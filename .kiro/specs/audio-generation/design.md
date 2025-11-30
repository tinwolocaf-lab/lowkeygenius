# Audio Generation Feature - Design Document

## Overview

This design document outlines the implementation of the audio generation feature for LearnSelfAI. The feature enables users to convert course lessons into audio format using Murf AI's text-to-speech API, with an integrated audio player for playback. The system integrates with the existing subscription model, requiring either a PRO_MAX plan or a separate audio add-on subscription ($10/month) for full access.

## Architecture

The audio generation feature follows the existing application architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  GenerateAudio Page  │  CourseView  │  CourseAudioPlayer        │
│  - Voice selection   │  - Audio btn │  - Playback controls      │
│  - Progress display  │  - Player    │  - Sleep timer            │
│  - Status tracking   │    toggle    │  - Auto-next              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Edge Functions                       │
├─────────────────────────────────────────────────────────────────┤
│  generate-audio      │  generate-course-audio                    │
│  - Single lesson     │  - Bulk generation                        │
│  - Access control    │  - Job tracking                           │
│  - Murf API call     │  - Progress updates                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
├─────────────────────────────────────────────────────────────────┤
│  Murf AI API         │  Supabase Storage    │  PolarSH           │
│  - TTS generation    │  - Audio files       │  - Subscriptions   │
│  - Voice selection   │  - Public URLs       │  - Add-on billing  │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Frontend Components

#### 1. GenerateAudio Page (`src/pages/GenerateAudio.tsx`)

A dedicated page for initiating and monitoring audio generation for a course.

```typescript
interface GenerateAudioPageProps {
  courseId: string;
}

interface AudioGenerationState {
  status: 'idle' | 'generating' | 'completed' | 'error';
  voiceType: 'male' | 'female';
  progress: {
    completed: number;
    total: number;
    currentLesson: string;
  };
  lessons: LessonAudioStatus[];
}

interface LessonAudioStatus {
  id: string;
  title: string;
  moduleIndex: number;
  lessonIndex: number;
  audioStatus: 'none' | 'generating' | 'ready' | 'failed';
  audioUrl: string | null;
  audioDuration: number | null;
}
```

#### 2. CourseAudioPlayer Component (Enhanced)

The existing `CourseAudioPlayer` component already implements most required functionality:
- Play/pause controls
- Skip forward/backward (10 seconds)
- Next/previous lesson navigation
- Seek bar
- Volume control
- Playback speed (0.5x - 2x)
- Sleep timer (5, 15, 30, 45, 60 minutes)
- Auto-next toggle

No major changes needed - the component is already well-implemented.

#### 3. VoiceSelector Component (`src/components/VoiceSelector.tsx`)

```typescript
interface VoiceSelectorProps {
  selectedVoice: 'male' | 'female';
  onVoiceChange: (voice: 'male' | 'female') => void;
  disabled?: boolean;
}
```

### Backend Edge Functions

#### 1. generate-audio (Existing - Minor Updates)

Already implemented with:
- Single lesson audio generation
- Access control (PRO_MAX, audio add-on, free trial)
- Murf AI integration
- Storage upload

#### 2. generate-course-audio (Existing - Minor Updates)

Already implemented with:
- Bulk audio generation
- Job tracking via `audio_generation_jobs` table
- Progress updates
- Content chunking for large lessons

### API Interfaces

#### Generate Lesson Audio

```typescript
// Request
interface GenerateAudioRequest {
  lessonId: string;
  voiceType: 'male' | 'female';
}

// Response
interface GenerateAudioResponse {
  success: boolean;
  audioUrl: string;
  duration: number;
  voiceType: string;
}
```

#### Generate Course Audio

```typescript
// Request
interface GenerateCourseAudioRequest {
  courseId: string;
  voiceType: 'male' | 'female';
}

// Response
interface GenerateCourseAudioResponse {
  success: boolean;
  jobId: string;
  totalLessons: number;
  completed: number;
  failed: number;
  errors?: string[];
}
```

## Data Models

### Existing Tables (Already Implemented)

#### lessons table
```sql
-- Existing columns for audio
audio_url: text | null
audio_duration_seconds: integer | null
audio_status: 'none' | 'generating' | 'ready' | 'failed'
audio_voice_type: text | null
audio_generated_at: timestamp | null
```

#### profiles table
```sql
-- Existing columns for audio access
audio_addon_enabled: boolean
audio_addon_trial_used: boolean
audio_addon_expires_at: timestamp | null
plan_type: 'FREE' | 'PLUS' | 'PRO' | 'PRO_MAX'
```

