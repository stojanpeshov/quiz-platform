-- ============================================================
-- Row Level Security
-- We use session-local config variables (set via `select set_config(...)`)
-- because our Node server uses the service-role key with per-request
-- claim injection (see lib/supabase.ts → withUserContext).
-- ============================================================

alter table users enable row level security;
alter table quizzes enable row level security;
alter table attempts enable row level security;
alter table ratings enable row level security;
alter table point_events enable row level security;

create or replace function current_user_id()
returns uuid language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid;
$$;

create or replace function current_user_is_admin()
returns boolean language sql stable as $$
  select coalesce(current_setting('app.user_role', true) = 'admin', false);
$$;

-- users: names/points public (for leaderboards); updates only self
create policy users_select_public on users for select using (true);
create policy users_update_self on users for update using (id = current_user_id());

-- quizzes: draft visible only to owner/admin; everyone sees published & archived
create policy quizzes_select on quizzes for select using (
  status in ('published', 'archived')
  or author_id = current_user_id()
  or current_user_is_admin()
);
create policy quizzes_insert_own on quizzes for insert
  with check (author_id = current_user_id());
create policy quizzes_update_owner_or_admin on quizzes for update
  using (author_id = current_user_id() or current_user_is_admin());
create policy quizzes_delete_owner_or_admin on quizzes for delete
  using (author_id = current_user_id() or current_user_is_admin());

-- attempts: reads open for per-quiz leaderboards; insert only self
create policy attempts_select_all on attempts for select using (true);
create policy attempts_insert_self on attempts for insert
  with check (user_id = current_user_id());

-- ratings: reads open; writes only self (delete: self or admin)
create policy ratings_select_all on ratings for select using (true);
create policy ratings_insert_self on ratings for insert
  with check (user_id = current_user_id());
create policy ratings_update_self on ratings for update
  using (user_id = current_user_id());
create policy ratings_delete_self_or_admin on ratings for delete
  using (user_id = current_user_id() or current_user_is_admin());

-- point_events: read self or admin; inserts only via award_points() SECURITY DEFINER
create policy point_events_select_self_or_admin on point_events for select
  using (user_id = current_user_id() or current_user_is_admin());

-- Set current user for this transaction (used by RLS policies)
create or replace function set_current_user(p_user_id uuid, p_role text)
returns void language plpgsql as $$
begin
  perform set_config('app.user_id', p_user_id::text, true);
  perform set_config('app.user_role', coalesce(p_role, 'user'), true);
end;
$$;
