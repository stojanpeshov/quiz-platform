"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type Quiz = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  author_id: string;
  question_count: number;
  avg_rating: number;
  rating_count: number;
  attempt_count: number;
  users: { name: string } | null;
};

export default function QuizzesPage() {
  const { data: session } = useSession();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [sort, setSort] = useState<"recent" | "rated" | "popular">("recent");
  const [includeMine, setIncludeMine] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const excludeMine = includeMine ? "" : "&excludeMine=1";
    fetch(`/api/quizzes?sort=${sort}${excludeMine}`)
      .then((r) => r.json())
      .then((d) => setQuizzes(d.quizzes ?? []))
      .finally(() => setLoading(false));
  }, [sort, includeMine]);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h1 className="text-2xl font-bold">Browse quizzes</h1>
          <div className="flex gap-2 text-sm">
            {(["recent", "rated", "popular"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-3 py-1 rounded border ${
                  sort === s
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {s === "recent" ? "Recent" : s === "rated" ? "Best rated" : "Most taken"}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={includeMine}
            onChange={(e) => setIncludeMine(e.target.checked)}
            className="cursor-pointer"
          />
          <span style={{ color: "var(--muted)" }}>Include my quizzes</span>
        </label>
      </div>

      {loading && <p className="text-[var(--muted)]">Loading…</p>}
      {!loading && quizzes.length === 0 && (
        <p className="text-[var(--muted)]">
          No quizzes yet. <Link href="/quizzes/new" className="text-[var(--accent)]">Create the first one.</Link>
        </p>
      )}

      <div className="grid gap-3">
        {quizzes.map((q) => {
          const isMyQuiz = session && q.author_id === (session.user as any)?.id;
          return (
            <Link
              key={q.id}
              href={`/quizzes/${q.id}`}
              className={`block bg-[var(--card)] border rounded-lg p-4 hover:border-[var(--accent)] ${
                isMyQuiz ? "border-[var(--accent)] border-2" : "border-[var(--border)]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="font-semibold text-lg truncate">{q.title}</h2>
                    {isMyQuiz && (
                      <span
                        className="px-2 py-0.5 text-xs font-medium rounded"
                        style={{ background: "var(--accent)", color: "black" }}
                      >
                        Your Quiz
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        q.difficulty === "beginner"
                          ? "bg-green-900 text-green-300"
                          : q.difficulty === "advanced"
                          ? "bg-red-900 text-red-300"
                          : "bg-blue-900 text-blue-300"
                      }`}
                    >
                      {q.difficulty}
                    </span>
                  </div>
                  <p className="text-[var(--muted)] text-sm line-clamp-2">{q.description}</p>
                  {q.users && (
                    <p className="text-xs text-[var(--muted)] mt-1">
                      by {q.users.name}
                    </p>
                  )}
                </div>
                <div className="hidden sm:block text-right text-xs text-[var(--muted)] shrink-0">
                  <div>{q.question_count} questions</div>
                  <div>★ {q.avg_rating.toFixed(1)} ({q.rating_count})</div>
                  <div>{q.attempt_count} attempts</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
