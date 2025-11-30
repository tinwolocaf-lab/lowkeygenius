# Requirements Document

## Introduction

This document specifies the requirements for implementing a comprehensive audio generation feature for the LearnSelfAI platform. The feature enables users to convert their course lessons into audio format using Murf AI's text-to-speech API. Users can listen to lessons through an integrated audio player with playback controls, sleep timer, and auto-next functionality. The feature includes a dedicated audio generation page accessible from published courses, voice selection (male/female), and integration with the existing subscription system where audio generation requires a paid add-on ($10/month) or PRO_MAX plan.

## Glossary

- **Audio Generation System**: The backend and frontend components responsible for converting lesson text content to audio using Murf AI's API
- **Murf AI**: Third-party text-to-speech service provider used for audio synthesis
- **Voice Type**: The gender characteristic of the AI voice (male or female)
- **Audio Add-on**: A separate subscription product ($10/month) that enables audio generation capabilities
- **Sleep Timer**: A feature that automatically pauses audio playback after a user-specified duration
- **Auto-Next**: A feature that automatically advances to the next lesson when the current audio finishes
- **Audio Status**: The state of audio generation for a lesson (none, generating, ready, failed)
- **Course Audio Generation**: The process of generating audio for all lessons in a course sequentially
- **Audio Generation Job**: A database record tracking the progress of bulk audio generation for a course

## Requirements

### Requirement 1

**User Story:** As a course owner, I want to generate audio versions of my course lessons, so that learners can listen to content instead of reading.

#### Acceptance Criteria

1. WHEN a user navigates to a published course THEN the Audio Generation System SHALL display an option to generate audio for the course
2. WHEN a user initiates audio generation THEN the Audio Generation System SHALL present a voice selection interface with male and female voice options
3. WHEN a user selects a voice and confirms generation THEN the Audio Generation System SHALL process all lessons sequentially and display progress
4. WHEN audio generation completes for a lesson THEN the Audio Generation System SHALL store the audio file in Supabase Storage and update the lesson record with the audio URL
5. WHEN audio generation fails for a lesson THEN the Audio Generation System SHALL mark the lesson status as failed and continue processing remaining lessons

### Requirement 2

**User Story:** As a learner, I want to listen to course lessons through an audio player, so that I can learn while doing other activities.

#### Acceptance Criteria

1. WHEN a user views a lesson with available audio THEN the Audio Generation System SHALL display a button to open the audio player
2. WHEN a user opens the audio player THEN the Audio Generation System SHALL display playback controls including play/pause, skip forward/backward, and seek bar
3. WHEN a user adjusts the playback position using the seek bar THEN the Audio Generation System SHALL update the audio playback position accordingly
4. WHEN audio playback reaches the end of a lesson THEN the Audio Generation System SHALL trigger the auto-next behavior if enabled
5. WHEN a user presses the next/previous lesson buttons THEN the Audio Generation System SHALL navigate to the next/previous lesson with available audio

### Requirement 3

**User Story:** As a learner, I want to control playback settings like speed and sleep timer, so that I can customize my listening experience.

#### Acceptance Criteria

1. WHEN a user selects a playback speed option THEN the Audio Generation System SHALL adjust the audio playback rate to the selected value
2. WHEN a user enables the sleep timer THEN the Audio Generation System SHALL pause playback after the specified duration
3. WHEN a user toggles the auto-next setting THEN the Audio Generation System SHALL enable or disable automatic advancement to the next lesson
4. WHEN a user adjusts the volume slider THEN the Audio Generation System SHALL update the audio volume level accordingly
5. WHEN a user toggles the mute button THEN the Audio Generation System SHALL mute or unmute the audio output

### Requirement 4

**User Story:** As a platform administrator, I want to restrict audio generation to paid users, so that the feature generates revenue.

#### Acceptance Criteria

1. WHEN a FREE plan user without audio add-on attempts to generate audio THEN the Audio Generation System SHALL allow generation for one lesson as a trial
2. WHEN a FREE plan user who has used their trial attempts to generate audio THEN the Audio Generation System SHALL display an upgrade prompt
3. WHEN a PLUS or PRO plan user with audio add-on attempts to generate audio THEN the Audio Generation System SHALL allow the generation
4. WHEN a PRO_MAX plan user attempts to generate audio THEN the Audio Generation System SHALL allow unlimited generation without requiring add-on
5. WHEN a user's audio add-on subscription expires THEN the Audio Generation System SHALL deny new audio generation requests

### Requirement 5

**User Story:** As a user, I want to purchase the audio add-on subscription, so that I can access audio generation features.

#### Acceptance Criteria

1. WHEN a user views the pricing page THEN the Audio Generation System SHALL display the audio add-on option with pricing information
2. WHEN a user clicks to purchase the audio add-on THEN the Audio Generation System SHALL initiate a PolarSH checkout session
3. WHEN a user completes the audio add-on purchase THEN the Audio Generation System SHALL update the user profile to enable audio features
4. WHEN a user's audio add-on subscription renews THEN the Audio Generation System SHALL maintain the enabled status
5. WHEN a user cancels the audio add-on subscription THEN the Audio Generation System SHALL disable audio generation at the end of the billing period

### Requirement 6

**User Story:** As a course owner, I want to see the audio generation status for my lessons, so that I can track progress and identify issues.

#### Acceptance Criteria

1. WHEN audio generation is in progress THEN the Audio Generation System SHALL display a progress indicator showing completed and total lessons
2. WHEN a lesson has audio ready THEN the Audio Generation System SHALL display an audio icon indicator next to the lesson
3. WHEN a lesson audio generation fails THEN the Audio Generation System SHALL display an error indicator and allow retry
4. WHEN viewing the audio generation page THEN the Audio Generation System SHALL display the status of each lesson (none, generating, ready, failed)
5. WHEN all lessons complete audio generation THEN the Audio Generation System SHALL display a completion summary with success and failure counts

### Requirement 7

**User Story:** As a developer, I want the audio generation to handle large lesson content, so that all lessons can be converted regardless of length.

#### Acceptance Criteria

1. WHEN lesson content exceeds the Murf AI character limit THEN the Audio Generation System SHALL split the content into chunks at sentence boundaries
2. WHEN multiple audio chunks are generated THEN the Audio Generation System SHALL concatenate them into a single audio file
3. WHEN processing markdown content THEN the Audio Generation System SHALL strip formatting to produce clean text for speech synthesis
4. WHEN uploading generated audio THEN the Audio Generation System SHALL store files in the lesson-audio storage bucket with a consistent naming convention
5. WHEN audio generation completes THEN the Audio Generation System SHALL record the audio duration in seconds in the lesson record
