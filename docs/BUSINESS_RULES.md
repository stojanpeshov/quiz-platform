# Business Rules & Feature Reference

This document captures the complete business logic of the quiz platform — everything that lives in behaviour rather than schema. It is intended as the authoritative reference for future development, regardless of the tech stack being used.

---

## Platform overview

Internal quiz platform for employees. Users sign in with a company Microsoft 365 account (single-tenant Entra ID). There are two roles: **user** (default) and **admin**. Admins promote other users via the admin UI; the first admin must be promoted directly in the database (`UPDATE users SET role = 'admin'`).

---

## User roles

| Role | What they can do |
|---|---|
| `user` | Create/edit/publish/delete their own quizzes, take and rate others' quizzes, view leaderboards, view their own achievements and points |
| `admin` | Everything a user can + manage all users' roles, view/delete any quiz, view the point event audit log, export attempts as CSV, manage achievement definitions, configure platform settings (Teams webhook) |

**Last-admin guard:** An admin cannot demote themselves if they are the only admin. The system returns `409` in this case.

---

## Quiz lifecycle

Quizzes move through three statuses: `draft → published → archived`.

```
  [draft]  ──publish──►  [published]  ──unpublish──►  [archived]
     ▲                                                      │
     └──────────────── (new draft created) ◄───────────────┘
```

### Rules

- **Draft:** only the author (or admin) can see it. Fully editable via `PATCH /api/quizzes/:id`.
- **Publish:** irreversible in-place. Sets `status = 'published'` and `published_at`. Awards `+20` points to the author (first publish only — idempotent check against `point_events`).
- **Published quiz is immutable** for integrity of scores. If changes are needed, the author uses "Unpublish & Edit":
  1. The published row is archived (`status = 'archived'`, `archived_at` set). All existing attempts and ratings are preserved on the archived row.
  2. A new `draft` row is created with the same content, linked via `parent_quiz_id → archived_row.id`.
  3. The UI redirects to the new draft for editing.
  4. When the draft is re-published, it becomes a separate published quiz with its own leaderboard.
- **Delete:** owner or admin can delete any quiz in any status. Cascades to attempts and ratings via FK.
- Only the **owner or admin** can publish/unpublish/delete.

### Answer visibility

The API strips correct answers from the quiz payload before sending it to a taker (`GET /api/quizzes/:id`). The full payload including answers is only returned to the owner or an admin.

---

## Question types and grading

Four question types, all defined in the same schema. All types support an optional `explanation` field that is shown to the taker after submitting.

### `single_choice`
- Has `options` (2–6 strings) and `correctAnswer` (zero-based index).
- Correct when the submitted index exactly matches `correctAnswer`.

### `multiple_choice`
- Has `options` (2–6 strings) and `correctAnswers` (array of zero-based indices, at least 1, no duplicates).
- Correct when the submitted set of indices **exactly matches** the correct set — partial credit is not given.

### `true_false`
- No `options`. `correctAnswer` is a boolean.
- Correct when the submitted boolean exactly matches.

### `short_text`
- No `options`. `correctAnswer` is a string (max 200 chars).
- Correct when the submitted string matches after normalization: `trim()`, `toLowerCase()`, collapse internal whitespace to a single space.

### Score calculation

```
scorePct = round((correctCount / totalCount) * 100)
```

The full per-question result (correct/incorrect + expected answer) is returned to the taker after submit.

---

## Quiz constraints (validation)

| Field | Rule |
|---|---|
| `title` | 3–120 characters |
| `description` | 0–500 characters |
| `difficulty` | `beginner`, `intermediate`, `advanced` (default: `intermediate`) |
| `questions` | 1–50 questions |
| `question.question` | 3–1000 characters |
| `option` strings | 1–500 characters |
| `correctAnswer` index | must be < options.length |
| `correctAnswers` indices | all must be < options.length; no duplicates |
| `correctAnswer` (short_text) | 1–200 characters |
| `explanation` | 0–1000 characters |

---

## Attempt rules

- A user can attempt a quiz **at most 3 times**. The 4th attempt is rejected with `409`. Enforced server-side (DB constraint or `SELECT … FOR UPDATE` check depending on implementation).
- A user **cannot take their own quiz**.
- Only `published` quizzes are takeable.
- The attempt record stores: `quiz_id`, `user_id`, `score_pct`, `correct_count`, `total_count`, `answers` (the submitted answers), `attempt_number`, `completed_at`.

