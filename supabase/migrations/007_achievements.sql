-- ============================================================
-- Achievements System + Platform Settings
-- ============================================================

-- Admin-defined achievement templates
CREATE TABLE achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  icon            TEXT NOT NULL,
  condition_type  TEXT NOT NULL CHECK (condition_type IN (
    'score_threshold', 'score_top_n', 'completion_count',
    'publish_count', 'points_milestone', 'quiz_attempt_count',
    'quiz_avg_rating', 'rating_top_n'
  )),
  condition_value JSONB NOT NULL,
  scope           TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'per_quiz')),
  -- 'self' = the user who triggered the event earns it
  -- 'quiz_author' = the quiz's author earns it (evaluated nightly)
  earner_type     TEXT NOT NULL DEFAULT 'self' CHECK (earner_type IN ('self', 'quiz_author')),
  card_type       TEXT NOT NULL CHECK (card_type IN (
    'score_milestone', 'top_performer', 'completion_milestone',
    'quiz_published', 'points_milestone', 'quiz_popular'
  )),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Earned achievements (append-only per scope rules)
CREATE TABLE user_achievements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id      UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shared_to_teams_at  TIMESTAMPTZ,
  ref_quiz_id         UUID REFERENCES quizzes(id) ON DELETE SET NULL,
  ref_attempt_id      UUID REFERENCES attempts(id) ON DELETE SET NULL
);

-- Global achievements: earned once per user
CREATE UNIQUE INDEX ua_global_unique
  ON user_achievements(user_id, achievement_id)
  WHERE ref_quiz_id IS NULL;

-- Per-quiz achievements: earned once per user per quiz
CREATE UNIQUE INDEX ua_per_quiz_unique
  ON user_achievements(user_id, achievement_id, ref_quiz_id)
  WHERE ref_quiz_id IS NOT NULL;

CREATE INDEX idx_ua_user_id ON user_achievements(user_id);
CREATE INDEX idx_ua_earned_at ON user_achievements(earned_at DESC);

-- Platform-wide key/value settings (admin-managed via UI)
CREATE TABLE platform_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

INSERT INTO platform_settings (key, value) VALUES
  ('teams_webhook_url',    ''),
  ('teams_notify_enabled', 'true');

-- ============================================================
-- Default achievements seed
-- ============================================================

INSERT INTO achievements (name, description, icon, condition_type, condition_value, scope, earner_type, card_type) VALUES
  -- Global / self
  ('First Steps',      'Complete your first quiz',             '🎯', 'completion_count',   '{"n": 1}',             'global',   'self',        'completion_milestone'),
  ('On a Roll',        'Complete 5 quizzes',                   '🔥', 'completion_count',   '{"n": 5}',             'global',   'self',        'completion_milestone'),
  ('Knowledge Seeker', 'Complete 25 quizzes',                  '📚', 'completion_count',   '{"n": 25}',            'global',   'self',        'completion_milestone'),
  ('Knowledge Sharer', 'Publish your first quiz',              '📝', 'publish_count',      '{"n": 1}',             'global',   'self',        'quiz_published'),
  ('Quiz Author',      'Publish 5 quizzes',                    '✍️',  'publish_count',      '{"n": 5}',             'global',   'self',        'quiz_published'),
  ('Rising Star',      'Reach 100 total points',               '⭐', 'points_milestone',   '{"points": 100}',      'global',   'self',        'points_milestone'),
  ('Expert',           'Reach 500 total points',               '🏆', 'points_milestone',   '{"points": 500}',      'global',   'self',        'points_milestone'),
  -- Per-quiz / self (taker)
  ('High Achiever',    'Score 80% or above on a quiz',         '🎖️',  'score_threshold',    '{"min_pct": 80}',      'per_quiz', 'self',        'score_milestone'),
  ('Perfectionist',    'Score 100% on a quiz',                 '💯', 'score_threshold',    '{"min_pct": 100}',     'per_quiz', 'self',        'score_milestone'),
  ('Top 5',            'Rank in the top 5 on any quiz',        '🥇', 'score_top_n',        '{"n": 5}',             'per_quiz', 'self',        'top_performer'),
  ('Top of the Class', 'Rank #1 on any quiz',                  '👑', 'score_top_n',        '{"n": 1}',             'per_quiz', 'self',        'top_performer'),
  -- Per-quiz / quiz_author
  ('Popular Quiz',     'Own a quiz with 20 or more attempts',  '📊', 'quiz_attempt_count', '{"n": 20}',            'per_quiz', 'quiz_author', 'quiz_popular'),
  ('Well Received',    'Own a quiz with 4.5+ average rating',  '💎', 'quiz_avg_rating',    '{"min_rating": 4.5}',  'per_quiz', 'quiz_author', 'quiz_popular'),
  ('Top Rated',        'Own a quiz ranked in the top 5',       '🏅', 'rating_top_n',       '{"n": 5}',             'per_quiz', 'quiz_author', 'quiz_popular');

