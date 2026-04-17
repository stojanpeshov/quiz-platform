-- ============================================================
-- Add difficulty level to quizzes
-- ============================================================

-- Add difficulty column to quizzes table
ALTER TABLE quizzes
ADD COLUMN difficulty text CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'));

-- Set default for existing quizzes
UPDATE quizzes SET difficulty = 'intermediate' WHERE difficulty IS NULL;

-- Make it NOT NULL after setting defaults
ALTER TABLE quizzes ALTER COLUMN difficulty SET DEFAULT 'intermediate';
ALTER TABLE quizzes ALTER COLUMN difficulty SET NOT NULL;

-- Create index for filtering by difficulty
CREATE INDEX idx_quizzes_difficulty ON quizzes(difficulty) WHERE status = 'published';