---

## Rating rules

- A user can rate a quiz **1–5 stars**. Ratings are upserted (one per user per quiz), so re-rating just updates the value.
- A user **cannot rate their own quiz**.
- A user must have **at least one completed attempt** on the quiz before rating.
- Only `published` quizzes can be rated.
- The quiz's `avg_rating` and `rating_count` are aggregate columns kept in sync by the backend.

---

## Point system

See `docs/POINTS.md` for the full rules. Summary:

### Immediate (event-driven)

| Event | Points | Conditions |
|---|---|---|
| Publish a quiz | +20 | Once per quiz (idempotent; checked against `point_events.event_type = 'publish_quiz'`) |
| Complete an attempt | +5 | Every attempt |
| First time scoring ≥ 80% on a quiz | +10 | Once per (user, quiz); stacks with +15 |
| First time scoring 100% on a quiz | +15 | Once per (user, quiz) |
| Rate a quiz | +1 | Once per (user, quiz) |

### Nightly (02:00 UTC, recalculated as deltas)

1. **Owner quality bonus** — `round(avg_rating × rating_count × 2)` per quiz with ≥ 3 ratings.
2. **Owner popularity bonus** — total attempt count across your published quizzes.
3. **Top-performer bonus** — for quizzes with ≥ 5 unique attempters, ranks 1–5 earn +25/+15/+10/+5/+3. Tiebreaker: fewer attempts used wins.

Points are append-only in `point_events`. `users.total_points` is a cached sum kept in sync.

---

## Achievement system

Achievements are admin-defined records in the `achievements` table. There are **14 default achievements** seeded on first deploy.

### Achievement fields

| Field | Values | Meaning |
|---|---|---|
| `condition_type` | see below | What triggers the check |
| `condition_value` | JSONB | Parameters for the condition |
| `scope` | `global`, `per_quiz` | `global` = earned once; `per_quiz` = earned once per quiz |
| `earner_type` | `self`, `quiz_author` | `self` = the acting user earns it; `quiz_author` = the quiz owner earns it |
| `card_type` | see below | Controls the visual card shown in the UI |
| `active` | boolean | Inactive achievements are not evaluated |

### Condition types

| `condition_type` | Parameters | When evaluated | Who earns it |
|---|---|---|---|
| `score_threshold` | `{"min_pct": N}` | Real-time, after attempt | Taker (`self`) |
| `completion_count` | `{"n": N}` | Real-time, after attempt | Taker (`self`) |
| `publish_count` | `{"n": N}` | Real-time, after publish | Publisher (`self`) |
| `points_milestone` | `{"points": N}` | Real-time, after attempt/publish/rate | Acting user (`self`) |
| `score_top_n` | `{"n": N}` | Nightly | Top-N scorers per quiz (`self`) |
| `rating_top_n` | `{"n": N}` | Nightly | Author of top-N rated quizzes (`quiz_author`) |
| `quiz_attempt_count` | `{"n": N}` | Nightly | Author of quizzes with ≥ N attempts (`quiz_author`) |
| `quiz_avg_rating` | `{"min_rating": R}` | Nightly | Author of quizzes with avg_rating ≥ R and ≥ 3 ratings (`quiz_author`) |

### Real-time vs. nightly evaluation

