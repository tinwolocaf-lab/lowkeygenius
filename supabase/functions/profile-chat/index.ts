/**
 * Profile Chat Edge Function
 * Handles conversational onboarding using Gemini chat API (gemini-2.5-flash model)
 * 
 * Requirements: 10.1, 10.2
 * Security: 1.1, 1.2, 2.1, 3.1, 3.2, 3.4, 7.2
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  validateAuth,
  getCorsHeaders,
  validateStringInput,
  sanitizeForPrompt,
  checkRateLimit,
  createRateLimitResponse,
  createUnauthorizedResponse,
  createValidationErrorResponse,
  createErrorResponse,
  createSafeErrorResponse,
} from '../_shared/security.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

// Maximum limits for input validation (Requirements 3.2)
const MAX_MESSAGE_LENGTH = 5000;
const MAX_CONVERSATION_HISTORY_LENGTH = 50;
const MAX_HISTORY_MESSAGE_LENGTH = 10000;

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface ProfileChatRequest {
  message: string;
  conversationHistory: ConversationMessage[];
}

interface ProfileChatResponse {
  success: boolean;
  response?: string;
  conversationComplete?: boolean;
  error?: string;
}

// Phrases that indicate the AI has gathered sufficient information (Requirements 10.2)
const COMPLETION_INDICATORS = [
  'I have a good understanding',
  'I now have enough information',
  'Thank you for sharing',
  'I have all the information I need',
  'That gives me a complete picture',
  'I understand your background well',
  'This is very helpful information',
];

const SYSTEM_PROMPT = `You are a friendly onboarding assistant for Lowkeygenius, an AI-powered learning platform. Your goal is to gather comprehensive information about the user's educational background, professional experience, learning interests, and preferences.

Guidelines:
1. Be warm, conversational, and encouraging
2. Ask follow-up questions to get specific details
3. Cover these key areas:
   - Educational background (degrees, certifications, courses taken)
   - Professional experience (current role, years of experience, industry)
   - Technical skills and expertise areas
   - Learning interests and goals
   - Preferred learning style (visual, hands-on, reading, etc.)

4. When you feel you have gathered enough information about all key areas, naturally conclude the conversation by:
   - Summarizing what you've learned
   - Using one of these phrases: "I have a good understanding of your background" or "I now have enough information to personalize your learning experience"

5. Keep responses concise but friendly (2-4 sentences typically)
6. Don't ask more than one question at a time
7. Acknowledge and build upon what the user shares

Remember: The information will be used to personalize course recommendations and content, so focus on learning-relevant details.`;

function checkConversationComplete(response: string): boolean {
  const lowerResponse = response.toLowerCase();
  return COMPLETION_INDICATORS.some(indicator => 
    lowerResponse.includes(indicator.toLowerCase())
  );
}

/**
 * Validate conversation history array
 * Requirements: 3.1, 3.2
 */
function validateConversationHistory(
  history: unknown
): { valid: boolean; error?: string; sanitizedHistory?: ConversationMessage[] } {
  if (!Array.isArray(history)) {
    return { valid: false, error: 'conversationHistory must be an array' };
  }

  if (history.length > MAX_CONVERSATION_HISTORY_LENGTH) {
    return { valid: false, error: `conversationHistory exceeds maximum length of ${MAX_CONVERSATION_HISTORY_LENGTH}` };
  }

  const sanitizedHistory: ConversationMessage[] = [];

  for (let i = 0; i < history.length; i++) {
    const msg = history[i];
    
    if (!msg || typeof msg !== 'object') {
      return { valid: false, error: `conversationHistory[${i}] must be an object` };
    }

    const typedMsg = msg as Record<string, unknown>;

    if (typedMsg.role !== 'user' && typedMsg.role !== 'assistant') {
      return { valid: false, error: `conversationHistory[${i}].role must be 'user' or 'assistant'` };
    }

    const contentValidation = validateStringInput(
      typedMsg.content,
      `conversationHistory[${i}].content`,
      MAX_HISTORY_MESSAGE_LENGTH
    );
    if (!contentValidation.valid) {
      return { valid: false, error: contentValidation.error };
    }

    // Sanitize user messages for prompt injection (Requirements 3.4)
    const sanitizedContent = typedMsg.role === 'user' 
      ? sanitizeForPrompt(typedMsg.content as string)
      : typedMsg.content as string;

    sanitizedHistory.push({
      role: typedMsg.role,
      content: sanitizedContent,
      timestamp: typeof typedMsg.timestamp === 'string' ? typedMsg.timestamp : undefined,
    });
  }

  return { valid: true, sanitizedHistory };
}

interface GeminiContent {
  role: string;
  parts: Array<{ text: string }>;
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
    const rateLimitResult = await checkRateLimit(supabase, authResult.user.id, 'profile-chat');
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);
    }

    // Parse and validate request body
    let requestData: ProfileChatRequest;
    try {
      requestData = await req.json();
    } catch {
      return createValidationErrorResponse(corsHeaders, 'Invalid JSON in request body');
    }

    const { message, conversationHistory } = requestData;

    // Validate message input (Requirements 3.1, 3.2)
    const messageValidation = validateStringInput(message, 'message', MAX_MESSAGE_LENGTH);
    if (!messageValidation.valid) {
      return createValidationErrorResponse(corsHeaders, messageValidation.error || 'Invalid message');
    }

    // Validate conversation history (Requirements 3.1, 3.2)
    const historyValidation = validateConversationHistory(conversationHistory || []);
    if (!historyValidation.valid) {
      return createValidationErrorResponse(corsHeaders, historyValidation.error || 'Invalid conversation history');
    }

    // Sanitize user message for prompt injection (Requirements 3.4)
    const sanitizedMessage = sanitizeForPrompt(message);

    // Build conversation contents for Gemini
    const contents: GeminiContent[] = [];

    // Add sanitized conversation history
    for (const msg of historyValidation.sanitizedHistory || []) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    // Add current sanitized user message
    contents.push({
      role: 'user',
      parts: [{ text: sanitizedMessage }],
    });

    // Use gemini-2.5-flash model as per Requirements 10.1
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      let errorMessage = 'AI service error';

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.code === 429) {
          return createRateLimitResponse(60, corsHeaders);
        } else if (errorData.error?.message) {
          // Don't expose internal API error details (Requirements 7.2)
          console.error('Gemini API error:', errorData.error.message);
          errorMessage = 'AI service temporarily unavailable';
        }
      } catch {
        console.error('Gemini API error:', errorText.substring(0, 200));
      }

      return createErrorResponse(errorMessage, 503, corsHeaders, 'SERVICE_UNAVAILABLE');
    }

    const geminiData = await geminiResponse.json();

    if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      return createErrorResponse(
        'Failed to generate response',
        500,
        corsHeaders,
        'INTERNAL_ERROR'
      );
    }

    const responseText = geminiData.candidates[0].content.parts[0].text.trim();

    // Check if conversation is complete (Requirements 10.2)
    const conversationComplete = checkConversationComplete(responseText);

    const successResponse: ProfileChatResponse = {
      success: true,
      response: responseText,
      conversationComplete,
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
    // Log error internally but don't expose details (Requirements 7.2)
    console.error('Error in profile-chat:', error);

    // Use createSafeErrorResponse to ensure no stack traces or internal paths are exposed
    return createSafeErrorResponse(error, 500, corsHeaders, 'INTERNAL_ERROR', 'An error occurred processing your request');
  }
});
