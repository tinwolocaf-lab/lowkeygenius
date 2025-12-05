import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  validateAuth,
  getCorsHeaders,
  validateStringInput,
  validateUUID,
  checkRateLimit,
  createRateLimitResponse,
  createErrorResponse,
  createSafeErrorResponse,
  createUnauthorizedResponse,
  createValidationErrorResponse,
  MAX_STRING_LENGTH,
} from '../_shared/security.ts';

interface OutlineLesson {
  title: string;
  objectives: string[];
}

interface OutlineModule {
  title: string;
  description: string;
  lessons: OutlineLesson[];
}

interface Outline {
  modules: OutlineModule[];
  estimatedDurationHours?: number;
  estimatedLessonsCount?: number;
}

interface UpdateOutlineRequest {
  courseId: string;
  outline: Outline;
}

/**
 * Validate the outline structure
 * Requirements: 3.1, 3.2
 */
function validateOutline(outline: unknown): { valid: boolean; error?: string } {
  if (!outline || typeof outline !== 'object') {
    return { valid: false, error: 'outline is required and must be an object' };
  }

  const outlineObj = outline as Record<string, unknown>;

  // Validate modules array exists
  if (!outlineObj.modules || !Array.isArray(outlineObj.modules)) {
    return { valid: false, error: 'outline.modules must be an array' };
  }

  const modules = outlineObj.modules as unknown[];

  // Validate modules array is not empty
  if (modules.length === 0) {
    return { valid: false, error: 'outline.modules cannot be empty' };
  }

  // Validate each module
  for (let i = 0; i < modules.length; i++) {
    const module = modules[i] as Record<string, unknown>;

    if (!module || typeof module !== 'object') {
      return { valid: false, error: `outline.modules[${i}] must be an object` };
    }

    // Validate module title
    const titleValidation = validateStringInput(module.title, `outline.modules[${i}].title`, MAX_STRING_LENGTH, true);
    if (!titleValidation.valid) {
      return { valid: false, error: titleValidation.error };
    }

    // Validate module description
    const descValidation = validateStringInput(module.description, `outline.modules[${i}].description`, MAX_STRING_LENGTH, true);
    if (!descValidation.valid) {
      return { valid: false, error: descValidation.error };
    }

    // Validate lessons array
    if (!module.lessons || !Array.isArray(module.lessons)) {
      return { valid: false, error: `outline.modules[${i}].lessons must be an array` };
    }

    const lessons = module.lessons as unknown[];

    // Validate each lesson
    for (let j = 0; j < lessons.length; j++) {
      const lesson = lessons[j] as Record<string, unknown>;

      if (!lesson || typeof lesson !== 'object') {
        return { valid: false, error: `outline.modules[${i}].lessons[${j}] must be an object` };
      }

      // Validate lesson title
      const lessonTitleValidation = validateStringInput(
        lesson.title,
        `outline.modules[${i}].lessons[${j}].title`,
        MAX_STRING_LENGTH,
        true
      );
      if (!lessonTitleValidation.valid) {
        return { valid: false, error: lessonTitleValidation.error };
      }

      // Validate objectives array
      if (!lesson.objectives || !Array.isArray(lesson.objectives)) {
        return { valid: false, error: `outline.modules[${i}].lessons[${j}].objectives must be an array` };
      }

      const objectives = lesson.objectives as unknown[];
      for (let k = 0; k < objectives.length; k++) {
        const objValidation = validateStringInput(
          objectives[k],
          `outline.modules[${i}].lessons[${j}].objectives[${k}]`,
          MAX_STRING_LENGTH,
          true
        );
        if (!objValidation.valid) {
          return { valid: false, error: objValidation.error };
        }
      }
    }
  }

  // Validate optional fields if present
  if (outlineObj.estimatedDurationHours !== undefined) {
    if (typeof outlineObj.estimatedDurationHours !== 'number' || outlineObj.estimatedDurationHours < 0) {
      return { valid: false, error: 'outline.estimatedDurationHours must be a non-negative number' };
    }
  }

  if (outlineObj.estimatedLessonsCount !== undefined) {
    if (typeof outlineObj.estimatedLessonsCount !== 'number' || outlineObj.estimatedLessonsCount < 0) {
      return { valid: false, error: 'outline.estimatedLessonsCount must be a non-negative number' };
    }
  }

  return { valid: true };
}

Deno.serve(async (req: Request) => {
  // Get CORS headers based on request origin (Requirements 2.1, 2.2, 2.3)
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin, 'POST, PUT, OPTIONS');

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
    // Validate authentication (Requirements 1.1, 1.2, 1.3)
    const authResult = await validateAuth(req, supabase);
    if (authResult.error || !authResult.user) {
      return createUnauthorizedResponse(corsHeaders, authResult.error || 'Unauthorized');
    }

    const user = authResult.user;

    // Check rate limit before processing (Requirements 4.1, 4.2)
    const rateLimitResult = await checkRateLimit(supabase, user.id, 'update-outline');
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);
    }

    // Parse and validate request body
    let requestData: UpdateOutlineRequest;
    try {
      requestData = await req.json();
    } catch {
      return createValidationErrorResponse(corsHeaders, 'Invalid JSON in request body');
    }

    const { courseId, outline } = requestData;

    // Validate courseId as UUID (Requirements 3.1)
    const courseIdValidation = validateUUID(courseId, 'courseId');
    if (!courseIdValidation.valid) {
      return createValidationErrorResponse(corsHeaders, courseIdValidation.error || 'Invalid courseId');
    }

    // Validate outline structure (Requirements 3.1, 3.2)
    const outlineValidation = validateOutline(outline);
    if (!outlineValidation.valid) {
      return createValidationErrorResponse(corsHeaders, outlineValidation.error || 'Invalid outline structure');
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

    // Calculate total lessons count
    const totalLessons = outline.modules.reduce(
      (sum, module) => sum + module.lessons.length,
      0
    );

    const updatedOutline: Outline = {
      ...outline,
      estimatedLessonsCount: totalLessons,
      estimatedDurationHours: outline.estimatedDurationHours || Math.ceil(totalLessons * 0.5),
    };

    // Update the course outline
    const { error: updateError } = await supabase
      .from('courses')
      .update({
        outline_json: updatedOutline,
        estimated_duration_hours: updatedOutline.estimatedDurationHours,
        updated_at: new Date().toISOString(),
      })
      .eq('id', courseId);

    if (updateError) {
      // Log full error for debugging (server-side only)
      console.error('Failed to update outline:', updateError);
      throw new Error('Failed to update outline');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        outline: updatedOutline 
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
    console.error('Error updating outline:', error);

    // Use createSafeErrorResponse to ensure no stack traces or internal paths are exposed (Requirements 7.2)
    return createSafeErrorResponse(error, 500, corsHeaders, 'INTERNAL_ERROR', 'Failed to update outline');
  }
});
