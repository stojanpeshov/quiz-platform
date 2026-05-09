import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "../lib/api";

const VIEWS = [
  { id: "global", label: "Global" },
  { id: "best_rated", label: "Best rated" },
  { id: "most_taken", label: "Most taken" },
] as const;

interface Row {
  id: string;
  name: string | null;
  title: string | null;
  totalPoints: number | null;
  attemptCount: number | null;
  avgRating: number | null;
  ratingCount: number | null;
}

export function Leaderboards() {
  const [view, setView] = useState<typeof VIEWS[number]["id"]>("global");
  const { data, isLoading } = useQuery<{ rows: Row[] }>({
    queryKey: ["leaderboards", view],
    queryFn: () => apiFetch(`/api/leaderboards?view=${view}`),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Leaderboards</h1>
      <div className="flex gap-1">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className="text-sm px-3 py-1 rounded"
            style={{
              background: view === v.id ? "var(--accent)" : "var(--card)",
              color: view === v.id ? "var(--bg)" : "var(--fg)",
              border: "1px solid var(--border)",
            }}>
            {v.label}
          </button>
        ))}
      </div>
      {isLoading ? <p>Loading…</p> : (
        <ul className="space-y-1">
          {data?.rows.map((r, i) => (
            <li key={r.id} className="p-2 rounded flex items-center justify-between"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <span>
                <span className="font-mono mr-2" style={{ color: "var(--muted)" }}>#{i + 1}</span>
                {r.name ?? r.title}
              </span>
              <span style={{ color: "var(--accent)" }}>
                {view === "global" && `${r.totalPoints} pts`}
                {view === "best_rated" && `★ ${r.avgRating} (${r.ratingCount})`}
                {view === "most_taken" && `${r.attemptCount} attempts`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
