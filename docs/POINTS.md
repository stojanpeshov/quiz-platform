# Point System

Every point award is logged in `point_events`. `users.total_points` is the cached sum.

## Base points (event-driven, permanent)

| Action | Points |
|---|---|
| Publish a quiz (first time per quiz) | **+20** |
| Complete a quiz attempt | **+5** |
| First time scoring ≥ 80% on a quiz | **+10** |
| First time scoring 100% on a quiz | **+15** (stacks with +10) |
| Rate a quiz (first time per quiz) | **+1** |

## Bonus points (recalculated nightly at 02:00 UTC)

These are recomputed based on current state and written as **deltas** against the previous day's snapshot. This keeps `total_points = sum(point_events)` always true.

### 1. Owner quality bonus
For quizzes with ≥ 3 ratings:
```
bonus = round(avg_rating × rating_count × 2)
```
Summed across all your published quizzes. Example: a quiz with 4.5 stars and 10 ratings = 90 points.

### 2. Owner popularity bonus
```
bonus = sum(attempt_count) across your published quizzes
```

### 3. Top-performer bonus
For every quiz with ≥ 5 unique attempters, the top 5 users by best score get bonuses (tiebreaker = fewer attempts used):

| Rank | Points |
|---|---|
| 1st | +25 |
| 2nd | +15 |
| 3rd | +10 |
| 4th | +5 |
| 5th | +3 |

## Why the nightly recompute

Owner + top-performer bonuses depend on leaderboard state that changes as others take/rate quizzes. Rather than recompute on every event, we take a snapshot nightly and write the diff. This keeps the system cheap and the history honest — every change shows up as a visible event on your point history page.

## Anti-gaming

- Cannot take or rate your own quiz.
- Rating requires ≥ 1 attempt on the quiz first.
- 3-attempt hard cap per (user, quiz).
- Tiebreaker rewards fewer attempts — brute-forcing the cap hurts ranking.
- First-time bonuses only fire once per user per quiz.

## Tuning

All point values are constants in `lib/points.ts` and `supabase/migrations/003_functions.sql`. Change them, run the migration fragment, and next night's recompute will re-level everyone.
