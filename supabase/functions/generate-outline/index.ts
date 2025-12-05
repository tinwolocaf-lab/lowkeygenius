import { createClient } from 'npm:@supabase/supabase-js@2';
import { validateUserQuota } from './quota-validation.ts';
import {
  validateAuth,
  getCorsHeaders,
  validateStringInput,
  sanitizeForPrompt,
  checkRateLimit,
  createRateLimitResponse,
  createErrorResponse,
  createSafeErrorResponse,
  createUnauthorizedResponse,
  createValidationErrorResponse,
  MAX_TOPIC_LENGTH,
  MAX_STRING_LENGTH,
  MAX_CONTENT_LENGTH,
} from '../_shared/security.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

interface ExtractedContext {
  education: string;
  experience: string;
  interests: string;
  expertise: string[];
  learningStyle?: string;
  preferences?: string[];
}

interface OutlineRequest {
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  intensity: 'short' | 'standard' | 'deep';
  background: {
    degree?: string;
    experience?: string;
    interests?: string;
  };
  materials?: Array<{
    title: string;
    summary?: string;
  }>;
  // Full materials content for storage (separate from summary for AI)
  materialsForStorage?: Array<{
    title: string;
    content?: string;
  }>;
  // Profile data passed from frontend when available
  profileContext?: ExtractedContext;
}

interface Module {
  title: string;
  description: string;
  lessons: Array<{
    title: string;
    objectives: string[];
  }>;
}

