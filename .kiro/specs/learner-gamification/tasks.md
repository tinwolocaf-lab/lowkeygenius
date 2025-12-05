# Implementation Plan

- [x] 1. Set up database schema for gamification
  - [x] 1.1 Create migration for gamification tables
    - Create `learner_xp_transactions` table with user_id, course_id, activity_type, xp_amount, metadata, created_at
    - Create `learner_stats` table with user_id, total_xp, current_streak, longest_streak, last_activity_date, activity counters
    - Create `badge_definitions` table with code, name, description, icon_url, category, criteria_json
    - Create `learner_badges` junction table with user_id, badge_id, earned_at
    - Create `course_xp_summary` table with user_id, course_id, total_xp
    - Add profile_visibility and display_name columns to profiles table
    - Create indexes on user_id and course_id columns
    - Enable RLS policies for all new tables
    - _Requirements: 8.4, 5.4_

  - [ ]* 1.2 Write property test for default profile visibility
    - **Property 13: Default Profile Visibility**
    - **Validates: Requirements 5.4**

  - [x] 1.3 Create migration for database triggers
    - Create trigger to update learner_stats when XP transaction is inserted
    - Create trigger to update course_xp_summary when XP transaction is inserted
    - Create trigger to check badge criteria after learner_stats update
    - _Requirements: 8.1, 8.2_

  - [x] 1.4 Seed badge definitions
    - Insert streak badges: 7-day, 30-day, 100-day streak
    - Insert XP badges: 100, 500, 1000, 5000 XP milestones
    - Insert course completion badge
    - Insert quiz badges: first perfect score, 10 perfect scores
    - Insert early adopter badge
    - _Requirements: 3.4_

- [x] 2. Implement gamification service layer
  - [x] 2.1 Create TypeScript types for gamification
    - Define XPTransaction, LearnerStats, Badge, LearnerBadge interfaces
    - Define LeaderboardEntry, PublicProfileData, CourseXPSummary interfaces
    - Define ActivityType union type
    - Add types to src/types/database.ts
    - _Requirements: 1.5_

  - [x] 2.2 Implement gamificationService.ts core functions
    - Implement `awardXP(userId, courseId, activityType, metadata)` function
    - Implement XP amount calculation based on activity type (10 for lesson, 25/10 for quiz based on score, 5 for flashcard)
    - Implement `getLearnerStats(userId)` function
    - Implement `getLearnerBadges(userId)` function
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 2.3 Write property test for XP award amounts
    - **Property 1: XP Award Amounts by Activity Type**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

  - [ ]* 2.4 Write property test for XP transaction integrity
    - **Property 2: XP Transaction Integrity**
    - **Validates: Requirements 1.5, 8.1**

  - [x] 2.5 Implement streak calculation logic
    - Implement streak increment logic for first daily activity
    - Implement streak reset logic when gap detected
    - Implement longest streak update logic
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ]* 2.6 Write property tests for streak logic
    - **Property 3: Streak Increment on First Daily Activity**
    - **Property 4: Streak Reset After Gap**
    - **Property 5: Longest Streak Invariant**
    - **Validates: Requirements 2.2, 2.3, 2.4**

  - [x] 2.7 Implement leaderboard functions
    - Implement `getCourseLeaderboard(courseId, limit)` function
    - Filter out private profiles from leaderboard
    - Include requesting user's rank if outside top 10
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 2.8 Write property tests for leaderboard
    - **Property 14: Leaderboard Size and Ordering**
    - **Property 15: Leaderboard Entry Data Completeness**
    - **Property 16: User Rank Outside Top 10**
    - **Property 17: Leaderboard Privacy Filtering**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

  - [x] 2.9 Implement public profile functions
    - Implement `getPublicProfile(userId)` function
    - Return null for private profiles
    - Exclude sensitive data from response
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 2.10 Write property tests for public profile
    - **Property 10: Public Profile Data Completeness**
    - **Property 11: Public Profile Privacy Protection**
    - **Property 12: Private Profile Access Restriction**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [x] 2.11 Implement XP breakdown functions
    - Implement `getXPTransactions(userId, limit)` function
    - Implement `getCourseXPBreakdown(userId)` function with total and weekly XP
    - _Requirements: 4.4, 7.2_

  - [ ]* 2.12 Write property tests for XP data functions
    - **Property 9: XP Transaction History Contains Required Fields**
    - **Property 18: Course XP Breakdown Data**
    - **Validates: Requirements 4.4, 7.2**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement useGamification hook
  - [x] 4.1 Create useGamification hook
    - Fetch and cache learner stats on mount
    - Provide awardXP function with optimistic updates
    - Manage new badge notification state
    - Set up Supabase realtime subscription for stats updates
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 2.3, 2.4_

  - [x] 4.2 Create useLeaderboard hook
    - Fetch leaderboard data for specific course
    - Include current user's rank
    - Handle loading and error states
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 5. Implement gamification UI components
  - [x] 5.1 Create StreakWidget component
    - Display fire icon with current streak count
    - Show tooltip with longest streak
    - Handle zero streak state
    - _Requirements: 2.5_

  - [x] 5.2 Create BadgeDisplay component
    - Display badge grid with earned badges in full color
    - Show unearned badges as grayed silhouettes
    - Include tooltip with badge name and description
    - Order badges chronologically by earned_at
    - _Requirements: 3.3, 3.5_

  - [ ]* 5.3 Write property test for badge ordering
    - **Property 7: Badge Display Chronological Order**
    - **Validates: Requirements 3.5**

  - [x] 5.4 Create XPNotification component
    - Display toast notification for XP awards
    - Show XP amount and activity type
    - Animate entrance and exit
    - _Requirements: 3.2_

  - [x] 5.5 Create LeaderboardPanel component
    - Display top 10 learners with rank, avatar, name, XP
    - Show current user's rank if outside top 10
    - Display message when fewer than 3 participants
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [x] 5.6 Create ActivityHeatmap component
    - Display 12-week activity grid
    - Color cells based on activity presence
    - Show tooltip with date and activity count
    - _Requirements: 4.2_

