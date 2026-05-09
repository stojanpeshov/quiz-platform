import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface UA {
  id: string;
  achievement: { name: string; description: string; icon: string };
  quiz: { title: string } | null;
}

export function UserAchievements() {
  const { id = "" } = useParams();
  const { data, isLoading } = useQuery<{ user: { name: string }; achievements: UA[] }>({
    queryKey: ["users", id, "achievements"],
    queryFn: () => apiFetch(`/api/users/${id}/achievements`),
  });

  if (isLoading || !data) return <p>Loading…</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{data.user.name}'s achievements</h1>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.achievements.map((ua) => (
          <li key={ua.id} className="p-3 rounded"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-start gap-2">
              <span className="text-2xl">{ua.achievement.icon}</span>
              <div>
                <div className="font-bold">{ua.achievement.name}</div>
                <div className="text-sm" style={{ color: "var(--muted)" }}>{ua.achievement.description}</div>
                {ua.quiz && <div className="text-xs mt-1">on {ua.quiz.title}</div>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
