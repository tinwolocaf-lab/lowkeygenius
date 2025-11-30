import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const MURF_API_KEY = Deno.env.get('MURF_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const MAX_CHUNK_SIZE = 2800; // Leave buffer under 3000 limit

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

interface GenerateCourseAudioRequest {
  courseId: string;
  voiceType: 'male' | 'female';
}

/**
 * Strip markdown formatting to get plain text for TTS
 */
function stripMarkdown(text: string): string {
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '')
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Split text into chunks respecting sentence boundaries
 */
function splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
  const plainText = stripMarkdown(text);
  
  if (plainText.length <= maxChunkSize) {
    return [plainText];
  }

  const chunks: string[] = [];
  const sentences = plainText.split(/(?<=[.!?])\s+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    // If single sentence is too long, split by commas or force split
    if (sentence.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // Try splitting by commas first
      const parts = sentence.split(/,\s*/);
      let partChunk = '';
      
      for (const part of parts) {
        if (part.length > maxChunkSize) {
          // Force split very long parts
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
  supabase: any,
  courseId: string,
  lessonId: string,
  voiceType: string
): Promise<string> {
  // Download all audio chunks
  const audioBuffers: Uint8Array[] = [];
  
  for (const url of audioUrls) {
    const buffer = await downloadAudioAsBuffer(url);
    audioBuffers.push(buffer);
  }

  // Simple concatenation - combine all MP3 buffers
  // Note: This works for MP3 files but may have minor glitches at boundaries
  // For production, consider using a proper audio processing library
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

    // Split content into chunks
    const chunks = splitTextIntoChunks(lesson.markdown_content, MAX_CHUNK_SIZE);
    console.log(`Lesson "${lesson.title}": ${chunks.length} chunks to process`);

    const audioUrls: string[] = [];
    let totalDuration = 0;

    // Generate audio for each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
      
      try {
        const result = await generateAudioForChunk(chunk, voiceType);
        audioUrls.push(result.audioUrl);
        totalDuration += result.duration;
      } catch (chunkError: any) {
        console.error(`Chunk ${i + 1} failed:`, chunkError.message);
        throw new Error(`Chunk ${i + 1} failed: ${chunkError.message}`);
      }
      
      // Small delay between API calls to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Concatenate all audio chunks and upload
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
  } catch (error: any) {
    console.error(`Lesson "${lesson.title}" failed:`, error.message);
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
          errors.push(`Lesson ${lesson.title}: ${result.error.substring(0, 100)}`);
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
