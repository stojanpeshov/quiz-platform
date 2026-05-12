-- ============================================================
-- Quiz Platform — Initial Schema
--
-- Differences from the original Supabase migration:
--   * No pg_cron extension or schedules — replaced by Spring @Scheduled jobs.
--   * No enforce_attempt_cap trigger — replaced by AttemptService transaction.
--   * No refresh_quiz_aggregates triggers — replaced by QuizAggregatesService.
--   * No award_points / recompute_bonuses functions — implemented in Java.
--   * No Postgres RLS — authorization is enforced at the application layer.
--   * Difficulty column included from the start (was migration 006).
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- users
-- Linked to Entra ID via azure_oid (oid claim from the JWT).
-- ------------------------------------------------------------
create table users (
  id uuid primary key default uuid_generate_v4(),
  azure_oid text unique not null,
  email text unique not null,
  name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  total_points integer not null default 0,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create index idx_users_email on users(email);
create index idx_users_total_points on users(total_points desc);

-- ------------------------------------------------------------
-- quizzes
-- status lifecycle: draft → published → archived.
-- Cached aggregates (avg_rating, rating_count, attempt_count,
-- unique_attempter_count) are maintained by QuizAggregatesService
-- in the .NET application layer.
-- ------------------------------------------------------------
create table quizzes (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text not null default '',
  questions jsonb not null,
  question_count integer not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  difficulty text not null default 'intermediate' check (difficulty in ('beginner', 'intermediate', 'advanced')),

  avg_rating numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  attempt_count integer not null default 0,
  unique_attempter_count integer not null default 0,

  -- Versioning: republishing after edit forks a new draft pointing
  -- back to the archived previous version.
  parent_quiz_id uuid references quizzes(id) on delete set null,

  created_at timestamptz not null default now(),
  published_at timestamptz,
  archived_at timestamptz
);

create index idx_quizzes_author on quizzes(author_id);
create index idx_quizzes_status on quizzes(status);
create index idx_quizzes_published on quizzes(status, published_at desc) where status = 'published';
create index idx_quizzes_rating on quizzes(avg_rating desc) where status = 'published';
create index idx_quizzes_attempts on quizzes(attempt_count desc) where status = 'published';
create index idx_quizzes_difficulty on quizzes(difficulty) where status = 'published';

-- ------------------------------------------------------------
-- attempts
-- Hard cap of 3 per (user, quiz) is enforced transactionally in
-- AttemptService.submit; the unique constraint here is the
-- second line of defence.
-- ------------------------------------------------------------
create table attempts (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  score_pct integer not null check (score_pct between 0 and 100),
  correct_count integer not null,
  total_count integer not null,
  answers jsonb not null,
  attempt_number integer not null check (attempt_number between 1 and 3),
  completed_at timestamptz not null default now(),
  unique(quiz_id, user_id, attempt_number)
);

create index idx_attempts_user on attempts(user_id);
create index idx_attempts_quiz on attempts(quiz_id);
create index idx_attempts_quiz_user_best on attempts(quiz_id, user_id, score_pct desc);

-- ------------------------------------------------------------
-- ratings — one per user per quiz
-- ------------------------------------------------------------
create table ratings (
  quiz_id uuid not null references quizzes(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (quiz_id, user_id)
);

create index idx_ratings_quiz on ratings(quiz_id);

-- ------------------------------------------------------------
-- point_events — append-only audit log;
-- users.total_points is the cached sum, maintained by PointsService.
-- ------------------------------------------------------------
create table point_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  event_type text not null,
  points integer not null,
  description text not null,
  ref_quiz_id uuid references quizzes(id) on delete set null,
  ref_attempt_id uuid references attempts(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_point_events_user on point_events(user_id, created_at desc);
create index idx_point_events_type on point_events(event_type);

-- ------------------------------------------------------------
-- bonus_snapshot — cached previous-day bonus values;
-- BonusRecomputeJob writes DELTA point_events against this so
-- users.total_points stays equal to sum(point_events.points).
-- ------------------------------------------------------------
create table bonus_snapshot (
  user_id uuid not null references users(id) on delete cascade,
  bonus_type text not null,
  points integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, bonus_type)
);
