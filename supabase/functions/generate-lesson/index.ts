import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  validateAuth,
  getCorsHeaders,
  validateStringInput,
  validateUUID,
  sanitizeForPrompt,
  checkRateLimit,
  createRateLimitResponse,
  createErrorResponse,
  createSafeErrorResponse,
  createUnauthorizedResponse,
  createValidationErrorResponse,
  MAX_STRING_LENGTH,
  MAX_CONTENT_LENGTH,
} from '../_shared/security.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

interface LessonRequest {
  courseId: string;
  lessonId: string;
  moduleTitle: string;
  lessonTitle: string;
  objectives: string[];
  courseContext: {
    topic: string;
    level: string;
    background?: string;
  };
  materials?: Array<{
    title: string;
    content?: string;
  }>;
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
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

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
    const authResult = await validateAuth(req, supabase);
    if (authResult.error || !authResult.user) {
      return createUnauthorizedResponse(corsHeaders, authResult.error || 'Unauthorized');
    }

    const user = authResult.user;

    // Check rate limit before processing (Requirements 4.1, 4.2, 4.3)
    const rateLimitResult = await checkRateLimit(supabase, user.id, 'generate-lesson');
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);
    }

    // Parse and validate request body
    let requestData: LessonRequest;
    try {
      requestData = await req.json();
    } catch {
      return createValidationErrorResponse(corsHeaders, 'Invalid JSON in request body');
    }

    const { courseId, lessonId, moduleTitle, lessonTitle, objectives, courseContext, materials } = requestData;

    // Validate required fields (Requirements 3.1, 3.2)
    
    // Validate courseId as UUID
    const courseIdValidation = validateUUID(courseId, 'courseId');
    if (!courseIdValidation.valid) {
      return createValidationErrorResponse(corsHeaders, courseIdValidation.error || 'Invalid courseId');
    }

    // Validate lessonId as UUID
    const lessonIdValidation = validateUUID(lessonId, 'lessonId');
    if (!lessonIdValidation.valid) {
      return createValidationErrorResponse(corsHeaders, lessonIdValidation.error || 'Invalid lessonId');
    }

    // Validate moduleTitle
    const moduleTitleValidation = validateStringInput(moduleTitle, 'moduleTitle', MAX_STRING_LENGTH, true);
    if (!moduleTitleValidation.valid) {
      return createValidationErrorResponse(corsHeaders, moduleTitleValidation.error || 'Invalid moduleTitle');
    }

    // Validate lessonTitle
    const lessonTitleValidation = validateStringInput(lessonTitle, 'lessonTitle', MAX_STRING_LENGTH, true);
    if (!lessonTitleValidation.valid) {
      return createValidationErrorResponse(corsHeaders, lessonTitleValidation.error || 'Invalid lessonTitle');
    }

    // Validate objectives array
    if (!objectives || !Array.isArray(objectives)) {
      return createValidationErrorResponse(corsHeaders, 'objectives must be an array');
    }
    if (objectives.length === 0) {
      return createValidationErrorResponse(corsHeaders, 'objectives cannot be empty');
    }
    for (let i = 0; i < objectives.length; i++) {
      const objValidation = validateStringInput(objectives[i], `objectives[${i}]`, MAX_STRING_LENGTH, true);
      if (!objValidation.valid) {
        return createValidationErrorResponse(corsHeaders, objValidation.error || `Invalid objectives[${i}]`);
      }
    }

    // Validate courseContext
    if (!courseContext || typeof courseContext !== 'object') {
      return createValidationErrorResponse(corsHeaders, 'courseContext is required');
    }
    const topicValidation = validateStringInput(courseContext.topic, 'courseContext.topic', MAX_STRING_LENGTH, true);
    if (!topicValidation.valid) {
      return createValidationErrorResponse(corsHeaders, topicValidation.error || 'Invalid courseContext.topic');
    }
    const levelValidation = validateStringInput(courseContext.level, 'courseContext.level', 50, true);
    if (!levelValidation.valid) {
      return createValidationErrorResponse(corsHeaders, levelValidation.error || 'Invalid courseContext.level');
    }
    if (courseContext.background) {
      const backgroundValidation = validateStringInput(courseContext.background, 'courseContext.background', MAX_STRING_LENGTH, false);
      if (!backgroundValidation.valid) {
        return createValidationErrorResponse(corsHeaders, backgroundValidation.error || 'Invalid courseContext.background');
      }
    }

    // Validate materials if provided (Requirements 3.1, 3.2)
    if (materials && Array.isArray(materials)) {
      for (let i = 0; i < materials.length; i++) {
        const material = materials[i];
        if (material.title) {
          const titleValidation = validateStringInput(material.title, `materials[${i}].title`, MAX_STRING_LENGTH, false);
          if (!titleValidation.valid) {
            return createValidationErrorResponse(corsHeaders, titleValidation.error || `Invalid materials[${i}].title`);
          }
        }
        if (material.content) {
          const contentValidation = validateStringInput(material.content, `materials[${i}].content`, MAX_CONTENT_LENGTH, false);
          if (!contentValidation.valid) {
            return createValidationErrorResponse(corsHeaders, contentValidation.error || `Invalid materials[${i}].content`);
          }
        }
      }
    }

    // Verify course ownership (Requirements 1.4, 8.2)
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, owner_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return createErrorResponse('Course not found', 404, corsHeaders, 'NOT_FOUND');
    }

    if (course.owner_id !== user.id) {
      // Log unauthorized access attempt (Requirements 10.2)
      console.warn(`Unauthorized course access attempt: user=${user.id}, course=${courseId}, owner=${course.owner_id}`);
      return createErrorResponse('You do not have permission to modify this course', 403, corsHeaders, 'FORBIDDEN');
    }

    // Verify lesson belongs to the course
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, module_id')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return createErrorResponse('Lesson not found', 404, corsHeaders, 'NOT_FOUND');
    }

    // Verify module belongs to the course
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('id, course_id')
      .eq('id', lesson.module_id)
      .single();

    if (moduleError || !module || module.course_id !== courseId) {
      return createErrorResponse('Lesson does not belong to the specified course', 400, corsHeaders, 'VALIDATION_ERROR');
    }

    // Sanitize user-provided content for AI prompts (Requirements 3.4)
    const sanitizedModuleTitle = sanitizeForPrompt(moduleTitle);
    const sanitizedLessonTitle = sanitizeForPrompt(lessonTitle);
    const sanitizedObjectives = objectives.map(obj => sanitizeForPrompt(obj));
    const sanitizedCourseContext = {
      topic: sanitizeForPrompt(courseContext.topic),
      level: sanitizeForPrompt(courseContext.level),
      background: courseContext.background ? sanitizeForPrompt(courseContext.background) : undefined,
    };

    // Build comprehensive materials context for lesson generation (using sanitized values)
    let materialsContext = '';
    if (materials && materials.length > 0) {
      const materialsWithContent = materials.filter(m => m.content && m.content.length > 100);
      
      if (materialsWithContent.length > 0) {
        // Sanitize materials content for prompt injection protection (Requirements 3.4)
        const sanitizedMaterialsContent = materialsWithContent.map((m, i) => {
          const sanitizedTitle = sanitizeForPrompt(m.title);
          const sanitizedContent = sanitizeForPrompt(m.content || '');
          return `--- Source ${i + 1}: ${sanitizedTitle} ---\n${sanitizedContent}\n`;
        }).join('\n');

        materialsContext = `\n\n=== USER-PROVIDED REFERENCE MATERIALS ===
IMPORTANT: Use the following materials as the PRIMARY source for this lesson's content.
Base your explanations, examples, and concepts on this material.

${sanitizedMaterialsContent}
=== END OF REFERENCE MATERIALS ===

Instructions for using materials:
- Structure the lesson content based on the information in these materials
- Use terminology, examples, and explanations from the provided materials
- Expand on the concepts found in the materials with additional context
- Ensure all key points from the materials relevant to this lesson are covered`;
      }
    }

    const prompt = `You are an expert instructor creating a comprehensive lesson. Create detailed lesson content for:

Course: ${sanitizedCourseContext.topic}
Level: ${sanitizedCourseContext.level}
Module: ${sanitizedModuleTitle}
Lesson: ${sanitizedLessonTitle}

Learning Objectives:
${sanitizedObjectives.map(obj => `- ${obj}`).join('\n')}${materialsContext}

Create a complete lesson in GitHub-flavored Markdown format with:
1. An engaging introduction
2. Clear explanations with examples
3. Code snippets where appropriate (use markdown code blocks)
4. **IMPORTANT: Include 1-2 Mermaid diagrams** to visualize concepts, processes, or relationships. Use \`\`\`mermaid code blocks.
5. Practical exercises or questions
6. Key takeaways summary
7. Further reading suggestions

Use proper markdown formatting:
- # for main title
- ## for major sections
- ### for subsections
- **bold** for emphasis
- \`code\` for inline code
- \`\`\`language for code blocks
- \`\`\`mermaid for diagrams (flowcharts, sequence diagrams, class diagrams, etc.)
- > for callouts/notes
- - for bullet lists
- 1. for numbered lists

Mermaid diagram examples to include:
- Flowcharts for processes or decision trees
- Sequence diagrams for interactions
- Class diagrams for object relationships
- State diagrams for state machines
- Mind maps for concept relationships

Make it engaging, practical, and appropriate for ${sanitizedCourseContext.level} level learners.`;

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
      let errorMessage = 'AI service error';

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.code === 429) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (errorData.error?.message) {
          // Only take first line to avoid exposing internal details
          errorMessage = errorData.error.message.split('\n')[0];
        }
      } catch {
        // Don't expose raw error text
        errorMessage = 'AI service temporarily unavailable';
      }

      throw new Error(errorMessage);
    }

    const geminiData = await geminiResponse.json();

    if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from AI service');
    }

    const markdown = geminiData.candidates[0].content.parts[0].text;

    const { error: updateError } = await supabase
      .from('lessons')
      .update({
        markdown_content: markdown,
        lesson_status: 'generated',
        original_content: markdown,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lessonId);

    if (updateError) {
      console.error('Failed to save lesson:', updateError);
      throw new Error('Failed to save lesson content');
    }

    return new Response(
      JSON.stringify({ markdown, lessonId }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: unknown) {
    // Log full error for debugging (server-side only)
    console.error('Error generating lesson:', error);

    // Determine appropriate status code based on error type
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    
    if (errorMessage.includes('rate limit')) {
      statusCode = 429;
      errorCode = 'RATE_LIMITED';
    } else if (errorMessage.includes('invalid') || errorMessage.includes('required')) {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
    }

    // Use createSafeErrorResponse to ensure no stack traces or internal paths are exposed (Requirements 7.2)
    return createSafeErrorResponse(error, statusCode, corsHeaders, errorCode, 'Failed to generate lesson content');
  }
});
