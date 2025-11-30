# Product Overview

LearnSelf is an AI-powered course generation platform that allows users to create personalized learning courses on any topic.

## Core Features

- **AI Course Generation**: Users input a topic, level, and intensity; the system generates a complete course outline with modules and lessons
- **Lesson Content Generation**: AI generates detailed markdown lesson content using Google Gemini
- **Audio Generation**: Text-to-speech conversion for lessons using Murf AI
- **Progress Tracking**: Users can track completion across courses and lessons
- **Notes System**: Users can save snippets from lessons as notes
- **Subscription Tiers**: FREE, PLUS, PRO, PRO_MAX plans with varying course limits and features

## User Flow

1. User signs up/logs in via Supabase Auth
2. Creates a new course through onboarding (topic, level, intensity)
3. Reviews and edits the generated outline
4. Generates lesson content for each lesson
5. Optionally generates audio narration
6. Studies the course with progress tracking

## Business Model

- Freemium with tiered subscriptions via Polar
- Audio generation as premium add-on feature
- Monthly course creation limits per plan tier
