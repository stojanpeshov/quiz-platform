import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { parseQuiz } from "../lib/schema";

export function EditQuiz() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery<{ quiz: unknown }>({
    queryKey: ["quiz", id],
    queryFn: () => apiFetch(`/api/quizzes/${id}`),
  });

  useEffect(() => {
    if (data?.quiz) setJson(JSON.stringify(data.quiz, null, 2));
  }, [data]);

  const save = useMutation({
    mutationFn: (payload: unknown) =>
      apiFetch(`/api/quizzes/${id}`, { method: "PATCH", body: JSON.stringify({ quiz: payload }) }),
    onSuccess: () => navigate("/my/quizzes"),
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edit draft</h1>
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        className="w-full h-96 p-3 rounded font-mono text-sm"
        style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--fg)" }}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        onClick={() => {
          setError(null);
          try { save.mutate(parseQuiz(json)); }
          catch (e) { setError((e as Error).message); }
        }}
        disabled={save.isPending}
        className="px-4 py-2 rounded font-medium"
        style={{ background: "var(--accent)", color: "var(--bg)" }}>
        {save.isPending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
