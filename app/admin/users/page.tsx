"use client";
import { useEffect, useState } from "react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const r = await fetch("/api/admin/users" + (q ? `?q=${encodeURIComponent(q)}` : ""));
    const d = await r.json();
    setUsers(d.users ?? []);
  }
  useEffect(() => { load(); }, []);

  async function setRole(id: string, role: "user" | "admin") {
    const r = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!r.ok) { alert((await r.json()).error); return; }
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email"
          className="bg-transparent border border-[var(--border)] rounded px-3 py-1 text-sm flex-1"
        />
        <button onClick={load} className="px-3 py-1 border border-[var(--border)] rounded text-sm">Search</button>
      </div>
      <table className="w-full text-sm">
        <thead className="text-[var(--muted)]">
          <tr>
            <th className="text-left py-2">Name / Email</th>
            <th className="text-left">Role</th>
            <th className="text-right">Points</th>
            <th className="text-right">Last login</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-[var(--border)]">
              <td className="py-2"><div>{u.name}</div><div className="text-[var(--muted)] text-xs">{u.email}</div></td>
              <td>{u.role}</td>
              <td className="text-right font-mono">{u.total_points}</td>
              <td className="text-right text-xs text-[var(--muted)]">
                {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "–"}
              </td>
              <td className="text-right">
                {u.role === "admin" ? (
                  <button onClick={() => setRole(u.id, "user")} className="text-xs px-2 py-1 border border-[var(--border)] rounded">Demote</button>
                ) : (
                  <button onClick={() => setRole(u.id, "admin")} className="text-xs px-2 py-1 border border-[var(--accent)] text-[var(--accent)] rounded">Promote</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
