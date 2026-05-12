import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import type { QuizSummary } from "../lib/types";

const SORTS = [
  { id: "recent", label: "Recent" },
  { id: "rated", label: "Best rated" },
  { id: "popular", label: "Most taken" },
] as const;

export function BrowseQuizzes() {
  const [sort, setSort] = useState<typeof SORTS[number]["id"]>("recent");
  const [excludeMine, setExcludeMine] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["quizzes", { sort, excludeMine }],
    queryFn: () =>
      apiFetch<{ quizzes: QuizSummary[] }>(
        `/api/quizzes?sort=${sort}${excludeMine ? "&excludeMine=1" : ""}`,
      ),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Browse quizzes</h1>
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {SORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className="text-sm px-3 py-1 rounded"
              style={{
                background: sort === s.id ? "var(--accent)" : "var(--card)",
                color: sort === s.id ? "var(--bg)" : "var(--fg)",
                border: "1px solid var(--border)",
              }}>
              {s.label}
            </button>
          ))}
        </div>
        <label className="text-sm flex items-center gap-2" style={{ color: "var(--muted)" }}>
          <input type="checkbox" checked={excludeMine} onChange={(e) => setExcludeMine(e.target.checked)} />
          Hide mine
        </label>
      </div>

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <ul className="space-y-2">
          {data?.quizzes.map((q) => (
            <li key={q.id}>
              <Link to={`/quizzes/${q.id}`} className="block p-3 rounded"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="font-semibold">{q.title}</div>
                <div className="text-sm" style={{ color: "var(--muted)" }}>
                  {q.authorName ?? "—"} · {q.questionCount} q · {q.attemptCount} attempts
                  {q.ratingCount > 0 && ` · ★ ${q.avgRating} (${q.ratingCount})`}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
