# Quiz Platform — Java Spring + PostgreSQL + React

Internal quiz platform for employee-generated tests. Users sign in with Microsoft 365 / Entra ID, import/create quizzes, take others' quizzes, rate them, compete on leaderboards, and unlock achievements that can be shared to a Microsoft Teams channel.

## Stack

| Layer | Tech |
|---|---|
| Backend | Spring Boot 3.x on Java 21 LTS, Spring MVC, Spring Data JPA + Hibernate 6, Spring Security `oauth2-resource-server` |
| Database | Self-hosted PostgreSQL 16, migrations via Flyway |
| Scheduling | `@Scheduled` + ShedLock (Postgres-backed distributed lock) |
| Frontend | Vite + React 18, React Router v6, TanStack Query, MSAL.js for Entra ID |
| Auth | Single-tenant Microsoft Entra ID; tenant lock enforced server-side on the JWT `tid` claim |

The repo is a monorepo:

```
backend/   Spring Boot application (Maven)
frontend/  Vite + React SPA
db/        Canonical SQL migrations (also copied into backend/src/main/resources/db/migration)
app/, components/, lib/, supabase/   Original Next.js code — kept as reference until cutover
```

## Prerequisites

- **JDK 21+** (Java 25 / Corretto 25 works fine — pom targets 21)
- **Maven 3.8+**
- **Node.js 20+** and npm
- **Docker** (optional, for the bundled Postgres + integration tests)
- A reachable PostgreSQL 16 (or the bundled docker-compose one)

## First-time setup

### 1. Start Postgres

```bash
docker compose up -d postgres
```

…or point the backend at any reachable Postgres 14+ via `SPRING_DATASOURCE_URL`.

### 2. Configure backend secrets

```bash
cd backend
cp .env.example .env
# edit:
#   QUIZPLATFORM_AZURE_AD_TENANT_ID   = your Entra ID tenant GUID
#   QUIZPLATFORM_AZURE_AD_AUDIENCE    = api://<api-app-client-id>
```

Spring Boot's relaxed binding maps `QUIZPLATFORM_AZURE_AD_*` env vars onto `quizplatform.azure-ad.*` in `application.yml`. You can also use `application-local.yml` instead of env vars.

### 3. Configure frontend

```bash
cd frontend
cp .env.example .env
# edit VITE_AZURE_TENANT_ID, VITE_AZURE_CLIENT_ID, VITE_API_SCOPE
npm install
```

### 4. Run the backend

```bash
cd backend
mvn spring-boot:run
```

Flyway runs `V001..V005` on first start. The app listens on `http://localhost:8080`.

### 5. Run the frontend (separate terminal)

```bash
cd frontend
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api/**` to the backend.

### 6. Promote yourself to admin

After your first login, in `psql`:

```sql
update users set role = 'admin' where email = 'you@company.com';
```

## Auth

Two Microsoft Entra ID app registrations are required:

1. **API** (exposes a scope, e.g. `access_as_user`). The backend validates JWTs with `spring-boot-starter-oauth2-resource-server`. The `JwtToUserContextFilter` enforces the tenant lock on the `tid` claim, upserts the `users` row by `azure_oid`, and populates the request-scoped `UserContext` bean.
2. **SPA** (public client / SPA redirect URI). MSAL.js acquires tokens for the API's scope and sends them as `Authorization: Bearer …`.

## Architectural notes

- **No Postgres RLS.** Authorization is enforced at the application layer (every mutation service method's first action is an ownership / admin check). The plan file in `~/.claude/plans/parallel-pondering-turing.md` records why.
- **Business logic that the original Supabase migrations kept in PL/pgSQL has been moved to Java services**: `AttemptService` (3-attempt cap via `SELECT … FOR UPDATE`), `PointsService` (replaces `award_points`), `QuizAggregatesService` (replaces `refresh_quiz_aggregates`), `AchievementService` (real-time + nightly evaluators), and `BonusRecomputeJob` (replaces `recompute_bonuses` + pg_cron).
- **Polymorphic JSON** for `Question` / `Answer` uses Jackson `@JsonTypeInfo` + `@JsonSubTypes`; Hibernate 6's `@JdbcTypeCode(SqlTypes.JSON)` maps `List<Question>` and `List<Answer>` to JSONB columns.
- **Two `@Scheduled` jobs** at 02:00 and 02:05 UTC; ShedLock guarantees only one replica runs each.
- **`per_quiz_leaderboard(uuid)`** stays as a SQL function (window-function ranking is denser in SQL than JPQL); called via `LeaderboardQueries.perQuiz`.

## Build / test

```bash
cd backend
mvn clean compile          # build
mvn test                   # runs unit tests; integration tests auto-skip if Docker isn't available
mvn -DskipTests package    # build a runnable jar (target/quiz-platform-api-0.1.0.jar)
mvn spring-boot:run        # run from source
```

`GradingServiceTest` enforces parity with the original `lib/grading.ts` implementation. `ApplicationContextTest` boots the full Spring context against a Testcontainers Postgres (skipped without Docker).

## Verification checklist

The plan file (`~/.claude/plans/parallel-pondering-turing.md`) has the full end-to-end checklist. Quick sanity:

- `curl http://localhost:8080/health` → `{"ok":true}`
- `curl http://localhost:8080/api/quizzes` (no token) → `401`
- Sign in via the SPA, take a quiz three times, verify the 4th fails with `409`
- `/me/points` shows the +5/+10/+15/+20 events as expected
- `/admin` (after self-promotion) loads the dashboard

## Project structure (backend)

```
backend/
  pom.xml
  src/main/resources/
    application.yml
    db/migration/V001..V005__*.sql            (Flyway)
  src/main/java/com/quizplatform/
    QuizPlatformApplication.java
    domain/                                   POJOs + JPA entities + polymorphic Question/Answer
    domain/enums/                             string-backed enums (UserRole, QuizStatus, …)
    infrastructure/persistence/               Spring Data JPA repositories + leaderboard SQL helper
    infrastructure/teams/                     RestClient-based Teams webhook client
    application/dto/                          wire DTOs (mirrors the FE contract)
    application/service/                      grading, points, attempt, rating, publish, quiz,
                                              leaderboard, me, admin, achievement, teams services
    application/validation/                   QuestionListValidator (mirrors lib/schema.ts rules)
    application/exception/                    AppException + 5 typed subclasses
    config/                                   SecurityConfig, JwtToUserContextFilter, UserContext,
                                              CorsConfig, JacksonConfig, SchedulerConfig (ShedLock)
    web/                                      QuizController, MeController, LeaderboardController,
                                              AdminController, HealthController, GlobalExceptionHandler
    jobs/                                     BonusRecomputeJob (02:00 UTC),
                                              NightlyAchievementJob (02:05 UTC)
  src/test/java/com/quizplatform/
    application/GradingServiceTest.java       parity with lib/grading.ts
    ApplicationContextTest.java               full Spring boot + Testcontainers Postgres
```

## Original Next.js reference

The `app/`, `components/`, `lib/`, and `supabase/` directories are the original Next.js + Supabase implementation. Kept in place until cutover so you can compare behaviour and roll back if needed. Delete them in a follow-up commit once the Spring backend has soaked in production.
