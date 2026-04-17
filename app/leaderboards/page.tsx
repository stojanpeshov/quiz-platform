"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type View = "global" | "best_rated" | "most_taken";

export default function LeaderboardsPage() {
  const [view, setView] = useState<View>("global");
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/leaderboards?view=${view}`).then((r) => r.json()).then((d) => setRows(d.rows ?? []));
  }, [view]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Leaderboards</h1>
      <div className="flex gap-2 text-sm flex-wrap">
        {(
          [
            ["global", "Global users"],
            ["best_rated", "Best-rated quizzes"],
            ["most_taken", "Most-taken quizzes"],
          ] as [View, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setView(k)}
            className={`px-3 py-1 rounded border ${
              view === k ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "global" && (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[var(--muted)]">
            <tr><th className="text-left py-2">#</th><th className="text-left">User</th><th className="text-right">Points</th></tr>
          </thead>
          <tbody>
            {rows.map((u, i) => (
              <tr key={u.id} className="border-t border-[var(--border)]">
                <td className="py-2">{i + 1}</td>
                <td>{u.name} <span className="text-[var(--muted)] text-xs">{u.email}</span></td>
                <td className="text-right font-mono">{u.total_points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {(view === "best_rated" || view === "most_taken") && (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[var(--muted)]">
            <tr>
              <th className="text-left py-2">#</th>
              <th className="text-left">Quiz</th>
              <th className="text-right">★ Rating</th>
              <th className="text-right">Attempts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((q, i) => (
              <tr key={q.id} className="border-t border-[var(--border)]">
                <td className="py-2">{i + 1}</td>
                <td>
                  <Link href={`/quizzes/${q.id}`} className="hover:text-[var(--accent)]">{q.title}</Link>
                </td>
                <td className="text-right">{q.avg_rating?.toFixed?.(1) ?? "–"} ({q.rating_count})</td>
                <td className="text-right">{q.attempt_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
