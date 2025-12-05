import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  validateAuth,
  getCorsHeaders,
  validateStringInput,
  validateUUID,
  checkRateLimit,
  createRateLimitResponse,
  createErrorResponse,
  createSafeErrorResponse,
  createUnauthorizedResponse,
  createValidationErrorResponse,
} from '../_shared/security.ts';

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

interface ProfileRecord {
  plan_type: string;
  audio_addon_enabled: boolean;
  audio_addon_expires_at: string | null;
}

interface LessonRecord {
  id: string;
  title: string;
  markdown_content: string | null;
  module_index: number;
  lesson_index: number;
  audio_status?: string;
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

/**
 * Check if user has access to bulk audio generation feature
 * Requirements: 8.5 - Premium feature gating
 */
async function checkAudioAccess(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ hasAccess: boolean; reason?: string }> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('plan_type, audio_addon_enabled, audio_addon_expires_at')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return { hasAccess: false, reason: 'Profile not found' };
  }

  const typedProfile = profile as ProfileRecord;

  // PRO_MAX users have full access
  if (typedProfile.plan_type === 'PRO_MAX') {
    return { hasAccess: true };
  }

  // Check audio add-on subscription
  if (typedProfile.audio_addon_enabled) {
    if (typedProfile.audio_addon_expires_at) {
      const expiresAt = new Date(typedProfile.audio_addon_expires_at);
      if (expiresAt > new Date()) {
        return { hasAccess: true };
      }
      return { hasAccess: false, reason: 'Audio add-on subscription expired' };
    }
    return { hasAccess: true };
  }

  // Bulk generation requires subscription (no free trial for bulk)
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
    throw new Error('Audio generation service error');
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
  supabase: ReturnType<typeof createClient>,
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
    throw new Error('Failed to upload audio');
  }

  const { data: urlData } = supabase.storage
    .from('lesson-audio')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

async function generateSingleLessonAudio(
  supabase: ReturnType<typeof createClient>,
  lesson: LessonRecord,
  voiceType: 'male' | 'female',
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!lesson.markdown_content) {
      return { success: false, error: 'No content' };
    }

    // Update status to generating
    await supabase
      .from('lessons')
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

    await supabase
      .from('lessons')
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
    
    await supabase
      .from('lessons')
      .update({ audio_status: 'failed' })
      .eq('id', lesson.id);
    
    return { success: false, error: err.message };
  }
}

