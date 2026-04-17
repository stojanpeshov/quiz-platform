"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MyQuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);

  async function load() {
    const r = await fetch("/api/quizzes?mine=1");
    const d = await r.json();
    setQuizzes(d.quizzes ?? []);
  }
  useEffect(() => { load(); }, []);

  async function publish(id: string) {
    const r = await fetch(`/api/quizzes/${id}/publish`, { method: "POST" });
    if (!r.ok) { alert((await r.json()).error); return; }
    load();
  }
  async function unpublish(id: string) {
    if (!confirm("Unpublishing archives this version. A new draft will open. Old scores are kept.")) return;
    const r = await fetch(`/api/quizzes/${id}/unpublish`, { method: "POST" });
    const d = await r.json();
    if (!r.ok) { alert(d.error); return; }
    router.push(`/my/quizzes/${d.newDraftId}/edit`);
  }
  async function del(id: string) {
    if (!confirm("Delete this quiz permanently? This also deletes all attempts and ratings.")) return;
    const r = await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
    if (!r.ok) { alert((await r.json()).error); return; }
    load();
  }

  const groups = {
    draft: quizzes.filter((q) => q.status === "draft"),
    published: quizzes.filter((q) => q.status === "published"),
    archived: quizzes.filter((q) => q.status === "archived"),
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My quizzes</h1>
        <Link href="/quizzes/new" className="bg-[var(--accent)] text-black font-semibold px-4 py-2 rounded">
          + New quiz
        </Link>
      </div>

      {(["draft", "published", "archived"] as const).map((status) => (
        <section key={status}>
          <h2 className="text-lg font-semibold capitalize mb-3">
            {status} ({groups[status].length})
          </h2>
          {groups[status].length === 0 && <p className="text-[var(--muted)] text-sm">None.</p>}
          <div className="space-y-2">
            {groups[status].map((q) => (
              <div key={q.id} className="bg-[var(--card)] border border-[var(--border)] rounded p-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{q.title}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {q.question_count} questions · {q.attempt_count} attempts · ★ {q.avg_rating?.toFixed?.(1) ?? "–"}
                  </div>
                </div>
                <div className="flex gap-2 text-sm shrink-0">
                  {status === "draft" && (
                    <>
                      <Link href={`/my/quizzes/${q.id}/edit`} className="px-2 py-1 border border-[var(--border)] rounded">Edit</Link>
                      <button onClick={() => publish(q.id)} className="px-2 py-1 bg-[var(--accent)] text-black rounded">Publish</button>
                    </>
                  )}
                  {status === "published" && (
                    <>
                      <Link href={`/quizzes/${q.id}`} className="px-2 py-1 border border-[var(--border)] rounded">View</Link>
                      <button onClick={() => unpublish(q.id)} className="px-2 py-1 border border-[var(--border)] rounded">Unpublish & Edit</button>
                    </>
                  )}
                  {status === "archived" && (
                    <Link href={`/quizzes/${q.id}`} className="px-2 py-1 border border-[var(--border)] rounded">View</Link>
                  )}
                  <button onClick={() => del(q.id)} className="px-2 py-1 text-red-400 border border-red-900 rounded">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
