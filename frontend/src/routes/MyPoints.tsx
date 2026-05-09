import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

interface PointsResp {
  totalPoints: number;
  events: { id: string; eventType: string; points: number; description: string; createdAt: string }[];
}

export function MyPoints() {
  const { data, isLoading } = useQuery<PointsResp>({
    queryKey: ["me", "points"],
    queryFn: () => apiFetch("/api/me/points"),
  });

  if (isLoading || !data) return <p>Loading…</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My points</h1>
      <p className="text-3xl" style={{ color: "var(--accent)" }}>{data.totalPoints}</p>
      <ul className="space-y-1 text-sm">
        {data.events.map((e) => (
          <li key={e.id} className="p-2 rounded flex items-center justify-between"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div>
              <div>{e.description}</div>
              <div style={{ color: "var(--muted)" }}>
                {e.eventType} · {new Date(e.createdAt).toLocaleString()}
              </div>
            </div>
            <div style={{ color: e.points >= 0 ? "var(--accent)" : "#f87171" }}>
              {e.points >= 0 ? "+" : ""}{e.points}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