interface OutlineResponse {
  title: string;
  description: string;
  modules: Module[];
  estimatedDurationHours: number;
  estimatedLessonsCount: number;
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
    const rateLimitResult = await checkRateLimit(supabase, user.id, 'generate-outline');
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);
    }

    // Validate user quota before processing (Requirements 2.1, 2.2, 4.1)
    const quotaResult = await validateUserQuota(supabase, user.id);
    
    if (!quotaResult.allowed) {
      return new Response(
        JSON.stringify({
          error: quotaResult.error || 'Course limit reached. Please upgrade your plan.',
          coursesUsed: quotaResult.coursesUsed,
          limit: quotaResult.limit,
          planType: quotaResult.planType,
          inProgressCount: quotaResult.inProgressCount,
          activeGenerationId: quotaResult.activeGenerationId,
          reason: quotaResult.reason,
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Parse and validate request body
    let requestData: OutlineRequest;
    try {
      requestData = await req.json();
    } catch {
      return createValidationErrorResponse(corsHeaders, 'Invalid JSON in request body');
    }

    const { topic, level, intensity, background, materials, materialsForStorage, profileContext } = requestData;

    // Validate required fields (Requirements 3.1, 3.2)
    const topicValidation = validateStringInput(topic, 'topic', MAX_TOPIC_LENGTH, true);
    if (!topicValidation.valid) {
      return createValidationErrorResponse(corsHeaders, topicValidation.error || 'Invalid topic');
    }

    // Validate level enum
    const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
    if (!level || !validLevels.includes(level)) {
      return createValidationErrorResponse(corsHeaders, 'level must be one of: beginner, intermediate, advanced, expert');
    }

    // Validate intensity enum
    const validIntensities = ['short', 'standard', 'deep'];
    if (!intensity || !validIntensities.includes(intensity)) {
      return createValidationErrorResponse(corsHeaders, 'intensity must be one of: short, standard, deep');
    }

    // Validate background fields if provided (Requirements 3.1, 3.2)
    if (background) {
      if (background.degree) {
        const degreeValidation = validateStringInput(background.degree, 'background.degree', MAX_STRING_LENGTH, false);
        if (!degreeValidation.valid) {
          return createValidationErrorResponse(corsHeaders, degreeValidation.error || 'Invalid background.degree');
        }
      }
      if (background.experience) {
        const experienceValidation = validateStringInput(background.experience, 'background.experience', MAX_STRING_LENGTH, false);
        if (!experienceValidation.valid) {
          return createValidationErrorResponse(corsHeaders, experienceValidation.error || 'Invalid background.experience');
        }
      }
      if (background.interests) {
        const interestsValidation = validateStringInput(background.interests, 'background.interests', MAX_STRING_LENGTH, false);
        if (!interestsValidation.valid) {
          return createValidationErrorResponse(corsHeaders, interestsValidation.error || 'Invalid background.interests');
        }
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
        if (material.summary) {
          const summaryValidation = validateStringInput(material.summary, `materials[${i}].summary`, MAX_CONTENT_LENGTH, false);
          if (!summaryValidation.valid) {
            return createValidationErrorResponse(corsHeaders, summaryValidation.error || `Invalid materials[${i}].summary`);
          }
        }
      }
    }

    // Sanitize user-provided content for AI prompts (Requirements 3.4)
    const sanitizedTopic = sanitizeForPrompt(topic);
    const sanitizedBackground = {
      degree: background?.degree ? sanitizeForPrompt(background.degree) : undefined,
      experience: background?.experience ? sanitizeForPrompt(background.experience) : undefined,
      interests: background?.interests ? sanitizeForPrompt(background.interests) : undefined,
    };
    const sanitizedMaterials = materials?.map(m => ({
      title: m.title ? sanitizeForPrompt(m.title) : m.title,
      summary: m.summary ? sanitizeForPrompt(m.summary) : m.summary,
    }));

    // Create course record AFTER quota validation passes (Requirements 2.1, 2.2, 2.3)
    // This ensures no orphaned courses are created if quota check fails
    // Note: Store original topic for display, sanitized values are only used in AI prompts
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        owner_id: user.id,
        title: topic, // Will be updated with AI-generated title (original for display)
        description: `A ${level} level course on ${topic}`,
        topic: topic, // Store original topic
        level,
        intensity,
        status: 'draft_outline',
        materials_json: materialsForStorage && materialsForStorage.length > 0 ? materialsForStorage : null,
      })
      .select('id')
      .single();

    if (courseError || !course) {
      console.error('Failed to create course:', courseError);
      throw new Error('Failed to create course record');
    }

    const courseId = course.id;

    // Fetch user profile from database if not provided in request (Requirements 6.3)
    let userProfileContext: ExtractedContext | null = profileContext || null;
    
    if (!userProfileContext) {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('extracted_context')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profileData?.extracted_context) {
        userProfileContext = profileData.extracted_context as ExtractedContext;
      }
    }

    const moduleCount = intensity === 'short' ? 3 : intensity === 'standard' ? 5 : 8;
    const lessonsPerModule = intensity === 'short' ? 2 : intensity === 'standard' ? 3 : 4;

    // Build comprehensive materials context with full content (using sanitized values for AI prompt)
    let materialsContext = '';
    if (sanitizedMaterials && sanitizedMaterials.length > 0) {
      const materialsWithContent = sanitizedMaterials.filter(m => m.summary && m.summary.length > 50);
      const materialsWithoutContent = sanitizedMaterials.filter(m => !m.summary || m.summary.length <= 50);
      
      if (materialsWithContent.length > 0) {
        materialsContext = `\n\n=== USER-PROVIDED LEARNING MATERIALS ===
IMPORTANT: Use the following materials as the PRIMARY source for structuring the course content. 
The course outline should be based on and aligned with these materials.

${materialsWithContent.map((m, i) => `--- Material ${i + 1}: ${m.title} ---
${m.summary}
`).join('\n')}
=== END OF MATERIALS ===

Instructions for using materials:
- Structure the course modules and lessons to cover the topics from these materials
- Use the terminology and concepts from the provided materials
- Ensure the course progression follows the logical flow of the materials
- Include all key topics mentioned in the materials`;
      }
      
      if (materialsWithoutContent.length > 0) {
        materialsContext += `\n\nAdditional referenced materials (titles only):\n${materialsWithoutContent.map(m => `- ${m.title}`).join('\n')}`;
      }
    }

    // Build learner background section - prefer profile data over onboarding background
    // Uses sanitized values for AI prompt safety (Requirements 3.4)
    const buildLearnerBackground = (): string => {
      if (userProfileContext) {
        // Use profile data (Requirements 6.3) - sanitize profile context for prompt
        const sanitizedExpertise = userProfileContext.expertise?.map(e => sanitizeForPrompt(e)) || [];
        const expertiseStr = sanitizedExpertise.length > 0 
          ? sanitizedExpertise.join(', ') 
          : 'Not specified';
        const sanitizedPreferences = userProfileContext.preferences?.map(p => sanitizeForPrompt(p)) || [];
        const preferencesStr = sanitizedPreferences.length > 0
          ? sanitizedPreferences.join(', ')
          : '';
        
        let backgroundStr = `Learner Background (from profile):
- Education: ${sanitizeForPrompt(userProfileContext.education || '') || 'Not specified'}
- Experience: ${sanitizeForPrompt(userProfileContext.experience || '') || 'Not specified'}
- Interests: ${sanitizeForPrompt(userProfileContext.interests || '') || 'Not specified'}
- Expertise/Skills: ${expertiseStr}`;
        
        if (userProfileContext.learningStyle) {
          backgroundStr += `\n- Learning Style: ${sanitizeForPrompt(userProfileContext.learningStyle)}`;
        }
        if (preferencesStr) {
          backgroundStr += `\n- Preferences: ${preferencesStr}`;
        }
        
        return backgroundStr;
      }
      
      // Fallback to onboarding background data (using sanitized values)
      return `Learner Background:
- Education: ${sanitizedBackground.degree || 'Not specified'}
- Experience: ${sanitizedBackground.experience || 'Not specified'}
- Interests: ${sanitizedBackground.interests || 'Not specified'}`;
    };

    // Build prompt using sanitized user input (Requirements 3.4)
    const prompt = `You are an expert instructional designer. Create a detailed course outline for the following:

Topic: ${sanitizedTopic}
Level: ${level}
Intensity: ${intensity}
${buildLearnerBackground()}${materialsContext}

Create a course with approximately ${moduleCount} modules, each with ${lessonsPerModule} lessons.

IMPORTANT: Respond ONLY with valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
{
  "title": "A compelling, professional course title that captures the essence of the topic",
  "description": "A brief 1-2 sentence description of what the learner will achieve",
  "modules": [
    {
      "title": "Module title",
      "description": "Brief description",
      "lessons": [
        {
          "title": "Lesson title",
          "objectives": ["Learning objective 1", "Learning objective 2"]
        }
      ]
    }
  ],
  "estimatedDurationHours": 10,
  "estimatedLessonsCount": 15
}

Generate a creative, engaging course title that goes beyond just restating the topic. The title should be professional and appealing.

Make the course comprehensive, practical, and tailored to the learner's background and level.`;

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
      throw new Error('Invalid response from AI service');
    }

    const generatedText = geminiData.candidates[0].content.parts[0].text;

    let outline: OutlineResponse;
    try {
      const cleanedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      outline = JSON.parse(cleanedText);
    } catch {
      console.error('Failed to parse Gemini response:', generatedText);
      // Clean up the course record if outline parsing fails
      await supabase.from('courses').delete().eq('id', courseId);
      throw new Error('Failed to parse course outline from AI response');
    }

    // Update the course with the generated outline
    const { error: updateError } = await supabase
      .from('courses')
      .update({
        title: outline.title || topic,
        description: outline.description || `A ${level} level course on ${topic}`,
        outline_json: outline,
        estimated_duration_hours: outline.estimatedDurationHours,
        status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', courseId);

    if (updateError) {
      console.error('Failed to update course with outline:', updateError);
      // Don't delete the course here - it exists and can be retried
      throw new Error('Failed to save course outline');
    }

    return new Response(
      JSON.stringify({
        courseId,
        ...outline,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: unknown) {
    // Log full error for debugging (server-side only)
    console.error('Error generating outline:', error);

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
    return createSafeErrorResponse(error, statusCode, corsHeaders, errorCode, 'Failed to generate course outline');
  }
});
