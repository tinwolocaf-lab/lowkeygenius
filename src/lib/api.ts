import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function generateCourseOutline(data: {
  topic: string;
  level: string;
  intensity: string;
  background: {
    degree?: string;
    experience?: string;
    languages?: string;
    interests?: string;
  };
  materials?: Array<{ title: string; summary?: string }>;
}) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-outline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate outline');
  }

  return response.json();
}

export async function generateLesson(data: {
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
  materials?: Array<{ title: string; content?: string }>;
}) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-lesson`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate lesson');
  }

  return response.json();
}
