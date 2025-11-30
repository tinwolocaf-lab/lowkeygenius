import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const MURF_API_KEY = Deno.env.get('MURF_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const MAX_CHUNK_SIZE = 2800;

const VOICE_CONFIGS: Record<string, { voiceId: string; style: string; multiNativeLocale: string }> = {
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

interface GenerateCourseAudioRequest {
  courseId: string;
  voiceType: 'male' | 'female';
  // Optional: process a single lesson (for continuation)
  lessonId?: string;
  jobId?: string;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*_]{3,}$/gm, '')
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
  const plainText = stripMarkdown(text);
  
  if (plainText.length <= maxChunkSize) {
    return [plainText];
  }

  const chunks: string[] = [];
  const sentences = plainText.split(/(?<=[.!?])\s+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    if (sentence.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      const parts = sentence.split(/,\s*/);
      let partChunk = '';
      
      for (const part of parts) {
        if (part.length > maxChunkSize) {
          if (partChunk) {
            chunks.push(partChunk.trim());
            partChunk = '';
          }
          for (let i = 0; i < part.length; i += maxChunkSize) {
            chunks.push(part.slice(i, i + maxChunkSize).trim());
          }
        } else if ((partChunk + ', ' + part).length > maxChunkSize) {
          chunks.push(partChunk.trim());
          partChunk = part;
        } else {
          partChunk = partChunk ? partChunk + ', ' + part : part;
        }
      }
      
      if (partChunk) {
        currentChunk = partChunk;
      }
      continue;
    }

    if ((currentChunk + ' ' + sentence).length > maxChunkSize) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 0);
}

interface SupabaseClientType {
  from: (table: string) => Record<string, unknown>;
  storage: {
    from: (bucket: string) => {
      upload: (path: string, data: Uint8Array, options: Record<string, unknown>) => Promise<{ error: Error | null }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
  auth: {
    getUser: (token: string) => Promise<{ data: { user: { id: string } | null }; error: Error | null }>;
  };
}

interface LessonRecord {
  id: string;
  title: string;
  markdown_content: string | null;
  module_index: number;
  lesson_index: number;
  audio_status?: string;
}

interface ProfileRecord {
  plan_type: string;
  audio_addon_enabled: boolean;
  audio_addon_expires_at: string | null;
}

interface JobRecord {
  id: string;
  course_id: string;
  user_id: string;
  voice_type: string;
  status: string;
  total_lessons: number;
  completed_lessons: number;
  failed_lessons: number;
}

async function checkAudioAccess(supabase: SupabaseClientType, userId: string): Promise<{ hasAccess: boolean; reason?: string }> {
  const { data: profile, error } = await (supabase
    .from('profiles') as { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: ProfileRecord | null; error: Error | null }> } } })
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