Deno.serve(async (req: Request) => {
  // Get CORS headers based on request origin (Requirements 2.1, 2.2, 2.3)
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Initialize Supabase client early for auth and rate limiting
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  try {
    if (!MURF_API_KEY) {
      console.error('MURF_API_KEY not configured');
      return createErrorResponse(
        'Service configuration error',
        500,
        corsHeaders,
        'INTERNAL_ERROR'
      );
    }

    // Validate authentication (Requirements 1.1, 1.2, 1.3)
    const authResult = await validateAuth(req, supabase);
    if (authResult.error || !authResult.user) {
      return createUnauthorizedResponse(corsHeaders, authResult.error || 'Unauthorized');
    }

    const user = authResult.user;

    // Check rate limit before processing (Requirements 4.1, 4.2, 4.3)
    // Bulk audio generation has the strictest limits
    const rateLimitResult = await checkRateLimit(supabase, user.id, 'generate-course-audio');
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);
    }

    // Parse and validate request body
    let requestData: GenerateCourseAudioRequest;
    try {
      requestData = await req.json();
    } catch {
      return createValidationErrorResponse(corsHeaders, 'Invalid JSON in request body');
    }

    const { courseId, voiceType, lessonId, jobId } = requestData;

    // Validate courseId as UUID (Requirements 3.1)
    const courseIdValidation = validateUUID(courseId, 'courseId');
    if (!courseIdValidation.valid) {
      return createValidationErrorResponse(corsHeaders, courseIdValidation.error || 'Invalid courseId');
    }

    // Validate voiceType (Requirements 3.1)
    const voiceTypeValidation = validateStringInput(voiceType, 'voiceType', 10, true);
    if (!voiceTypeValidation.valid) {
      return createValidationErrorResponse(corsHeaders, voiceTypeValidation.error || 'Invalid voiceType');
    }
    if (!['male', 'female'].includes(voiceType)) {
      return createValidationErrorResponse(corsHeaders, 'voiceType must be "male" or "female"');
    }

    // Validate optional lessonId if provided
    if (lessonId !== undefined) {
      const lessonIdValidation = validateUUID(lessonId, 'lessonId');
      if (!lessonIdValidation.valid) {
        return createValidationErrorResponse(corsHeaders, lessonIdValidation.error || 'Invalid lessonId');
      }
    }

    // Validate optional jobId if provided
    if (jobId !== undefined) {
      const jobIdValidation = validateUUID(jobId, 'jobId');
      if (!jobIdValidation.valid) {
        return createValidationErrorResponse(corsHeaders, jobIdValidation.error || 'Invalid jobId');
      }
    }

    // Check premium feature access (Requirements 8.5)
    const accessCheck = await checkAudioAccess(supabase, user.id);
    if (!accessCheck.hasAccess) {
      return createErrorResponse(
        accessCheck.reason || 'Access denied',
        403,
        corsHeaders,
        'FORBIDDEN'
      );
    }

    // Verify course ownership (Requirements 1.4, 8.2)
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('owner_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return createErrorResponse('Course not found', 404, corsHeaders, 'NOT_FOUND');
    }

    if (course.owner_id !== user.id) {
      // Log unauthorized access attempt (Requirements 10.2)
      console.warn(`Unauthorized bulk audio generation attempt: user=${user.id}, course=${courseId}, owner=${course.owner_id}`);
      return createErrorResponse(
        'You do not have permission to generate audio for this course',
        403,
        corsHeaders,
        'FORBIDDEN'
      );
    }

    // If lessonId is provided, process just that lesson (continuation mode)
    if (lessonId && jobId) {
      const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();

      if (lessonError || !lesson) {
        return createErrorResponse('Lesson not found', 404, corsHeaders, 'NOT_FOUND');
      }

      const result = await generateSingleLessonAudio(
        supabase,
        lesson as LessonRecord,
        voiceType,
        courseId
      );

      // Update job progress
      const { data: job } = await supabase
        .from('audio_generation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (job) {
        const typedJob = job as JobRecord;
        const newCompleted = result.success ? typedJob.completed_lessons + 1 : typedJob.completed_lessons;
        const newFailed = result.success ? typedJob.failed_lessons : typedJob.failed_lessons + 1;
        const isComplete = newCompleted + newFailed >= typedJob.total_lessons;

        await supabase
          .from('audio_generation_jobs')
          .update({
            completed_lessons: newCompleted,
            failed_lessons: newFailed,
            status: isComplete ? (newFailed === typedJob.total_lessons ? 'failed' : 'completed') : 'processing',
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
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, title, markdown_content, module_index, lesson_index, audio_status')
      .eq('course_id', courseId)
      .not('markdown_content', 'is', null)
      .order('module_index')
      .order('lesson_index');

    if (lessonsError) {
      console.error('Failed to fetch lessons:', lessonsError);
      return createErrorResponse('Failed to fetch lessons', 500, corsHeaders, 'INTERNAL_ERROR');
    }

    if (!lessons || lessons.length === 0) {
      return createValidationErrorResponse(corsHeaders, 'No lessons found with content');
    }

    // Filter to only lessons that need audio generation
    const lessonsToProcess = (lessons as LessonRecord[]).filter(
      (l) => !l.audio_status || l.audio_status === 'failed' || l.audio_status === 'pending'
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
    const { data: job, error: jobError } = await supabase
      .from('audio_generation_jobs')
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
      console.error('Failed to create generation job:', jobError);
      return createErrorResponse('Failed to create generation job', 500, corsHeaders, 'INTERNAL_ERROR');
    }

    // Mark all lessons as pending
    for (const lesson of lessonsToProcess) {
      await supabase
        .from('lessons')
        .update({ audio_status: 'pending' })
        .eq('id', lesson.id);
    }

    // Return job info and lesson IDs for client to process sequentially
    return new Response(
      JSON.stringify({
        success: true,
        jobId: (job as JobRecord).id,
        totalLessons: lessonsToProcess.length,
        lessonIds: lessonsToProcess.map((l) => l.id),
        message: 'Job created. Process lessons by calling this endpoint with lessonId and jobId.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    // Log full error for debugging (server-side only)
    console.error('Error in generate-course-audio:', error);

    // Use createSafeErrorResponse to ensure no stack traces or internal paths are exposed (Requirements 7.2)
    return createSafeErrorResponse(error, 500, corsHeaders, 'INTERNAL_ERROR', 'Failed to generate course audio');
  }
});
