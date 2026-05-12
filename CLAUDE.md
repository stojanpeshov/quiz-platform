# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Backend (from /backend)
mvn spring-boot:run     # Start Spring Boot API on :8080
mvn clean compile       # Compile
mvn test                # Unit tests (integration tests need Docker)
mvn -DskipTests package # Build runnable jar

# Frontend (from /frontend)
npm run dev             # Start Vite dev server on :5173 (proxies /api → :8080)
npm run build           # Production build
npm run lint            # ESLint
npm run typecheck       # tsc --noEmit
```

## Architecture

**Stack:** Spring Boot 3 / Java 21 backend, Vite + React 18 frontend, PostgreSQL 16 with Flyway migrations, Microsoft Entra ID (single-tenant) for auth.

**Monorepo layout:**

```
backend/   Spring Boot application (Maven)
frontend/  Vite + React SPA (React Router v6, TanStack Query, MSAL.js)
db/        Canonical SQL migrations (also copied to backend/src/main/resources/db/migration)
docs/      Business rules, point system rules, quiz prompt template
```

### Auth flow

Two Entra ID app registrations: an **API** app (exposes `access_as_user` scope) and a **SPA** app (public client). The frontend uses MSAL.js to acquire a bearer token for the API scope. The backend validates JWTs via `spring-boot-starter-oauth2-resource-server`. `JwtToUserContextFilter` enforces the tenant lock on the `tid` claim, upserts the `users` row by `azure_oid`, and populates a request-scoped `UserContext` bean. All service methods receive a `UserContext` which carries the authenticated user's ID and role.

**No Postgres RLS.** Authorization is enforced at the application layer — every mutation's first action is an ownership / admin check.

### Data model

Eight tables: `users`, `quizzes`, `attempts`, `ratings`, `point_events`, `achievements`, `user_achievements`, `platform_settings`.

- `quizzes.questions` is JSONB; `List<Question>` mapped via Hibernate 6 `@JdbcTypeCode(SqlTypes.JSON)` + Jackson `@JsonTypeInfo`/`@JsonSubTypes`.
- `quizzes.status`: `draft → published → archived`. Publishing is irreversible; "Unpublish & Edit" archives the current row and creates a new draft linked via `parent_quiz_id`.
- `attempts` are capped at 3 per user per quiz (`SELECT … FOR UPDATE` check in `AttemptService`).
- `point_events` is append-only; `users.total_points` is a cache kept in sync by `PointsService`.

### Backend service map

| Service | Responsibility |
|---|---|
| `AttemptService` | Enforce 3-attempt cap, grade quiz, record attempt |
| `GradingService` | Grade all four question types |
| `PointsService` | Award immediate points, check "already earned" |
| `QuizService` | CRUD, publish/unpublish lifecycle |
| `QuizAggregatesService` | Keep `avg_rating`, `rating_count`, `attempt_count` in sync |
| `RatingService` | Upsert ratings; enforce attempt-before-rate rule |
| `AchievementService` | Real-time evaluation (score_threshold, completion_count, publish_count, points_milestone) |
| `NightlyAchievementJob` | 02:05 UTC — evaluate score_top_n, rating_top_n, quiz_attempt_count, quiz_avg_rating |
| `BonusRecomputeJob` | 02:00 UTC — recompute owner quality/popularity + top-performer bonuses as delta events |
| `LeaderboardService` | Four leaderboard views; per-quiz uses `per_quiz_leaderboard(uuid)` SQL function |
| `TeamsService` | Post Adaptive Card to Teams webhook (errors are non-fatal) |
| `AdminService` | Stats, user management, audit log, CSV export |

### API conventions

1. Controllers call `userContext.requireUser()` or `userContext.requireAdmin()` at the top.
2. Services do ownership / business-rule checks before any mutation.
3. `AppException` subclasses map to typed HTTP errors via `GlobalExceptionHandler`.

### Quiz question types

Four types: `single_choice`, `multiple_choice`, `true_false`, `short_text`. See `docs/BUSINESS_RULES.md` for grading rules and validation constraints. Short-text answers are normalized (lowercase, trim, collapse whitespace) before comparison.

### Point and achievement systems

See `docs/POINTS.md` for point values and bonus rules. See `docs/BUSINESS_RULES.md` for the full achievement condition-type catalogue and real-time vs. nightly split.

### Roles

Two roles: `user` (default) and `admin`. Role is stored in `users.role` and read from the JWT claims on every request. Admins access `/admin/*` routes and `/api/admin/*` endpoints.
