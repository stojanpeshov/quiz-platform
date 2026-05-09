import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "../../lib/api";

interface E { id: string; eventType: string; points: number; description: string; createdAt: string }

export function AdminEvents() {
  const [eventType, setEventType] = useState("");
  const { data } = useQuery<{ events: E[] }>({
    queryKey: ["admin", "events", eventType],
    queryFn: () => apiFetch(`/api/admin/events${eventType ? `?eventType=${encodeURIComponent(eventType)}` : ""}`),
  });
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Point events</h1>
      <select value={eventType} onChange={(e) => setEventType(e.target.value)}
              style={{ background: "var(--card)", color: "var(--fg)" }}>
        <option value="">All</option>
        <option value="publish_quiz">Publish quiz</option>
        <option value="complete_attempt">Complete attempt</option>
        <option value="rate_quiz">Rate quiz</option>
        <option value="score_80_first_time">Score ≥80%</option>
        <option value="score_100_first_time">Score 100%</option>
        <option value="owner_quality_delta">Owner quality (delta)</option>
        <option value="owner_popularity_delta">Owner popularity (delta)</option>
        <option value="top_performer_delta">Top performer (delta)</option>
      </select>
      <ul className="space-y-1 text-sm">
        {data?.events.map((e) => (
          <li key={e.id} className="p-2 rounded"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <span style={{ color: e.points >= 0 ? "var(--accent)" : "#f87171" }}>{e.points}</span>
            {" "}{e.eventType} — {e.description}
            <span className="ml-2" style={{ color: "var(--muted)" }}>
              {new Date(e.createdAt).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
