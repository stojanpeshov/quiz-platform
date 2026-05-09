# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02-quiz-lifecycle.spec.ts >> Unpublish & Edit archives the quiz and creates a new draft
- Location: tests/02-quiz-lifecycle.spec.ts:92:5

# Error details

```
Error: POST /api/quizzes → 500: {"timestamp":"2026-05-09T21:53:25.191+00:00","status":500,"error":"Internal Server Error","path":"/api/quizzes"}
```

# Test source

```ts
  1   | import { signToken, type TestUser } from "./jwt";
  2   | 
  3   | const BASE = "http://localhost:8080";
  4   | 
  5   | // Direct Node.js API client for test data setup (creates/deletes quizzes,
  6   | // submits attempts, etc.) without going through the browser. Uses the same
  7   | // signed JWTs as the browser so the backend upserts the user on first call.
  8   | export class ApiClient {
  9   |   private readonly token: string;
  10  | 
  11  |   constructor(user: TestUser) {
  12  |     this.token = signToken(user);
  13  |   }
  14  | 
  15  |   private async req<T>(
  16  |     method: string,
  17  |     path: string,
  18  |     body?: unknown,
  19  |   ): Promise<T> {
  20  |     const res = await fetch(`${BASE}${path}`, {
  21  |       method,
  22  |       headers: {
  23  |         Authorization: `Bearer ${this.token}`,
  24  |         ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
  25  |       },
  26  |       body: body !== undefined ? JSON.stringify(body) : undefined,
  27  |     });
  28  |     if (!res.ok) {
  29  |       const text = await res.text().catch(() => res.statusText);
> 30  |       throw new Error(`${method} ${path} → ${res.status}: ${text}`);
      |             ^ Error: POST /api/quizzes → 500: {"timestamp":"2026-05-09T21:53:25.191+00:00","status":500,"error":"Internal Server Error","path":"/api/quizzes"}
  31  |     }
  32  |     if (res.status === 204) return undefined as T;
  33  |     return res.json() as T;
  34  |   }
  35  | 
  36  |   // ── Quizzes ──────────────────────────────────────────────────────────────
  37  | 
  38  |   async createQuiz(quiz: object): Promise<string> {
  39  |     const { id } = await this.req<{ id: string }>("POST", "/api/quizzes", { quiz });
  40  |     return id;
  41  |   }
  42  | 
  43  |   async publishQuiz(id: string): Promise<void> {
  44  |     await this.req("POST", `/api/quizzes/${id}/publish`);
  45  |   }
  46  | 
  47  |   async createAndPublishQuiz(quiz: object): Promise<string> {
  48  |     const id = await this.createQuiz(quiz);
  49  |     await this.publishQuiz(id);
  50  |     return id;
  51  |   }
  52  | 
  53  |   async deleteQuiz(id: string): Promise<void> {
  54  |     await this.req("DELETE", `/api/quizzes/${id}`);
  55  |   }
  56  | 
  57  |   async getQuiz(id: string): Promise<{ quiz: Record<string, unknown>; myRating: number | null }> {
  58  |     return this.req("GET", `/api/quizzes/${id}`);
  59  |   }
  60  | 
  61  |   // ── Attempts ─────────────────────────────────────────────────────────────
  62  | 
  63  |   async takeQuiz(id: string, answers: unknown[]): Promise<{ score: number; attemptNumber: number }> {
  64  |     return this.req("POST", `/api/quizzes/${id}/take`, { answers });
  65  |   }
  66  | 
  67  |   // ── Ratings ──────────────────────────────────────────────────────────────
  68  | 
  69  |   async rateQuiz(id: string, stars: number): Promise<void> {
  70  |     await this.req("POST", `/api/quizzes/${id}/rate`, { stars });
  71  |   }
  72  | 
  73  |   // ── Me ───────────────────────────────────────────────────────────────────
  74  | 
  75  |   async getPoints(): Promise<{ totalPoints: number; events: unknown[] }> {
  76  |     return this.req("GET", "/api/me/points");
  77  |   }
  78  | 
  79  |   async getAchievements(): Promise<{ achievements: Array<{ achievement: { name: string } }> }> {
  80  |     return this.req("GET", "/api/me/achievements");
  81  |   }
  82  | 
  83  |   // ── Admin ─────────────────────────────────────────────────────────────────
  84  | 
  85  |   async getAdminStats(): Promise<Record<string, unknown>> {
  86  |     return this.req("GET", "/api/admin/stats");
  87  |   }
  88  | 
  89  |   async listAdminUsers(): Promise<{ users: Array<{ id: string; email: string; role: string }> }> {
  90  |     return this.req("GET", "/api/admin/users");
  91  |   }
  92  | 
  93  |   async setUserRole(userId: string, role: "User" | "Admin"): Promise<void> {
  94  |     await this.req("PATCH", `/api/admin/users/${userId}`, { role });
  95  |   }
  96  | }
  97  | 
  98  | // ── Shared test quiz shapes ────────────────────────────────────────────────
  99  | 
  100 | export const TRUE_FALSE_QUIZ = {
  101 |   title: "E2E True/False Quiz",
  102 |   description: "Single question for fast test setup",
  103 |   difficulty: "beginner",
  104 |   questions: [{ type: "true_false", question: "Is this a test?", correctAnswer: true }],
  105 | };
  106 | 
  107 | export const ALL_TYPES_QUIZ = {
  108 |   title: "E2E All-Types Quiz",
  109 |   description: "Covers all four question types",
  110 |   difficulty: "intermediate",
  111 |   questions: [
  112 |     {
  113 |       type: "single_choice",
  114 |       question: "Pick option B",
  115 |       options: ["Option A", "Option B", "Option C"],
  116 |       correctAnswer: 1,
  117 |     },
  118 |     {
  119 |       type: "multiple_choice",
  120 |       question: "Pick A and C",
  121 |       options: ["Option A", "Option B", "Option C"],
  122 |       correctAnswers: [0, 2],
  123 |     },
  124 |     {
  125 |       type: "true_false",
  126 |       question: "Is this a true/false question?",
  127 |       correctAnswer: true,
  128 |     },
  129 |     {
  130 |       type: "short_text",
```