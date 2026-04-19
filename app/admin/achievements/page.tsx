"use client";
import { useEffect, useState } from "react";

type ConditionValue = { n?: number; min_pct?: number; min_rating?: number; points?: number };

type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition_type: string;
  condition_value: ConditionValue;
  scope: string;
  earner_type: string;
  card_type: string;
  active: boolean;
  created_at: string;
};

const CONDITION_LABELS: Record<string, string> = {
  score_threshold: "Score ≥ X%",
  score_top_n: "Top-N scorers (nightly)",
  completion_count: "Complete N quizzes",
  publish_count: "Publish N quizzes",
  points_milestone: "Reach N points",
  quiz_attempt_count: "Quiz gets N attempts (nightly)",
  quiz_avg_rating: "Quiz avg rating ≥ X (nightly)",
  rating_top_n: "Quiz in top-N by rating (nightly)",
};

const CARD_TYPES = [
  "score_milestone", "top_performer", "completion_milestone",
  "quiz_published", "points_milestone", "quiz_popular",
];

const CONDITION_TYPES = Object.keys(CONDITION_LABELS);

const BLANK: {
  name: string; description: string; icon: string;
  condition_type: string; condition_value: ConditionValue;
  scope: string; earner_type: string; card_type: string;
} = {
  name: "", description: "", icon: "🏅",
  condition_type: "completion_count",
  condition_value: { n: 1 },
  scope: "global", earner_type: "self", card_type: "completion_milestone",
};

export default function AdminAchievementsPage() {
  const [items, setItems] = useState<Achievement[]>([]);
  const [form, setForm] = useState<typeof BLANK | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    fetch("/api/admin/achievements")
      .then((r) => r.json())
      .then((d) => setItems(d.achievements ?? []));
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(item: Achievement) {
    await fetch(`/api/admin/achievements/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active }),
    });
    load();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError("");

    const url = editId ? `/api/admin/achievements/${editId}` : "/api/admin/achievements";
    const method = editId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, condition_value: conditionValueObj(form) }),
    });

    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed");
      return;
    }
    setForm(null);
    setEditId(null);
    load();
  }

  function conditionValueObj(f: typeof BLANK): Record<string, number> {
    switch (f.condition_type) {
      case "score_threshold": return { min_pct: f.condition_value.min_pct ?? 80 };
      case "quiz_avg_rating": return { min_rating: f.condition_value.min_rating ?? 4.5 };
      case "points_milestone": return { points: f.condition_value.points ?? 100 };
      default: return { n: f.condition_value.n ?? 1 };
    }
  }

  function conditionValueLabel(item: Achievement) {
    const cv = item.condition_value;
    if (cv.n !== undefined) return `n = ${cv.n}`;
    if (cv.min_pct !== undefined) return `min ${cv.min_pct}%`;
    if (cv.min_rating !== undefined) return `min ${cv.min_rating}★`;
    if (cv.points !== undefined) return `${cv.points} pts`;
    return JSON.stringify(cv);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Achievements</h1>
        <button
          onClick={() => { setForm(BLANK); setEditId(null); }}
          className="px-3 py-1 border border-[var(--accent)] text-[var(--accent)] rounded text-sm"
        >
          + New achievement
        </button>
      </div>

      {form && (
        <form onSubmit={submit} className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
          <h2 className="font-semibold">{editId ? "Edit achievement" : "New achievement"}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[var(--muted)]">Icon (emoji)</label>
              <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="w-full bg-transparent border border-[var(--border)] rounded px-2 py-1 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--muted)]">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                required className="w-full bg-transparent border border-[var(--border)] rounded px-2 py-1 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--muted)]">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              required className="w-full bg-transparent border border-[var(--border)] rounded px-2 py-1 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[var(--muted)]">Condition</label>
              <select value={form.condition_type}
                onChange={(e) => setForm({ ...form, condition_type: e.target.value, condition_value: { n: 1 } })}
                className="w-full bg-transparent border border-[var(--border)] rounded px-2 py-1 text-sm">
                {CONDITION_TYPES.map((t) => <option key={t} value={t}>{CONDITION_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--muted)]">
                {form.condition_type === "score_threshold" ? "Min score %" :
                 form.condition_type === "quiz_avg_rating" ? "Min rating" :
                 form.condition_type === "points_milestone" ? "Points" : "Count (N)"}
              </label>
              <input type="number" min={1}
                value={
                  form.condition_value.n ??
                  form.condition_value.min_pct ??
                  form.condition_value.min_rating ??
                  form.condition_value.points ?? 1
                }
                onChange={(e) => {
                  const v = Number(e.target.value);
                  const key =
                    form.condition_type === "score_threshold" ? "min_pct" :
                    form.condition_type === "quiz_avg_rating" ? "min_rating" :
                    form.condition_type === "points_milestone" ? "points" : "n";
                  setForm({ ...form, condition_value: { [key]: v } });
                }}
                className="w-full bg-transparent border border-[var(--border)] rounded px-2 py-1 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[var(--muted)]">Scope</label>
              <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}
                className="w-full bg-transparent border border-[var(--border)] rounded px-2 py-1 text-sm">
                <option value="global">Global</option>
                <option value="per_quiz">Per quiz</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--muted)]">Earner</label>
              <select value={form.earner_type} onChange={(e) => setForm({ ...form, earner_type: e.target.value })}
                className="w-full bg-transparent border border-[var(--border)] rounded px-2 py-1 text-sm">
                <option value="self">Self (action performer)</option>
                <option value="quiz_author">Quiz author</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--muted)]">Card type</label>
              <select value={form.card_type} onChange={(e) => setForm({ ...form, card_type: e.target.value })}
                className="w-full bg-transparent border border-[var(--border)] rounded px-2 py-1 text-sm">
                {CARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="px-3 py-1 bg-[var(--accent)] text-white rounded text-sm disabled:opacity-50">
              {saving ? "Saving…" : editId ? "Update" : "Create"}
            </button>
            <button type="button" onClick={() => { setForm(null); setEditId(null); }}
              className="px-3 py-1 border border-[var(--border)] rounded text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[var(--muted)]">
            <tr>
              <th className="text-left py-2">Achievement</th>
              <th className="text-left">Condition</th>
              <th className="text-left">Scope</th>
              <th className="text-left">Earner</th>
              <th className="text-left">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={`border-t border-[var(--border)] ${!item.active ? "opacity-50" : ""}`}>
                <td className="py-2">
                  <span className="mr-2">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                  <div className="text-xs text-[var(--muted)]">{item.description}</div>
                </td>
                <td className="text-xs">
                  <div>{CONDITION_LABELS[item.condition_type]}</div>
                  <div className="text-[var(--muted)]">{conditionValueLabel(item)}</div>
                </td>
                <td className="text-xs capitalize">{item.scope.replace("_", " ")}</td>
                <td className="text-xs capitalize">{item.earner_type.replace("_", " ")}</td>
                <td className="text-xs">{item.active ? "Active" : "Inactive"}</td>
                <td className="text-right">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => { setForm({
                      name: item.name, description: item.description, icon: item.icon,
                      condition_type: item.condition_type, condition_value: item.condition_value,
                      scope: item.scope, earner_type: item.earner_type, card_type: item.card_type,
                    }); setEditId(item.id); }}
                      className="text-xs px-2 py-1 border border-[var(--border)] rounded">Edit</button>
                    <button onClick={() => toggleActive(item)}
                      className="text-xs px-2 py-1 border border-[var(--border)] rounded">
                      {item.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
