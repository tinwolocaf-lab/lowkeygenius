/**
 * Profile Chat Edge Function
 * Handles conversational onboarding using Gemini chat API (gemini-2.5-flash model)
 * 
 * Requirements: 10.1, 10.2
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

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

const SYSTEM_PROMPT = `You are a friendly onboarding assistant for Progent, an AI-powered learning platform. Your goal is to gather comprehensive information about the user's educational background, professional experience, learning interests, and preferences.

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

interface GeminiContent {
  role: string;
  parts: Array<{ text: string }>;
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

    const requestData: ProfileChatRequest = await req.json();
    const { message, conversationHistory } = requestData;

    if (!message || typeof message !== 'string') {
      throw new Error('No message provided');
    }

    // Build conversation contents for Gemini
    const contents: GeminiContent[] = [];

    // Add conversation history
    for (const msg of conversationHistory) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
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
      let errorMessage = 'Gemini API error';

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.code === 429) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
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
      throw new Error('Failed to generate response');
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
    console.error('Error in profile-chat:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to process chat message';
    
    let statusCode = 500;
    if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
      statusCode = 429;
    } else if (errorMessage.includes('unavailable') || errorMessage.includes('503')) {
      statusCode = 503;
    }

    const errorResponse: ProfileChatResponse = {
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
