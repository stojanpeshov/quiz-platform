"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminHome() {
  const [stats, setStats] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setStats)
      .catch(setErr);
  }, []);

  if (err) return <p className="text-red-400">Admin access required.</p>;
  if (!stats) return <p className="text-[var(--muted)]">Loading…</p>;

  const kpi = [
    ["Users", stats.userCount],
    ["Published quizzes", stats.publishedQuizCount],
    ["Total quizzes", stats.quizCount],
    ["Attempts", stats.attemptCount],
    ["Ratings", stats.ratingCount],
    ["Active users (7d)", stats.activeUsers7d],
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/admin/users" className="px-3 py-1 border border-[var(--border)] rounded">Users</Link>
          <Link href="/admin/quizzes" className="px-3 py-1 border border-[var(--border)] rounded">Quizzes</Link>
          <Link href="/admin/events" className="px-3 py-1 border border-[var(--border)] rounded">Events</Link>
          <Link href="/admin/achievements" className="px-3 py-1 border border-[var(--border)] rounded">Achievements</Link>
          <Link href="/admin/settings" className="px-3 py-1 border border-[var(--border)] rounded">Settings</Link>
          <a href="/api/admin/export" className="px-3 py-1 border border-[var(--border)] rounded">Export CSV</a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpi.map(([label, val]) => (
          <div key={label as string} className="bg-[var(--card)] border border-[var(--border)] rounded p-4">
            <div className="text-xs text-[var(--muted)]">{label}</div>
            <div className="text-2xl font-bold">{val as any}</div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-2">Top quizzes</h2>
        <ul className="space-y-1 text-sm">
          {stats.topQuizzes.map((q: any) => (
            <li key={q.id} className="flex justify-between border-b border-[var(--border)] py-1">
              <Link href={`/quizzes/${q.id}`} className="hover:text-[var(--accent)]">{q.title}</Link>
              <span className="text-[var(--muted)]">{q.attempt_count} attempts · ★ {q.avg_rating?.toFixed?.(1) ?? "–"}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Top users</h2>
        <ul className="space-y-1 text-sm">
          {stats.topUsers.map((u: any) => (
            <li key={u.id} className="flex justify-between border-b border-[var(--border)] py-1">
              <span>{u.name} <span className="text-[var(--muted)] text-xs">{u.email}</span></span>
              <span className="font-mono">{u.total_points} pts</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
