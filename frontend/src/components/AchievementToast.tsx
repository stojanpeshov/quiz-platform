import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { EarnedAchievement } from "../lib/types";

// Toast for newly-earned achievements. Mirrors components/AchievementToast.tsx.
// The "Share to Teams" button POSTs /api/share/teams and disables itself on
// success/error. The toast accepts a list of achievements and a close callback.
export function AchievementToast({
  achievements,
  onClose,
}: {
  achievements: EarnedAchievement[];
  onClose: () => void;
}) {
  if (achievements.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-3 z-50">
      {achievements.map((ach) => (
        <ToastCard key={ach.userAchievementId} ach={ach} onClose={onClose} />
      ))}
    </div>
  );
}

function ToastCard({ ach, onClose }: { ach: EarnedAchievement; onClose: () => void }) {
  const [shared, setShared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const share = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>("/api/share/teams", {
        method: "POST",
        body: JSON.stringify({ userAchievementId: ach.userAchievementId }),
      }),
    onSuccess: () => setShared(true),
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div
      className="p-4 rounded shadow-lg w-80"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-start gap-2">
        <span className="text-2xl">{ach.icon}</span>
        <div className="flex-1">
          <div className="font-bold">Achievement unlocked: {ach.name}</div>
          <div className="text-sm" style={{ color: "var(--muted)" }}>{ach.description}</div>
        </div>
        <button onClick={onClose} aria-label="Dismiss">×</button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {shared ? (
          <span className="text-sm" style={{ color: "var(--accent)" }}>Shared to Teams ✓</span>
        ) : (
          <button
            disabled={share.isPending}
            onClick={() => share.mutate()}
            className="text-sm px-2 py-1 rounded"
            style={{ background: "var(--accent)", color: "var(--bg)" }}>
            {share.isPending ? "Sharing…" : "Share to Teams"}
          </button>
        )}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  );
}
