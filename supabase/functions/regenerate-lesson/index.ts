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
  MAX_STRING_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_TOPIC_LENGTH,
} from '../_shared/security.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

interface RegenerateRequest {
  lessonId: string;
  instructions?: string;
  sectionToRegenerate?: string;
  courseContext: {
    topic: string;
    level: string;
  };
  moduleTitle: string;
  lessonTitle: string;
  objectives: string[];
  currentContent?: string;
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
    const rateLimitResult = await checkRateLimit(supabase, user.id, 'regenerate-lesson');
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);
    }

    // Parse request body
    let requestData: RegenerateRequest;
    try {
      requestData = await req.json();
    } catch {
      return createValidationErrorResponse(corsHeaders, 'Invalid JSON in request body');
    }

    const { 
      lessonId, 
      instructions, 
      sectionToRegenerate,
      courseContext, 
      moduleTitle, 
      lessonTitle, 
      objectives,
      currentContent 
    } = requestData;

    // Input validation (Requirements 3.1, 3.2)
    const lessonIdValidation = validateUUID(lessonId, 'lessonId');
    if (!lessonIdValidation.valid) {
      return createValidationErrorResponse(corsHeaders, lessonIdValidation.error || 'Invalid lessonId');
    }

    // Validate optional instructions
    if (instructions !== undefined) {
      const instructionsValidation = validateStringInput(instructions, 'instructions', MAX_STRING_LENGTH, false);
      if (!instructionsValidation.valid) {
        return createValidationErrorResponse(corsHeaders, instructionsValidation.error || 'Invalid instructions');
      }
    }

    // Validate optional sectionToRegenerate
    if (sectionToRegenerate !== undefined) {
      const sectionValidation = validateStringInput(sectionToRegenerate, 'sectionToRegenerate', MAX_CONTENT_LENGTH, false);
      if (!sectionValidation.valid) {
        return createValidationErrorResponse(corsHeaders, sectionValidation.error || 'Invalid sectionToRegenerate');
      }
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

    // Validate moduleTitle
    const moduleTitleValidation = validateStringInput(moduleTitle, 'moduleTitle', MAX_TOPIC_LENGTH);
    if (!moduleTitleValidation.valid) {
      return createValidationErrorResponse(corsHeaders, moduleTitleValidation.error || 'Invalid moduleTitle');
    }

    // Validate lessonTitle
    const lessonTitleValidation = validateStringInput(lessonTitle, 'lessonTitle', MAX_TOPIC_LENGTH);
    if (!lessonTitleValidation.valid) {
      return createValidationErrorResponse(corsHeaders, lessonTitleValidation.error || 'Invalid lessonTitle');
    }

    // Validate objectives array
    if (!Array.isArray(objectives)) {
      return createValidationErrorResponse(corsHeaders, 'objectives must be an array');
    }

    for (let i = 0; i < objectives.length; i++) {
      const objValidation = validateStringInput(objectives[i], `objectives[${i}]`, MAX_STRING_LENGTH);
      if (!objValidation.valid) {
        return createValidationErrorResponse(corsHeaders, objValidation.error || `Invalid objective at index ${i}`);
      }
    }

    // Validate optional currentContent
    if (currentContent !== undefined) {
      const contentValidation = validateStringInput(currentContent, 'currentContent', MAX_CONTENT_LENGTH, false);
      if (!contentValidation.valid) {
        return createValidationErrorResponse(corsHeaders, contentValidation.error || 'Invalid currentContent');
      }
    }

    // Verify lesson exists and user owns the course (Requirements 1.4, 8.2)
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*, course:courses!inner(owner_id)')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return createErrorResponse('Lesson not found', 404, corsHeaders, 'NOT_FOUND');
    }

    // Verify course ownership (Requirements 1.4, 8.2)
    if (lesson.course.owner_id !== user.id) {
      return createErrorResponse('Access denied', 403, corsHeaders, 'FORBIDDEN');
    }

    // Sanitize inputs for AI prompt (Requirements 3.4)
    const sanitizedInstructions = instructions ? sanitizeForPrompt(instructions) : '';
    const sanitizedSection = sectionToRegenerate ? sanitizeForPrompt(sectionToRegenerate) : '';
    const sanitizedTopic = sanitizeForPrompt(courseContext.topic);
    const sanitizedLevel = sanitizeForPrompt(courseContext.level);
    const sanitizedModuleTitle = sanitizeForPrompt(moduleTitle);
    const sanitizedLessonTitle = sanitizeForPrompt(lessonTitle);
    const sanitizedObjectives = objectives.map(obj => sanitizeForPrompt(obj));

    const existingContent = currentContent || lesson.markdown_content || '';
    const sanitizedExistingContent = sanitizeForPrompt(existingContent);

    const regenerationContext = sanitizedSection 
      ? `Focus on regenerating this specific section:\n${sanitizedSection}\n\nKeep the rest of the lesson intact.`
      : 'Regenerate the entire lesson with improvements.';

    const userInstructions = sanitizedInstructions 
      ? `\n\nUser's specific instructions for regeneration:\n${sanitizedInstructions}`
      : '';

    const prompt = `You are an expert instructor improving lesson content. ${regenerationContext}

Course: ${sanitizedTopic}
Level: ${sanitizedLevel}
Module: ${sanitizedModuleTitle}
Lesson: ${sanitizedLessonTitle}

Learning Objectives:
${sanitizedObjectives.map(obj => `- ${obj}`).join('\n')}${userInstructions}

Current lesson content:
${sanitizedExistingContent}

${sanitizedSection 
  ? 'Regenerate only the specified section while maintaining consistency with the rest of the lesson. Return the improved section.'
  : 'Regenerate the entire lesson with the following improvements:\n- Make explanations clearer and more engaging\n- Add or improve examples\n- Ensure proper flow and structure\n- Maintain the appropriate difficulty level\n- Use proper markdown formatting'
}

Return the ${sanitizedSection ? 'improved section' : 'complete improved lesson'} in GitHub-flavored Markdown format.`;

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
            temperature: 0.8,
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

    const regeneratedContent = geminiData.candidates[0].content.parts[0].text;

    const editEntry = {
      timestamp: new Date().toISOString(),
      type: sectionToRegenerate ? 'section_regeneration' : 'full_regeneration',
      instructions: instructions || null,
      previousContent: existingContent.substring(0, 1000),
    };

    const currentHistory = lesson.edit_history || [];
    const updatedHistory = [...currentHistory, editEntry];

    const { error: updateError } = await supabase
      .from('lessons')
      .update({
        markdown_content: sectionToRegenerate ? existingContent : regeneratedContent,
        regeneration_count: (lesson.regeneration_count || 0) + 1,
        custom_instructions: instructions || lesson.custom_instructions,
        edit_history: updatedHistory,
        lesson_status: 'edited',
        original_content: lesson.original_content || existingContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lessonId);

    if (updateError) {
      console.error('Failed to save lesson:', updateError);
      return createErrorResponse('Failed to save lesson', 500, corsHeaders, 'INTERNAL_ERROR');
    }

    return new Response(
      JSON.stringify({ 
        content: regeneratedContent,
        lessonId,
        regenerationCount: (lesson.regeneration_count || 0) + 1
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Error regenerating lesson:', error);

    // Return safe error response (Requirements 7.2)
    return createErrorResponse('Failed to regenerate lesson content', 500, corsHeaders, 'INTERNAL_ERROR');
  }
});
