import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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
      throw new Error('GEMINI_API_KEY not configured');
    }

    // 2.1: Validate user authentication token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const requestData: GenerateDefinitionRequest = await req.json();
    const { lessonId, term, surroundingContext, courseContext } = requestData;

    // Validate required fields
    if (!lessonId || !term || !courseContext) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: lessonId, term, and courseContext are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2.1: Verify user has access to the lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, course_id')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return new Response(
        JSON.stringify({ error: 'Lesson not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user has access to the course (owner or published)
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, owner_id, status')
      .eq('id', lesson.course_id)
      .single();

    if (courseError || !course) {
      return new Response(
        JSON.stringify({ error: 'Course not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // User must be owner or course must be published
    if (course.owner_id !== user.id && course.status !== 'published') {
      return new Response(
        JSON.stringify({ error: 'Access denied to this lesson' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2.2: Construct prompt with term, context, and course information
    const prompt = `You are an expert educator creating a concise definition for a term within a learning context.

Course Topic: ${courseContext.topic}
Course Level: ${courseContext.level}
Lesson: ${courseContext.lessonTitle}

Term to define: "${term}"

Context where the term appears:
"${surroundingContext || 'No additional context provided'}"

Provide a clear, concise definition of "${term}" that:
1. Is appropriate for a ${courseContext.level} level learner
2. Relates to the context of ${courseContext.topic}
3. Is 1-3 sentences long
4. Uses simple language while being accurate

Respond with ONLY the definition text, no additional formatting or explanation.`;

    // 2.2: Call Gemini API with educational context prompt
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
      let errorMessage = 'AI service error';

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

    // 2.2: Parse and validate AI response
    const geminiData = await geminiResponse.json();

    if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from AI service');
    }

    const definition = geminiData.candidates[0].content.parts[0].text.trim();

    // 2.3: Store InlineWiki_Entry with all required fields
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
      throw new Error(`Failed to save definition: ${insertError.message}`);
    }

    // 2.3: Return entry ID and definition to client
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

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate definition';
    const statusCode = errorMessage.includes('Rate limit') ? 429 : 500;

    return new Response(
      JSON.stringify({
        error: errorMessage,
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
