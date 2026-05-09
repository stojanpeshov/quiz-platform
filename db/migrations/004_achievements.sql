-- ============================================================
-- Achievements System + Platform Settings
--
-- The original Supabase migration also defined evaluate_nightly_achievements()
-- and registered a pg_cron job. Both are removed here; the same logic is
-- implemented by NightlyAchievementJob in the Spring Boot backend.
-- Authorization is enforced at the application layer (no Postgres RLS).
-- ============================================================

-- Admin-defined achievement templates
create table achievements (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  description     text not null,
  icon            text not null,
  condition_type  text not null check (condition_type in (
    'score_threshold', 'score_top_n', 'completion_count',
    'publish_count', 'points_milestone', 'quiz_attempt_count',
    'quiz_avg_rating', 'rating_top_n'
  )),
  condition_value jsonb not null,
  scope           text not null default 'global' check (scope in ('global', 'per_quiz')),
  -- 'self'        = the user who triggered the event earns it
  -- 'quiz_author' = the quiz's author earns it (evaluated nightly)
  earner_type     text not null default 'self' check (earner_type in ('self', 'quiz_author')),
  card_type       text not null check (card_type in (
    'score_milestone', 'top_performer', 'completion_milestone',
    'quiz_published', 'points_milestone', 'quiz_popular'
  )),
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Earned achievements (append-only per scope rules)
create table user_achievements (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references users(id) on delete cascade,
  achievement_id      uuid not null references achievements(id) on delete cascade,
  earned_at           timestamptz not null default now(),
  shared_to_teams_at  timestamptz,
  ref_quiz_id         uuid references quizzes(id) on delete set null,
  ref_attempt_id      uuid references attempts(id) on delete set null
);

-- Global achievements: earned once per user
create unique index ua_global_unique
  on user_achievements(user_id, achievement_id)
  where ref_quiz_id is null;

-- Per-quiz achievements: earned once per user per quiz
create unique index ua_per_quiz_unique
  on user_achievements(user_id, achievement_id, ref_quiz_id)
  where ref_quiz_id is not null;

create index idx_ua_user_id    on user_achievements(user_id);
create index idx_ua_earned_at  on user_achievements(earned_at desc);

-- Platform-wide key/value settings (admin-managed via UI)
create table platform_settings (
  key   text primary key,
  value text not null default ''
);

-- ------------------------------------------------------------
-- Seed: platform settings
-- ------------------------------------------------------------
insert into platform_settings (key, value) values
  ('teams_webhook_url',    ''),
  ('teams_notify_enabled', 'true');

-- ------------------------------------------------------------
-- Seed: 14 default achievements
-- ------------------------------------------------------------
insert into achievements (name, description, icon, condition_type, condition_value, scope, earner_type, card_type) values
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
