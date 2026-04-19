"use client";
import { useEffect, useState } from "react";

type UserAchievement = {
  id: string;
  earned_at: string;
  shared_to_teams_at: string | null;
  ref_quiz_id: string | null;
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
    card_type: string;
  };
  quiz: { id: string; title: string } | null;
};

export default function MyAchievementsPage() {
  const [items, setItems] = useState<UserAchievement[]>([]);
  const [sharing, setSharing] = useState<Record<string, boolean>>({});
  const [shared, setShared] = useState<Record<string, boolean>>({});
  const [shareError, setShareError] = useState<Record<string, string>>({});

  function load() {
    fetch("/api/me/achievements")
      .then((r) => r.json())
      .then((d) => setItems(d.achievements ?? []));
  }

  useEffect(() => { load(); }, []);

  async function shareToTeams(id: string) {
    setSharing((s) => ({ ...s, [id]: true }));
    setShareError((e) => ({ ...e, [id]: "" }));
    try {
      const res = await fetch("/api/share/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAchievementId: id }),
      });
      if (!res.ok) {
        const d = await res.json();
        setShareError((e) => ({ ...e, [id]: d.error ?? "Failed" }));
      } else {
        setShared((s) => ({ ...s, [id]: true }));
        load();
      }
    } catch {
      setShareError((e) => ({ ...e, [id]: "Request failed" }));
    } finally {
      setSharing((s) => ({ ...s, [id]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My achievements</h1>

      {items.length === 0 && (
        <p className="text-[var(--muted)] text-sm">
          No achievements yet. Complete quizzes, publish your own, and earn points to unlock them.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((ua) => {
          const isShared = ua.shared_to_teams_at || shared[ua.id];
          return (
            <div
              key={ua.id}
              className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{ua.achievement.icon}</span>
                <div className="min-w-0">
                  <div className="font-bold">{ua.achievement.name}</div>
                  <div className="text-xs text-[var(--muted)]">{ua.achievement.description}</div>
                  {ua.quiz && (
                    <div className="text-xs text-[var(--muted)] mt-1 truncate">
                      Quiz: {ua.quiz.title}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--border)]">
                <span className="text-xs text-[var(--muted)]">
                  {new Date(ua.earned_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-2">
                  {isShared ? (
                    <span className="text-xs text-green-500">Shared ✓</span>
                  ) : (
                    <>
                      <button
                        onClick={() => shareToTeams(ua.id)}
                        disabled={sharing[ua.id]}
                        className="text-xs px-2 py-1 border border-[var(--accent)] text-[var(--accent)] rounded hover:bg-[var(--accent)] hover:text-white transition-colors disabled:opacity-50"
                      >
                        {sharing[ua.id] ? "Sharing…" : "Share to Teams"}
                      </button>
                      {shareError[ua.id] && (
                        <span className="text-xs text-red-500">{shareError[ua.id]}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
