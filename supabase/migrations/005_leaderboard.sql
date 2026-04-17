-- ============================================================
-- Per-quiz leaderboard function
-- ============================================================

create or replace function per_quiz_leaderboard(p_quiz_id uuid)
returns table (
  user_id uuid,
  user_name text,
  best_score integer,
  attempts_used integer,
  rank integer
) as $$
  with best_per_user as (
    select a.user_id,
           max(a.score_pct) as best_score,
           count(*)::int as attempts_used
    from attempts a
    where a.quiz_id = p_quiz_id
    group by a.user_id
  )
  select b.user_id,
         u.name as user_name,
         b.best_score,
         b.attempts_used,
         row_number() over (order by b.best_score desc, b.attempts_used asc)::int as rank
  from best_per_user b
  join users u on u.id = b.user_id
  order by rank
  limit 10;
$$ language sql stable;
