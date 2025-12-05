# Requirements Document

## Introduction

This document specifies the requirements for implementing a comprehensive learner gamification system for Progent, inspired by Duolingo's proven engagement strategies. The system introduces personal analytics dashboards, achievement badges, experience points (XP), learning streaks, and social features including public learner profiles and course-specific leaderboards. These features aim to increase user engagement, retention, and motivation through game mechanics that reward consistent learning behavior.

## Glossary

- **Progent**: The AI-powered course generation and learning platform
- **XP (Experience Points)**: Numeric points earned by learners for completing learning activities
- **Badge**: A visual achievement award granted when a learner meets specific criteria
- **Streak**: A count of consecutive days a learner has completed at least one learning activity
- **Leaderboard**: A ranked list of learners ordered by XP earned within a specific course
- **Analytics Dashboard**: A personal page displaying learning statistics, progress, and achievements
- **Public Profile**: A learner's profile page visible to other authenticated users
- **Learning Activity**: Any tracked action including lesson completion, quiz completion, or flashcard session
- **Streak Freeze**: A protective mechanism that preserves a streak when a day is missed (future enhancement)

## Requirements

### Requirement 1

**User Story:** As a learner, I want to earn experience points (XP) for completing learning activities, so that I can track my progress and feel rewarded for my efforts.

#### Acceptance Criteria

1. WHEN a learner completes a lesson THEN the Progent System SHALL award 10 XP to the learner's total XP balance
2. WHEN a learner completes a quiz with a score of 80% or higher THEN the Progent System SHALL award 25 XP to the learner
3. WHEN a learner completes a quiz with a score below 80% THEN the Progent System SHALL award 10 XP to the learner
4. WHEN a learner completes a flashcard session THEN the Progent System SHALL award 5 XP to the learner
5. WHEN XP is awarded THEN the Progent System SHALL record the XP transaction with timestamp, activity type, and associated course

### Requirement 2

**User Story:** As a learner, I want to maintain a learning streak by studying daily, so that I stay motivated to learn consistently.

#### Acceptance Criteria

1. WHEN a learner completes any learning activity THEN the Progent System SHALL check if the learner has activity recorded for the current calendar day
2. WHEN a learner completes their first activity of the day THEN the Progent System SHALL increment the learner's current streak by 1
3. WHEN a learner has no recorded activity for the previous calendar day THEN the Progent System SHALL reset the learner's current streak to 1 upon their next activity
4. WHEN a learner's streak is updated THEN the Progent System SHALL compare the current streak to the learner's longest streak and update the longest streak if exceeded
5. WHEN displaying streak information THEN the Progent System SHALL show both current streak and longest streak values

### Requirement 3

**User Story:** As a learner, I want to earn badges for achieving milestones, so that I have visible recognition of my accomplishments.

#### Acceptance Criteria

1. WHEN a learner meets the criteria for a badge THEN the Progent System SHALL award the badge and record the award timestamp
2. WHEN a badge is awarded THEN the Progent System SHALL display a celebratory notification to the learner
3. WHEN displaying badges THEN the Progent System SHALL show earned badges with full color and unearned badges as grayed-out silhouettes
4. THE Progent System SHALL support the following badge categories: streak milestones (7, 30, 100 days), course completion, XP milestones (100, 500, 1000, 5000 XP), quiz performance (first perfect score, 10 perfect scores), and early adopter
5. WHEN a learner views their profile THEN the Progent System SHALL display all earned badges in chronological order of acquisition

### Requirement 4

**User Story:** As a learner, I want to view my personal analytics dashboard, so that I can understand my learning patterns and progress.

#### Acceptance Criteria

1. WHEN a learner navigates to the analytics page THEN the Progent System SHALL display total XP, current streak, longest streak, and total lessons completed
2. WHEN displaying analytics THEN the Progent System SHALL show a weekly activity heatmap indicating days with learning activity
3. WHEN displaying analytics THEN the Progent System SHALL show course-by-course progress with completion percentages
4. WHEN displaying analytics THEN the Progent System SHALL show recent XP transactions with activity type and timestamp
5. WHEN displaying analytics THEN the Progent System SHALL show the learner's earned badges collection

### Requirement 5

**User Story:** As a learner, I want to view other learners' public profiles, so that I can see their achievements and feel part of a learning community.

#### Acceptance Criteria

1. WHEN a learner views another user's public profile THEN the Progent System SHALL display the user's display name, avatar, total XP, current streak, and earned badges
2. WHEN displaying a public profile THEN the Progent System SHALL hide sensitive information including email, subscription status, and detailed course progress
3. WHEN a learner has set their profile to private THEN the Progent System SHALL display a message indicating the profile is not publicly visible
4. THE Progent System SHALL provide a profile visibility toggle in user settings defaulting to public

### Requirement 6

**User Story:** As a learner, I want to see leaderboards for courses I'm enrolled in, so that I can compare my progress with other learners and stay motivated through friendly competition.

#### Acceptance Criteria

1. WHEN a learner views a course leaderboard THEN the Progent System SHALL display the top 10 learners ranked by XP earned in that specific course
2. WHEN displaying the leaderboard THEN the Progent System SHALL show each learner's rank, display name, avatar, and course XP
3. WHEN the current learner is not in the top 10 THEN the Progent System SHALL display the learner's own rank and XP below the top 10 list
4. WHEN displaying leaderboard entries THEN the Progent System SHALL only include learners who have set their profile visibility to public
5. WHEN a course has fewer than 3 public participants THEN the Progent System SHALL display a message encouraging more learners to join

### Requirement 7

**User Story:** As a learner, I want to see my XP breakdown per course, so that I can understand where I'm investing my learning effort.

#### Acceptance Criteria

1. WHEN a learner views their analytics THEN the Progent System SHALL display XP earned per course in a visual chart format
2. WHEN displaying course XP THEN the Progent System SHALL show both total XP and XP earned in the current week for each course
3. WHEN a learner clicks on a course in the XP breakdown THEN the Progent System SHALL navigate to that course's detail view

### Requirement 8

**User Story:** As a system, I want to efficiently calculate and store gamification data, so that the user experience remains fast and responsive.

#### Acceptance Criteria

1. WHEN XP is awarded THEN the Progent System SHALL update the learner's cached total XP within the same database transaction
2. WHEN streak data is updated THEN the Progent System SHALL store the last activity date to enable efficient streak calculations
3. WHEN badge criteria are checked THEN the Progent System SHALL evaluate criteria only for badges not yet earned by the learner
4. THE Progent System SHALL use database indexes on user_id and course_id columns for gamification tables to ensure query performance
