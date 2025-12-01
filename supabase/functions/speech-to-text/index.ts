/**
 * Speech-to-Text Edge Function
 * Converts audio recordings to text using Gemini API (gemini-2.5-flash-lite model)
 * 
 * Requirements: 8.1, 8.2, 8.3
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

interface SpeechToTextRequest {
  audioBase64: string;
  mimeType: string; // 'audio/wav' | 'audio/mp3' | 'audio/aiff' | 'audio/aac' | 'audio/ogg' | 'audio/flac'
}

interface SpeechToTextResponse {
  success: boolean;
  transcription?: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const requestData: SpeechToTextRequest = await req.json();
    const { audioBase64, mimeType } = requestData;

    if (!audioBase64) {
      throw new Error('No audio data provided');
    }

    if (!mimeType) {
      throw new Error('No mime type provided');
    }

    // Validate mime type
    const validMimeTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/webm'];
    if (!validMimeTypes.includes(mimeType)) {
      throw new Error(`Invalid mime type: ${mimeType}. Supported types: ${validMimeTypes.join(', ')}`);
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
            temperature: 0.1, // Low temperature for accurate transcription
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      let errorMessage = 'Gemini API error';

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.code === 429) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (errorData.error?.code === 503) {
          errorMessage = 'Speech-to-text service is temporarily unavailable. Please try again later.';
        } else if (errorData.error?.message) {
          errorMessage = errorData.error.message.split('\n')[0];
        }
      } catch {
        errorMessage = errorText.substring(0, 200);
      }

      throw new Error(errorMessage);
    }

    const geminiData = await geminiResponse.json();

    if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Failed to transcribe audio - no text returned');
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

    const errorMessage = error instanceof Error ? error.message : 'Failed to transcribe audio';
    
    // Check for specific error types (Requirements 8.3)
    let statusCode = 500;
    if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
      statusCode = 429;
    } else if (errorMessage.includes('unavailable') || errorMessage.includes('503')) {
      statusCode = 503;
    }

    const errorResponse: SpeechToTextResponse = {
      success: false,
      error: errorMessage,
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: statusCode,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