### New/Updated Tables

#### audio_generation_jobs table (Existing)
```sql
CREATE TABLE audio_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  total_lessons INTEGER NOT NULL,
  completed_lessons INTEGER DEFAULT 0,
  failed_lessons INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Audio access control consistency
*For any* user profile with plan_type and audio_addon_enabled and audio_addon_trial_used and audio_addon_expires_at fields, the checkAudioAccess function should return hasAccess=true if and only if: (plan_type === 'PRO_MAX') OR (audio_addon_enabled === true AND (audio_addon_expires_at is null OR audio_addon_expires_at > now)) OR (plan_type === 'FREE' AND audio_addon_trial_used === false).
**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 2: Markdown stripping preserves readable text
*For any* markdown string, the stripMarkdown function should return a string that contains all the readable text from the original (excluding code blocks) while removing all markdown formatting characters (headers, bold, italic, links, images, blockquotes, list markers).
**Validates: Requirements 7.3**

### Property 3: Content chunking respects size limits and sentence boundaries
*For any* text string and maximum chunk size, the splitTextIntoChunks function should return an array where: (a) each chunk length is less than or equal to the maximum size, (b) chunks split at sentence boundaries when possible, and (c) concatenating all chunks produces the original text content.
**Validates: Requirements 7.1**

### Property 4: Audio file storage path consistency
*For any* courseId, lessonId, and voiceType, the generated storage path should match the pattern `{courseId}/{lessonId}-{voiceType}.mp3` exactly.
**Validates: Requirements 7.4**

### Property 5: Progress tracking invariants
*For any* audio generation job state, the following invariants should hold: (a) completed_lessons >= 0, (b) failed_lessons >= 0, (c) completed_lessons + failed_lessons <= total_lessons, (d) if status === 'completed' then completed_lessons + failed_lessons === total_lessons.
**Validates: Requirements 6.1, 6.5**

### Property 6: Lesson audio status transitions
*For any* lesson, the audio_status field should only transition through valid states: 'none' → 'generating' → 'ready' OR 'none' → 'generating' → 'failed'. Direct transitions from 'none' to 'ready' or 'none' to 'failed' should not occur.
**Validates: Requirements 1.4, 1.5, 6.4**

### Property 7: Audio navigation finds correct lessons
*For any* list of lessons and current index, findNextAudioLesson should return the index of the first lesson after currentIndex that has a non-null audio_url, or -1 if none exists. Similarly, findPrevAudioLesson should return the index of the first lesson before currentIndex with audio.
**Validates: Requirements 2.5**

### Property 8: Playback speed synchronization
*For any* playback speed value in the valid range [0.5, 2], setting the playback speed should result in the audio element's playbackRate property matching the selected value.
**Validates: Requirements 3.1**

## Error Handling

### Frontend Error Handling

1. **Network Errors**: Display toast notification with retry option
2. **Access Denied (403)**: Show upgrade prompt modal
3. **Generation Failures**: Display error message per lesson with retry button
4. **Audio Playback Errors**: Show error state in player with reload option

### Backend Error Handling

1. **Murf API Errors**: Log error, mark lesson as failed, continue with next lesson
2. **Storage Upload Errors**: Retry up to 3 times, then mark as failed
3. **Rate Limiting**: Implement exponential backoff between API calls
4. **Invalid Content**: Skip lessons without markdown content

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;
  details?: string;
  code?: string;
}
```

## Testing Strategy

### Unit Testing

Unit tests will verify individual component behavior:

1. **VoiceSelector Component**: Test voice selection state changes
2. **Access Control Logic**: Test permission checking for different user types
3. **Markdown Stripping**: Test various markdown patterns are correctly removed
4. **Time Formatting**: Test duration display formatting

### Property-Based Testing

Property-based tests will use **fast-check** library to verify correctness properties:

1. **Access Control Property**: Generate random user profiles and verify access decisions
2. **Markdown Stripping Property**: Generate random markdown and verify text preservation
3. **Chunking Property**: Generate random text and verify chunk boundaries
4. **Progress Tracking Property**: Generate random job states and verify invariants

Each property-based test will:
- Run a minimum of 100 iterations
- Be tagged with the corresponding correctness property reference
- Use the format: `**Feature: audio-generation, Property {number}: {property_text}**`

### Integration Testing

1. **End-to-end audio generation flow**: Test complete generation pipeline
2. **Subscription integration**: Test PolarSH webhook handling
3. **Audio player functionality**: Test playback controls and state management
