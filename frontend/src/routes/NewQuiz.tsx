import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { parseQuiz } from "../lib/schema";

const SAMPLE = JSON.stringify({
  title: "Sample quiz",
  description: "Replace this with your own.",
  difficulty: "intermediate",
  questions: [
    { type: "single_choice", question: "Pick the right one", options: ["A", "B", "C"], correctAnswer: 1 },
    { type: "true_false", question: "Water is wet?", correctAnswer: true },
  ],
}, null, 2);

export function NewQuiz() {
  const [json, setJson] = useState(SAMPLE);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const create = useMutation({
    mutationFn: (payload: unknown) =>
      apiFetch<{ id: string }>("/api/quizzes", { method: "POST", body: JSON.stringify({ quiz: payload }) }),
    onSuccess: ({ id }) => navigate(`/my/quizzes/${id}/edit`),
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">New quiz</h1>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Paste a JSON quiz body or edit the sample below. Validated against the same Zod schema as the API.
      </p>
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        className="w-full h-96 p-3 rounded font-mono text-sm"
        style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--fg)" }}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        disabled={create.isPending}
        onClick={() => {
          setError(null);
          try {
            const parsed = parseQuiz(json);
            create.mutate(parsed);
          } catch (e) { setError((e as Error).message); }
        }}
        className="px-4 py-2 rounded font-medium"
        style={{ background: "var(--accent)", color: "var(--bg)" }}>
        {create.isPending ? "Creating…" : "Create draft"}
      </button>
    </div>
  );
}
