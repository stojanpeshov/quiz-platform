import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AchievementToast } from "../components/AchievementToast";
import { apiFetch } from "../lib/api";
import type { EarnedAchievement } from "../lib/types";

interface QuizResp {
  quiz: {
    id: string;
    title: string;
    description: string;
    questionCount: number;
    avgRating: number;
    ratingCount: number;
    attemptCount: number;
    status: string;
  };
  myRating: number | null;
}

export function QuizDetail() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const [toasts, setToasts] = useState<EarnedAchievement[]>([]);

  const { data, isLoading } = useQuery<QuizResp>({
    queryKey: ["quiz", id],
    queryFn: () => apiFetch(`/api/quizzes/${id}`),
  });

  const rate = useMutation({
    mutationFn: (stars: number) =>
      apiFetch<{ ok: boolean; newlyEarned: EarnedAchievement[] }>(
        `/api/quizzes/${id}/rate`,
        { method: "POST", body: JSON.stringify({ stars }) }),
    onSuccess: (res) => {
      setToasts(res.newlyEarned);
      qc.invalidateQueries({ queryKey: ["quiz", id] });
    },
  });

  if (isLoading || !data) return <p>Loading…</p>;
  const q = data.quiz;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{q.title}</h1>
      <p style={{ color: "var(--muted)" }}>{q.description}</p>
      <div className="text-sm" style={{ color: "var(--muted)" }}>
        {q.questionCount} questions · {q.attemptCount} attempts
        {q.ratingCount > 0 && ` · ★ ${q.avgRating} (${q.ratingCount})`}
      </div>

      <div className="flex gap-2">
        <Link to={`/quizzes/${id}/take`} className="px-4 py-2 rounded font-medium"
              style={{ background: "var(--accent)", color: "var(--bg)" }}>
          Take quiz
        </Link>
      </div>

      <div className="pt-4">
        <h2 className="font-bold mb-2">Rate this quiz</h2>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => rate.mutate(n)}
              disabled={rate.isPending}
              style={{
                color: (data.myRating ?? 0) >= n ? "var(--accent)" : "var(--muted)",
                fontSize: "1.5rem",
              }}
              aria-label={`${n} stars`}>
              ★
            </button>
          ))}
        </div>
        {rate.error && <p className="text-sm text-red-400">{(rate.error as Error).message}</p>}
      </div>

      <AchievementToast achievements={toasts} onClose={() => setToasts([])} />
    </div>
  );
}
