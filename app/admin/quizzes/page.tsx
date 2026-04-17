"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);

  async function load() {
    // Admin sees everything via RLS policy
    const r = await fetch("/api/admin/quizzes");
    const d = await r.json();
    setQuizzes(d.quizzes ?? []);
  }
  useEffect(() => { load(); }, []);

  async function del(id: string) {
    if (!confirm("Delete this quiz and all its attempts/ratings?")) return;
    const r = await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
    if (!r.ok) { alert((await r.json()).error); return; }
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">All quizzes</h1>
      <table className="w-full text-sm">
        <thead className="text-[var(--muted)]">
          <tr>
            <th className="text-left py-2">Title</th>
            <th className="text-left">Status</th>
            <th className="text-right">Attempts</th>
            <th className="text-right">★</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {quizzes.map((q) => (
            <tr key={q.id} className="border-t border-[var(--border)]">
              <td className="py-2">
                <Link href={`/quizzes/${q.id}`} className="hover:text-[var(--accent)]">{q.title}</Link>
                <div className="text-xs text-[var(--muted)]">by {q.author_email ?? q.author_id}</div>
              </td>
              <td>{q.status}</td>
              <td className="text-right">{q.attempt_count}</td>
              <td className="text-right">{q.avg_rating?.toFixed?.(1) ?? "–"}</td>
              <td className="text-right">
                <button onClick={() => del(q.id)} className="text-xs px-2 py-1 text-red-400 border border-red-900 rounded">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
