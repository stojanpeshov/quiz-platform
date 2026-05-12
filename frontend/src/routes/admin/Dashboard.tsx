import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";

interface Stats {
  userCount: number; quizCount: number; publishedQuizCount: number;
  attemptCount: number; ratingCount: number; activeUsers7d: number;
  topQuizzes: { id: string; title: string; attemptCount: number; avgRating: number }[];
  topUsers: { id: string; name: string; email: string; totalPoints: number }[];
}

export function AdminDashboard() {
  const { data, isLoading } = useQuery<Stats>({
    queryKey: ["admin", "stats"],
    queryFn: () => apiFetch("/api/admin/stats"),
  });
  if (isLoading || !data) return <p>Loading…</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin</h1>
      <div className="flex gap-3 text-sm flex-wrap">
        <Link to="/admin/users">Users</Link>
        <Link to="/admin/quizzes">Quizzes</Link>
        <Link to="/admin/achievements">Achievements</Link>
        <Link to="/admin/events">Events</Link>
        <Link to="/admin/settings">Settings</Link>
        <a href="/api/admin/export">Export CSV</a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="Users" value={data.userCount} />
        <Stat label="Quizzes" value={data.quizCount} />
        <Stat label="Published" value={data.publishedQuizCount} />
        <Stat label="Attempts" value={data.attemptCount} />
        <Stat label="Ratings" value={data.ratingCount} />
        <Stat label="Active 7d" value={data.activeUsers7d} />
      </div>
      <h2 className="text-xl font-bold">Top quizzes</h2>
      <ul className="text-sm space-y-1">
        {data.topQuizzes.map((q) => (
          <li key={q.id}>{q.title} — {q.attemptCount} attempts · ★ {q.avgRating}</li>
        ))}
      </ul>
      <h2 className="text-xl font-bold">Top users</h2>
      <ul className="text-sm space-y-1">
        {data.topUsers.map((u) => <li key={u.id}>{u.name} ({u.email}) — {u.totalPoints} pts</li>)}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 rounded" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="text-sm" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
