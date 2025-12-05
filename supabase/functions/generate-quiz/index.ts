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
  MAX_CONTENT_LENGTH,
  MAX_TOPIC_LENGTH,
} from '../_shared/security.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

interface GenerateQuizRequest {
  lessonId: string;
  lessonContent: string;
  lessonTitle: string;
  courseLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

type QuestionType = 'multiple_choice' | 'true_false';

interface GeneratedQuestion {
  questionText: string;
  questionType: QuestionType;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface GeminiQuizResponse {
  questions: GeneratedQuestion[];
}

const VALID_COURSE_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;

/**
 * Validates the structure of a single quiz question
 * Requirements: 7.5 - Each question has exactly one correct answer
 */
function isValidQuestion(question: unknown): question is GeneratedQuestion {
  if (typeof question !== 'object' || question === null) return false;
  const obj = question as Record<string, unknown>;

  // Validate questionText
  if (typeof obj.questionText !== 'string' || obj.questionText.trim().length === 0) {
    return false;
  }

  // Validate questionType
  if (obj.questionType !== 'multiple_choice' && obj.questionType !== 'true_false') {
    return false;
  }

  // Validate options array
  if (!Array.isArray(obj.options) || obj.options.length === 0) {
    return false;
  }

  // For true/false, must have exactly 2 options
  if (obj.questionType === 'true_false' && obj.options.length !== 2) {
    return false;
  }

  // For multiple choice, must have at least 2 options (typically 4)
  if (obj.questionType === 'multiple_choice' && obj.options.length < 2) {
    return false;
  }

  // All options must be non-empty strings
  if (!obj.options.every((opt: unknown) => typeof opt === 'string' && opt.trim().length > 0)) {
    return false;
  }

  // Validate correctIndex is within bounds
  if (
    typeof obj.correctIndex !== 'number' ||
    obj.correctIndex < 0 ||
    obj.correctIndex >= obj.options.length
  ) {
    return false;
  }

  // Validate explanation
  if (typeof obj.explanation !== 'string' || obj.explanation.trim().length === 0) {
    return false;
  }

  return true;
}

/**
 * Validates the AI response structure and question count bounds (5-10)
 * Requirements: 7.3 - Create between 5 and 10 questions per lesson
 * Requirements: 7.4 - Include a mix of multiple choice and true/false
 */
function validateQuizResponse(data: unknown): GeminiQuizResponse {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid response format: expected object');
  }

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.questions)) {
    throw new Error('Invalid response format: questions must be an array');
  }

  const questions = obj.questions.filter(isValidQuestion);

  if (questions.length < 5) {
    throw new Error(`Invalid question count: got ${questions.length}, minimum is 5`);
  }

  if (questions.length > 10) {
    // Truncate to 10 if AI generated more
    questions.length = 10;
  }

  // Ensure diversity: at least one of each type if we have more than 2 questions
  // Requirements: 7.4
  if (questions.length > 2) {
    const hasMultipleChoice = questions.some(q => q.questionType === 'multiple_choice');
    const hasTrueFalse = questions.some(q => q.questionType === 'true_false');

    if (!hasMultipleChoice || !hasTrueFalse) {
      console.warn('Quiz lacks question type diversity, but proceeding with available questions');
    }
  }

  return { questions };
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
    const rateLimitResult = await checkRateLimit(supabase, user.id, 'generate-quiz');
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);
    }

    // Parse request body
    let requestData: GenerateQuizRequest;
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
    const prompt = buildQuizPrompt(sanitizedTitle, sanitizedContent, courseLevel);

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
            maxOutputTokens: 8192,
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
    let parsedResponse: GeminiQuizResponse;
    try {
      const jsonData = extractJsonFromResponse(responseText);
      parsedResponse = validateQuizResponse(jsonData);
    } catch (error) {
      console.error('Failed to parse AI response:', error, responseText);
      return createErrorResponse('Failed to parse quiz data', 500, corsHeaders, 'INTERNAL_ERROR');
    }


    // Delete existing quiz and questions for this lesson (for regeneration support)
    // First, find existing quiz
    const { data: existingQuiz } = await supabase
      .from('quizzes')
      .select('id')
      .eq('lesson_id', lessonId)
      .single();

    if (existingQuiz) {
      // Delete quiz questions first (cascade should handle this, but being explicit)
      await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', existingQuiz.id);

      // Delete the quiz
      await supabase
        .from('quizzes')
        .delete()
        .eq('id', existingQuiz.id);
    }

    // Create new quiz
    const { data: insertedQuiz, error: quizInsertError } = await supabase
      .from('quizzes')
      .insert({
        lesson_id: lessonId,
        title: `Quiz: ${lessonTitle}`,
        question_count: parsedResponse.questions.length,
      })
      .select()
      .single();

    if (quizInsertError || !insertedQuiz) {
      console.error('Failed to save quiz:', quizInsertError);
      return createErrorResponse('Failed to save quiz', 500, corsHeaders, 'INTERNAL_ERROR');
    }

    // Insert quiz questions
    const questionsToInsert = parsedResponse.questions.map((question, index) => ({
      quiz_id: insertedQuiz.id,
      question_text: question.questionText.trim(),
      question_type: question.questionType,
      options: question.options.map(opt => opt.trim()),
      correct_index: question.correctIndex,
      explanation: question.explanation.trim(),
      order_index: index,
    }));

    const { data: insertedQuestions, error: questionsInsertError } = await supabase
      .from('quiz_questions')
      .insert(questionsToInsert)
      .select();

    if (questionsInsertError) {
      // Rollback: delete the quiz if questions failed to insert
      await supabase.from('quizzes').delete().eq('id', insertedQuiz.id);
      console.error('Failed to save quiz questions:', questionsInsertError);
      return createErrorResponse('Failed to save quiz questions', 500, corsHeaders, 'INTERNAL_ERROR');
    }

    return new Response(
      JSON.stringify({
        quiz: insertedQuiz,
        questions: insertedQuestions,
        questionCount: insertedQuestions?.length || 0,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Error generating quiz:', error);

    // Return safe error response (Requirements 7.2)
    return createErrorResponse('Failed to generate quiz', 500, corsHeaders, 'INTERNAL_ERROR');
  }
});


