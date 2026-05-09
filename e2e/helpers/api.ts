import { signToken, type TestUser } from "./jwt";

const BASE = "http://localhost:8080";

// Direct Node.js API client for test data setup (creates/deletes quizzes,
// submits attempts, etc.) without going through the browser. Uses the same
// signed JWTs as the browser so the backend upserts the user on first call.
export class ApiClient {
  private readonly token: string;

  constructor(user: TestUser) {
    this.token = signToken(user);
  }

  private async req<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`${method} ${path} → ${res.status}: ${text}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as T;
  }

  // ── Quizzes ──────────────────────────────────────────────────────────────

  async createQuiz(quiz: object): Promise<string> {
    const { id } = await this.req<{ id: string }>("POST", "/api/quizzes", { quiz });
    return id;
  }

  async publishQuiz(id: string): Promise<void> {
    await this.req("POST", `/api/quizzes/${id}/publish`);
  }

  async createAndPublishQuiz(quiz: object): Promise<string> {
    const id = await this.createQuiz(quiz);
    await this.publishQuiz(id);
    return id;
  }

  async deleteQuiz(id: string): Promise<void> {
    await this.req("DELETE", `/api/quizzes/${id}`);
  }

  async getQuiz(id: string): Promise<{ quiz: Record<string, unknown>; myRating: number | null }> {
    return this.req("GET", `/api/quizzes/${id}`);
  }

  // ── Attempts ─────────────────────────────────────────────────────────────

  async takeQuiz(id: string, answers: unknown[]): Promise<{ score: number; attemptNumber: number }> {
    return this.req("POST", `/api/quizzes/${id}/take`, { answers });
  }

  // ── Ratings ──────────────────────────────────────────────────────────────

  async rateQuiz(id: string, stars: number): Promise<void> {
    await this.req("POST", `/api/quizzes/${id}/rate`, { stars });
  }

  // ── Me ───────────────────────────────────────────────────────────────────

  async getPoints(): Promise<{ totalPoints: number; events: unknown[] }> {
    return this.req("GET", "/api/me/points");
  }

  async getAchievements(): Promise<{ achievements: Array<{ achievement: { name: string } }> }> {
    return this.req("GET", "/api/me/achievements");
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  async getAdminStats(): Promise<Record<string, unknown>> {
    return this.req("GET", "/api/admin/stats");
  }

  async listAdminUsers(): Promise<{ users: Array<{ id: string; email: string; role: string }> }> {
    return this.req("GET", "/api/admin/users");
  }

  async setUserRole(userId: string, role: "User" | "Admin"): Promise<void> {
    await this.req("PATCH", `/api/admin/users/${userId}`, { role });
  }
}

// ── Shared test quiz shapes ────────────────────────────────────────────────

export const TRUE_FALSE_QUIZ = {
  title: "E2E True/False Quiz",
  description: "Single question for fast test setup",
  difficulty: "beginner",
  questions: [{ type: "true_false", question: "Is this a test?", correctAnswer: true }],
};

export const ALL_TYPES_QUIZ = {
  title: "E2E All-Types Quiz",
  description: "Covers all four question types",
  difficulty: "intermediate",
  questions: [
    {
      type: "single_choice",
      question: "Pick option B",
      options: ["Option A", "Option B", "Option C"],
      correctAnswer: 1,
    },
    {
      type: "multiple_choice",
      question: "Pick A and C",
      options: ["Option A", "Option B", "Option C"],
      correctAnswers: [0, 2],
    },
    {
      type: "true_false",
      question: "Is this a true/false question?",
      correctAnswer: true,
    },
    {
      type: "short_text",
      question: "Type the word 'hello'",
      correctAnswer: "hello",
    },
  ],
};

// Answers that yield 100% on ALL_TYPES_QUIZ.
export const ALL_TYPES_CORRECT_ANSWERS = [
  { type: "single_choice", value: 1 },
  { type: "multiple_choice", value: [0, 2] },
  { type: "true_false", value: true },
  { type: "short_text", value: "hello" },
];

// Answer that yields 100% on TRUE_FALSE_QUIZ.
export const TRUE_FALSE_CORRECT_ANSWER = [{ type: "true_false", value: true }];
