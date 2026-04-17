# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit (no test suite exists)
```

## Architecture

**Stack:** Next.js App Router + TypeScript, NextAuth.js (Microsoft Entra ID), Supabase (Postgres + RLS), Tailwind CSS, Zod, React Hook Form.

**No ORM** — all DB access is via Supabase's PostgREST client (`@supabase/supabase-js`).

### Auth flow

NextAuth with Azure AD (single-tenant, `tid` claim enforced in `signIn` callback). The JWT carries `user_id` and `role`. Helper functions `requireUser()` / `requireAdmin()` in API routes extract these and return a `UserCtx` containing the Supabase service-role client pre-configured with RLS context via `set_current_user(user_id, role)`.

All DB queries go through `UserCtx.client` so Postgres RLS policies apply.

### Data model

Five main tables: `users`, `quizzes`, `attempts`, `ratings`, `point_events`.

- `quizzes.questions` is JSONB, validated by the Zod schema in `lib/schema.ts` — this is the single source of truth for question structure.
- `quizzes.status` is an enum: `draft` → `published` → `archived`. Publishing is irreversible (edit creates a new draft linked via `parent_quiz_id`).
- `attempts` are capped at 3 per user per quiz, enforced by a DB trigger.
- `point_events` is append-only; `users.total_points` is a cache kept in sync by DB functions.

### Point system

Points are awarded in two layers:
1. **Immediate** (API routes): base points for publishing, completing, rating.
2. **Nightly** (pg_cron at 02:00 UTC): owner bonuses + top-performer bonuses recalculated as delta events. See `docs/POINTS.md` for rules and `lib/points.ts` for constants.

### API conventions

All routes follow the same pattern:
1. Call `requireUser()` or `requireAdmin()` at the top.
2. Do application-level auth checks (ownership, attempt limits).
3. Use `ctx.client` for DB queries — RLS provides the final enforcement layer.

### Quiz question types

Four types defined in `lib/schema.ts`: `single_choice`, `multiple_choice`, `true_false`, `short_text`. Grading logic lives in `lib/grading.ts`. Correct answers are stripped before the quiz is sent to a taker (`stripAnswers()` in schema.ts). Short-text answers are normalized (lowercase, trim, collapse whitespace) before comparison.

### Roles

Two roles: `user` (default) and `admin`. Admins access `/admin/*` routes and API endpoints at `/api/admin/*`. Role is stored in `users.role` and propagated through NextAuth JWT into every request.
