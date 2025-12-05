/**
 * Speech-to-Text Edge Function
 * Converts audio recordings to text using Gemini API (gemini-2.5-flash-lite model)
 * 
 * Requirements: 8.1, 8.2, 8.3
 * Security: 1.1, 1.2, 2.1, 3.1, 3.2, 7.2
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  validateAuth,
  getCorsHeaders,
  validateStringInput,
  checkRateLimit,
  createRateLimitResponse,
  createUnauthorizedResponse,
  createValidationErrorResponse,
  createErrorResponse,
} from '../_shared/security.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

// Maximum audio size limits (Requirements 3.2)
// Base64 encoding increases size by ~33%, so 10MB audio = ~13.3MB base64
const MAX_AUDIO_BASE64_LENGTH = 15 * 1024 * 1024;
const MAX_MIME_TYPE_LENGTH = 50;

// Valid audio MIME types
const VALID_MIME_TYPES = [
  'audio/wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/aiff',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
  'audio/webm',
];

interface SpeechToTextRequest {
  audioBase64: string;
  mimeType: string;
}

interface SpeechToTextResponse {
  success: boolean;
  transcription?: string;
  error?: string;
}


/**
 * Validate that a string is valid base64
 */
function isValidBase64(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }
  
  // Check for valid base64 characters
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  
  // Remove any whitespace that might be present
  const cleanStr = str.replace(/\s/g, '');
  
  // Check length is multiple of 4 and matches base64 pattern
  return cleanStr.length % 4 === 0 && base64Regex.test(cleanStr);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle preflight requests (Requirements 2.2)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return createErrorResponse(
        'Service configuration error',
        500,
        corsHeaders,
        'INTERNAL_ERROR'
      );
    }

    // Validate authentication (Requirements 1.1, 1.2, 1.3)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authResult = await validateAuth(req, supabase);
    if (authResult.error || !authResult.user) {
      console.warn('Authentication failed:', authResult.error);
      return createUnauthorizedResponse(corsHeaders, authResult.error || 'Unauthorized');
    }

    // Check rate limit (Requirements 4.1, 4.2)
    const rateLimitResult = await checkRateLimit(supabase, authResult.user.id, 'speech-to-text');
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);
    }

    // Parse and validate request body
    let requestData: SpeechToTextRequest;
    try {
      requestData = await req.json();
    } catch {
      return createValidationErrorResponse(corsHeaders, 'Invalid JSON in request body');
    }

    const { audioBase64, mimeType } = requestData;

    // Validate audioBase64 (Requirements 3.1, 3.2)
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return createValidationErrorResponse(corsHeaders, 'audioBase64 is required');
    }

    if (audioBase64.length > MAX_AUDIO_BASE64_LENGTH) {
      return createValidationErrorResponse(
        corsHeaders,
        `Audio data exceeds maximum size of ${Math.round(MAX_AUDIO_BASE64_LENGTH / 1024 / 1024)}MB`
      );
    }

    // Validate base64 format
    if (!isValidBase64(audioBase64)) {
      return createValidationErrorResponse(corsHeaders, 'Invalid base64 encoding for audio data');
    }

    // Validate mimeType (Requirements 3.1, 3.2)
    const mimeTypeValidation = validateStringInput(mimeType, 'mimeType', MAX_MIME_TYPE_LENGTH);
    if (!mimeTypeValidation.valid) {
      return createValidationErrorResponse(corsHeaders, mimeTypeValidation.error || 'Invalid mimeType');
    }

    if (!VALID_MIME_TYPES.includes(mimeType)) {
      return createValidationErrorResponse(
        corsHeaders,
        `Invalid mime type: ${mimeType}. Supported types: ${VALID_MIME_TYPES.join(', ')}`
      );
    }

    const prompt = `Please transcribe the following audio recording accurately. 
Return only the transcribed text without any additional commentary or formatting.
If the audio is unclear or contains no speech, indicate that briefly.`;

    // Use gemini-2.5-flash-lite model for speech-to-text as per Requirements 8.1
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: audioBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      let statusCode = 503;

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.code === 429) {
          return createRateLimitResponse(60, corsHeaders);
        } else if (errorData.error?.code === 503) {
          statusCode = 503;
        }
        console.error('Gemini API error:', errorData.error?.message || errorText.substring(0, 200));
      } catch {
        console.error('Gemini API error:', errorText.substring(0, 200));
      }

      return createErrorResponse(
        'Speech-to-text service temporarily unavailable',
        statusCode,
        corsHeaders,
        'SERVICE_UNAVAILABLE'
      );
    }

    const geminiData = await geminiResponse.json();

    if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      return createErrorResponse(
        'Failed to transcribe audio - no text returned',
        500,
        corsHeaders,
        'INTERNAL_ERROR'
      );
    }

    const transcription = geminiData.candidates[0].content.parts[0].text.trim();

    const successResponse: SpeechToTextResponse = {
      success: true,
      transcription,
    };

    return new Response(
      JSON.stringify(successResponse),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Error in speech-to-text:', error);

    return createErrorResponse(
      'An error occurred processing your request',
      500,
      corsHeaders,
      'INTERNAL_ERROR'
    );
  }
});
