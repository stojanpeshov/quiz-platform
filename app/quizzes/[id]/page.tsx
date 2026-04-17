"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function QuizDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [quiz, setQuiz] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myAttempts, setMyAttempts] = useState(0);
  const [stars, setStars] = useState(0);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`/api/quizzes/${params.id}`).then((r) => r.json()).then((d) => setQuiz(d.quiz));
    fetch(`/api/leaderboards?view=per_quiz&quizId=${params.id}`)
      .then((r) => r.json())
      .then((d) => setLeaderboard(d.rows ?? []));
  }, [params.id]);

  async function rate(s: number) {
    setStars(s);
    const res = await fetch(`/api/quizzes/${params.id}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stars: s }),
    });
    const data = await res.json();
    setMsg(res.ok ? "Rating saved." : data.error ?? "Failed to rate");
  }

  if (!quiz) return <p className="text-[var(--muted)]">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="text-xs text-[var(--muted)] uppercase">{quiz.status}</div>
          {quiz.difficulty && (
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded ${
                quiz.difficulty === "beginner"
                  ? "bg-green-900 text-green-300"
                  : quiz.difficulty === "advanced"
                  ? "bg-red-900 text-red-300"
                  : "bg-blue-900 text-blue-300"
              }`}
            >
              {quiz.difficulty}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold">{quiz.title}</h1>
        <p className="text-[var(--muted)] mt-2">{quiz.description}</p>
        <div className="flex gap-4 text-sm text-[var(--muted)] mt-3">
          {quiz.author_name && <span>by {quiz.author_name}</span>}
          <span>{quiz.question_count} questions</span>
          <span>★ {quiz.avg_rating?.toFixed?.(1) ?? "–"} ({quiz.rating_count})</span>
          <span>{quiz.attempt_count} attempts</span>
        </div>
      </div>

      {quiz.status === "published" && (
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/quizzes/${params.id}/take`)}
            className="bg-[var(--accent)] text-black font-semibold px-4 py-2 rounded"
          >
            Take quiz
          </button>
        </div>
      )}

      {session && quiz.author_id !== (session.user as any)?.id && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Rate this quiz</h2>
          <div className="flex gap-1 text-2xl">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => rate(s)}
                className={s <= stars ? "text-[var(--accent)]" : "text-[var(--muted)]"}
              >
                ★
              </button>
            ))}
          </div>
          {msg && <p className="text-sm text-[var(--muted)] mt-1">{msg}</p>}
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">Top 10 on this quiz</h2>
        {leaderboard.length === 0 ? (
          <p className="text-[var(--muted)] text-sm">No attempts yet. Be the first.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[var(--muted)]">
              <tr>
                <th className="text-left py-2">#</th>
                <th className="text-left">Name</th>
                <th className="text-right">Best score</th>
                <th className="text-right">Attempts used</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((r: any) => (
                <tr key={r.user_id} className="border-t border-[var(--border)]">
                  <td className="py-2">{r.rank}</td>
                  <td>{r.user_name}</td>
                  <td className="text-right">{r.best_score}%</td>
                  <td className="text-right">{r.attempts_used}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
