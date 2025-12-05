/*
  # Seed Badge Definitions

  ## Overview
  Inserts initial badge definitions for the gamification system.

  ## Badge Categories
  - streak: 7-day, 30-day, 100-day streak milestones
  - xp: 100, 500, 1000, 5000 XP milestones
  - course: Course completion badge
  - quiz: First perfect score, 10 perfect scores
  - special: Early adopter badge

  _Requirements: 3.4_
*/

-- Streak badges
INSERT INTO badge_definitions (code, name, description, icon_url, category, criteria_json, sort_order)
VALUES 
  (
    'streak_7',
    'Week Warrior',
    'Maintain a 7-day learning streak',
    '/badges/streak-7.svg',
    'streak',
    '{"type": "streak_days", "value": 7}',
    10
  ),
  (
    'streak_30',
    'Monthly Master',
    'Maintain a 30-day learning streak',
    '/badges/streak-30.svg',
    'streak',
    '{"type": "streak_days", "value": 30}',
    11
  ),
  (
    'streak_100',
    'Century Champion',
    'Maintain a 100-day learning streak',
    '/badges/streak-100.svg',
    'streak',
    '{"type": "streak_days", "value": 100}',
    12
  );

-- XP milestone badges
INSERT INTO badge_definitions (code, name, description, icon_url, category, criteria_json, sort_order)
VALUES 
  (
    'xp_100',
    'Getting Started',
    'Earn your first 100 XP',
    '/badges/xp-100.svg',
    'xp',
    '{"type": "total_xp", "value": 100}',
    20
  ),
  (
    'xp_500',
    'Rising Star',
    'Earn 500 XP',
    '/badges/xp-500.svg',
    'xp',
    '{"type": "total_xp", "value": 500}',
    21
  ),
  (
    'xp_1000',
    'Knowledge Seeker',
    'Earn 1,000 XP',
    '/badges/xp-1000.svg',
    'xp',
    '{"type": "total_xp", "value": 1000}',
    22
  ),
  (
    'xp_5000',
    'Learning Legend',
    'Earn 5,000 XP',
    '/badges/xp-5000.svg',
    'xp',
    '{"type": "total_xp", "value": 5000}',
    23
  );

-- Course completion badge
INSERT INTO badge_definitions (code, name, description, icon_url, category, criteria_json, sort_order)
VALUES 
  (
    'course_complete_1',
    'Course Conqueror',
    'Complete your first course',
    '/badges/course-complete.svg',
    'course',
    '{"type": "courses_completed", "value": 1}',
    30
  );

-- Quiz badges
INSERT INTO badge_definitions (code, name, description, icon_url, category, criteria_json, sort_order)
VALUES 
  (
    'quiz_perfect_1',
    'Perfect Score',
    'Get your first perfect quiz score',
    '/badges/quiz-perfect-1.svg',
    'quiz',
    '{"type": "perfect_scores", "value": 1}',
    40
  ),
  (
    'quiz_perfect_10',
    'Quiz Master',
    'Get 10 perfect quiz scores',
    '/badges/quiz-perfect-10.svg',
    'quiz',
    '{"type": "perfect_scores", "value": 10}',
    41
  );

-- Special badges
INSERT INTO badge_definitions (code, name, description, icon_url, category, criteria_json, sort_order)
VALUES 
  (
    'early_adopter',
    'Early Adopter',
    'Joined Progent during the early access period',
    '/badges/early-adopter.svg',
    'special',
    '{"type": "manual", "description": "Awarded to users who joined before public launch"}',
    50
  );
