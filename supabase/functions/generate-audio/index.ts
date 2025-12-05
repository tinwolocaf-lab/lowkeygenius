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

const MAX_CHUNK_SIZE = 2800; // Murf AI has ~3000 char limit

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

/**
 * Strip markdown formatting to get plain text for TTS
 * Requirements: 7.3
 */
function stripMarkdown(text: string): string {
  if (!text) {
    return '';
  }

  const result = text
    // Replace mermaid diagrams with spoken placeholder
    .replace(/```mermaid[\s\S]*?```/g, 'There is a diagram here illustrating this concept.')
    // Replace code blocks with a spoken placeholder (keep some context)
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang) => {
      if (lang) {
        return `There is a ${lang} code example here.`;
      }
      return 'There is a code example here.';
    })
    // Remove inline code but keep the text
    .replace(/`([^`]+)`/g, '$1')
    // Remove headers but keep the text
    .replace(/^#{1,6}\s+(.+)$/gm, '$1.')
    // Remove images but add description if available
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, (_match, alt) => {
      if (alt && alt.trim()) {
        return `Image: ${alt}.`;
      }
      return '';
    })
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bold (double asterisks) but keep text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove italic (single asterisks) but keep text
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove bold (double underscores) but keep text
    .replace(/__([^_]+)__/g, '$1')
    // Remove italic (single underscores) but keep text
    .replace(/_([^_]+)_/g, '$1')
    // Remove strikethrough but keep text
    .replace(/~~([^~]+)~~/g, '$1')
    // Remove blockquotes marker but keep text
    .replace(/^>\s*/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '')
    // Remove unordered list markers but keep text
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // Remove ordered list markers but keep text
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove table formatting
    .replace(/\|/g, ' ')
    .replace(/^[\s]*[-:]+[\s]*$/gm, '')
    // Clean up multiple spaces
    .replace(/[ \t]+/g, ' ')
    // Clean up extra newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // If result is too short, return a fallback message
  if (result.length < 10) {
    return 'This lesson contains visual content such as diagrams and code examples. Please refer to the written content for details.';
  }

  return result;
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

interface GenerateAudioRequest {
  lessonId: string;
  voiceType: 'male' | 'female';
}

interface ProfileRecord {
  plan_type: string;
  audio_addon_enabled: boolean;
  audio_addon_trial_used: boolean;
  audio_addon_expires_at: string | null;
}

/**
 * Check if user has access to audio generation feature
 * Requirements: 8.5 - Premium feature gating
 */
async function checkAudioAccess(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ hasAccess: boolean; reason?: string }> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('plan_type, audio_addon_enabled, audio_addon_trial_used, audio_addon_expires_at')
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

  // Free trial for FREE users who haven't used it
  if (!typedProfile.audio_addon_trial_used && typedProfile.plan_type === 'FREE') {
    return { hasAccess: true };
  }

  return { hasAccess: false, reason: 'Audio add-on required' };
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
    // Audio generation has stricter limits due to higher resource costs
    const rateLimitResult = await checkRateLimit(supabase, user.id, 'generate-audio');
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);
    }

    // Parse and validate request body
    let requestData: GenerateAudioRequest;
    try {
      requestData = await req.json();
    } catch {
      return createValidationErrorResponse(corsHeaders, 'Invalid JSON in request body');
    }

    const { lessonId, voiceType } = requestData;

    // Validate lessonId as UUID (Requirements 3.1)
    const lessonIdValidation = validateUUID(lessonId, 'lessonId');
    if (!lessonIdValidation.valid) {
      return createValidationErrorResponse(corsHeaders, lessonIdValidation.error || 'Invalid lessonId');
    }

    // Validate voiceType (Requirements 3.1)
    const voiceTypeValidation = validateStringInput(voiceType, 'voiceType', 10, true);
    if (!voiceTypeValidation.valid) {
      return createValidationErrorResponse(corsHeaders, voiceTypeValidation.error || 'Invalid voiceType');
    }
    if (!['male', 'female'].includes(voiceType)) {
      return createValidationErrorResponse(corsHeaders, 'voiceType must be "male" or "female"');
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

    // Fetch lesson with course info for ownership verification
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*, course:courses!inner(id, owner_id)')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return createErrorResponse('Lesson not found', 404, corsHeaders, 'NOT_FOUND');
    }

    // Verify course ownership (Requirements 1.4, 8.2)
    const courseData = lesson.course as { id: string; owner_id: string };
    if (courseData.owner_id !== user.id) {
      // Log unauthorized access attempt (Requirements 10.2)
      console.warn(`Unauthorized audio generation attempt: user=${user.id}, lesson=${lessonId}, owner=${courseData.owner_id}`);
      return createErrorResponse(
        'You do not have permission to generate audio for this lesson',
        403,
        corsHeaders,
        'FORBIDDEN'
      );
    }

    if (!lesson.markdown_content) {
      return createValidationErrorResponse(corsHeaders, 'Lesson has no content to convert to audio');
    }

    // Update lesson status to generating
    await supabase
      .from('lessons')
      .update({ audio_status: 'generating' })
      .eq('id', lessonId);

    // Split text into chunks for Murf API (has ~3000 char limit)
    const chunks = splitTextIntoChunks(lesson.markdown_content, MAX_CHUNK_SIZE);
    
    // Filter out empty chunks and ensure we have content
    const validChunks = chunks.filter(c => c.trim().length >= 10);
    
    if (validChunks.length === 0) {
      // Fallback: try to extract any text content
      const fallbackText = stripMarkdown(lesson.markdown_content);
      if (fallbackText.length >= 10) {
        validChunks.push(fallbackText);
      } else {
        await supabase
          .from('lessons')
          .update({ audio_status: 'failed' })
          .eq('id', lessonId);
        return createValidationErrorResponse(corsHeaders, 'Lesson has no readable content after stripping markdown');
      }
    }

    console.log(`Processing ${validChunks.length} chunks for lesson`);

    const voiceConfig = VOICE_CONFIGS[voiceType];
    const audioUrls: string[] = [];
    let totalDuration = 0;

    // Generate audio for each chunk
    for (let i = 0; i < validChunks.length; i++) {
      const chunk = validChunks[i];
      console.log(`Processing chunk ${i + 1}/${validChunks.length} (${chunk.length} chars)`);

      const murfResponse = await fetch('https://api.murf.ai/v1/speech/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': MURF_API_KEY,
        },
        body: JSON.stringify({
          text: chunk,
          voiceId: voiceConfig.voiceId,
          style: voiceConfig.style,
          multiNativeLocale: voiceConfig.multiNativeLocale,
          format: 'MP3',
          sampleRate: 44100,
        }),
      });

      if (!murfResponse.ok) {
        const errorText = await murfResponse.text();
        let errorMessage = 'Audio generation service error';

        console.error('Murf API error response:', {
          status: murfResponse.status,
          statusText: murfResponse.statusText,
          chunkLength: chunk.length,
        });

        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = 'Audio generation failed';
          } else if (errorData.message) {
            errorMessage = 'Audio generation failed';
          }
        } catch {
          errorMessage = `Audio generation failed (${murfResponse.status})`;
        }

        await supabase
          .from('lessons')
          .update({ audio_status: 'failed' })
          .eq('id', lessonId);

        return createErrorResponse(errorMessage, 500, corsHeaders, 'INTERNAL_ERROR');
      }

      const murfData = await murfResponse.json();

      if (!murfData.audioFile) {
        await supabase
          .from('lessons')
          .update({ audio_status: 'failed' })
          .eq('id', lessonId);
        return createErrorResponse('No audio file returned from service', 500, corsHeaders, 'INTERNAL_ERROR');
      }

      audioUrls.push(murfData.audioFile);
      totalDuration += murfData.audioLengthInSeconds || 0;

      // Small delay between API calls to avoid rate limiting
      if (i < validChunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Download and concatenate all audio chunks
    const audioBuffers: Uint8Array[] = [];
    for (const url of audioUrls) {
      const response = await fetch(url);
      if (!response.ok) {
        await supabase
          .from('lessons')
          .update({ audio_status: 'failed' })
          .eq('id', lessonId);
        return createErrorResponse('Failed to download audio chunk', 500, corsHeaders, 'INTERNAL_ERROR');
      }
      const arrayBuffer = await response.arrayBuffer();
      audioBuffers.push(new Uint8Array(arrayBuffer));
    }

    // Concatenate buffers
    const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.length, 0);
    const concatenated = new Uint8Array(totalLength);
    let offset = 0;
    for (const buffer of audioBuffers) {
      concatenated.set(buffer, offset);
      offset += buffer.length;
    }

    // Upload concatenated audio
    const fileName = `${courseData.id}/${lessonId}-${voiceType}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from('lesson-audio')
      .upload(fileName, concatenated, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Failed to upload audio:', uploadError);
      await supabase
        .from('lessons')
        .update({ audio_status: 'failed' })
        .eq('id', lessonId);
      return createErrorResponse('Failed to upload audio', 500, corsHeaders, 'INTERNAL_ERROR');
    }

    const { data: urlData } = supabase.storage
      .from('lesson-audio')
      .getPublicUrl(fileName);

    const publicAudioUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from('lessons')
      .update({
        audio_url: publicAudioUrl,
        audio_duration_seconds: Math.round(totalDuration),
        audio_status: 'ready',
        audio_voice_type: voiceType,
        audio_generated_at: new Date().toISOString(),
      })
      .eq('id', lessonId);

    if (updateError) {
      console.error('Failed to update lesson:', updateError);
      return createErrorResponse('Failed to save audio metadata', 500, corsHeaders, 'INTERNAL_ERROR');
    }

    // Mark trial as used for FREE users
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
        duration: Math.round(totalDuration),
        voiceType,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    // Log full error for debugging (server-side only)
    console.error('Error generating audio:', error);

    // Use createSafeErrorResponse to ensure no stack traces or internal paths are exposed (Requirements 7.2)
    return createSafeErrorResponse(error, 500, corsHeaders, 'INTERNAL_ERROR', 'Failed to generate audio');
  }
});
