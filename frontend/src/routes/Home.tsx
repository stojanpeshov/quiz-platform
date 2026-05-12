import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import type { QuizSummary } from "../lib/types";

export function HomePage() {
  const myQuizzes = useQuery({
    queryKey: ["quizzes", { mine: 1 }],
    queryFn: () => apiFetch<{ quizzes: QuizSummary[] }>("/api/quizzes?mine=1"),
  });
  const points = useQuery<{ totalPoints: number }>({
    queryKey: ["me", "points"],
    queryFn: () => apiFetch("/api/me/points"),
  });

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
        <p style={{ color: "var(--muted)" }}>
          Total points: <span style={{ color: "var(--accent)" }}>{points.data?.totalPoints ?? 0}</span>
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Your quizzes</h2>
          <Link to="/quizzes/new" className="text-sm px-3 py-1 rounded"
                style={{ background: "var(--accent)", color: "var(--bg)" }}>
            Create quiz
          </Link>
        </div>
        {myQuizzes.isLoading ? (
          <p>Loading…</p>
        ) : myQuizzes.data?.quizzes.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No quizzes yet — create your first one.</p>
        ) : (
          <ul className="space-y-2">
            {myQuizzes.data?.quizzes.map((q) => (
              <li key={q.id}>
                <Link to={`/quizzes/${q.id}`} className="block p-3 rounded"
                      style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="font-semibold">{q.title}</div>
                  <div className="text-sm" style={{ color: "var(--muted)" }}>
                    {q.status} · {q.questionCount} questions · {q.attemptCount} attempts
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
