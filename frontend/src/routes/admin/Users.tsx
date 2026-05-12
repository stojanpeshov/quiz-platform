import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "../../lib/api";

interface U { id: string; email: string; name: string; role: "user" | "admin"; totalPoints: number }

export function AdminUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data } = useQuery<{ users: U[] }>({
    queryKey: ["admin", "users", q],
    queryFn: () => apiFetch(`/api/admin/users?q=${encodeURIComponent(q)}`),
  });
  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "user" | "admin" }) =>
      apiFetch(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ role }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Users</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search email or name"
        className="w-full px-2 py-1 rounded"
        style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--fg)" }}
      />
      <ul className="space-y-1">
        {data?.users.map((u) => (
          <li key={u.id} className="p-2 rounded flex items-center justify-between"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <span>{u.name} ({u.email}) — {u.totalPoints} pts</span>
            <select
              value={u.role}
              onChange={(e) => setRole.mutate({ id: u.id, role: e.target.value as "user" | "admin" })}
              style={{ background: "var(--bg)", color: "var(--fg)" }}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </li>
        ))}
      </ul>
      {setRole.error && <p className="text-sm text-red-400">{(setRole.error as Error).message}</p>}
    </div>
  );
}
