import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    const requestData: LessonRequest = await req.json();
    const { lessonId, moduleTitle, lessonTitle, objectives, courseContext, materials } = requestData;

    const materialsContext = materials && materials.length > 0
      ? `\n\nRelevant course materials:\n${materials.map(m => `- ${m.title}${m.content ? '\n  ' + m.content.substring(0, 500) + '...' : ''}`).join('\n\n')}`
      : '';

    const prompt = `You are an expert instructor creating a comprehensive lesson. Create detailed lesson content for:

Course: ${courseContext.topic}
Level: ${courseContext.level}
Module: ${moduleTitle}
Lesson: ${lessonTitle}

Learning Objectives:
${objectives.map(obj => `- ${obj}`).join('\n')}${materialsContext}

Create a complete lesson in GitHub-flavored Markdown format with:
1. An engaging introduction
2. Clear explanations with examples
3. Code snippets or diagrams where appropriate (use markdown code blocks)
4. Practical exercises or questions
5. Key takeaways summary
6. Further reading suggestions

Use proper markdown formatting:
- # for main title
- ## for major sections
- ### for subsections
- **bold** for emphasis
- \`code\` for inline code
- \`\`\`language for code blocks
- > for callouts/notes
- - for bullet lists
- 1. for numbered lists

Make it engaging, practical, and appropriate for ${courseContext.level} level learners.`;

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

    const markdown = geminiData.candidates[0].content.parts[0].text;

    const { error: updateError } = await supabase
      .from('lessons')
      .update({
        markdown_content: markdown,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lessonId);

    if (updateError) {
      throw new Error(`Failed to save lesson: ${updateError.message}`);
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
  } catch (error: any) {
    console.error('Error generating lesson:', error);

    const errorMessage = error?.message || 'Failed to generate lesson content';
    const statusCode = errorMessage.includes('Rate limit') ? 429 : 500;

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error?.stack?.substring(0, 500)
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
