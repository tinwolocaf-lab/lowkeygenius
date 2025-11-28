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

interface GenerateCourseAudioRequest {
  courseId: string;
  voiceType: 'male' | 'female';
}

async function checkAudioAccess(supabase: any, userId: string): Promise<{ hasAccess: boolean; reason?: string }> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('plan_type, audio_addon_enabled, audio_addon_expires_at')
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

  return { hasAccess: false, reason: 'Audio add-on required for bulk generation' };
}

async function downloadAndUploadAudio(
  audioUrl: string,
  supabase: any,
  courseId: string,
  lessonId: string,
  voiceType: string
): Promise<string> {
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

async function generateLessonAudio(
  supabase: any,
  lesson: any,
  voiceType: 'male' | 'female',
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!lesson.markdown_content) {
      return { success: false, error: 'No content' };
    }

    await supabase
      .from('lessons')
      .update({ audio_status: 'generating' })
      .eq('id', lesson.id);

    const voiceConfig = VOICE_CONFIGS[voiceType];
    const murfResponse = await fetch('https://api.murf.ai/v1/speech/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': MURF_API_KEY!,
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
      await supabase
        .from('lessons')
        .update({ audio_status: 'failed' })
        .eq('id', lesson.id);
      return { success: false, error: errorText.substring(0, 100) };
    }

    const murfData = await murfResponse.json();

    if (!murfData.audioFile) {
      await supabase
        .from('lessons')
        .update({ audio_status: 'failed' })
        .eq('id', lesson.id);
      return { success: false, error: 'No audio file URL' };
    }

    const publicAudioUrl = await downloadAndUploadAudio(
      murfData.audioFile,
      supabase,
      courseId,
      lesson.id,
      voiceType
    );

    await supabase
      .from('lessons')
      .update({
        audio_url: publicAudioUrl,
        audio_duration_seconds: Math.round(murfData.audioLengthInSeconds || 0),
        audio_status: 'ready',
        audio_voice_type: voiceType,
        audio_generated_at: new Date().toISOString(),
      })
      .eq('id', lesson.id);

    return { success: true };
  } catch (error: any) {
    await supabase
      .from('lessons')
      .update({ audio_status: 'failed' })
      .eq('id', lesson.id);
    return { success: false, error: error.message };
  }
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

    const requestData: GenerateCourseAudioRequest = await req.json();
    const { courseId, voiceType } = requestData;

    if (!courseId || !voiceType || !['male', 'female'].includes(voiceType)) {
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

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('owner_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      throw new Error('Course not found');
    }

    if (course.owner_id !== user.id) {
      throw new Error('Unauthorized');
    }

    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .not('markdown_content', 'is', null)
      .order('module_index')
      .order('lesson_index');

    if (lessonsError) {
      throw new Error('Failed to fetch lessons');
    }

    if (!lessons || lessons.length === 0) {
      throw new Error('No lessons found with content');
    }

    const { data: job, error: jobError } = await supabase
      .from('audio_generation_jobs')
      .insert({
        course_id: courseId,
        user_id: user.id,
        voice_type: voiceType,
        status: 'processing',
        total_lessons: lessons.length,
        completed_lessons: 0,
        failed_lessons: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError || !job) {
      throw new Error('Failed to create generation job');
    }

    let completed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const lesson of lessons) {
      const result = await generateLessonAudio(supabase, lesson, voiceType, courseId);

      if (result.success) {
        completed++;
      } else {
        failed++;
        if (result.error) {
          errors.push(`Lesson ${lesson.title}: ${result.error}`);
        }
      }

      await supabase
        .from('audio_generation_jobs')
        .update({
          completed_lessons: completed,
          failed_lessons: failed,
        })
        .eq('id', job.id);
    }

    const finalStatus = failed === lessons.length ? 'failed' : 'completed';
    await supabase
      .from('audio_generation_jobs')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        error_message: errors.length > 0 ? errors.join('; ').substring(0, 500) : null,
      })
      .eq('id', job.id);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        totalLessons: lessons.length,
        completed,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error generating course audio:', error);

    return new Response(
      JSON.stringify({
        error: error?.message || 'Failed to generate course audio',
        details: error?.stack?.substring(0, 500),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});