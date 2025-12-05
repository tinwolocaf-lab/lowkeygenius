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
  MAX_STRING_LENGTH,
  MAX_TOPIC_LENGTH,
} from '../_shared/security.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

interface GenerateDefinitionRequest {
  lessonId: string;
  term: string;
  surroundingContext: string;
  courseContext: {
    topic: string;
    level: string;
    lessonTitle: string;
  };
}

interface GenerateDefinitionResponse {
  entryId: string;
  term: string;
  definition: string;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin, 'POST, OPTIONS');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Validate GEMINI_API_KEY is configured
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
    const rateLimitResult = await checkRateLimit(supabase, user.id, 'generate-definition');
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);
    }

    // Parse request body
    let requestData: GenerateDefinitionRequest;
    try {
      requestData = await req.json();
    } catch {
      return createValidationErrorResponse(corsHeaders, 'Invalid JSON in request body');
    }

    const { lessonId, term, surroundingContext, courseContext } = requestData;

    // Input validation (Requirements 3.1, 3.2)
    const lessonIdValidation = validateUUID(lessonId, 'lessonId');
    if (!lessonIdValidation.valid) {
      return createValidationErrorResponse(corsHeaders, lessonIdValidation.error || 'Invalid lessonId');
    }

    const termValidation = validateStringInput(term, 'term', MAX_TOPIC_LENGTH);
    if (!termValidation.valid) {
      return createValidationErrorResponse(corsHeaders, termValidation.error || 'Invalid term');
    }

    const contextValidation = validateStringInput(surroundingContext, 'surroundingContext', MAX_STRING_LENGTH, false);
    if (!contextValidation.valid) {
      return createValidationErrorResponse(corsHeaders, contextValidation.error || 'Invalid surroundingContext');
    }

    // Validate courseContext object
    if (!courseContext || typeof courseContext !== 'object') {
      return createValidationErrorResponse(corsHeaders, 'courseContext is required');
    }

    const topicValidation = validateStringInput(courseContext.topic, 'courseContext.topic', MAX_TOPIC_LENGTH);
    if (!topicValidation.valid) {
      return createValidationErrorResponse(corsHeaders, topicValidation.error || 'Invalid topic');
    }

    const levelValidation = validateStringInput(courseContext.level, 'courseContext.level', 50);
    if (!levelValidation.valid) {
      return createValidationErrorResponse(corsHeaders, levelValidation.error || 'Invalid level');
    }

    const lessonTitleValidation = validateStringInput(courseContext.lessonTitle, 'courseContext.lessonTitle', MAX_TOPIC_LENGTH);
    if (!lessonTitleValidation.valid) {
      return createValidationErrorResponse(corsHeaders, lessonTitleValidation.error || 'Invalid lessonTitle');
    }

    // Verify user has access to the lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, course_id')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return createErrorResponse('Lesson not found', 404, corsHeaders, 'NOT_FOUND');
    }

    // Check if user has access to the course (owner or published)
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, owner_id, status')
      .eq('id', lesson.course_id)
      .single();

    if (courseError || !course) {
      return createErrorResponse('Course not found', 404, corsHeaders, 'NOT_FOUND');
    }

    // User must be owner or course must be published (Requirements 1.4, 8.1)
    if (course.owner_id !== user.id && course.status !== 'published') {
      return createErrorResponse('Access denied to this lesson', 403, corsHeaders, 'FORBIDDEN');
    }

    // Sanitize inputs for AI prompt (Requirements 3.4)
    const sanitizedTerm = sanitizeForPrompt(term);
    const sanitizedContext = sanitizeForPrompt(surroundingContext || '');
    const sanitizedTopic = sanitizeForPrompt(courseContext.topic);
    const sanitizedLevel = sanitizeForPrompt(courseContext.level);
    const sanitizedLessonTitle = sanitizeForPrompt(courseContext.lessonTitle);

    // Construct prompt with sanitized inputs
    const prompt = `You are an expert educator creating a concise definition for a term within a learning context.

Course Topic: ${sanitizedTopic}
Course Level: ${sanitizedLevel}
Lesson: ${sanitizedLessonTitle}

Term to define: "${sanitizedTerm}"

Context where the term appears:
"${sanitizedContext || 'No additional context provided'}"

Provide a clear, concise definition of "${sanitizedTerm}" that:
1. Is appropriate for a ${sanitizedLevel} level learner
2. Relates to the context of ${sanitizedTopic}
3. Is 1-3 sentences long
4. Uses simple language while being accurate

Respond with ONLY the definition text, no additional formatting or explanation.`;

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
            temperature: 0.3,
            maxOutputTokens: 256,
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

    // Parse and validate AI response
    const geminiData = await geminiResponse.json();

    if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      return createErrorResponse('Invalid response from AI service', 500, corsHeaders, 'INTERNAL_ERROR');
    }

    const definition = geminiData.candidates[0].content.parts[0].text.trim();

    // Store InlineWiki_Entry with all required fields
    const { data: entry, error: insertError } = await supabase
      .from('inline_wiki_entries')
      .insert({
        lesson_id: lessonId,
        user_id: user.id,
        term: term,
        definition: definition,
      })
      .select('id, term, definition')
      .single();

    if (insertError) {
      console.error('Failed to save definition:', insertError);
      return createErrorResponse('Failed to save definition', 500, corsHeaders, 'INTERNAL_ERROR');
    }

    // Return entry ID and definition to client
    const response: GenerateDefinitionResponse = {
      entryId: entry.id,
      term: entry.term,
      definition: entry.definition,
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Error generating definition:', error);

    // Use createSafeErrorResponse to ensure no stack traces or internal paths are exposed (Requirements 7.2)
    return createSafeErrorResponse(error, 500, corsHeaders, 'INTERNAL_ERROR', 'Failed to generate definition');
  }
});
