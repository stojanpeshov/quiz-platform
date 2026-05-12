import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AchievementToast } from "../components/AchievementToast";
import { apiFetch } from "../lib/api";
import type { EarnedAchievement, QuizSummary } from "../lib/types";

export function MyQuizzes() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<EarnedAchievement[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["quizzes", { mine: 1 }],
    queryFn: () => apiFetch<{ quizzes: QuizSummary[] }>("/api/quizzes?mine=1"),
  });

  const publish = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean; newlyEarned: EarnedAchievement[] }>(
        `/api/quizzes/${id}/publish`, { method: "POST" }),
    onSuccess: (r) => { setToasts(r.newlyEarned); qc.invalidateQueries({ queryKey: ["quizzes"] }); },
  });

  const unpublish = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ newDraftId: string }>(`/api/quizzes/${id}/unpublish`, { method: "POST" }),
    onSuccess: (r) => navigate(`/my/quizzes/${r.newDraftId}/edit`),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/quizzes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quizzes"] }),
  });

  if (isLoading) return <p>Loading…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My quizzes</h1>
      <Link to="/quizzes/new" className="text-sm">+ New</Link>
      <ul className="space-y-2">
        {data?.quizzes.map((q) => (
          <li key={q.id} className="p-3 rounded flex items-center justify-between"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <Link to={`/quizzes/${q.id}`} className="flex-1">
              <div className="font-semibold">{q.title}</div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>{q.status} · {q.questionCount} q</div>
            </Link>
            <div className="flex gap-2 text-sm">
              {q.status === "draft" && (
                <>
                  <Link to={`/my/quizzes/${q.id}/edit`} className="px-2 py-1 rounded border">Edit</Link>
                  <button onClick={() => publish.mutate(q.id)} className="px-2 py-1 rounded"
                          style={{ background: "var(--accent)", color: "var(--bg)" }}>
                    Publish
                  </button>
                  <button onClick={() => del.mutate(q.id)} className="px-2 py-1 rounded border">Delete</button>
                </>
              )}
              {q.status === "published" && (
                <button onClick={() => unpublish.mutate(q.id)} className="px-2 py-1 rounded border">
                  Unpublish & edit
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <AchievementToast achievements={toasts} onClose={() => setToasts([])} />
    </div>
  );
}
