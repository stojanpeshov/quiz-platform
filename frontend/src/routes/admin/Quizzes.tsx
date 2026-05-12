import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";

interface Q {
  id: string; title: string; status: string; difficulty: string;
  authorName: string; authorEmail: string; attemptCount: number;
}

export function AdminQuizzes() {
  const qc = useQueryClient();
  const { data } = useQuery<{ quizzes: Q[] }>({
    queryKey: ["admin", "quizzes"],
    queryFn: () => apiFetch("/api/admin/quizzes"),
  });
  const del = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/quizzes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "quizzes"] }),
  });
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">All quizzes</h1>
      <ul className="space-y-1">
        {data?.quizzes.map((q) => (
          <li key={q.id} className="p-2 rounded flex items-center justify-between"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <span>{q.title} — {q.status}, by {q.authorName} · {q.attemptCount} attempts</span>
            <button onClick={() => del.mutate(q.id)} className="text-sm px-2 py-1 rounded border">
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
