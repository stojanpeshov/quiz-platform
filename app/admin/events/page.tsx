"use client";
import { useEffect, useState } from "react";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [type, setType] = useState("");

  useEffect(() => {
    const q = type ? `?eventType=${type}` : "";
    fetch(`/api/admin/events${q}`).then((r) => r.json()).then((d) => setEvents(d.events ?? []));
  }, [type]);

  const types = [
    "", "publish_quiz", "complete_attempt", "score_80_first", "score_100_first",
    "rate_quiz", "owner_quality_delta", "owner_popularity_delta", "top_performer_delta",
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Point events</h1>
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="bg-[var(--card)] border border-[var(--border)] rounded px-3 py-1 text-sm"
      >
        {types.map((t) => (
          <option key={t} value={t}>{t || "All types"}</option>
        ))}
      </select>
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="text-[var(--muted)]">
          <tr>
            <th className="text-left py-2">When</th>
            <th className="text-left">Type</th>
            <th className="text-right">Points</th>
            <th className="text-left">Description</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-t border-[var(--border)]">
              <td className="py-2 text-xs text-[var(--muted)]">{new Date(e.created_at).toLocaleString()}</td>
              <td className="text-xs">{e.event_type}</td>
              <td className={`text-right font-mono ${e.points >= 0 ? "text-green-400" : "text-red-400"}`}>
                {e.points > 0 ? "+" : ""}{e.points}
              </td>
              <td>{e.description}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}
