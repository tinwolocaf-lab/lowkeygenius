# Progent React Native - Gemini AI & Murf AI Integration Guide

## Table of Contents
1. [Environment Setup](#1-environment-setup)
2. [Supabase Edge Functions Overview](#2-supabase-edge-functions-overview)
3. [API Utility Functions for React Native](#3-api-utility-functions-for-react-native)
4. [Gemini AI Integration (Course Generation)](#4-gemini-ai-integration-course-generation)
5. [Murf AI Integration (Audio Generation)](#5-murf-ai-integration-audio-generation)
6. [Complete Screen Implementations](#6-complete-screen-implementations)
7. [Error Handling & Rate Limiting](#7-error-handling--rate-limiting)
8. [Testing Guide](#8-testing-guide)

---

## 1. Environment Setup

### 1.1 Update .env File

Add Gemini and Murf API key variables to your `.env` file:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# AI Services (Note: These are used by Supabase Edge Functions, not directly by the app)
# You will configure these in your Supabase project settings
GEMINI_API_KEY=
MURF_API_KEY=
```

**Important Notes:**
- The mobile app does NOT call Gemini or Murf APIs directly
- All AI API calls go through Supabase Edge Functions
- This keeps your API keys secure on the server
- You only need Supabase credentials in the mobile app

### 1.2 Configure Supabase Edge Functions

In your Supabase project dashboard, set the environment variables for Edge Functions:

1. Go to **Settings** → **Edge Functions** → **Secrets**
2. Add the following secrets:
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `MURF_API_KEY`: Your Murf AI API key
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key

### 1.3 Verify Edge Functions are Deployed

Your project should have these Edge Functions already deployed:
- `generate-outline` - Creates course outline using Gemini
- `generate-lesson` - Creates lesson content using Gemini
- `regenerate-lesson` - Regenerates specific lessons
- `update-outline` - Updates course outline
- `generate-audio` - Generates audio for a lesson using Murf
- `generate-course-audio` - Generates audio for entire course

You can verify by running:
```bash
supabase functions list
```

---

## 2. Supabase Edge Functions Overview

### 2.1 How Edge Functions Work

**Architecture:**
```
Mobile App → Supabase Edge Function → AI API (Gemini/Murf) → Response → Mobile App
```

**Benefits:**
- API keys stay secure on server
- Rate limiting handled server-side
- Error handling centralized
- Can modify AI logic without app updates

### 2.2 Edge Function Endpoints

All Edge Functions are accessed via:
```
{SUPABASE_URL}/functions/v1/{function-name}
```

**Authentication:** All requests require Bearer token (user's session access token)

### 2.3 Generate Outline Function

**Endpoint:** `POST /functions/v1/generate-outline`

**Purpose:** Creates a course outline using Gemini AI

**Request Body:**
```typescript
{
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
```

**Response:**
```typescript
{
  modules: Array<{
    title: string;
    description: string;
    lessons: Array<{
      title: string;
      objectives: string[];
    }>;
  }>;
  estimatedDurationHours: number;
  estimatedLessonsCount: number;
}
```

**AI Model Used:** `gemini-2.5-flash-lite`

**Generation Config:**
- Temperature: 0.7
- Max Output Tokens: 4096

### 2.4 Generate Lesson Function

**Endpoint:** `POST /functions/v1/generate-lesson`

**Purpose:** Creates lesson content in Markdown using Gemini AI

**Request Body:**
```typescript
{
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
```

**Response:**
```typescript
{
  markdown: string;  // Full lesson content in Markdown
  lessonId: string;
}
```

**AI Model Used:** `gemini-2.5-flash-lite`

**Generation Config:**
- Temperature: 0.8
- Max Output Tokens: 8192

**Automatic Actions:**
- Saves markdown to `lessons.markdown_content`
- Updates `lessons.lesson_status` to 'generated'
- Stores original content in `lessons.original_content`

### 2.5 Generate Audio Function

**Endpoint:** `POST /functions/v1/generate-audio`

**Purpose:** Converts lesson text to audio using Murf AI

**Request Body:**
```typescript
{
  lessonId: string;
  voiceType: 'male' | 'female';
}
```

**Response:**
```typescript
{
  success: boolean;
  audioUrl: string;    // Public URL to MP3 file
  duration: number;    // Duration in seconds
  voiceType: string;
}
```

**Voice Configurations:**

**Female Voice:**
- Voice ID: `en-US-natalie`
- Style: `Narration`
- Locale: `en-US`

**Male Voice:**
- Voice ID: `en-US-cooper`
- Style: `Narration`
- Locale: `en-US`

**Murf API Settings:**
- Format: MP3
- Sample Rate: 44100 Hz
- Quality: High

**Automatic Actions:**
- Downloads audio from Murf
- Uploads to Supabase Storage (`lesson-audio` bucket)
- Updates `lessons.audio_url` with public URL
- Updates `lessons.audio_duration_seconds`
- Updates `lessons.audio_status` to 'ready'
- Marks free trial as used if applicable

**Access Control:**
- Checks user's plan and audio addon status
- PRO_MAX plan: Always has access
- Audio addon enabled: Has access if not expired
- FREE plan: One free trial, then requires addon

---

## 3. API Utility Functions for React Native

### 3.1 Create API Helper File

**File:** `src/lib/api.ts`

```typescript
import { supabase } from './supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

/**
 * Base function for calling Supabase Edge Functions
 */
async function callEdgeFunction<TRequest, TResponse>(
  functionName: string,
  data: TRequest
): Promise<TResponse> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated. Please sign in.');
  }

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/${functionName}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    // Try to extract error message from response
    let errorMessage = `Failed to call ${functionName}`;

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
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

/**
 * GEMINI AI FUNCTIONS
 */

interface GenerateOutlineRequest {
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

interface CourseOutline {
  modules: Array<{
    title: string;
    description: string;
    lessons: Array<{
      title: string;
      objectives: string[];
    }>;
  }>;
  estimatedDurationHours: number;
  estimatedLessonsCount: number;
}

export async function generateCourseOutline(
  data: GenerateOutlineRequest
): Promise<CourseOutline> {
  return callEdgeFunction<GenerateOutlineRequest, CourseOutline>(
    'generate-outline',
    data
  );
}

interface GenerateLessonRequest {
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

interface GenerateLessonResponse {
  markdown: string;
  lessonId: string;
}

export async function generateLesson(
  data: GenerateLessonRequest
): Promise<GenerateLessonResponse> {
  return callEdgeFunction<GenerateLessonRequest, GenerateLessonResponse>(
    'generate-lesson',
    data
  );
}

interface RegenerateLessonRequest {
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

export async function regenerateLesson(
  data: RegenerateLessonRequest
): Promise<GenerateLessonResponse> {
  return callEdgeFunction<RegenerateLessonRequest, GenerateLessonResponse>(
    'regenerate-lesson',
    data
  );
}

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

interface UpdateOutlineResponse {
  success: boolean;
  courseId: string;
}

export async function updateCourseOutline(
  data: UpdateOutlineRequest
): Promise<UpdateOutlineResponse> {
  return callEdgeFunction<UpdateOutlineRequest, UpdateOutlineResponse>(
    'update-outline',
    data
  );
}

/**
 * MURF AI FUNCTIONS
 */

interface GenerateAudioRequest {
  lessonId: string;
  voiceType: 'male' | 'female';
}

interface GenerateAudioResponse {
  success: boolean;
  audioUrl: string;
  duration: number;
  voiceType: string;
}

export async function generateLessonAudio(
  data: GenerateAudioRequest
): Promise<GenerateAudioResponse> {
  return callEdgeFunction<GenerateAudioRequest, GenerateAudioResponse>(
    'generate-audio',
    data
  );
}

interface GenerateCourseAudioRequest {
  courseId: string;
  voiceType: 'male' | 'female';
}

interface GenerateCourseAudioResponse {
  success: boolean;
  completedLessons: number;
  totalLessons: number;
  failedLessons: string[];
}

export async function generateCourseAudio(
  data: GenerateCourseAudioRequest
): Promise<GenerateCourseAudioResponse> {
  return callEdgeFunction<GenerateCourseAudioRequest, GenerateCourseAudioResponse>(
    'generate-course-audio',
    data
  );
}
```

---

## 4. Gemini AI Integration (Course Generation)

### 4.1 Onboarding Screen - Generate Course Outline

**File:** `src/screens/OnboardingScreen.tsx`

**Implementation:**

```typescript
import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { generateCourseOutline } from '../lib/api';
import { Button } from '../components/Button';
import { ChatMessage } from '../components/ChatMessage';

export function OnboardingScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  // State for onboarding data
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>('beginner');
  const [intensity, setIntensity] = useState<'short' | 'standard' | 'deep'>('standard');
  const [background, setBackground] = useState({
    degree: '',
    experience: '',
    interests: '',
  });
  const [materials, setMaterials] = useState<Array<{ title: string; summary?: string }>>([]);

  // State for generation
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateCourse = async () => {
    if (!topic) {
      setError('Please enter a topic');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      // Step 1: Create course record in database
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .insert({
          owner_id: user!.id,
          title: `${topic} - ${level.charAt(0).toUpperCase() + level.slice(1)} Course`,
          description: `A ${intensity} ${level} course on ${topic}`,
          topic,
          level,
          intensity,
          status: 'draft_outline',
        })
        .select()
        .single();

      if (courseError) throw courseError;

      // Step 2: Generate outline using Gemini AI
      const outline = await generateCourseOutline({
        topic,
        level,
        intensity,
        background,
        materials,
      });

      // Step 3: Update course with generated outline
      const { error: updateError } = await supabase
        .from('courses')
        .update({
          outline_json: outline,
          estimated_duration_hours: outline.estimatedDurationHours,
          status: 'ready',
        })
        .eq('id', courseData.id);

      if (updateError) throw updateError;

      // Step 4: Navigate to course outline screen
      navigation.navigate('CourseOutline', { courseId: courseData.id });
    } catch (err: any) {
      console.error('Error generating course:', err);
      setError(err.message || 'Failed to generate course. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Chat messages and input */}
        {/* ... your existing chat UI ... */}

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Generate Button */}
        <Button
          variant="primary"
          size="lg"
          onPress={handleGenerateCourse}
          disabled={generating || !topic}
          fullWidth
        >
          {generating ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.loadingText}>Generating course outline...</Text>
            </View>
          ) : (
            'Generate My Course'
          )}
        </Button>
      </ScrollView>
    </View>
  );
}
```

### 4.2 Generate Lessons Screen

**File:** `src/screens/GenerateLessonsScreen.tsx`

**Implementation:**

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { generateLesson } from '../lib/api';

interface Lesson {
  id: string;
  title: string;
  module_index: number;
  lesson_index: number;
  objectives: string[];
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

export function GenerateLessonsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { courseId } = route.params as { courseId: string };

  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  // Fetch course and create lesson records
  useEffect(() => {
    loadCourseAndCreateLessons();
  }, [courseId]);

  const loadCourseAndCreateLessons = async () => {
    try {
      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Create lesson records from outline
      const outline = courseData.outline_json;
      const lessonRecords: any[] = [];

      outline.modules.forEach((module: any, moduleIndex: number) => {
        module.lessons.forEach((lesson: any, lessonIndex: number) => {
          lessonRecords.push({
            course_id: courseId,
            module_index: moduleIndex,
            lesson_index: lessonIndex,
            title: lesson.title,
            objectives: lesson.objectives,
            markdown_content: null,
            audio_status: 'none',
          });
        });
      });

      // Insert all lesson records
      const { data: insertedLessons, error: insertError } = await supabase
        .from('lessons')
        .insert(lessonRecords)
        .select();

      if (insertError) throw insertError;

      // Set lessons state
      const lessonsWithStatus = insertedLessons.map((lesson) => ({
        ...lesson,
        status: 'pending' as const,
      }));
      setLessons(lessonsWithStatus);

      // Update course status
      await supabase
        .from('courses')
        .update({ status: 'generating_lessons' })
        .eq('id', courseId);

      // Start generating lessons
      startLessonGeneration(lessonsWithStatus, outline);
    } catch (err: any) {
      console.error('Error loading course:', err);
      setError(err.message);
    }
  };

  const startLessonGeneration = async (lessonsToGenerate: Lesson[], outline: any) => {
    for (let i = 0; i < lessonsToGenerate.length; i++) {
      const lesson = lessonsToGenerate[i];

      // Update UI to show current lesson being generated
      setCurrentLessonIndex(i);
      setProgress((i / lessonsToGenerate.length) * 100);

      // Update lesson status to generating
      setLessons((prev) =>
        prev.map((l) => (l.id === lesson.id ? { ...l, status: 'generating' } : l))
      );

      try {
        // Get module info
        const module = outline.modules[lesson.module_index];

        // Generate lesson content using Gemini
        await generateLesson({
          courseId,
          lessonId: lesson.id,
          moduleTitle: module.title,
          lessonTitle: lesson.title,
          objectives: lesson.objectives,
          courseContext: {
            topic: course.topic,
            level: course.level,
            background: course.background,
          },
          materials: [], // Add materials if available
        });

        // Update lesson status to completed
        setLessons((prev) =>
          prev.map((l) => (l.id === lesson.id ? { ...l, status: 'completed' } : l))
        );
      } catch (err: any) {
        console.error(`Error generating lesson ${lesson.id}:`, err);

        // Update lesson status to failed
        setLessons((prev) =>
          prev.map((l) => (l.id === lesson.id ? { ...l, status: 'failed' } : l))
        );

        // Handle rate limit errors with retry
        if (err.message.includes('Rate limit')) {
          setError('AI service is busy. Retrying in 5 seconds...');
          await new Promise((resolve) => setTimeout(resolve, 5000));
          // Retry this lesson
          i--;
          continue;
        }
      }

      // Small delay between lessons to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // All lessons generated
    setProgress(100);

    // Update course status
    await supabase
      .from('courses')
      .update({ status: 'ready' })
      .eq('id', courseId);

    // Navigate to preview screen
    setTimeout(() => {
      navigation.navigate('LessonPreview', { courseId });
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Progress Circle */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          <Text style={styles.progressSubtext}>
            Generating {currentLessonIndex + 1} of {lessons.length} lessons
          </Text>
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Lessons List */}
        <View style={styles.lessonsList}>
          {lessons.map((lesson, index) => (
            <View key={lesson.id} style={styles.lessonItem}>
              <View style={styles.lessonStatus}>
                {lesson.status === 'pending' && (
                  <View style={[styles.statusDot, styles.statusPending]} />
                )}
                {lesson.status === 'generating' && (
                  <ActivityIndicator size="small" color="#FFC800" />
                )}
                {lesson.status === 'completed' && (
                  <View style={[styles.statusDot, styles.statusCompleted]} />
                )}
                {lesson.status === 'failed' && (
                  <View style={[styles.statusDot, styles.statusFailed]} />
                )}
              </View>
              <View style={styles.lessonInfo}>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <Text style={styles.lessonStatus}>
                  {lesson.status === 'pending' && 'Waiting...'}
                  {lesson.status === 'generating' && 'Generating...'}
                  {lesson.status === 'completed' && 'Completed'}
                  {lesson.status === 'failed' && 'Failed'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
```

---

## 5. Murf AI Integration (Audio Generation)

### 5.1 Generate Audio Screen

**File:** `src/screens/GenerateAudioScreen.tsx`

**Implementation:**

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { generateLessonAudio } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Speaker, Check, X } from '../components/icons';

interface Lesson {
  id: string;
  title: string;
  markdown_content: string | null;
  audio_url: string | null;
  audio_status: 'none' | 'generating' | 'ready' | 'failed';
  audio_duration_seconds: number | null;
}

export function GenerateAudioScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user, profile } = useAuth();
  const { courseId } = route.params as { courseId: string };

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [voiceType, setVoiceType] = useState<'male' | 'female'>('female');
  const [generating, setGenerating] = useState(false);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(-1);
  const [hasAudioAccess, setHasAudioAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAudioAccess();
    loadLessons();
  }, [courseId]);

  const checkAudioAccess = () => {
    // Check if user has audio addon or PRO_MAX plan
    const hasAccess =
      profile?.plan_type === 'PRO_MAX' ||
      profile?.audio_addon_enabled === true;

    setHasAudioAccess(hasAccess);
  };

  const loadLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('module_index')
        .order('lesson_index');

      if (error) throw error;
      setLessons(data || []);
    } catch (err: any) {
      console.error('Error loading lessons:', err);
      Alert.alert('Error', 'Failed to load lessons');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!hasAudioAccess) {
      // Show upgrade modal
      Alert.alert(
        'Audio Add-on Required',
        'Audio generation requires the Audio Add-on ($10/mo with 7-day free trial) or PRO MAX plan.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: () => navigation.navigate('Pricing'),
          },
        ]
      );
      return;
    }

    setGenerating(true);

    // Generate audio for all lessons sequentially
    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];

      // Skip lessons that don't have content or already have audio
      if (!lesson.markdown_content || lesson.audio_url) {
        continue;
      }

      setCurrentLessonIndex(i);

      // Update UI to show generating
      setLessons((prev) =>
        prev.map((l) =>
          l.id === lesson.id ? { ...l, audio_status: 'generating' } : l
        )
      );

      try {
        // Call Murf AI via Edge Function
        const result = await generateLessonAudio({
          lessonId: lesson.id,
          voiceType,
        });

        // Update UI to show success
        setLessons((prev) =>
          prev.map((l) =>
            l.id === lesson.id
              ? {
                  ...l,
                  audio_url: result.audioUrl,
                  audio_status: 'ready',
                  audio_duration_seconds: result.duration,
                }
              : l
          )
        );
      } catch (err: any) {
        console.error(`Error generating audio for lesson ${lesson.id}:`, err);

        // Update UI to show failure
        setLessons((prev) =>
          prev.map((l) =>
            l.id === lesson.id ? { ...l, audio_status: 'failed' } : l
          )
        );

        // Show error message
        Alert.alert(
          'Generation Error',
          `Failed to generate audio for "${lesson.title}": ${err.message}`
        );
      }

      // Delay between requests to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    setGenerating(false);
    setCurrentLessonIndex(-1);

    // Show completion message
    Alert.alert(
      'Audio Generation Complete',
      'All lessons now have audio!',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6DAA" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Generate Audio</Text>
          <Text style={styles.subtitle}>
            Convert all lessons to audio with AI text-to-speech
          </Text>
        </View>

        {/* Voice Selection */}
        <Card style={styles.voiceCard}>
          <Text style={styles.sectionTitle}>Select Voice</Text>
          <View style={styles.voiceOptions}>
            <TouchableOpacity
              style={[
                styles.voiceOption,
                voiceType === 'female' && styles.voiceOptionSelected,
              ]}
              onPress={() => setVoiceType('female')}
            >
              <Text
                style={[
                  styles.voiceOptionText,
                  voiceType === 'female' && styles.voiceOptionTextSelected,
                ]}
              >
                Female Voice
              </Text>
              <Text style={styles.voiceSubtext}>Natalie - Narration</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.voiceOption,
                voiceType === 'male' && styles.voiceOptionSelected,
              ]}
              onPress={() => setVoiceType('male')}
            >
              <Text
                style={[
                  styles.voiceOptionText,
                  voiceType === 'male' && styles.voiceOptionTextSelected,
                ]}
              >
                Male Voice
              </Text>
              <Text style={styles.voiceSubtext}>Cooper - Narration</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Lessons List */}
        <View style={styles.lessonsList}>
          <Text style={styles.sectionTitle}>Lessons</Text>
          {lessons.map((lesson, index) => (
            <Card key={lesson.id} style={styles.lessonCard}>
              <View style={styles.lessonHeader}>
                <Text style={styles.lessonTitle} numberOfLines={1}>
                  {lesson.title}
                </Text>
                <View style={styles.lessonStatus}>
                  {lesson.audio_status === 'none' && (
                    <Speaker size={20} color="#777777" />
                  )}
                  {lesson.audio_status === 'generating' && (
                    <ActivityIndicator size="small" color="#FFC800" />
                  )}
                  {lesson.audio_status === 'ready' && (
                    <Check size={20} color="#58CC02" />
                  )}
                  {lesson.audio_status === 'failed' && (
                    <X size={20} color="#FF4B4B" />
                  )}
                </View>
              </View>

              {lesson.audio_duration_seconds && (
                <Text style={styles.duration}>
                  Duration: {Math.floor(lesson.audio_duration_seconds / 60)}:
                  {(lesson.audio_duration_seconds % 60)
                    .toString()
                    .padStart(2, '0')}
                </Text>
              )}

              {currentLessonIndex === index && (
                <View style={styles.generatingIndicator}>
                  <ActivityIndicator size="small" color="#FF6DAA" />
                  <Text style={styles.generatingText}>Generating audio...</Text>
                </View>
              )}
            </Card>
          ))}
        </View>

        {/* Generate Button */}
        <Button
          variant="primary"
          size="lg"
          onPress={handleGenerateAudio}
          disabled={generating}
          fullWidth
        >
          {generating ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.buttonText}>
                Generating {currentLessonIndex + 1} of {lessons.length}...
              </Text>
            </View>
          ) : (
            'Generate Audio for All Lessons'
          )}
        </Button>

        {!hasAudioAccess && (
          <View style={styles.upgradeNotice}>
            <Text style={styles.upgradeText}>
              Audio generation requires the Audio Add-on or PRO MAX plan
            </Text>
            <Button
              variant="secondary"
              size="md"
              onPress={() => navigation.navigate('Pricing')}
            >
              View Plans
            </Button>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
```

### 5.2 Course View with Audio Player

**File:** `src/screens/CourseViewScreen.tsx` (Audio Integration)

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import { Headphones, Play, Pause } from '../components/icons';

export function CourseViewScreen() {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<any>(null);

  // ... existing code ...

  const playAudio = async (audioUrl: string) => {
    try {
      // Unload previous sound if exists
      if (sound) {
        await sound.unloadAsync();
      }

      // Load and play new audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);

      // Set playback status update callback
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);

          // Auto-advance to next lesson when current audio finishes
          if (status.didJustFinish) {
            handleNextLesson();
          }
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const togglePlayPause = async () => {
    if (!sound) return;

    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  return (
    <View>
      {/* Lesson content */}
      {/* ... */}

      {/* Audio Player (if audio available) */}
      {currentLesson?.audio_url && (
        <View style={styles.audioPlayer}>
          <TouchableOpacity
            style={styles.audioButton}
            onPress={() =>
              isPlaying ? togglePlayPause() : playAudio(currentLesson.audio_url)
            }
          >
            {isPlaying ? (
              <Pause size={24} color="#FFFFFF" />
            ) : (
              <Play size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          <View style={styles.audioInfo}>
            <Text style={styles.audioTitle}>
              {isPlaying ? 'Playing' : 'Play'} Audio
            </Text>
            {currentLesson.audio_duration_seconds && (
              <Text style={styles.audioDuration}>
                {Math.floor(currentLesson.audio_duration_seconds / 60)}:
                {(currentLesson.audio_duration_seconds % 60)
                  .toString()
                  .padStart(2, '0')}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
```

---

## 6. Complete Screen Implementations

### 6.1 Key Integration Points

**Screens that use Gemini AI:**
1. **OnboardingScreen** - Generate course outline
2. **GenerateLessonsScreen** - Generate lesson content
3. **LessonPreviewScreen** - Regenerate specific lessons

**Screens that use Murf AI:**
1. **GenerateAudioScreen** - Generate audio for lessons
2. **CourseViewScreen** - Play generated audio
3. **CoursesListScreen** - Show audio status

### 6.2 State Management Pattern

All AI operations follow this pattern:

```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const [progress, setProgress] = useState(0);

const handleAIOperation = async () => {
  setLoading(true);
  setError('');

  try {
    const result = await someAIFunction(data);
    // Handle success
  } catch (err: any) {
    setError(err.message);
    // Handle error (retry logic, show message, etc.)
  } finally {
    setLoading(false);
  }
};
```

---

## 7. Error Handling & Rate Limiting

### 7.1 Common Errors

**Gemini API Errors:**
- 429: Rate limit exceeded
- 400: Invalid request (malformed prompt)
- 500: Server error
- 503: Service unavailable

**Murf API Errors:**
- 402: Character limit exhausted or expired subscription
- 403: Invalid API key
- 429: Rate limit (15 concurrent requests max for Pay As You Go)

### 7.2 Retry Logic Implementation

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry non-retryable errors
      if (
        !error.message.includes('Rate limit') &&
        !error.message.includes('503') &&
        !error.message.includes('500')
      ) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      const waitTime = delayMs * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}

// Usage:
const result = await retryWithBackoff(() =>
  generateLesson(lessonData)
);
```

### 7.3 Rate Limit Handling

**Best Practices:**

1. **Sequential Processing**: Generate lessons one at a time, not in parallel
2. **Delays Between Requests**: Add 1-2 second delays between API calls
3. **User Feedback**: Show clear progress indicators
4. **Graceful Degradation**: Allow users to retry failed generations

**Implementation:**

```typescript
// In GenerateLessonsScreen
for (let i = 0; i < lessons.length; i++) {
  try {
    await generateLesson(lessons[i]);

    // Delay before next request
    await new Promise(resolve => setTimeout(resolve, 1500));
  } catch (error: any) {
    if (error.message.includes('Rate limit')) {
      // Show message and wait longer
      setError('AI is busy. Waiting 10 seconds before retry...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Retry this lesson
      i--;
      continue;
    }

    // Handle other errors
    throw error;
  }
}
```

---

## 8. Testing Guide

### 8.1 Test Gemini Integration

**Test Course Outline Generation:**

```typescript
// Test data
const testData = {
  topic: 'React Hooks',
  level: 'intermediate',
  intensity: 'standard',
  background: {
    degree: 'Computer Science',
    experience: '2 years with React',
    interests: 'Frontend development',
  },
  materials: [],
};

// Run test
const outline = await generateCourseOutline(testData);

// Verify
console.log('Modules:', outline.modules.length);
console.log('Estimated lessons:', outline.estimatedLessonsCount);
```

**Expected Output:**
```json
{
  "modules": [
    {
      "title": "Introduction to React Hooks",
      "description": "...",
      "lessons": [
        {
          "title": "What are Hooks?",
          "objectives": ["Understand...", "Learn..."]
        }
      ]
    }
  ],
  "estimatedDurationHours": 8,
  "estimatedLessonsCount": 15
}
```

### 8.2 Test Murf Integration

**Test Audio Generation:**

```typescript
// Prerequisites: Lesson must have markdown_content
const testData = {
  lessonId: 'your-lesson-id',
  voiceType: 'female',
};

// Run test
const result = await generateLessonAudio(testData);

// Verify
console.log('Audio URL:', result.audioUrl);
console.log('Duration:', result.duration);
console.log('Can play:', result.audioUrl.startsWith('https://'));
```

**Expected Output:**
```json
{
  "success": true,
  "audioUrl": "https://xxx.supabase.co/storage/v1/object/public/lesson-audio/...",
  "duration": 245,
  "voiceType": "female"
}
```

### 8.3 Test Error Scenarios

**Test Rate Limiting:**

```typescript
// Generate multiple lessons rapidly to trigger rate limit
const results = await Promise.all(
  lessons.map(lesson => generateLesson(lesson))
);

// Expected: Some will fail with "Rate limit exceeded"
```

**Test Invalid Input:**

```typescript
// Missing required fields
try {
  await generateCourseOutline({ topic: '' });
} catch (error) {
  console.log('Error:', error.message);
  // Expected: "Please enter a topic" or validation error
}
```

**Test Unauthorized Access:**

```typescript
// User without audio addon
try {
  await generateLessonAudio({ lessonId: 'xxx', voiceType: 'female' });
} catch (error) {
  console.log('Error:', error.message);
  // Expected: "Audio add-on required" (403 error)
}
```

### 8.4 End-to-End Testing Checklist

- [ ] User can complete onboarding flow
- [ ] Course outline generates successfully
- [ ] Lessons generate sequentially without errors
- [ ] Rate limiting is handled gracefully
- [ ] Audio generation works for users with access
- [ ] Audio generation blocked for users without access
- [ ] Generated audio plays correctly
- [ ] Progress indicators show accurate status
- [ ] Errors display user-friendly messages
- [ ] Retry logic works for failed generations
- [ ] Database updates correctly after each step

---

## Summary

This guide provides complete implementation for:

✅ **Gemini AI Integration**
- Course outline generation
- Lesson content generation
- Markdown formatting
- Error handling

✅ **Murf AI Integration**
- Audio generation with voice selection
- Storage upload and public URLs
- Access control
- Playback integration

✅ **Production-Ready Features**
- Retry logic
- Rate limit handling
- Progress tracking
- Error recovery

All AI operations are handled through Supabase Edge Functions, keeping your API keys secure and allowing you to modify AI logic without app updates.

**Next Steps:**
1. Add your Gemini and Murf API keys to Supabase Edge Function secrets
2. Test each Edge Function independently
3. Integrate the API utility functions into your screens
4. Test the complete user flow
5. Monitor usage and adjust rate limiting as needed
