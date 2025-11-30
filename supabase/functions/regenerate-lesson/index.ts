import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    const requestData: RegenerateRequest = await req.json();
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

    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*, course:courses!inner(owner_id)')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      throw new Error('Lesson not found');
    }

    if (lesson.course.owner_id !== user.id) {
      throw new Error('Unauthorized');
    }

    const existingContent = currentContent || lesson.markdown_content || '';
    const regenerationContext = sectionToRegenerate 
      ? `Focus on regenerating this specific section:\n${sectionToRegenerate}\n\nKeep the rest of the lesson intact.`
      : 'Regenerate the entire lesson with improvements.';

    const userInstructions = instructions 
      ? `\n\nUser's specific instructions for regeneration:\n${instructions}`
      : '';

    const prompt = `You are an expert instructor improving lesson content. ${regenerationContext}

Course: ${courseContext.topic}
Level: ${courseContext.level}
Module: ${moduleTitle}
Lesson: ${lessonTitle}

Learning Objectives:
${objectives.map(obj => `- ${obj}`).join('\n')}${userInstructions}

Current lesson content:
${existingContent}

${sectionToRegenerate 
  ? 'Regenerate only the specified section while maintaining consistency with the rest of the lesson. Return the improved section.'
  : 'Regenerate the entire lesson with the following improvements:\n- Make explanations clearer and more engaging\n- Add or improve examples\n- Ensure proper flow and structure\n- Maintain the appropriate difficulty level\n- Use proper markdown formatting'
}

Return the ${sectionToRegenerate ? 'improved section' : 'complete improved lesson'} in GitHub-flavored Markdown format.`;

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
      throw new Error(`Failed to save lesson: ${updateError.message}`);
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

    const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate lesson content';
    const errorStack = error instanceof Error ? error.stack?.substring(0, 500) : undefined;
    const statusCode = errorMessage.includes('Rate limit') ? 429 : 500;

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorStack
      }),
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