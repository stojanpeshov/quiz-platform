"use client";
import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";

export function NavBar({ session }: { session: Session }) {
  const role = (session.user as any)?.role;
  const [open, setOpen] = useState(false);

  const links = (
    <>
      <Link href="/quizzes" className="hover:text-[var(--accent)]" onClick={() => setOpen(false)}>Browse</Link>
      <Link href="/quizzes/new" className="hover:text-[var(--accent)]" onClick={() => setOpen(false)}>Create</Link>
      <Link href="/my/quizzes" className="hover:text-[var(--accent)]" onClick={() => setOpen(false)}>My quizzes</Link>
      <Link href="/leaderboards" className="hover:text-[var(--accent)]" onClick={() => setOpen(false)}>Leaderboards</Link>
      <Link href="/me" className="hover:text-[var(--accent)]" onClick={() => setOpen(false)}>My points</Link>
      {role === "admin" && (
        <Link href="/admin" className="hover:text-[var(--accent)] text-amber-400" onClick={() => setOpen(false)}>Admin</Link>
      )}
    </>
  );

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="flex items-center">
          <Link href="/" className="font-bold text-lg">Quizzes</Link>
          <div className="hidden sm:flex items-center gap-6 ml-6 text-sm">
            {links}
          </div>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden sm:inline text-[var(--muted)]">{session.user?.email}</span>
            <button
              onClick={() => signOut()}
              className="px-3 py-1 border border-[var(--border)] rounded hover:bg-[var(--border)]"
            >
              Sign out
            </button>
            <button
              className="sm:hidden p-1"
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {open ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        {open && (
          <div className="sm:hidden flex flex-col gap-4 pt-4 pb-2 text-sm border-t border-[var(--border)] mt-3">
            {links}
            <span className="text-[var(--muted)] text-xs">{session.user?.email}</span>
          </div>
        )}
      </div>
    </nav>
  );
}