-- ============================================================
-- Nightly achievement evaluation (rank-based + author-based)
-- Called by pg_cron alongside recompute_bonuses()
-- ============================================================

CREATE OR REPLACE FUNCTION evaluate_nightly_achievements()
RETURNS VOID AS $$
DECLARE
  ach RECORD;
  r   RECORD;
BEGIN
  -- score_top_n: top-N scorers per quiz earn the achievement
  FOR ach IN
    SELECT * FROM achievements
    WHERE active = TRUE AND condition_type = 'score_top_n'
  LOOP
    FOR r IN
      WITH best_per_user AS (
        SELECT quiz_id, user_id,
               MAX(score_pct)  AS best_score,
               COUNT(*)        AS attempts_used
        FROM attempts
        GROUP BY quiz_id, user_id
      ),
      ranked AS (
        SELECT b.quiz_id, b.user_id,
               ROW_NUMBER() OVER (
                 PARTITION BY b.quiz_id
                 ORDER BY b.best_score DESC, b.attempts_used ASC
               ) AS rnk
        FROM best_per_user b
        JOIN quizzes q ON q.id = b.quiz_id
        WHERE q.status = 'published'
      )
      SELECT quiz_id, user_id FROM ranked
      WHERE rnk <= (ach.condition_value->>'n')::int
    LOOP
      INSERT INTO user_achievements (user_id, achievement_id, ref_quiz_id)
      VALUES (r.user_id, ach.id, r.quiz_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- rating_top_n: top-N quizzes by avg_rating → quiz author earns the achievement
  FOR ach IN
    SELECT * FROM achievements
    WHERE active = TRUE AND condition_type = 'rating_top_n'
  LOOP
    FOR r IN
      SELECT id AS quiz_id, author_id AS user_id
      FROM (
        SELECT id, author_id,
               ROW_NUMBER() OVER (ORDER BY avg_rating DESC, rating_count DESC) AS rnk
        FROM quizzes
        WHERE status = 'published' AND rating_count >= 3
      ) sub
      WHERE rnk <= (ach.condition_value->>'n')::int
    LOOP
      INSERT INTO user_achievements (user_id, achievement_id, ref_quiz_id)
      VALUES (r.user_id, ach.id, r.quiz_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- quiz_attempt_count: quiz author earns it when their quiz reaches N total attempts
  FOR ach IN
    SELECT * FROM achievements
    WHERE active = TRUE AND condition_type = 'quiz_attempt_count'
  LOOP
    FOR r IN
      SELECT id AS quiz_id, author_id AS user_id
      FROM quizzes
      WHERE status = 'published'
        AND attempt_count >= (ach.condition_value->>'n')::int
    LOOP
      INSERT INTO user_achievements (user_id, achievement_id, ref_quiz_id)
      VALUES (r.user_id, ach.id, r.quiz_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- quiz_avg_rating: quiz author earns it when avg_rating hits threshold (min 3 ratings)
  FOR ach IN
    SELECT * FROM achievements
    WHERE active = TRUE AND condition_type = 'quiz_avg_rating'
  LOOP
    FOR r IN
      SELECT id AS quiz_id, author_id AS user_id
      FROM quizzes
      WHERE status = 'published'
        AND rating_count >= 3
        AND avg_rating >= (ach.condition_value->>'min_rating')::numeric
    LOOP
      INSERT INTO user_achievements (user_id, achievement_id, ref_quiz_id)
      VALUES (r.user_id, ach.id, r.quiz_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Extend the nightly cron to also evaluate achievements
SELECT cron.schedule(
  'evaluate-achievements-nightly',
  '5 2 * * *',
  $$ SELECT evaluate_nightly_achievements(); $$
);
