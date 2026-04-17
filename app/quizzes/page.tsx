"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Quiz = {
  id: string;
  title: string;
  description: string;
  question_count: number;
  avg_rating: number;
  rating_count: number;
  attempt_count: number;
};

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [sort, setSort] = useState<"recent" | "rated" | "popular">("recent");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/quizzes?sort=${sort}`)
      .then((r) => r.json())
      .then((d) => setQuizzes(d.quizzes ?? []))
      .finally(() => setLoading(false));
  }, [sort]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
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

      {loading && <p className="text-[var(--muted)]">Loading…</p>}
      {!loading && quizzes.length === 0 && (
        <p className="text-[var(--muted)]">
          No quizzes yet. <Link href="/quizzes/new" className="text-[var(--accent)]">Create the first one.</Link>
        </p>
      )}

      <div className="grid gap-3">
        {quizzes.map((q) => (
          <Link
            key={q.id}
            href={`/quizzes/${q.id}`}
            className="block bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--accent)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-semibold text-lg truncate">{q.title}</h2>
                <p className="text-[var(--muted)] text-sm line-clamp-2">{q.description}</p>
              </div>
              <div className="text-right text-xs text-[var(--muted)] shrink-0">
                <div>{q.question_count} questions</div>
                <div>★ {q.avg_rating.toFixed(1)} ({q.rating_count})</div>
                <div>{q.attempt_count} attempts</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
