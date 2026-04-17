-- ============================================================
-- Point System Functions
-- ============================================================

-- Append a point event and update user total atomically
create or replace function award_points(
  p_user_id uuid,
  p_event_type text,
  p_points integer,
  p_description text,
  p_ref_quiz_id uuid default null,
  p_ref_attempt_id uuid default null
) returns uuid as $$
declare
  new_id uuid;
begin
  insert into point_events (user_id, event_type, points, description, ref_quiz_id, ref_attempt_id)
    values (p_user_id, p_event_type, p_points, p_description, p_ref_quiz_id, p_ref_attempt_id)
    returning id into new_id;
  update users set total_points = total_points + p_points where id = p_user_id;
  return new_id;
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------
-- Cached bonus tables — track yesterday's bonus values so we
-- can write DELTA events instead of duplicating points
-- ------------------------------------------------------------
create table if not exists bonus_snapshot (
  user_id uuid not null,
  bonus_type text not null,
  points integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, bonus_type)
);

-- ------------------------------------------------------------
-- Nightly recomputation entry point
-- Runs three buckets and writes deltas
-- ------------------------------------------------------------
create or replace function recompute_bonuses()
returns void as $$
declare
  r record;
  old_pts integer;
  new_pts integer;
  delta integer;
begin
  -- 1) Owner quality bonus: avg_rating * rating_count * 2 (min 3 ratings)
  for r in
    select author_id as user_id,
           coalesce(sum(round(avg_rating * rating_count * 2)), 0)::int as pts
    from quizzes
    where status = 'published' and rating_count >= 3
    group by author_id
  loop
    select coalesce(points, 0) into old_pts
      from bonus_snapshot where user_id = r.user_id and bonus_type = 'owner_quality';
    old_pts := coalesce(old_pts, 0);
    new_pts := r.pts;
    delta := new_pts - old_pts;
    if delta != 0 then
      perform award_points(
        r.user_id, 'owner_quality_delta', delta,
        format('Owner quality bonus recalculated (%s → %s)', old_pts, new_pts)
      );
      insert into bonus_snapshot (user_id, bonus_type, points)
        values (r.user_id, 'owner_quality', new_pts)
        on conflict (user_id, bonus_type) do update set points = excluded.points, updated_at = now();
    end if;
  end loop;

  -- 2) Owner popularity bonus: attempt_count * 1
  for r in
    select author_id as user_id, coalesce(sum(attempt_count), 0)::int as pts
    from quizzes where status = 'published'
    group by author_id
  loop
    select coalesce(points, 0) into old_pts
      from bonus_snapshot where user_id = r.user_id and bonus_type = 'owner_popularity';
    old_pts := coalesce(old_pts, 0);
    new_pts := r.pts;
    delta := new_pts - old_pts;
    if delta != 0 then
      perform award_points(
        r.user_id, 'owner_popularity_delta', delta,
        format('Owner popularity bonus recalculated (%s → %s)', old_pts, new_pts)
      );
      insert into bonus_snapshot (user_id, bonus_type, points)
        values (r.user_id, 'owner_popularity', new_pts)
        on conflict (user_id, bonus_type) do update set points = excluded.points, updated_at = now();
    end if;
  end loop;

  -- 3) Top-performer bonuses: top 5 by best_score per quiz (min 5 attempters)
  --    Tiebreaker: fewer attempts used wins
  for r in
    with best_per_user as (
      select quiz_id, user_id,
             max(score_pct) as best_score,
             count(*) as attempts_used
      from attempts group by quiz_id, user_id
    ),
    ranked as (
      select b.quiz_id, b.user_id, b.best_score, b.attempts_used,
             row_number() over (
               partition by b.quiz_id
               order by b.best_score desc, b.attempts_used asc
             ) as rank
      from best_per_user b
      join quizzes q on q.id = b.quiz_id
      where q.status = 'published' and q.unique_attempter_count >= 5
    )
    select user_id, sum(
      case rank when 1 then 25 when 2 then 15 when 3 then 10 when 4 then 5 when 5 then 3 else 0 end
    )::int as pts
    from ranked
    where rank <= 5
    group by user_id
  loop
    select coalesce(points, 0) into old_pts
      from bonus_snapshot where user_id = r.user_id and bonus_type = 'top_performer';
    old_pts := coalesce(old_pts, 0);
    new_pts := r.pts;
    delta := new_pts - old_pts;
    if delta != 0 then
      perform award_points(
        r.user_id, 'top_performer_delta', delta,
        format('Top-performer bonus recalculated (%s → %s)', old_pts, new_pts)
      );
      insert into bonus_snapshot (user_id, bonus_type, points)
        values (r.user_id, 'top_performer', new_pts)
        on conflict (user_id, bonus_type) do update set points = excluded.points, updated_at = now();
    end if;
  end loop;
end;
$$ language plpgsql security definer;
