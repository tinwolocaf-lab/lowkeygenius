import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const MURF_API_KEY = Deno.env.get('MURF_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const VOICE_CONFIGS = {
  female: {
    voiceId: 'en-US-natalie',
    style: 'Narration',
    multiNativeLocale: 'en-US',
  },
  male: {
    voiceId: 'en-US-cooper',
    style: 'Narration',
    multiNativeLocale: 'en-US',
  },
};

interface GenerateAudioRequest {
  lessonId: string;
  voiceType: 'male' | 'female';
}

async function checkAudioAccess(supabase: any, userId: string): Promise<{ hasAccess: boolean; reason?: string }> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('plan_type, audio_addon_enabled, audio_addon_trial_used, audio_addon_expires_at')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return { hasAccess: false, reason: 'Profile not found' };
  }

  if (profile.plan_type === 'PRO_MAX') {
    return { hasAccess: true };
  }

  if (profile.audio_addon_enabled) {
    if (profile.audio_addon_expires_at) {
      const expiresAt = new Date(profile.audio_addon_expires_at);
      if (expiresAt > new Date()) {
        return { hasAccess: true };
      }
      return { hasAccess: false, reason: 'Audio add-on subscription expired' };
    }
    return { hasAccess: true };
  }

  if (!profile.audio_addon_trial_used && profile.plan_type === 'FREE') {
    return { hasAccess: true };
  }

  return { hasAccess: false, reason: 'Audio add-on required' };
}

async function downloadAndUploadAudio(audioUrl: string, supabase: any, courseId: string, lessonId: string, voiceType: string): Promise<string> {
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error('Failed to download audio from Murf AI');
  }

  const audioBlob = await audioResponse.blob();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const fileName = `${courseId}/${lessonId}-${voiceType}.mp3`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('lesson-audio')
    .upload(fileName, uint8Array, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload audio: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('lesson-audio')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (!MURF_API_KEY) {
      throw new Error('MURF_API_KEY not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const requestData: GenerateAudioRequest = await req.json();
    const { lessonId, voiceType } = requestData;

    if (!lessonId || !voiceType || !['male', 'female'].includes(voiceType)) {
      throw new Error('Invalid request parameters');
    }

    const accessCheck = await checkAudioAccess(supabase, user.id);
    if (!accessCheck.hasAccess) {
      return new Response(
        JSON.stringify({ error: accessCheck.reason || 'Access denied' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*, course:courses!inner(id, owner_id)')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      throw new Error('Lesson not found');
    }

    if (lesson.course.owner_id !== user.id) {
      throw new Error('Unauthorized');
    }

    if (!lesson.markdown_content) {
      throw new Error('Lesson has no content to convert to audio');
    }

    await supabase
      .from('lessons')
      .update({ audio_status: 'generating' })
      .eq('id', lessonId);

    const voiceConfig = VOICE_CONFIGS[voiceType];
    const murfResponse = await fetch('https://api.murf.ai/v1/speech/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': MURF_API_KEY,
      },
      body: JSON.stringify({
        text: lesson.markdown_content,
        voiceId: voiceConfig.voiceId,
        style: voiceConfig.style,
        multiNativeLocale: voiceConfig.multiNativeLocale,
        format: 'MP3',
        sampleRate: 44100,
      }),
    });

    if (!murfResponse.ok) {
      const errorText = await murfResponse.text();
      let errorMessage = 'Murf AI API error';

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        errorMessage = errorText.substring(0, 200) || `API error (${murfResponse.status})`;
      }

      await supabase
        .from('lessons')
        .update({ audio_status: 'failed' })
        .eq('id', lessonId);

      throw new Error(errorMessage);
    }

    const murfData = await murfResponse.json();

    if (!murfData.audioFile) {
      throw new Error('No audio file URL returned from Murf AI');
    }

    const publicAudioUrl = await downloadAndUploadAudio(
      murfData.audioFile,
      supabase,
      lesson.course.id,
      lessonId,
      voiceType
    );

    const { error: updateError } = await supabase
      .from('lessons')
      .update({
        audio_url: publicAudioUrl,
        audio_duration_seconds: Math.round(murfData.audioLengthInSeconds || 0),
        audio_status: 'ready',
        audio_voice_type: voiceType,
        audio_generated_at: new Date().toISOString(),
      })
      .eq('id', lessonId);

    if (updateError) {
      throw new Error(`Failed to update lesson: ${updateError.message}`);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('audio_addon_trial_used, plan_type')
      .eq('id', user.id)
      .single();

    if (profile && !profile.audio_addon_trial_used && profile.plan_type === 'FREE') {
      await supabase
        .from('profiles')
        .update({ audio_addon_trial_used: true })
        .eq('id', user.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        audioUrl: publicAudioUrl,
        duration: Math.round(murfData.audioLengthInSeconds || 0),
        voiceType,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error generating audio:', error);

    return new Response(
      JSON.stringify({
        error: error?.message || 'Failed to generate audio',
        details: error?.stack?.substring(0, 500),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});