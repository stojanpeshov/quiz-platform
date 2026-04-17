"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Quiz {
  id: string;
  title: string;
  description: string;
  status: string;
  question_count: number;
  avg_rating: number;
  rating_count: number;
  attempt_count: number;
  created_at: string;
  published_at: string | null;
}

interface UserPoints {
  total_points: number;
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [points, setPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      // Fetch quizzes and points in parallel
      Promise.all([
        fetch("/api/quizzes?mine=1").then((res) => res.json()),
        fetch("/api/me/points").then((res) => res.json()),
      ])
        .then(([quizzesData, pointsData]) => {
          setMyQuizzes(quizzesData.quizzes || []);
          setPoints(pointsData.totalPoints || 0);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Header with Points */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "var(--fg)" }}>
              Welcome back, {session.user?.name?.split(" ")[0]}!
            </h1>
            <p className="mt-2" style={{ color: "var(--muted)" }}>
              Create quizzes, test your knowledge, and compete with your colleagues
            </p>
          </div>
          <Link
            href="/me/points"
            className="rounded-lg p-6 text-center hover:opacity-90 transition-opacity"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="text-sm" style={{ color: "var(--muted)" }}>
              Your Points
            </div>
            <div className="text-3xl font-bold mt-1" style={{ color: "var(--accent)" }}>
              {points.toLocaleString()}
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/quizzes/new"
            className="rounded-lg p-6 shadow-lg transition-all hover:shadow-xl hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1 text-black">
                  Create New Quiz
                </h3>
                <p className="text-sm text-black opacity-80">
                  Generate from your materials
                </p>
              </div>
              <svg
                className="w-8 h-8 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
          </Link>

          <Link
            href="/quizzes"
            className="rounded-lg p-6 shadow-md transition-all hover:shadow-lg"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--fg)" }}>
                  Browse Quizzes
                </h3>
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  From your colleagues
                </p>
              </div>
              <svg
                className="w-8 h-8"
                style={{ color: "var(--muted)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          </Link>

          <Link
            href="/leaderboards"
            className="rounded-lg p-6 shadow-md transition-all hover:shadow-lg"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--fg)" }}>
                  Leaderboards
                </h3>
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  See top performers
                </p>
              </div>
              <svg
                className="w-8 h-8"
                style={{ color: "var(--muted)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
            </div>
          </Link>
        </div>

        {/* My Quizzes Section */}
        <div
          className="rounded-lg shadow-md p-6"
          style={{ background: "var(--card)" }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{ color: "var(--fg)" }}>
              My Quizzes
            </h2>
            <Link
              href="/my/quizzes"
              className="text-sm font-medium hover:opacity-80"
              style={{ color: "var(--accent)" }}
            >
              View All →
            </Link>
          </div>

          {myQuizzes.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12"
                style={{ color: "var(--muted)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3
                className="mt-2 text-sm font-medium"
                style={{ color: "var(--fg)" }}
              >
                No quizzes yet
              </h3>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                Get started by creating your first quiz
              </p>
              <div className="mt-6">
                <Link
                  href="/quizzes/new"
                  className="inline-flex items-center px-4 py-2 shadow-sm text-sm font-medium rounded-md text-black hover:opacity-90"
                  style={{ background: "var(--accent)" }}
                >
                  Create Quiz
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myQuizzes.slice(0, 6).map((quiz) => (
                <Link
                  key={quiz.id}
                  href={
                    quiz.status === "draft"
                      ? `/my/quizzes/${quiz.id}/edit`
                      : `/quizzes/${quiz.id}`
                  }
                  className="rounded-lg p-4 hover:opacity-80 transition-opacity"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3
                      className="font-semibold line-clamp-2"
                      style={{ color: "var(--fg)" }}
                    >
                      {quiz.title}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        quiz.status === "published"
                          ? "bg-green-900 text-green-300"
                          : quiz.status === "draft"
                          ? "bg-yellow-900 text-yellow-300"
                          : "bg-gray-800 text-gray-300"
                      }`}
                    >
                      {quiz.status}
                    </span>
                  </div>
                  <p
                    className="text-sm line-clamp-2 mb-3"
                    style={{ color: "var(--muted)" }}
                  >
                    {quiz.description}
                  </p>
                  <div
                    className="flex items-center justify-between text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    <span>{quiz.question_count} questions</span>
                    {quiz.status === "published" && (
                      <div className="flex items-center gap-3">
                        <span>⭐ {quiz.avg_rating.toFixed(1)}</span>
                        <span>👥 {quiz.attempt_count}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