**Real-time** (evaluated inline after each event, must not fail the event's HTTP response):
- `score_threshold`, `completion_count`, `publish_count`, `points_milestone`

**Nightly** (evaluated by a scheduled job at 02:05 UTC):
- `score_top_n`, `rating_top_n`, `quiz_attempt_count`, `quiz_avg_rating`

Achievement awards are idempotent: inserting a duplicate `(user_id, achievement_id)` for global scope, or `(user_id, achievement_id, ref_quiz_id)` for per-quiz scope, is silently ignored (unique index + `ON CONFLICT DO NOTHING`).

### Card types

Used by the UI to pick the visual treatment:

| `card_type` | Used for |
|---|---|
| `completion_milestone` | Completing N quizzes |
| `quiz_published` | Publishing N quizzes |
| `points_milestone` | Reaching N total points |
| `score_milestone` | Score threshold achievements |
| `top_performer` | Ranking in top N |
| `quiz_popular` | Author's quiz reaching a popularity/quality threshold |

### Default achievements

| Name | Condition | Scope | Earner |
|---|---|---|---|
| First Steps | completion_count ≥ 1 | global | self |
| On a Roll | completion_count ≥ 5 | global | self |
| Knowledge Seeker | completion_count ≥ 25 | global | self |
| Knowledge Sharer | publish_count ≥ 1 | global | self |
| Quiz Author | publish_count ≥ 5 | global | self |
| Rising Star | points ≥ 100 | global | self |
| Expert | points ≥ 500 | global | self |
| High Achiever | score ≥ 80% on a quiz | per_quiz | self |
| Perfectionist | score = 100% on a quiz | per_quiz | self |
| Top 5 | rank ≤ 5 on any quiz (nightly) | per_quiz | self |
| Top of the Class | rank = 1 on any quiz (nightly) | per_quiz | self |
| Popular Quiz | quiz has ≥ 20 attempts (nightly) | per_quiz | quiz_author |
| Well Received | quiz avg_rating ≥ 4.5, ≥ 3 ratings (nightly) | per_quiz | quiz_author |
| Top Rated | quiz ranked in top 5 by rating (nightly) | per_quiz | quiz_author |

### Sharing to Teams

A user can share an earned achievement to the configured Microsoft Teams channel once. The `shared_to_teams_at` column is set on share; subsequent share attempts return `409`. The webhook URL is stored in `platform_settings` and never exposed to the client.

---

## Leaderboards

Four views, all accessible to any authenticated user.

| `view` param | What it shows | Sort | Limit |
|---|---|---|---|
| `global` | Top users by total points | `total_points DESC` | 50 |
| `best_rated` | Top quizzes by avg rating (min 3 ratings) | `avg_rating DESC`, then `rating_count DESC` | 20 |
| `most_taken` | Top quizzes by attempt count | `attempt_count DESC` | 20 |
| `per_quiz` | Top 10 users on a specific quiz | Best score DESC, fewer attempts used wins ties | 10 |

The `per_quiz` view requires `?quizId=<uuid>` and is backed by the `per_quiz_leaderboard(uuid)` SQL function (window-function ranking).

---

## API endpoint summary

All endpoints require a valid auth token. `requireAdmin()` additionally enforces the `admin` role.

### Quizzes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/quizzes` | user | List published quizzes. Query params: `mine=1` (own drafts+published), `excludeMine=1`, `sort=recent\|rated\|popular`. Limit 100. |
| `POST` | `/api/quizzes` | user | Create a new draft. Body: `{ quiz: <Quiz> }`. Returns `{ id }`. |
| `GET` | `/api/quizzes/:id` | user | Get quiz. Answers stripped for non-owner/non-admin. Returns `{ quiz, myRating }`. |
| `PATCH` | `/api/quizzes/:id` | user (owner/admin) | Edit draft only. Body: `{ quiz: <Quiz> }`. Returns `409` if not a draft. |
| `DELETE` | `/api/quizzes/:id` | user (owner/admin) | Hard delete. Cascades to attempts/ratings. |
| `POST` | `/api/quizzes/:id/publish` | user (owner/admin) | Publish a draft. Awards +20 points. Evaluates achievements. Returns `{ ok, newlyEarned }`. |
| `POST` | `/api/quizzes/:id/unpublish` | user (owner/admin) | Archives published quiz, creates new draft. Returns `{ newDraftId }`. |
| `POST` | `/api/quizzes/:id/take` | user | Submit answers. Body: `{ answers: Answer[] }`. Enforces 3-attempt cap (409), published-only (409). Awards points, evaluates achievements. Returns full grading result + `newlyEarned`. |
| `POST` | `/api/quizzes/:id/rate` | user | Upsert rating. Body: `{ stars: 1..5 }`. Awards +1 point (first time only). Evaluates achievements. Returns `{ ok, newlyEarned }`. |

### Me

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/me/points` | user | Paginated point event history + total. Query: `page=N` (page size 50). |
| `GET` | `/api/me/achievements` | user | Earned achievements, newest first. Includes linked quiz title. |

### Users

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users/:id/achievements` | user | Any user's public achievement list. |

### Leaderboards

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/leaderboards` | user | Query param `view=global\|best_rated\|most_taken\|per_quiz`. For `per_quiz`, also `quizId=<uuid>`. |

### Teams sharing

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/share/teams` | user | Share an earned achievement to Teams. Body: `{ userAchievementId }`. One-time only (409 if already shared). Requires `teams_notify_enabled=true` and `teams_webhook_url` set. |

### Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/stats` | admin | Dashboard stats: user count, quiz counts, attempt count, rating count, active users (7d), top 5 quizzes/users. |
| `GET` | `/api/admin/users` | admin | All users with stats. Query: `q=` (search by name/email). Limit 200. |
| `PATCH` | `/api/admin/users/:id` | admin | Change user role. Body: `{ role: 'user'\|'admin' }`. Last-admin guard. |
| `GET` | `/api/admin/quizzes` | admin | All quizzes with author info. Limit 500. |
| `GET` | `/api/admin/events` | admin | Paginated point event audit log. Query: `userId=`, `eventType=`, `page=N` (page size 100). |
| `GET` | `/api/admin/export` | admin | CSV download of all attempts with user + quiz info. Limit 10,000. |
| `GET` | `/api/admin/achievements` | admin | List all achievement definitions. |
| `POST` | `/api/admin/achievements` | admin | Create new achievement. Required fields: `name`, `description`, `icon`, `condition_type`, `condition_value`, `scope`, `card_type`. |
| `PATCH` | `/api/admin/achievements/:id` | admin | Update achievement fields. Allowed: `name`, `description`, `icon`, `condition_type`, `condition_value`, `scope`, `earner_type`, `card_type`, `active`. |
| `DELETE` | `/api/admin/achievements/:id` | admin | Hard delete. Blocked (409) if any users have already earned it — deactivate instead. |
| `GET` | `/api/admin/settings` | admin | All platform settings as key/value map. |
| `PATCH` | `/api/admin/settings` | admin | Upsert settings. Allowed keys: `teams_webhook_url`, `teams_notify_enabled`. |

---

## Teams integration (Adaptive Card format)

When an achievement is shared, an Adaptive Card (v1.4) is posted to the Teams incoming webhook. The card includes:
- Header: `"<icon> Achievement unlocked"` in accent/bold
- Body: `"<userName> earned <achievementName>"` + achievement description (subtle/small)
- FactSet: Quiz title (if applicable), score % (if applicable), total points
- Action button: `"View on platform"` → `<platformUrl>/me/achievements`

The webhook URL is read from `platform_settings.teams_webhook_url`. Errors are logged but never propagate to the caller — the share endpoint always returns `200` if the DB write succeeded.

---

## Platform settings

Stored in `platform_settings` as key/value strings. Managed via admin UI.

| Key | Default | Meaning |
|---|---|---|
| `teams_webhook_url` | `""` | Incoming Webhook URL for the Teams channel. Empty = Teams sharing disabled. |
| `teams_notify_enabled` | `"true"` | Master switch for Teams notifications. String `"false"` disables all posting. |

---

## Database schema (key tables)

| Table | Key columns | Notes |
|---|---|---|
| `users` | `id`, `azure_oid`, `email`, `name`, `role`, `total_points`, `last_login_at` | Upserted on every login by the auth layer |
| `quizzes` | `id`, `author_id`, `title`, `description`, `difficulty`, `questions` (JSONB), `status`, `question_count`, `avg_rating`, `rating_count`, `attempt_count`, `published_at`, `archived_at`, `parent_quiz_id` | Aggregate columns kept in sync by the backend |
| `attempts` | `id`, `quiz_id`, `user_id`, `attempt_number`, `score_pct`, `correct_count`, `total_count`, `answers` (JSONB), `completed_at` | 3-attempt hard cap enforced on insert |
| `ratings` | `quiz_id`, `user_id`, `stars`, `updated_at` | Unique on `(quiz_id, user_id)` |
| `point_events` | `id`, `user_id`, `event_type`, `points`, `description`, `ref_quiz_id`, `ref_attempt_id`, `created_at` | Append-only |
| `achievements` | `id`, `name`, `description`, `icon`, `condition_type`, `condition_value`, `scope`, `earner_type`, `card_type`, `active` | Admin-managed |
| `user_achievements` | `id`, `user_id`, `achievement_id`, `earned_at`, `shared_to_teams_at`, `ref_quiz_id`, `ref_attempt_id` | Unique indexes enforce "earn once" rules |
| `platform_settings` | `key`, `value` | Key/value store for admin-managed config |
