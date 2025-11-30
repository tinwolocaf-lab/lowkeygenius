# Implementation Plan

- [x] 1. Set up database schema and types
  - [x] 1.1 Add audio_generation_jobs table migration if not exists
    - Create migration file for audio_generation_jobs table
    - Add indexes for course_id and user_id
    - _Requirements: 6.1, 6.5_
  - [x] 1.2 Update database types to include audio_generation_jobs
    - Add AudioGenerationJob type to src/types/database.ts
    - _Requirements: 6.1_
  - [ ]* 1.3 Write property test for progress tracking invariants
    - **Property 5: Progress tracking invariants**
    - **Validates: Requirements 6.1, 6.5**

- [x] 2. Implement audio access control utilities
  - [x] 2.1 Create checkAudioAccess utility function
    - Implement access logic for PRO_MAX, audio add-on, and free trial
    - Return hasAccess boolean and reason string
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ]* 2.2 Write property test for audio access control
    - **Property 1: Audio access control consistency**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [x] 3. Implement text processing utilities
  - [x] 3.1 Create stripMarkdown utility function
    - Remove code blocks, headers, bold/italic, links, images, blockquotes, list markers
    - Preserve readable text content
    - _Requirements: 7.3_
  - [ ]* 3.2 Write property test for markdown stripping
    - **Property 2: Markdown stripping preserves readable text**
    - **Validates: Requirements 7.3**
  - [x] 3.3 Create splitTextIntoChunks utility function
    - Split at sentence boundaries
    - Respect maximum chunk size limit
    - Handle edge cases for very long sentences
    - _Requirements: 7.1_
  - [ ]* 3.4 Write property test for content chunking
    - **Property 3: Content chunking respects size limits and sentence boundaries**
    - **Validates: Requirements 7.1**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create VoiceSelector component
  - [x] 5.1 Implement VoiceSelector component
    - Create src/components/VoiceSelector.tsx
    - Display male and female voice options with visual indicators
    - Handle selection state and disabled state
    - _Requirements: 1.2_
  - [ ]* 5.2 Write unit tests for VoiceSelector
    - Test voice selection state changes
    - Test disabled state rendering
    - _Requirements: 1.2_

- [x] 6. Create GenerateAudio page
  - [x] 6.1 Create GenerateAudio page component
    - Create src/pages/GenerateAudio.tsx
    - Implement voice selection UI using VoiceSelector
    - Display lesson list with audio status indicators
    - _Requirements: 1.1, 1.2, 6.4_
  - [x] 6.2 Implement audio generation flow
    - Add generate button with access control check
    - Call generateCourseAudio API
    - Display progress during generation
    - _Requirements: 1.3, 6.1_
  - [x] 6.3 Implement generation status display
    - Show per-lesson status (none, generating, ready, failed)
    - Display completion summary with success/failure counts
    - Add retry functionality for failed lessons
    - _Requirements: 6.2, 6.3, 6.4, 6.5_
  - [ ]* 6.4 Write property test for lesson audio status transitions
    - **Property 6: Lesson audio status transitions**
    - **Validates: Requirements 1.4, 1.5, 6.4**

- [x] 7. Add routing and navigation
  - [x] 7.1 Add GenerateAudio route to router
    - Add route /courses/:courseId/generate-audio
    - Protect route with authentication
    - _Requirements: 1.1_
  - [x] 7.2 Add navigation button to course detail page
    - Add "Generate Audio" button to published courses
    - Navigate to GenerateAudio page on click
    - _Requirements: 1.1_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Enhance CourseAudioPlayer component
  - [x] 9.1 Verify existing audio player functionality
    - Confirm play/pause, skip, seek, volume controls work
    - Confirm sleep timer and auto-next work
    - Confirm playback speed control works
    - _Requirements: 2.2, 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ]* 9.2 Write property test for audio navigation
    - **Property 7: Audio navigation finds correct lessons**
    - **Validates: Requirements 2.5**
  - [ ]* 9.3 Write property test for playback speed synchronization
    - **Property 8: Playback speed synchronization**
    - **Validates: Requirements 3.1**

- [x] 10. Implement audio file storage path utility
  - [x] 10.1 Create getAudioStoragePath utility function
    - Generate consistent path: {courseId}/{lessonId}-{voiceType}.mp3
    - _Requirements: 7.4_
  - [ ]* 10.2 Write property test for storage path consistency
    - **Property 4: Audio file storage path consistency**
    - **Validates: Requirements 7.4**

- [x] 11. Update edge functions if needed
  - [x] 11.1 Review and verify generate-audio edge function
    - Confirm access control logic matches requirements
    - Confirm Murf AI integration works correctly
    - Confirm storage upload and lesson update work
    - _Requirements: 1.4, 4.1, 4.2, 4.3, 4.4, 7.4, 7.5_
  - [x] 11.2 Review and verify generate-course-audio edge function
    - Confirm bulk generation with job tracking works
    - Confirm progress updates are accurate
    - Confirm error handling continues to next lesson
    - _Requirements: 1.3, 1.5, 6.1, 7.1, 7.2_

- [x] 12. Integrate audio add-on with PolarSH
  - [x] 12.1 Add audio add-on product ID to environment
    - Add VITE_POLAR_PRODUCT_AUDIO_ADDON to .env
    - _Requirements: 5.1, 5.2_
  - [x] 12.2 Verify pricing page audio add-on section
    - Confirm audio add-on displays with $10/month pricing
    - Confirm checkout initiates correctly
    - _Requirements: 5.1, 5.2_
  - [x] 12.3 Update webhook handler for audio add-on subscription
    - Handle audio add-on subscription created event
    - Handle audio add-on subscription cancelled event
    - Update profile audio_addon_enabled field
    - _Requirements: 5.3, 5.4, 5.5_

- [x] 13. Add audio button to CourseView
  - [x] 13.1 Verify audio button in lesson view
    - Confirm "Listen to Audio Version" button appears when audio_url exists
    - Confirm clicking opens CourseAudioPlayer
    - _Requirements: 2.1_
  - [x] 13.2 Verify audio icon in lesson sidebar
    - Confirm headphones icon appears next to lessons with audio
    - _Requirements: 6.2_

- [ ] 14. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
