import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface UpdateOutlineRequest {
  courseId: string;
  outline: {
    modules: Array<{
      title: string;
      description: string;
      lessons: Array<{
        title: string;
        objectives: string[];
      }>;
    }>;
    estimatedDurationHours?: number;
    estimatedLessonsCount?: number;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
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

    const requestData: UpdateOutlineRequest = await req.json();
    const { courseId, outline } = requestData;

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('owner_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      throw new Error('Course not found');
    }

    if (course.owner_id !== user.id) {
      throw new Error('Unauthorized');
    }

    const totalLessons = outline.modules.reduce(
      (sum, module) => sum + module.lessons.length,
      0
    );

    const updatedOutline = {
      ...outline,
      estimatedLessonsCount: totalLessons,
      estimatedDurationHours: outline.estimatedDurationHours || Math.ceil(totalLessons * 0.5),
    };

    const { error: updateError } = await supabase
      .from('courses')
      .update({
        outline_json: updatedOutline,
        estimated_duration_hours: updatedOutline.estimatedDurationHours,
        updated_at: new Date().toISOString(),
      })
      .eq('id', courseId);

    if (updateError) {
      throw new Error(`Failed to update outline: ${updateError.message}`);
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
    console.error('Error updating outline:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to update outline';
    const errorStack = error instanceof Error ? error.stack?.substring(0, 500) : undefined;

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorStack
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});