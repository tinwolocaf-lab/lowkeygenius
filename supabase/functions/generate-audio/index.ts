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
    style: 'Conversational',
    multiNativeLocale: 'en-US',
  },
};

/**
 * Strip markdown formatting to get plain text for TTS
 * Requirements: 7.3
 */
function stripMarkdown(text: string): string {
  if (!text) {
    return '';
  }

  return text
    // Replace mermaid diagrams with spoken placeholder
    .replace(/```mermaid[\s\S]*?```/g, 'There is a diagram here illustrating this concept.')
    // Remove other code blocks (fenced)
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]+`/g, '')
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove images (must come before links)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bold (double asterisks)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove italic (single asterisks)
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove bold (double underscores)
    .replace(/__([^_]+)__/g, '$1')
    // Remove italic (single underscores)
    .replace(/_([^_]+)_/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '')
    // Remove unordered list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // Remove ordered list markers
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface GenerateAudioRequest {
  lessonId: string;
  voiceType: 'male' | 'female';
}

interface SupabaseClient {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        single: () => Promise<{ data: Record<string, unknown> | null; error: Error | null }>;
      };
    };
    update: (data: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: Error | null }>;
    };
  };
  storage: {
    from: (bucket: string) => {
      upload: (path: string, data: Uint8Array, options: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
  auth: {
    getUser: (token: string) => Promise<{ data: { user: { id: string } | null }; error: Error | null }>;
  };
}

async function checkAudioAccess(supabase: SupabaseClient, userId: string): Promise<{ hasAccess: boolean; reason?: string }> {
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

async function downloadAndUploadAudio(audioUrl: string, supabase: SupabaseClient, courseId: string, lessonId: string, voiceType: string): Promise<string> {
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error('Failed to download audio from Murf AI');
  }

  const audioBlob = await audioResponse.blob();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const fileName = `${courseId}/${lessonId}-${voiceType}.mp3`;
  const { error: uploadError } = await supabase.storage
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

    // Strip markdown formatting for clean TTS (Requirement 7.3)
    const plainText = stripMarkdown(lesson.markdown_content);
    
    if (!plainText) {
      throw new Error('Lesson has no readable content after stripping markdown');
    }

    const voiceConfig = VOICE_CONFIGS[voiceType];
    const murfResponse = await fetch('https://api.murf.ai/v1/speech/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': MURF_API_KEY,
      },
      body: JSON.stringify({
        text: plainText,
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

      console.error('Murf API error response:', {
        status: murfResponse.status,
        statusText: murfResponse.statusText,
        body: errorText,
        voiceConfig,
        textLength: plainText.length,
      });

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch {
        errorMessage = errorText.substring(0, 200) || `API error (${murfResponse.status})`;
      }

      await supabase
        .from('lessons')
        .update({ audio_status: 'failed' })
        .eq('id', lessonId);

      throw new Error(`Murf AI: ${errorMessage}`);
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
  } catch (error) {
    console.error('Error generating audio:', error);

    const errorWithMessage = error as { message?: string; stack?: string };
    return new Response(
      JSON.stringify({
        error: errorWithMessage?.message || 'Failed to generate audio',
        details: errorWithMessage?.stack?.substring(0, 500),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});