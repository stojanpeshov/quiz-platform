"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const EXAMPLE = JSON.stringify(
  {
    title: "Prompt Engineering Basics",
    description: "Sample quiz based on Anthropic Academy module 1",
    difficulty: "intermediate",
    questions: [
      {
        type: "single_choice",
        question: "What is the role of a system prompt?",
        options: [
          "To set the AI's persona and constraints",
          "To pass user input only",
          "To store chat history",
          "To log errors",
        ],
        correctAnswer: 0,
        explanation: "System prompts frame the assistant's behavior.",
      },
      {
        type: "true_false",
        question: "Temperature 0 produces deterministic outputs.",
        correctAnswer: true,
      },
    ],
  },
  null,
  2
);

export default function NewQuizPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"json" | "form">("json");
  const [json, setJson] = useState(EXAMPLE);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit() {
    setError("");
    setSaving(true);
    let quiz: any;
    try {
      quiz = JSON.parse(json);
    } catch (e: any) {
      setSaving(false);
      return setError("Invalid JSON: " + e.message);
    }
    const res = await fetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quiz }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      const detail = data.issues ? JSON.stringify(data.issues, null, 2) : "";
      return setError(`${data.error}\n${detail}`);
    }
    router.push(`/my/quizzes/${data.id}/edit`);
  }

  const TEMPLATE_TEXT = `Output **ONLY valid JSON** matching this exact schema. No prose, no explanations, no markdown fences — just the raw JSON object.

## Schema

json:
{
  "title": "string (3–120 chars)",
  "description": "string (0–500 chars)",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "questions": [
    {
      "type": "single_choice" | "multiple_choice" | "true_false" | "short_text",
      "question": "string (required)",
      "options": ["..."],
      "correctAnswer": <index|bool|string>,
      "correctAnswers": [<indices>],
      "explanation": "string (required)"
    }
  ]
}

## Per-type rules

- **single_choice**: include "options" (2–6 strings) and "correctAnswer" as the zero-based index of the correct option. Do NOT include "correctAnswers".
- **multiple_choice**: include "options" and "correctAnswers" as an array of zero-based indices (at least 1). Do NOT include "correctAnswer".
- **true_false**: omit "options". "correctAnswer" must be the boolean "true" or "false".
- **short_text**: omit "options". "correctAnswer" must be a short string (matching is case-insensitive, whitespace-normalized).`;

  function copyTemplate() {
    navigator.clipboard.writeText(TEMPLATE_TEXT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create a new quiz</h1>

      {/* Info Box */}
      <div
        className="rounded-lg p-4 border"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <h3 className="font-semibold mb-2" style={{ color: "var(--accent)" }}>
          💡 Try a quick AI self-check
        </h3>
        <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
          Use your favorite AI tool (ChatGPT, Claude, Copilot, Gemini) to create a quiz from your course materials.
        </p>

        <div className="text-sm space-y-2 mb-3" style={{ color: "var(--fg)" }}>
          <p className="font-medium">What to include in your prompt:</p>
          <ul className="list-disc list-inside space-y-1 ml-2" style={{ color: "var(--muted)" }}>
            <li>The course link or list of materials you completed</li>
            <li>Difficulty level of the questions (beginner, intermediate, advanced)</li>
            <li>Number of questions (e.g., 5 or 20)</li>
          </ul>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer font-medium mb-2" style={{ color: "var(--accent)" }}>
            Show JSON template part for your AI prompt (copy paste to your prompt)
          </summary>
          <div className="relative mt-2">
            <button
              onClick={copyTemplate}
              className="absolute top-2 right-2 px-3 py-1 text-xs rounded hover:opacity-80"
              style={{ background: "var(--accent)", color: "black" }}
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
            <pre
              className="text-xs p-3 rounded overflow-x-auto pr-24"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              {TEMPLATE_TEXT}
            </pre>
          </div>
        </details>

        <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            <strong>How it works:</strong> Copy the JSON output from your AI → Paste below → Click "Save as draft" →
            Review & edit → Publish when ready. Your quiz starts as a draft—nothing is public until you publish.
          </p>
        </div>
      </div>

      <div className="flex gap-2 text-sm">
        {(["json", "form"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded border ${tab === t ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)]"
              }`}
          >
            {t === "json" ? "Paste JSON" : "Build manually"}
          </button>
        ))}
      </div>

      {tab === "json" ? (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>
            Paste your quiz JSON here (sample provided below - replace with your own)
          </label>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            className="w-full h-96 bg-[var(--card)] border border-[var(--border)] rounded p-3 font-mono text-sm"
            placeholder="Paste your quiz JSON here..."
          />
          {error && <pre className="text-red-400 text-xs mt-2 whitespace-pre-wrap">{error}</pre>}
          <button
            onClick={submit}
            disabled={saving}
            className="mt-3 bg-[var(--accent)] text-black font-semibold px-4 py-2 rounded disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save as draft"}
          </button>
        </div>
      ) : (
        <ManualBuilder
          onSubmit={(quiz) => {
            setJson(JSON.stringify(quiz, null, 2));
            setTab("json");
          }}
        />
      )}
    </div>
  );
}

function ManualBuilder({ onSubmit }: { onSubmit: (q: any) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<any[]>([
    { type: "single_choice", question: "", options: ["", ""], correctAnswer: 0 },
  ]);

  function update(i: number, patch: any) {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }
  function addQuestion(type: string) {
    const base: any = { type, question: "" };
    if (type === "single_choice") Object.assign(base, { options: ["", ""], correctAnswer: 0 });
    if (type === "multiple_choice") Object.assign(base, { options: ["", ""], correctAnswers: [0] });
    if (type === "true_false") Object.assign(base, { correctAnswer: true });
    if (type === "short_text") Object.assign(base, { correctAnswer: "" });
    setQuestions([...questions, base]);
  }

  return (
    <div className="space-y-4">
      <input
        className="w-full bg-transparent border border-[var(--border)] rounded px-3 py-2"
        placeholder="Quiz title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="w-full bg-transparent border border-[var(--border)] rounded px-3 py-2"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {questions.map((q, i) => (
        <div key={i} className="border border-[var(--border)] rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--muted)]">{q.type}</span>
            <button
              onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))}
              className="text-xs text-red-400"
            >
              Remove
            </button>
          </div>
          <input
            className="w-full bg-transparent border border-[var(--border)] rounded px-3 py-2"
            placeholder="Question text"
            value={q.question}
            onChange={(e) => update(i, { question: e.target.value })}
          />
          {(q.type === "single_choice" || q.type === "multiple_choice") && (
            <div className="space-y-1">
              {q.options.map((opt: string, oi: number) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type={q.type === "single_choice" ? "radio" : "checkbox"}
                    name={`q-${i}`}
                    checked={
                      q.type === "single_choice"
                        ? q.correctAnswer === oi
                        : q.correctAnswers.includes(oi)
                    }
                    onChange={() => {
                      if (q.type === "single_choice") update(i, { correctAnswer: oi });
                      else {
                        const ca = q.correctAnswers.includes(oi)
                          ? q.correctAnswers.filter((x: number) => x !== oi)
                          : [...q.correctAnswers, oi].sort();
                        update(i, { correctAnswers: ca });
                      }
                    }}
                  />
                  <input
                    className="flex-1 bg-transparent border border-[var(--border)] rounded px-3 py-1"
                    value={opt}
                    onChange={(e) => {
                      const opts = [...q.options];
                      opts[oi] = e.target.value;
                      update(i, { options: opts });
                    }}
                  />
                </div>
              ))}
              <button
                onClick={() => update(i, { options: [...q.options, ""] })}
                className="text-xs text-[var(--accent)]"
              >
                + add option
              </button>
            </div>
          )}
          {q.type === "true_false" && (
            <select
              className="bg-[var(--card)] border border-[var(--border)] rounded px-3 py-1"
              value={String(q.correctAnswer)}
              onChange={(e) => update(i, { correctAnswer: e.target.value === "true" })}
            >
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          )}
          {q.type === "short_text" && (
            <input
              className="w-full bg-transparent border border-[var(--border)] rounded px-3 py-2"
              placeholder="Correct answer (exact match, case-insensitive)"
              value={q.correctAnswer}
              onChange={(e) => update(i, { correctAnswer: e.target.value })}
            />
          )}
        </div>
      ))}

      <div className="flex gap-2 text-xs">
        {["single_choice", "multiple_choice", "true_false", "short_text"].map((t) => (
          <button
            key={t}
            onClick={() => addQuestion(t)}
            className="px-2 py-1 border border-[var(--border)] rounded"
          >
            + {t}
          </button>
        ))}
      </div>

      <button
        onClick={() => onSubmit({ title, description, questions })}
        className="bg-[var(--accent)] text-black font-semibold px-4 py-2 rounded"
      >
        Generate JSON → review & save
      </button>
    </div>
  );
}
