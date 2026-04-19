"use client";
import { useState } from "react";
import type { EarnedAchievement } from "@/lib/achievements";

type Props = {
  achievements: EarnedAchievement[];
  onClose: () => void;
};

export default function AchievementToast({ achievements, onClose }: Props) {
  const [sharing, setSharing] = useState<Record<string, boolean>>({});
  const [shared, setShared] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string>>({});

  if (!achievements.length) return null;

  async function share(ua: EarnedAchievement) {
    setSharing((s) => ({ ...s, [ua.userAchievementId]: true }));
    setError((e) => ({ ...e, [ua.userAchievementId]: "" }));
    try {
      const res = await fetch("/api/share/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAchievementId: ua.userAchievementId }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError((e) => ({ ...e, [ua.userAchievementId]: d.error ?? "Failed" }));
      } else {
        setShared((s) => ({ ...s, [ua.userAchievementId]: true }));
      }
    } catch {
      setError((e) => ({ ...e, [ua.userAchievementId]: "Request failed" }));
    } finally {
      setSharing((s) => ({ ...s, [ua.userAchievementId]: false }));
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {achievements.map((ua) => (
        <div
          key={ua.userAchievementId}
          className="bg-[var(--card)] border border-[var(--accent)] rounded-lg p-4 shadow-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl flex-shrink-0">{ua.icon}</span>
              <div className="min-w-0">
                <div className="font-semibold text-sm">Achievement unlocked!</div>
                <div className="font-bold truncate">{ua.name}</div>
                <div className="text-xs text-[var(--muted)] truncate">{ua.description}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--muted)] hover:text-current text-lg leading-none flex-shrink-0 -mt-1"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            {shared[ua.userAchievementId] ? (
              <span className="text-xs text-green-500">Shared to Teams ✓</span>
            ) : (
              <button
                onClick={() => share(ua)}
                disabled={sharing[ua.userAchievementId]}
                className="text-xs px-3 py-1 border border-[var(--accent)] text-[var(--accent)] rounded hover:bg-[var(--accent)] hover:text-white transition-colors disabled:opacity-50"
              >
                {sharing[ua.userAchievementId] ? "Sharing…" : "Share to Teams"}
              </button>
            )}
            {error[ua.userAchievementId] && (
              <span className="text-xs text-red-500">{error[ua.userAchievementId]}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
