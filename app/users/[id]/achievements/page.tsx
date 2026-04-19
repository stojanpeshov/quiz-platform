"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type UserAchievement = {
  id: string;
  earned_at: string;
  shared_to_teams_at: string | null;
  achievement: {
    name: string;
    description: string;
    icon: string;
  };
  quiz: { id: string; title: string } | null;
};

export default function UserAchievementsPage() {
  const { id } = useParams<{ id: string }>();
  const [userName, setUserName] = useState("");
  const [items, setItems] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${id}/achievements`)
      .then((r) => r.json())
      .then((d) => {
        setUserName(d.user?.name ?? "");
        setItems(d.achievements ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-[var(--muted)] text-sm">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{userName ? `${userName}'s achievements` : "Achievements"}</h1>

      {items.length === 0 && (
        <p className="text-[var(--muted)] text-sm">No achievements yet.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((ua) => (
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
              {ua.shared_to_teams_at && (
                <span className="text-xs text-[var(--muted)]">Shared to Teams</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
