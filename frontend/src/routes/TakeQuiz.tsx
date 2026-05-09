import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { AchievementToast } from "../components/AchievementToast";
import { apiFetch } from "../lib/api";
import type { Answer } from "../lib/schema";
import type { EarnedAchievement } from "../lib/types";

interface PublicQuestion {
  type: "single_choice" | "multiple_choice" | "true_false" | "short_text";
  question: string;
  options?: string[];
}

interface SubmitResp {
  attemptId: string;
  attemptNumber: number;
  score: number;
  correctCount: number;
  totalCount: number;
  perQuestion: { correct: boolean; expected: unknown }[];
  questions: { question: string; explanation?: string }[];
  newlyEarned: EarnedAchievement[];
}

export function TakeQuiz() {
  const { id = "" } = useParams();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [result, setResult] = useState<SubmitResp | null>(null);

  const { data, isLoading } = useQuery<{
    quiz: { title: string; questions: PublicQuestion[] };
  }>({
    queryKey: ["quiz", id],
    queryFn: () => apiFetch(`/api/quizzes/${id}`),
  });

  const submit = useMutation({
    mutationFn: () =>
      apiFetch<SubmitResp>(`/api/quizzes/${id}/take`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      }),
    onSuccess: (r) => setResult(r),
  });

  if (isLoading || !data) return <p>Loading…</p>;
  const qs = data.quiz.questions;

  function setAnswer(i: number, a: Answer) {
    setAnswers((prev) => {
      const copy = prev.slice();
      copy[i] = a;
      return copy;
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{data.quiz.title}</h1>
      {qs.map((q, i) => (
        <div key={i} className="p-3 rounded space-y-2"
             style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="font-medium">
            {i + 1}. {q.question}
          </div>
          {q.type === "single_choice" && q.options?.map((opt, j) => (
            <label key={j} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`q${i}`}
                onChange={() => setAnswer(i, { type: "single_choice", value: j })}
              />
              {opt}
            </label>
          ))}
          {q.type === "multiple_choice" && q.options?.map((opt, j) => (
            <label key={j} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                onChange={(e) => {
                  const cur = answers[i]?.type === "multiple_choice" ? answers[i].value : [];
                  const next = e.target.checked ? [...cur, j] : cur.filter((x) => x !== j);
                  setAnswer(i, { type: "multiple_choice", value: next });
                }}
              />
              {opt}
            </label>
          ))}
          {q.type === "true_false" && (
            <div className="flex gap-3 text-sm">
              <label><input type="radio" name={`q${i}`} onChange={() => setAnswer(i, { type: "true_false", value: true })} /> True</label>
              <label><input type="radio" name={`q${i}`} onChange={() => setAnswer(i, { type: "true_false", value: false })} /> False</label>
            </div>
          )}
          {q.type === "short_text" && (
            <input
              type="text"
              onChange={(e) => setAnswer(i, { type: "short_text", value: e.target.value })}
              className="w-full px-2 py-1 rounded"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)" }}
            />
          )}
          {result && (
            <div className="text-sm pt-2">
              {result.perQuestion[i].correct ? "✓ Correct" : "✗ Incorrect"}
            </div>
          )}
        </div>
      ))}

      {!result ? (
        <button
          disabled={submit.isPending}
          onClick={() => submit.mutate()}
          className="px-4 py-2 rounded font-medium"
          style={{ background: "var(--accent)", color: "var(--bg)" }}>
          {submit.isPending ? "Submitting…" : "Submit"}
        </button>
      ) : (
        <div>
          <p className="font-bold">
            Score: {result.score}% ({result.correctCount}/{result.totalCount}) — attempt #{result.attemptNumber}
          </p>
        </div>
      )}

      {submit.error && <p className="text-sm text-red-400">{(submit.error as Error).message}</p>}
      <AchievementToast achievements={result?.newlyEarned ?? []} onClose={() => setResult(r => r ? { ...r, newlyEarned: [] } : r)} />
    </div>
  );
}
