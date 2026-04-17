"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditDraftPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [json, setJson] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/quizzes/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        const q = d.quiz;
        setJson(JSON.stringify({ title: q.title, description: q.description, questions: q.questions }, null, 2));
      });
  }, [params.id]);

  async function save() {
    setSaving(true);
    setError("");
    let quiz: any;
    try { quiz = JSON.parse(json); }
    catch (e: any) { setSaving(false); return setError("Invalid JSON: " + e.message); }
    const res = await fetch(`/api/quizzes/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quiz }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error + "\n" + JSON.stringify(data.issues ?? "", null, 2));
    router.push("/my/quizzes");
  }
  async function publish() {
    // Save first, then publish
    await save();
    const r = await fetch(`/api/quizzes/${params.id}/publish`, { method: "POST" });
    if (!r.ok) { alert((await r.json()).error); return; }
    router.push("/my/quizzes");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edit draft</h1>
      <p className="text-[var(--muted)] text-sm">Once published, the quiz becomes immutable. Old scores are preserved if you later unpublish.</p>
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        className="w-full h-96 bg-[var(--card)] border border-[var(--border)] rounded p-3 font-mono text-sm"
      />
      {error && <pre className="text-red-400 text-xs whitespace-pre-wrap">{error}</pre>}
      <div className="flex gap-3">
        <button onClick={save} disabled={saving} className="px-4 py-2 border border-[var(--border)] rounded">Save draft</button>
        <button onClick={publish} className="px-4 py-2 bg-[var(--accent)] text-black font-semibold rounded">Save & Publish</button>
      </div>
    </div>
  );
}