- [x] 6. Implement Analytics page
  - [x] 6.1 Create Analytics page structure
    - Add route for /analytics in App.tsx
    - Create page layout with stats cards, heatmap, and badge sections
    - Integrate useGamification hook
    - _Requirements: 4.1_

  - [x] 6.2 Implement XP and streak summary cards
    - Display total XP with weekly comparison
    - Display current streak and longest streak
    - Display total lessons completed
    - _Requirements: 4.1_

  - [x] 6.3 Implement course progress section
    - Display course-by-course progress with completion percentages
    - Calculate completion as completed_lessons / total_lessons
    - Link to course detail view
    - _Requirements: 4.3, 7.3_

  - [ ]* 6.4 Write property test for completion percentage
    - **Property 8: Course Completion Percentage Calculation**
    - **Validates: Requirements 4.3**

  - [x] 6.5 Implement recent XP transactions list
    - Display recent XP transactions with activity type and timestamp
    - Show course name for each transaction
    - _Requirements: 4.4_

  - [x] 6.6 Implement course XP breakdown chart
    - Display XP per course in visual format
    - Show total XP and weekly XP for each course
    - _Requirements: 7.1, 7.2_

- [x] 7. Implement Public Profile page
  - [x] 7.1 Create PublicProfile page
    - Add route for /profile/:userId in App.tsx
    - Display public profile data (name, avatar, XP, streak, badges)
    - Handle private profile state with appropriate message
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 7.2 Add profile visibility toggle to Settings
    - Add toggle in Settings page for profile visibility
    - Default to public for new users
    - Save preference to profiles table
    - _Requirements: 5.4_

- [x] 8. Integrate XP awards into existing flows
  - [x] 8.1 Award XP on lesson completion
    - Call awardXP when lesson is marked complete in CourseView
    - Show XP notification toast
    - _Requirements: 1.1_

  - [x] 8.2 Award XP on quiz completion
    - Call awardXP when quiz is submitted in QuizTake
    - Award 25 XP for score >= 80%, 10 XP otherwise
    - Show XP notification toast
    - _Requirements: 1.2, 1.3_

  - [x] 8.3 Award XP on flashcard session completion
    - Call awardXP when flashcard session ends in FlashcardStudy
    - Show XP notification toast
    - _Requirements: 1.4_

  - [ ]* 8.4 Write property test for last activity date update
    - **Property 19: Last Activity Date Update**
    - **Validates: Requirements 8.2**

- [x] 9. Add leaderboard to course view
  - [x] 9.1 Integrate LeaderboardPanel into CourseView
    - Add leaderboard section to course detail page
    - Show leaderboard for enrolled courses
    - Handle courses with few participants
    - _Requirements: 6.1, 6.5_

- [x] 10. Add navigation and sidebar updates
  - [x] 10.1 Add Analytics link to sidebar
    - Add Analytics menu item to Layout sidebar
    - Add analytics icon (BarChart or similar)
    - _Requirements: 4.1_

  - [x] 10.2 Add StreakWidget to header/sidebar
    - Display current streak in sidebar or header
    - Link to Analytics page
    - _Requirements: 2.5_

- [x] 11. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
