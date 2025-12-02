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

    // Build comprehensive materials context for lesson generation
    let materialsContext = '';
    if (materials && materials.length > 0) {
      const materialsWithContent = materials.filter(m => m.content && m.content.length > 100);
      
      if (materialsWithContent.length > 0) {
        materialsContext = `\n\n=== USER-PROVIDED REFERENCE MATERIALS ===
IMPORTANT: Use the following materials as the PRIMARY source for this lesson's content.
Base your explanations, examples, and concepts on this material.

${materialsWithContent.map((m, i) => `--- Source ${i + 1}: ${m.title} ---
${m.content}
`).join('\n')}
=== END OF REFERENCE MATERIALS ===

Instructions for using materials:
- Structure the lesson content based on the information in these materials
- Use terminology, examples, and explanations from the provided materials
- Expand on the concepts found in the materials with additional context
- Ensure all key points from the materials relevant to this lesson are covered`;
      }
    }

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
        lesson_status: 'generated',
        original_content: markdown,
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
  } catch (error: unknown) {
    console.error('Error generating lesson:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate lesson content';
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
