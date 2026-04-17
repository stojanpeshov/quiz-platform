-- ============================================================
-- Quiz Platform — Initial Schema
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- users
-- Linked to Entra ID via azure_oid (oid claim from the token)
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
-- status lifecycle: draft → published → archived
-- ------------------------------------------------------------
create table quizzes (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text not null default '',
  questions jsonb not null,
  question_count integer not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),

  -- Cached aggregates (updated by triggers / cron)
  avg_rating numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  attempt_count integer not null default 0,
  unique_attempter_count integer not null default 0,

  -- Versioning: when a quiz is republished after edit, a new row is created
  -- pointing to the previous version via parent_quiz_id
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

-- ------------------------------------------------------------
-- attempts
-- Hard cap of 3 attempts per (user, quiz) enforced by trigger below
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
-- point_events — append-only audit log; users.total_points is the cached sum
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
-- Trigger: enforce 3-attempt cap
-- ------------------------------------------------------------
create or replace function enforce_attempt_cap()
returns trigger as $$
declare
  cnt integer;
begin
  select count(*) into cnt from attempts
    where quiz_id = new.quiz_id and user_id = new.user_id;
  if cnt >= 3 then
    raise exception 'Attempt cap of 3 reached for this quiz';
  end if;
  new.attempt_number := cnt + 1;
  return new;
end;
$$ language plpgsql;

create trigger trg_enforce_attempt_cap
  before insert on attempts
  for each row execute function enforce_attempt_cap();

-- ------------------------------------------------------------
-- Trigger: update cached aggregates on ratings/attempts change
-- ------------------------------------------------------------
create or replace function refresh_quiz_aggregates(p_quiz_id uuid)
returns void as $$
begin
  update quizzes set
    avg_rating = coalesce((select round(avg(stars)::numeric, 2) from ratings where quiz_id = p_quiz_id), 0),
    rating_count = (select count(*) from ratings where quiz_id = p_quiz_id),
    attempt_count = (select count(*) from attempts where quiz_id = p_quiz_id),
    unique_attempter_count = (select count(distinct user_id) from attempts where quiz_id = p_quiz_id)
  where id = p_quiz_id;
end;
$$ language plpgsql;

create or replace function trg_refresh_on_rating()
returns trigger as $$
begin
  perform refresh_quiz_aggregates(coalesce(new.quiz_id, old.quiz_id));
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger trg_rating_aggregates
  after insert or update or delete on ratings
  for each row execute function trg_refresh_on_rating();

create or replace function trg_refresh_on_attempt()
returns trigger as $$
begin
  perform refresh_quiz_aggregates(new.quiz_id);
  return new;
end;
$$ language plpgsql;

create trigger trg_attempt_aggregates
  after insert on attempts
  for each row execute function trg_refresh_on_attempt();
