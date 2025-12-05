/*
  # Fix Function Search Path Security Issues

  ## Overview
  This migration fixes functions that have mutable search_path, which is a security issue.
  Setting explicit search_path prevents search_path attacks.

  ## Functions Updated
  - update_updated_at_column
  - check_badge_criteria_on_stats_update
  - update_course_xp_summary_on_xp_transaction
  - update_learner_stats_on_xp_transaction
  - update_lesson_generation_job_updated_at
  - is_course_public_and_published

  ## Security Requirements
  - Requirements: 5.4
*/

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix update_lesson_generation_job_updated_at function
CREATE OR REPLACE FUNCTION update_lesson_generation_job_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix is_course_public_and_published function
CREATE OR REPLACE FUNCTION is_course_public_and_published(p_course_id uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM courses 
    WHERE id = p_course_id 
    AND is_public = true 
    AND status = 'published'::course_status
  );
END;
$$;

-- Fix check_badge_criteria_on_stats_update function
CREATE OR REPLACE FUNCTION check_badge_criteria_on_stats_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  badge_rec RECORD;
  criteria_type TEXT;
  criteria_threshold INTEGER;
  current_value INTEGER;
BEGIN
  FOR badge_rec IN SELECT * FROM badge_definitions LOOP
    IF EXISTS (
      SELECT 1 FROM learner_badges 
      WHERE user_id = NEW.user_id AND badge_id = badge_rec.id
    ) THEN
      CONTINUE;
    END IF;
    
    criteria_type := badge_rec.criteria_json->>'type';
    criteria_threshold := (badge_rec.criteria_json->>'threshold')::INTEGER;
    
    CASE criteria_type
      WHEN 'streak' THEN current_value := NEW.current_streak;
      WHEN 'total_xp' THEN current_value := NEW.total_xp;
      WHEN 'lessons_completed' THEN current_value := NEW.lessons_completed;
      WHEN 'quizzes_completed' THEN current_value := NEW.quizzes_completed;
      ELSE CONTINUE;
    END CASE;
    
    IF current_value >= criteria_threshold THEN
      INSERT INTO learner_badges (user_id, badge_id)
      VALUES (NEW.user_id, badge_rec.id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Fix update_course_xp_summary_on_xp_transaction function
CREATE OR REPLACE FUNCTION update_course_xp_summary_on_xp_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO course_xp_summary (user_id, course_id, total_xp)
  VALUES (NEW.user_id, NEW.course_id, NEW.xp_amount)
  ON CONFLICT (user_id, course_id) 
  DO UPDATE SET 
    total_xp = course_xp_summary.total_xp + NEW.xp_amount,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix update_learner_stats_on_xp_transaction function
CREATE OR REPLACE FUNCTION update_learner_stats_on_xp_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_date DATE;
  new_streak INTEGER;
BEGIN
  SELECT last_activity_date, current_streak INTO last_date, new_streak
  FROM learner_stats WHERE user_id = NEW.user_id;
  
  IF last_date IS NULL OR last_date < CURRENT_DATE - 1 THEN
    new_streak := 1;
  ELSIF last_date = CURRENT_DATE - 1 THEN
    new_streak := COALESCE(new_streak, 0) + 1;
  END IF;
  
  INSERT INTO learner_stats (
    user_id, 
    total_xp, 
    current_streak, 
    longest_streak,
    last_activity_date,
    lessons_completed,
    quizzes_completed,
    flashcard_sessions_completed
  )
  VALUES (
    NEW.user_id,
    NEW.xp_amount,
    new_streak,
    new_streak,
    CURRENT_DATE,
    CASE WHEN NEW.activity_type = 'lesson_complete' THEN 1 ELSE 0 END,
    CASE WHEN NEW.activity_type = 'quiz_complete' THEN 1 ELSE 0 END,
    CASE WHEN NEW.activity_type = 'flashcard_session' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = learner_stats.total_xp + NEW.xp_amount,
    current_streak = new_streak,
    longest_streak = GREATEST(learner_stats.longest_streak, new_streak),
    last_activity_date = CURRENT_DATE,
    lessons_completed = learner_stats.lessons_completed + 
      CASE WHEN NEW.activity_type = 'lesson_complete' THEN 1 ELSE 0 END,
    quizzes_completed = learner_stats.quizzes_completed + 
      CASE WHEN NEW.activity_type = 'quiz_complete' THEN 1 ELSE 0 END,
    flashcard_sessions_completed = learner_stats.flashcard_sessions_completed + 
      CASE WHEN NEW.activity_type = 'flashcard_session' THEN 1 ELSE 0 END,
    updated_at = now();
  
  RETURN NEW;
END;
$$;
