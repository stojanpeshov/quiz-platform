"use client";
import { useEffect, useState } from "react";

export default function MyPointsPage() {
  const [total, setTotal] = useState(0);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/me/points").then((r) => r.json()).then((d) => {
      setTotal(d.totalPoints ?? 0);
      setEvents(d.events ?? []);
    });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My points</h1>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
        <div className="text-sm text-[var(--muted)]">Total</div>
        <div className="text-4xl font-bold text-[var(--accent)]">{total}</div>
      </div>

      <h2 className="text-lg font-semibold">Recent events</h2>
      <div className="space-y-1">
        {events.length === 0 && <p className="text-[var(--muted)] text-sm">No events yet. Take a quiz or publish one.</p>}
        {events.map((e) => (
          <div key={e.id} className="flex items-center gap-3 border-b border-[var(--border)] py-2 text-sm">
            <span className={`font-mono w-12 text-right ${e.points > 0 ? "text-green-400" : "text-red-400"}`}>
              {e.points > 0 ? "+" : ""}{e.points}
            </span>
            <span className="flex-1">{e.description}</span>
            <span className="text-[var(--muted)] text-xs">{new Date(e.created_at).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
