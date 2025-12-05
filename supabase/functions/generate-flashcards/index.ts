import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  validateAuth,
  getCorsHeaders,
  validateStringInput,
  validateUUID,
  sanitizeForPrompt,
  checkRateLimit,
  createRateLimitResponse,
  createUnauthorizedResponse,
  createValidationErrorResponse,
  createErrorResponse,
  createSafeErrorResponse,
  MAX_CONTENT_LENGTH,
  MAX_TOPIC_LENGTH,
} from '../_shared/security.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

interface GenerateFlashcardsRequest {
  lessonId: string;
  lessonContent: string;
  lessonTitle: string;
  courseLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

interface GeneratedFlashcard {
  front: string;
  back: string;
}

interface GeminiFlashcardsResponse {
  flashcards: GeneratedFlashcard[];
}

const VALID_COURSE_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;

/**
 * Validates the structure of a single flashcard
 */
function isValidFlashcard(card: unknown): card is GeneratedFlashcard {
  if (typeof card !== 'object' || card === null) return false;
  const obj = card as Record<string, unknown>;
  return (
    typeof obj.front === 'string' &&
    typeof obj.back === 'string' &&
    obj.front.trim().length > 0 &&
    obj.back.trim().length > 0
  );
}

/**
 * Validates the AI response structure and flashcard count bounds (5-15)
 */
function validateFlashcardsResponse(data: unknown): GeminiFlashcardsResponse {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid response format: expected object');
  }

  const obj = data as Record<string, unknown>;
  
  if (!Array.isArray(obj.flashcards)) {
    throw new Error('Invalid response format: flashcards must be an array');
  }

  const flashcards = obj.flashcards.filter(isValidFlashcard);

  if (flashcards.length < 5) {
    throw new Error(`Invalid flashcard count: got ${flashcards.length}, minimum is 5`);
  }

  if (flashcards.length > 15) {
    // Truncate to 15 if AI generated more
    flashcards.length = 15;
  }

  return { flashcards };
}

/**
 * Extracts JSON from AI response text, handling markdown code blocks
 */
