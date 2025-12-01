-- Migration: Create flashcard and quiz tables for the flashcard-quiz-generation feature
-- Requirements: 8.1, 8.2, 8.3

-- Flashcards table
CREATE TABLE flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  front_text TEXT NOT NULL,
  back_text TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_flashcards_lesson_id ON flashcards(lesson_id);

-- Flashcard sessions table
CREATE TABLE flashcard_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  total_cards INTEGER NOT NULL,
  mastered_cards INTEGER NOT NULL,
  review_cards INTEGER NOT NULL,
  responses_json JSONB NOT NULL DEFAULT '[]',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_flashcard_sessions_user_lesson ON flashcard_sessions(user_id, lesson_id);

-- Quizzes table
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lesson_id)
);

CREATE INDEX idx_quizzes_lesson_id ON quizzes(lesson_id);

-- Quiz questions table
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false')),
  options JSONB NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);


-- Quiz attempts table
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  answers_json JSONB NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_id);

-- Enable Row Level Security
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Flashcards: readable by authenticated users
CREATE POLICY "Flashcards are viewable by authenticated users"
  ON flashcards FOR SELECT
  TO authenticated
  USING (true);

-- Flashcards: insertable by service role (edge functions)
CREATE POLICY "Flashcards are insertable by service role"
  ON flashcards FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Flashcards: deletable by service role (for regeneration)
CREATE POLICY "Flashcards are deletable by service role"
  ON flashcards FOR DELETE
  TO service_role
  USING (true);

-- Flashcard sessions: users can only see their own
CREATE POLICY "Users can view their own flashcard sessions"
  ON flashcard_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcard sessions"
  ON flashcard_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Quizzes: readable by authenticated users
CREATE POLICY "Quizzes are viewable by authenticated users"
  ON quizzes FOR SELECT
  TO authenticated
  USING (true);

-- Quizzes: insertable by service role (edge functions)
CREATE POLICY "Quizzes are insertable by service role"
  ON quizzes FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Quizzes: updatable by service role (for regeneration)
CREATE POLICY "Quizzes are updatable by service role"
  ON quizzes FOR UPDATE
  TO service_role
  USING (true);

-- Quizzes: deletable by service role (for regeneration)
CREATE POLICY "Quizzes are deletable by service role"
  ON quizzes FOR DELETE
  TO service_role
  USING (true);

-- Quiz questions: readable by authenticated users
CREATE POLICY "Quiz questions are viewable by authenticated users"
  ON quiz_questions FOR SELECT
  TO authenticated
  USING (true);

-- Quiz questions: insertable by service role (edge functions)
CREATE POLICY "Quiz questions are insertable by service role"
  ON quiz_questions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Quiz questions: deletable by service role (for regeneration)
CREATE POLICY "Quiz questions are deletable by service role"
  ON quiz_questions FOR DELETE
  TO service_role
  USING (true);

-- Quiz attempts: users can only see their own
CREATE POLICY "Users can view their own quiz attempts"
  ON quiz_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz attempts"
  ON quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_flashcards_updated_at
  BEFORE UPDATE ON flashcards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
