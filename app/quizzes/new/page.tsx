"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const EXAMPLE = JSON.stringify(
  {
    title: "Prompt Engineering Basics",
    description: "Sample quiz based on Anthropic Academy module 1",
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create a new quiz</h1>
      <p className="text-[var(--muted)] text-sm">
        Start as a draft. Nothing is public until you publish. See{" "}
        <a href="/docs/QUIZ_PROMPT_TEMPLATE.md" className="text-[var(--accent)] underline">
          the prompt template
        </a>{" "}
        to generate a quiz from any LLM.
      </p>

      <div className="flex gap-2 text-sm">
        {(["json", "form"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded border ${
              tab === t ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)]"
            }`}
          >
            {t === "json" ? "Paste JSON" : "Build manually"}
          </button>
        ))}
      </div>

      {tab === "json" ? (
        <div>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            className="w-full h-96 bg-[var(--card)] border border-[var(--border)] rounded p-3 font-mono text-sm"
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