/**
 * Builds the prompt for quiz generation based on lesson content and course level
 * Requirements: 7.3 (5-10 questions), 7.4 (mix of types), 7.5 (one correct answer), 7.6 (match difficulty)
 */
function buildQuizPrompt(
  lessonTitle: string,
  lessonContent: string,
  courseLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
): string {
  const levelGuidance = {
    beginner: 'Create straightforward questions testing basic understanding. Use clear language and avoid trick questions. Focus on fundamental concepts.',
    intermediate: 'Include questions that test both recall and application. Mix straightforward and moderately challenging questions.',
    advanced: 'Create questions that test deeper understanding, analysis, and application. Include some questions requiring synthesis of concepts.',
    expert: 'Design challenging questions that test nuanced understanding, edge cases, and expert-level knowledge. Include questions requiring critical analysis.',
  };

  return `You are an expert educator creating a quiz to test comprehension of lesson material.

Create quiz questions based on the following lesson content:

**Lesson Title:** ${lessonTitle}

**Lesson Content:**
${lessonContent}

**Course Level:** ${courseLevel}
${levelGuidance[courseLevel]}

**Instructions:**
1. Create between 5 and 10 questions based on the content
2. Include a MIX of question types:
   - "multiple_choice": Questions with 4 answer options (A, B, C, D)
   - "true_false": True/False statements with exactly 2 options ["True", "False"]
3. Aim for approximately 60-70% multiple choice and 30-40% true/false questions
4. Each question MUST have:
   - "questionText": Clear, unambiguous question or statement
   - "questionType": Either "multiple_choice" or "true_false"
   - "options": Array of answer choices (4 for multiple choice, 2 for true/false)
   - "correctIndex": Index (0-based) of the correct answer in the options array
   - "explanation": Brief explanation of why the correct answer is right
5. For multiple choice: Create plausible distractors (wrong answers that seem reasonable)
6. Ensure questions cover the most important concepts from the lesson
7. Make the difficulty appropriate for ${courseLevel} level learners

**Response Format:**
Return ONLY a valid JSON object with this exact structure:
\`\`\`json
{
  "questions": [
    {
      "questionText": "What is the primary purpose of X?",
      "questionType": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Option A is correct because..."
    },
    {
      "questionText": "X is always greater than Y.",
      "questionType": "true_false",
      "options": ["True", "False"],
      "correctIndex": 1,
      "explanation": "This is false because..."
    }
  ]
}
\`\`\`

Generate the quiz questions now:`;
}