async function generateAudioForChunk(
  text: string,
  voiceType: 'male' | 'female'
): Promise<{ audioUrl: string; duration: number }> {
  const voiceConfig = VOICE_CONFIGS[voiceType];
  
  const response = await fetch('https://api.murf.ai/v1/speech/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': MURF_API_KEY!,
    },
    body: JSON.stringify({
      text,
      voiceId: voiceConfig.voiceId,
      style: voiceConfig.style,
      multiNativeLocale: voiceConfig.multiNativeLocale,
      format: 'MP3',
      sampleRate: 44100,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  const data = await response.json();
  
  if (!data.audioFile) {
    throw new Error('No audio file URL in response');
  }

  return {
    audioUrl: data.audioFile,
    duration: data.audioLengthInSeconds || 0,
  };
}

async function downloadAudioAsBuffer(audioUrl: string): Promise<Uint8Array> {
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error('Failed to download audio');
  }
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

async function concatenateAndUploadAudio(
  audioUrls: string[],
  supabase: SupabaseClientType,
  courseId: string,
  lessonId: string,
  voiceType: string
): Promise<string> {
  const audioBuffers: Uint8Array[] = [];
  
  for (const url of audioUrls) {
    const buffer = await downloadAudioAsBuffer(url);
    audioBuffers.push(buffer);
  }

  const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.length, 0);
  const concatenated = new Uint8Array(totalLength);
  
  let offset = 0;
  for (const buffer of audioBuffers) {
    concatenated.set(buffer, offset);
    offset += buffer.length;
  }

  const fileName = `${courseId}/${lessonId}-${voiceType}.mp3`;
  const { error: uploadError } = await supabase.storage
    .from('lesson-audio')
    .upload(fileName, concatenated, {
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

async function generateSingleLessonAudio(
  supabase: SupabaseClientType,
  lesson: LessonRecord,
  voiceType: 'male' | 'female',
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!lesson.markdown_content) {
      return { success: false, error: 'No content' };
    }

    // Update status to generating
    await (supabase.from('lessons') as { update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: Error | null }> } })
      .update({ audio_status: 'generating' })
      .eq('id', lesson.id);

    const chunks = splitTextIntoChunks(lesson.markdown_content, MAX_CHUNK_SIZE);
    console.log(`Lesson "${lesson.title}": ${chunks.length} chunks to process`);

    const audioUrls: string[] = [];
    let totalDuration = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
      
      const result = await generateAudioForChunk(chunk, voiceType);
      audioUrls.push(result.audioUrl);
      totalDuration += result.duration;
      
      // Small delay between API calls
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    const publicAudioUrl = await concatenateAndUploadAudio(
      audioUrls,
      supabase,
      courseId,
      lesson.id,
      voiceType
    );

    await (supabase.from('lessons') as { update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: Error | null }> } })
      .update({
        audio_url: publicAudioUrl,
        audio_duration_seconds: Math.round(totalDuration),
        audio_status: 'ready',
        audio_voice_type: voiceType,
        audio_generated_at: new Date().toISOString(),
      })
      .eq('id', lesson.id);

    return { success: true };
  } catch (error) {
    const err = error as Error;
    console.error(`Lesson "${lesson.title}" failed:`, err.message);
    
    await (supabase.from('lessons') as { update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: Error | null }> } })
      .update({ audio_status: 'failed' })
      .eq('id', lesson.id);
    
    return { success: false, error: err.message };
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

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!) as unknown as SupabaseClientType;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const requestData: GenerateCourseAudioRequest = await req.json();
    const { courseId, voiceType, lessonId, jobId } = requestData;

    if (!courseId || !voiceType || !['male', 'female'].includes(voiceType)) {
      throw new Error('Invalid request parameters');
    }

    // Check audio access
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

    // Verify course ownership
    const { data: course, error: courseError } = await (supabase
      .from('courses') as { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: { owner_id: string } | null; error: Error | null }> } } })
      .select('owner_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      throw new Error('Course not found');
    }

    if (course.owner_id !== user.id) {
      throw new Error('Unauthorized');
    }

    // If lessonId is provided, process just that lesson (continuation mode)
    if (lessonId && jobId) {
      const { data: lesson, error: lessonError } = await (supabase
        .from('lessons') as { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: LessonRecord | null; error: Error | null }> } } })
        .select('*')
        .eq('id', lessonId)
        .single();

      if (lessonError || !lesson) {
        throw new Error('Lesson not found');
      }

      const result = await generateSingleLessonAudio(supabase, lesson, voiceType, courseId);

      // Update job progress
      const { data: job } = await (supabase
        .from('audio_generation_jobs') as { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: JobRecord | null; error: Error | null }> } } })
        .select('*')
        .eq('id', jobId)
        .single();

      if (job) {
        const newCompleted = result.success ? job.completed_lessons + 1 : job.completed_lessons;
        const newFailed = result.success ? job.failed_lessons : job.failed_lessons + 1;
        const isComplete = newCompleted + newFailed >= job.total_lessons;

        await (supabase.from('audio_generation_jobs') as { update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: Error | null }> } })
          .update({
            completed_lessons: newCompleted,
            failed_lessons: newFailed,
            status: isComplete ? (newFailed === job.total_lessons ? 'failed' : 'completed') : 'processing',
            completed_at: isComplete ? new Date().toISOString() : null,
          })
          .eq('id', jobId);
      }

      return new Response(
        JSON.stringify({
          success: result.success,
          lessonId,
          error: result.error,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initial request: create job and return lesson list for client to process
    const { data: lessons, error: lessonsError } = await (supabase
      .from('lessons') as { 
        select: (cols: string) => { 
          eq: (col: string, val: string) => { 
            not: (col: string, op: string, val: null) => { 
              order: (col: string) => { 
                order: (col: string) => Promise<{ data: LessonRecord[] | null; error: Error | null }> 
              } 
            } 
          } 
        } 
      })
      .select('id, title, markdown_content, module_index, lesson_index, audio_status')
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

    // Filter to only lessons that need audio generation
    const lessonsToProcess = lessons.filter(
      (l: LessonRecord) => !l.audio_status || l.audio_status === 'failed' || l.audio_status === 'pending'
    );

    if (lessonsToProcess.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'All lessons already have audio',
          totalLessons: lessons.length,
          lessonsToProcess: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create the job
    const { data: job, error: jobError } = await (supabase
      .from('audio_generation_jobs') as { 
        insert: (data: Record<string, unknown>) => { 
          select: () => { 
            single: () => Promise<{ data: JobRecord | null; error: Error | null }> 
          } 
        } 
      })
      .insert({
        course_id: courseId,
        user_id: user.id,
        voice_type: voiceType,
        status: 'processing',
        total_lessons: lessonsToProcess.length,
        completed_lessons: 0,
        failed_lessons: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError || !job) {
      throw new Error('Failed to create generation job');
    }

    // Mark all lessons as pending
    for (const lesson of lessonsToProcess) {
      await (supabase.from('lessons') as { update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: Error | null }> } })
        .update({ audio_status: 'pending' })
        .eq('id', lesson.id);
    }

    // Return job info and lesson IDs for client to process sequentially
    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        totalLessons: lessonsToProcess.length,
        lessonIds: lessonsToProcess.map((l: LessonRecord) => l.id),
        message: 'Job created. Process lessons by calling this endpoint with lessonId and jobId.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-course-audio:', error);

    const err = error as Error;
    return new Response(
      JSON.stringify({
        error: err.message || 'Failed to generate course audio',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
