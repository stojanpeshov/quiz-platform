"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Question =
  | { type: "single_choice"; question: string; options: string[] }
  | { type: "multiple_choice"; question: string; options: string[] }
  | { type: "true_false"; question: string }
  | { type: "short_text"; question: string };

export default function TakeQuizPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/quizzes/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        setQuiz(d.quiz);
        setAnswers(d.quiz.questions.map((q: Question) => defaultAnswer(q)));
      });
  }, [params.id]);

  function defaultAnswer(q: Question): any {
    switch (q.type) {
      case "single_choice": return { type: "single_choice", value: -1 };
      case "multiple_choice": return { type: "multiple_choice", value: [] };
      case "true_false": return { type: "true_false", value: null };
      case "short_text": return { type: "short_text", value: "" };
    }
  }

  function setAnswer(i: number, a: any) {
    setAnswers((prev) => prev.map((x, idx) => (idx === i ? a : x)));
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    // sanitize unanswered values
    const normalized = answers.map((a: any, i: number) => {
      const q = quiz.questions[i];
      if (q.type === "single_choice" && a.value < 0) return { type: "single_choice", value: -1 };
      if (q.type === "true_false" && a.value === null) return { type: "true_false", value: false };
      return a;
    });
    const res = await fetch(`/api/quizzes/${params.id}/take`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: normalized }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) return setError(data.error ?? "Failed to submit");
    setResult(data);
  }

  if (!quiz) return <p className="text-[var(--muted)]">Loading…</p>;

  if (result) {
    return (
      <div className="space-y-6">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
          <h1 className="text-2xl font-bold">Attempt {result.attemptNumber} / 3</h1>
          <p className="text-4xl font-bold mt-2">
            {result.score}% <span className="text-sm font-normal text-[var(--muted)]">({result.correctCount}/{result.totalCount})</span>
          </p>
        </div>

        <h2 className="text-lg font-semibold">Review</h2>
        {result.questions.map((q: any, i: number) => (
          <div
            key={i}
            className={`border rounded p-4 ${
              result.perQuestion[i].correct ? "border-green-600" : "border-red-600"
            }`}
          >
            <div className="font-medium mb-2">{i + 1}. {q.question}</div>
            <AnswerReview q={q} given={answers[i]} correct={result.perQuestion[i].correct} />
            {q.explanation && (
              <p className="text-sm text-[var(--muted)] mt-2 italic">{q.explanation}</p>
            )}
          </div>
        ))}

        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/quizzes/${params.id}`)}
            className="px-4 py-2 border border-[var(--border)] rounded"
          >
            Back to quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{quiz.title}</h1>
      <p className="text-[var(--muted)] text-sm">You have up to 3 attempts. Best score counts.</p>

      {quiz.questions.map((q: Question, i: number) => (
        <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
          <div className="font-medium mb-3">{i + 1}. {q.question}</div>
          <QuestionInput q={q} value={answers[i]} onChange={(a) => setAnswer(i, a)} />
        </div>
      ))}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        onClick={submit}
        disabled={submitting}
        className="bg-[var(--accent)] text-black font-semibold px-4 py-2 rounded disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit answers"}
      </button>
    </div>
  );
}

function QuestionInput({ q, value, onChange }: { q: Question; value: any; onChange: (a: any) => void }) {
  if (q.type === "single_choice") {
    return (
      <div className="space-y-1">
        {q.options.map((opt, idx) => (
          <label key={idx} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={value.value === idx}
              onChange={() => onChange({ type: "single_choice", value: idx })}
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }
  if (q.type === "multiple_choice") {
    const selected: number[] = value.value ?? [];
    return (
      <div className="space-y-1">
        {q.options.map((opt, idx) => (
          <label key={idx} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(idx)}
              onChange={(e) => {
                const next = e.target.checked
                  ? [...selected, idx].sort()
                  : selected.filter((x) => x !== idx);
                onChange({ type: "multiple_choice", value: next });
              }}
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }
  if (q.type === "true_false") {
    return (
      <div className="flex gap-4">
        {[true, false].map((b) => (
          <label key={String(b)} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={value.value === b}
              onChange={() => onChange({ type: "true_false", value: b })}
            />
            {b ? "True" : "False"}
          </label>
        ))}
      </div>
    );
  }
  return (
    <input
      type="text"
      value={value.value ?? ""}
      onChange={(e) => onChange({ type: "short_text", value: e.target.value })}
      className="w-full bg-transparent border border-[var(--border)] rounded px-3 py-2"
      placeholder="Your answer"
    />
  );
}

function AnswerReview({ q, given, correct }: { q: any; given: any; correct: boolean }) {
  return (
    <div className="text-sm space-y-1">
      <div>Your answer: <span className={correct ? "text-green-400" : "text-red-400"}>{formatAnswer(q, given)}</span></div>
      {!correct && <div>Correct: <span className="text-green-400">{formatCorrect(q)}</span></div>}
    </div>
  );
}

function formatAnswer(q: any, a: any): string {
  if (!a) return "–";
  if (q.type === "single_choice") return a.value >= 0 ? q.options[a.value] : "(no answer)";
  if (q.type === "multiple_choice") return (a.value ?? []).map((i: number) => q.options[i]).join(", ") || "(none)";
  if (q.type === "true_false") return a.value == null ? "(no answer)" : (a.value ? "True" : "False");
  return a.value || "(no answer)";
}
function formatCorrect(q: any): string {
  if (q.type === "single_choice") return q.options[q.correctAnswer];
  if (q.type === "multiple_choice") return q.correctAnswers.map((i: number) => q.options[i]).join(", ");
  if (q.type === "true_false") return q.correctAnswer ? "True" : "False";
  return q.correctAnswer;
}
