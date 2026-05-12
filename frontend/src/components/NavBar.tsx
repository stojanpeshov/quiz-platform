import { useMsal } from "@azure/msal-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useIsAdmin } from "./RequireAdmin";

// Top navigation. Mirrors the original components/NavBar.tsx — same links,
// hamburger toggle, sign-out button, role-aware Admin entry.
export function NavBar() {
  const { instance, accounts } = useMsal();
  const isAdmin = useIsAdmin();
  const [open, setOpen] = useState(false);
  const email = accounts[0]?.username ?? "";

  const links = [
    { href: "/", label: "Home" },
    { href: "/quizzes", label: "Browse" },
    { href: "/quizzes/new", label: "Create" },
    { href: "/my/quizzes", label: "My quizzes" },
    { href: "/leaderboards", label: "Leaderboards" },
    { href: "/me/points", label: "My points" },
    { href: "/me/achievements", label: "Achievements" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <nav style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
         className="px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link to="/" className="font-bold text-lg">Quiz Platform</Link>
        <div className="hidden md:flex items-center gap-4 text-sm">
          {links.map((l) => (
            <Link key={l.href} to={l.href} style={{ color: "var(--muted)" }}>{l.label}</Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {email && <span className="hidden md:inline text-sm" style={{ color: "var(--muted)" }}>{email}</span>}
        <button
          onClick={() => instance.logoutRedirect()}
          className="text-sm px-3 py-1 rounded"
          style={{ background: "var(--accent)", color: "var(--bg)" }}>
          Sign out
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden text-sm px-2 py-1 rounded border"
          style={{ borderColor: "var(--border)" }}
          aria-label="Toggle menu">
          ☰
        </button>
      </div>
      {open && (
        <div className="absolute top-14 right-4 md:hidden flex flex-col gap-2 p-3 rounded"
             style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          {links.map((l) => (
            <Link key={l.href} to={l.href} onClick={() => setOpen(false)}>{l.label}</Link>
          ))}
        </div>
      )}
    </nav>
  );
}
