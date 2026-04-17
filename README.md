# Quiz Platform

Internal quiz platform for employee-generated tests. Users sign in with Microsoft 365 / Entra ID, import/create quizzes, take others' quizzes, rate them, and compete on leaderboards.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Supabase** (Postgres, RLS, scheduled functions)
- **NextAuth.js** (Entra ID, strict tenant lock)
- **Zod** (unified quiz schema validation)
- **Tailwind CSS** + shadcn/ui
- **Vercel** (hosting)

All free tier. Targets 100–500 users.

## Admin Setup (one-time)

### 1. Azure AD / Entra ID app registration

1. Azure Portal → Microsoft Entra ID → App registrations → **New registration**
2. Name: `Quiz Platform`
3. Supported account types: **Accounts in this organizational directory only** (single tenant)
4. Redirect URI: Web → `https://<your-domain>/api/auth/callback/azure-ad`
5. After creation, copy **Application (client) ID** and **Directory (tenant) ID**
6. Certificates & secrets → **New client secret** → copy the value
7. API permissions: Microsoft Graph → `User.Read` (delegated) — granted by default
8. Token configuration → Add optional claim → **email**, **tid** for ID token

### 2. Supabase project

1. Create project at supabase.com (free tier)
2. SQL Editor → paste `supabase/migrations/001_initial.sql` → run
3. SQL Editor → paste `supabase/migrations/002_rls.sql` → run
4. SQL Editor → paste `supabase/migrations/003_functions.sql` → run
5. Database → Extensions → enable `pg_cron`
6. SQL Editor → paste `supabase/migrations/004_cron.sql` → run
7. Settings → API → copy `URL`, `anon key`, `service_role key`

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXTAUTH_URL=https://<your-domain>
NEXTAUTH_SECRET=<generate: openssl rand -base64 32>

AZURE_AD_CLIENT_ID=<from step 1>
AZURE_AD_CLIENT_SECRET=<from step 1>
AZURE_AD_TENANT_ID=<from step 1>

NEXT_PUBLIC_SUPABASE_URL=<from step 2>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from step 2>
SUPABASE_SERVICE_ROLE_KEY=<from step 2>
```

### 4. Deploy to Vercel

```bash
vercel --prod
```

Add the same env vars in Vercel project settings.

### 5. Promote yourself to admin

After your first login, run in Supabase SQL editor:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@company.com';
```

### 6. Share the prompt template

Send employees the template in `docs/QUIZ_PROMPT_TEMPLATE.md`. They paste their course material + this prompt into any LLM (Copilot, ChatGPT, Claude) and get back importable JSON.

## Dev

```bash
npm install
npm run dev
```

## Point System

See `docs/POINTS.md`.

## Project Structure

```
app/                    Next.js App Router
  api/auth/             NextAuth handlers
  api/quizzes/          Quiz CRUD endpoints
  api/attempts/         Attempt submission
  api/ratings/          Rating endpoints
  api/admin/            Admin-only endpoints
  quizzes/              Browse + take quizzes
  my/                   Personal dashboard, drafts
  admin/                Admin panel
  leaderboards/         4 leaderboard views
lib/
  schema.ts             Zod quiz schema (the contract)
  supabase.ts           Supabase clients (anon + service role)
  auth.ts               NextAuth config (tenant-locked)
  points.ts             Point calculation logic
  grading.ts            Quiz auto-grading
supabase/migrations/    SQL migrations (run in order)
docs/                   Prompt template, point system docs
```
