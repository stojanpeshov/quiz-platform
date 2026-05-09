import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

interface UA {
  id: string;
  earnedAt: string;
  sharedToTeamsAt: string | null;
  achievement: { id: string; name: string; description: string; icon: string };
  quiz: { id: string; title: string } | null;
}

export function MyAchievements() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ achievements: UA[] }>({
    queryKey: ["me", "achievements"],
    queryFn: () => apiFetch("/api/me/achievements"),
  });

  const share = useMutation({
    mutationFn: (id: string) =>
      apiFetch("/api/share/teams", { method: "POST", body: JSON.stringify({ userAchievementId: id }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me", "achievements"] }),
  });

  if (isLoading || !data) return <p>Loading…</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My achievements</h1>
      {data.achievements.length === 0 && <p style={{ color: "var(--muted)" }}>None yet.</p>}
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.achievements.map((ua) => (
          <li key={ua.id} className="p-3 rounded"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-start gap-2">
              <span className="text-2xl">{ua.achievement.icon}</span>
              <div className="flex-1">
                <div className="font-bold">{ua.achievement.name}</div>
                <div className="text-sm" style={{ color: "var(--muted)" }}>{ua.achievement.description}</div>
                {ua.quiz && <div className="text-xs mt-1">on {ua.quiz.title}</div>}
              </div>
            </div>
            <div className="mt-3">
              {ua.sharedToTeamsAt ? (
                <span className="text-sm" style={{ color: "var(--accent)" }}>Shared to Teams ✓</span>
              ) : (
                <button
                  onClick={() => share.mutate(ua.id)}
                  disabled={share.isPending}
                  className="text-sm px-2 py-1 rounded"
                  style={{ background: "var(--accent)", color: "var(--bg)" }}>
                  Share to Teams
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
