import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

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
    let errorMessage = 'Failed to generate outline';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch {
      const text = await response.text();
      errorMessage = text || `Server error (${response.status})`;
    }
    throw new Error(errorMessage);
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
    let errorMessage = 'Failed to generate lesson';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch {
      try {
        const text = await response.text();
        errorMessage = text || `Server error (${response.status})`;
      } catch {
        errorMessage = `Network error (${response.status})`;
      }
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function regenerateLesson(data: {
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
}) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/regenerate-lesson`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to regenerate lesson';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch {
      try {
        const text = await response.text();
        errorMessage = text || `Server error (${response.status})`;
      } catch {
        errorMessage = `Network error (${response.status})`;
      }
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function updateCourseOutline(data: {
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
}) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/update-outline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to update outline';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch {
      const text = await response.text();
      errorMessage = text || `Server error (${response.status})`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function generateLessonAudio(data: {
  lessonId: string;
  voiceType: 'male' | 'female';
}) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-audio`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to generate audio';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch {
      const text = await response.text();
      errorMessage = text || `Server error (${response.status})`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function generateCourseAudio(data: {
  courseId: string;
  voiceType: 'male' | 'female';
}) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-course-audio`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to generate course audio';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch {
      const text = await response.text();
      errorMessage = text || `Server error (${response.status})`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export interface GenerateDefinitionParams {
  lessonId: string;
  term: string;
  surroundingContext: string;
  courseContext: {
    topic: string;
    level: string;
    lessonTitle: string;
  };
}

export interface GenerateDefinitionResponse {
  entryId: string;
  term: string;
  definition: string;
}

export async function generateDefinition(
  data: GenerateDefinitionParams
): Promise<GenerateDefinitionResponse> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-definition`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to generate definition';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch {
      try {
        const text = await response.text();
        errorMessage = text || `Server error (${response.status})`;
      } catch {
        errorMessage = `Network error (${response.status})`;
      }
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