function extractJsonFromResponse(text: string): unknown {
  // Try to extract JSON from markdown code block
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    return JSON.parse(jsonBlockMatch[1].trim());
  }

  // Try to parse the entire text as JSON
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }

  throw new Error('Could not extract JSON from AI response');
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return createErrorResponse('Service configuration error', 500, corsHeaders, 'INTERNAL_ERROR');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate authentication (Requirements 1.1, 1.2, 1.3)
    const authResult = await validateAuth(req, supabase);
    if (authResult.error || !authResult.user) {
      return createUnauthorizedResponse(corsHeaders, authResult.error || 'Unauthorized');
    }

    const user = authResult.user;

    // Check rate limit (Requirements 4.1, 4.2, 4.3)
    const rateLimitResult = await checkRateLimit(supabase, user.id, 'generate-flashcards');
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);
    }

    // Parse request body
    let requestData: GenerateFlashcardsRequest;
    try {
      requestData = await req.json();
    } catch {
      return createValidationErrorResponse(corsHeaders, 'Invalid JSON in request body');
    }

    const { lessonId, lessonContent, lessonTitle, courseLevel } = requestData;

    // Input validation (Requirements 3.1, 3.2)
    const lessonIdValidation = validateUUID(lessonId, 'lessonId');
    if (!lessonIdValidation.valid) {
      return createValidationErrorResponse(corsHeaders, lessonIdValidation.error || 'Invalid lessonId');
    }

    const contentValidation = validateStringInput(lessonContent, 'lessonContent', MAX_CONTENT_LENGTH);
    if (!contentValidation.valid) {
      return createValidationErrorResponse(corsHeaders, contentValidation.error || 'Invalid lessonContent');
    }

    const titleValidation = validateStringInput(lessonTitle, 'lessonTitle', MAX_TOPIC_LENGTH);
    if (!titleValidation.valid) {
      return createValidationErrorResponse(corsHeaders, titleValidation.error || 'Invalid lessonTitle');
    }

    // Validate courseLevel is one of the allowed values
    if (!courseLevel || !VALID_COURSE_LEVELS.includes(courseLevel)) {
      return createValidationErrorResponse(corsHeaders, 'courseLevel must be one of: beginner, intermediate, advanced, expert');
    }

    // Sanitize inputs for AI prompt (Requirements 3.4)
    const sanitizedContent = sanitizeForPrompt(lessonContent);
    const sanitizedTitle = sanitizeForPrompt(lessonTitle);

    // Build the prompt for Gemini AI
    const prompt = buildFlashcardPrompt(sanitizedTitle, sanitizedContent, courseLevel);

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.code === 429) {
          return createErrorResponse('AI service rate limit exceeded. Please try again later.', 429, corsHeaders, 'RATE_LIMITED');
        }
      } catch {
        // Ignore parse error
      }

      return createErrorResponse('AI service error', 500, corsHeaders, 'INTERNAL_ERROR');
    }

    const geminiData = await geminiResponse.json();

    if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      return createErrorResponse('Invalid response from AI service', 500, corsHeaders, 'INTERNAL_ERROR');
    }

    const responseText = geminiData.candidates[0].content.parts[0].text;

    // Parse and validate the response
    let parsedResponse: GeminiFlashcardsResponse;
    try {
      const jsonData = extractJsonFromResponse(responseText);
      parsedResponse = validateFlashcardsResponse(jsonData);
    } catch (error) {
      console.error('Failed to parse AI response:', error, responseText);
      return createErrorResponse('Failed to parse flashcard data', 500, corsHeaders, 'INTERNAL_ERROR');
    }

    // Delete existing flashcards for this lesson (for regeneration support)
    const { error: deleteError } = await supabase
      .from('flashcards')
      .delete()
      .eq('lesson_id', lessonId);

    if (deleteError) {
      console.error('Error deleting existing flashcards:', deleteError);
      // Continue anyway - might be first generation
    }

    // Insert new flashcards
    const flashcardsToInsert = parsedResponse.flashcards.map((card, index) => ({
      lesson_id: lessonId,
      front_text: card.front.trim(),
      back_text: card.back.trim(),
      order_index: index,
    }));

    const { data: insertedFlashcards, error: insertError } = await supabase
      .from('flashcards')
      .insert(flashcardsToInsert)
      .select();

    if (insertError) {
      console.error('Failed to save flashcards:', insertError);
      return createErrorResponse('Failed to save flashcards', 500, corsHeaders, 'INTERNAL_ERROR');
    }

    return new Response(
      JSON.stringify({
        flashcards: insertedFlashcards,
        count: insertedFlashcards.length,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Error generating flashcards:', error);

    // Use createSafeErrorResponse to ensure no stack traces or internal paths are exposed (Requirements 7.2)
    return createSafeErrorResponse(error, 500, corsHeaders, 'INTERNAL_ERROR', 'Failed to generate flashcards');
  }
});

/**
 * Builds the prompt for flashcard generation based on lesson content and course level
 * Requirements: 7.1 (5-15 cards), 7.2 (key terms/concepts), 7.6 (match difficulty)
 */
function buildFlashcardPrompt(
  lessonTitle: string,
  lessonContent: string,
  courseLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
): string {
  const levelGuidance = {
    beginner: 'Focus on fundamental concepts, basic definitions, and simple explanations. Use clear, accessible language.',
    intermediate: 'Include both foundational concepts and more nuanced details. Balance theory with practical applications.',
    advanced: 'Cover complex concepts, edge cases, and deeper technical details. Assume familiarity with basics.',
    expert: 'Focus on advanced techniques, subtle distinctions, and expert-level knowledge. Include nuanced details.',
  };

  return `You are an expert educator creating flashcards for effective memorization and learning.

Create flashcards based on the following lesson content:

**Lesson Title:** ${lessonTitle}

**Lesson Content:**
${lessonContent}

**Course Level:** ${courseLevel}
${levelGuidance[courseLevel]}

**Instructions:**
1. Create between 5 and 15 flashcards based on the content density
2. Extract key terms, concepts, definitions, and important facts
3. Each flashcard should have:
   - "front": A clear question, term, or prompt
   - "back": A concise but complete answer or definition
4. Ensure flashcards cover the most important concepts from the lesson
5. Make the difficulty appropriate for ${courseLevel} level learners
6. Avoid overly long answers - keep them memorable and focused

**Response Format:**
Return ONLY a valid JSON object with this exact structure:
\`\`\`json
{
  "flashcards": [
    {
      "front": "Question or term here",
      "back": "Answer or definition here"
    }
  ]
}
\`\`\`

Generate the flashcards now:`;
}
