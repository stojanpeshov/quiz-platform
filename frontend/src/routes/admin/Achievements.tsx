import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";

interface A {
  id: string; name: string; description: string; icon: string;
  conditionType: string; scope: string; earnerType: string; cardType: string;
  active: boolean;
}

export function AdminAchievements() {
  const qc = useQueryClient();
  const { data } = useQuery<{ achievements: A[] }>({
    queryKey: ["admin", "achievements"],
    queryFn: () => apiFetch("/api/admin/achievements"),
  });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiFetch(`/api/admin/achievements/${id}`, { method: "PATCH", body: JSON.stringify({ active }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "achievements"] }),
  });

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Achievements</h1>
      <ul className="space-y-1">
        {data?.achievements.map((a) => (
          <li key={a.id} className="p-2 rounded flex items-center justify-between"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <span>
              {a.icon} {a.name}{" "}
              <span style={{ color: "var(--muted)" }}>· {a.conditionType} · {a.scope}</span>
            </span>
            <button
              onClick={() => toggle.mutate({ id: a.id, active: !a.active })}
              className="text-sm px-2 py-1 rounded border">
              {a.active ? "Deactivate" : "Activate"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
