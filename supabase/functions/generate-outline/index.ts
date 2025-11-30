import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

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
  modules: Module[];
  estimatedDurationHours: number;
  estimatedLessonsCount: number;
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

    const requestData: OutlineRequest = await req.json();
    const { topic, level, intensity, background, materials } = requestData;

    const moduleCount = intensity === 'short' ? 3 : intensity === 'standard' ? 5 : 8;
    const lessonsPerModule = intensity === 'short' ? 2 : intensity === 'standard' ? 3 : 4;

    const materialsContext = materials && materials.length > 0
      ? `\n\nAvailable learning materials:\n${materials.map(m => `- ${m.title}${m.summary ? ': ' + m.summary : ''}`).join('\n')}`
      : '';

    const prompt = `You are an expert instructional designer. Create a detailed course outline for the following:

Topic: ${topic}
Level: ${level}
Intensity: ${intensity}
Learner Background:
- Education: ${background.degree || 'Not specified'}
- Experience: ${background.experience || 'Not specified'}
- Interests: ${background.interests || 'Not specified'}${materialsContext}

Create a course with approximately ${moduleCount} modules, each with ${lessonsPerModule} lessons.

IMPORTANT: Respond ONLY with valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
{
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

Make the course comprehensive, practical, and tailored to the learner's background and level.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
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
      throw new Error('Failed to parse course outline from AI response');
    }

    return new Response(
      JSON.stringify(outline),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Error generating outline:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate course outline';
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
