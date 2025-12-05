/*
  # Gamification Triggers Migration

  ## Overview
  Creates database triggers for automatic gamification updates:
  1. Update learner_stats when XP transaction is inserted
  2. Update course_xp_summary when XP transaction is inserted
  3. Check badge criteria after learner_stats update

  _Requirements: 8.1, 8.2_
*/

-- Function to update learner_stats when XP transaction is inserted
CREATE OR REPLACE FUNCTION update_learner_stats_on_xp_transaction()
RETURNS TRIGGER AS $$
DECLARE
  current_date_val date := CURRENT_DATE;
  existing_stats learner_stats%ROWTYPE;
  new_streak integer;
  new_longest_streak integer;
BEGIN
  -- Get existing stats or create new record
  SELECT * INTO existing_stats FROM learner_stats WHERE user_id = NEW.user_id;
  
  IF NOT FOUND THEN
    -- First activity ever - initialize stats
    INSERT INTO learner_stats (
      user_id,
      total_xp,
      current_streak,
      longest_streak,
      last_activity_date,
      lessons_completed,
      quizzes_completed,
      flashcard_sessions_completed
    ) VALUES (
      NEW.user_id,
      NEW.xp_amount,
      1,
      1,
      current_date_val,
      CASE WHEN NEW.activity_type = 'lesson_complete' THEN 1 ELSE 0 END,
      CASE WHEN NEW.activity_type = 'quiz_complete' THEN 1 ELSE 0 END,
      CASE WHEN NEW.activity_type = 'flashcard_session' THEN 1 ELSE 0 END
    );
  ELSE
    -- Calculate streak
    IF existing_stats.last_activity_date IS NULL THEN
      -- First activity
      new_streak := 1;
    ELSIF existing_stats.last_activity_date = current_date_val THEN
      -- Same day activity - streak unchanged
      new_streak := existing_stats.current_streak;
    ELSIF existing_stats.last_activity_date = current_date_val - INTERVAL '1 day' THEN
      -- Consecutive day - increment streak
      new_streak := existing_stats.current_streak + 1;
    ELSE
      -- Gap in activity - reset streak
      new_streak := 1;
    END IF;
    
    -- Update longest streak if current exceeds it
    new_longest_streak := GREATEST(existing_stats.longest_streak, new_streak);
    
    -- Update stats
    UPDATE learner_stats SET
      total_xp = total_xp + NEW.xp_amount,
      current_streak = new_streak,
      longest_streak = new_longest_streak,
      last_activity_date = current_date_val,
      lessons_completed = lessons_completed + CASE WHEN NEW.activity_type = 'lesson_complete' THEN 1 ELSE 0 END,
      quizzes_completed = quizzes_completed + CASE WHEN NEW.activity_type = 'quiz_complete' THEN 1 ELSE 0 END,
      flashcard_sessions_completed = flashcard_sessions_completed + CASE WHEN NEW.activity_type = 'flashcard_session' THEN 1 ELSE 0 END
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update learner_stats on XP transaction insert
DROP TRIGGER IF EXISTS on_xp_transaction_update_stats ON learner_xp_transactions;
CREATE TRIGGER on_xp_transaction_update_stats
  AFTER INSERT ON learner_xp_transactions
  FOR EACH ROW EXECUTE FUNCTION update_learner_stats_on_xp_transaction();

-- Function to update course_xp_summary when XP transaction is inserted
CREATE OR REPLACE FUNCTION update_course_xp_summary_on_xp_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Upsert course XP summary
  INSERT INTO course_xp_summary (user_id, course_id, total_xp)
  VALUES (NEW.user_id, NEW.course_id, NEW.xp_amount)
  ON CONFLICT (user_id, course_id)
  DO UPDATE SET total_xp = course_xp_summary.total_xp + NEW.xp_amount;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update course_xp_summary on XP transaction insert
DROP TRIGGER IF EXISTS on_xp_transaction_update_course_summary ON learner_xp_transactions;
CREATE TRIGGER on_xp_transaction_update_course_summary
  AFTER INSERT ON learner_xp_transactions
  FOR EACH ROW EXECUTE FUNCTION update_course_xp_summary_on_xp_transaction();

-- Function to check and award badges after learner_stats update
CREATE OR REPLACE FUNCTION check_badge_criteria_on_stats_update()
RETURNS TRIGGER AS $$
DECLARE
  badge_record RECORD;
  criteria jsonb;
  should_award boolean;
BEGIN
  -- Loop through all badge definitions
  FOR badge_record IN SELECT * FROM badge_definitions LOOP
    -- Skip if user already has this badge
    IF EXISTS (
      SELECT 1 FROM learner_badges 
      WHERE user_id = NEW.user_id AND badge_id = badge_record.id
    ) THEN
      CONTINUE;
    END IF;
    
    criteria := badge_record.criteria_json;
    should_award := false;
    
    -- Check criteria based on badge category
    CASE badge_record.category
      WHEN 'streak' THEN
        -- Check streak milestones
        IF criteria->>'type' = 'streak_days' THEN
          should_award := NEW.current_streak >= (criteria->>'value')::integer;
        END IF;
        
      WHEN 'xp' THEN
        -- Check XP milestones
        IF criteria->>'type' = 'total_xp' THEN
          should_award := NEW.total_xp >= (criteria->>'value')::integer;
        END IF;
        
      WHEN 'quiz' THEN
        -- Check quiz-related badges
        IF criteria->>'type' = 'perfect_scores' THEN
          -- Count perfect quiz scores (100%)
          SELECT COUNT(*) >= (criteria->>'value')::integer INTO should_award
          FROM quiz_attempts
          WHERE user_id = NEW.user_id AND percentage = 100;
        END IF;
        
      WHEN 'course' THEN
        -- Check course completion badges
        IF criteria->>'type' = 'courses_completed' THEN
          -- Count courses where all lessons are completed
          SELECT COUNT(DISTINCT c.id) >= (criteria->>'value')::integer INTO should_award
          FROM courses c
          WHERE c.owner_id = NEW.user_id
          AND NOT EXISTS (
            SELECT 1 FROM lessons l
            WHERE l.course_id = c.id
            AND NOT EXISTS (
              SELECT 1 FROM user_progress up
              WHERE up.lesson_id = l.id
              AND up.user_id = NEW.user_id
              AND up.completed = true
            )
          );
        END IF;
        
      WHEN 'special' THEN
        -- Special badges (like early adopter) are awarded manually or via specific logic
        NULL;
        
      ELSE
        NULL;
    END CASE;
    
    -- Award badge if criteria met
    IF should_award THEN
      INSERT INTO learner_badges (user_id, badge_id)
      VALUES (NEW.user_id, badge_record.id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check badge criteria after learner_stats update
DROP TRIGGER IF EXISTS on_learner_stats_check_badges ON learner_stats;
CREATE TRIGGER on_learner_stats_check_badges
  AFTER INSERT OR UPDATE ON learner_stats
  FOR EACH ROW EXECUTE FUNCTION check_badge_criteria_on_stats_update();
