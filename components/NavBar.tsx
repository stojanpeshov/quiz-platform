"use client";
import Link from "next/link";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";

export function NavBar({ session }: { session: Session }) {
  const role = (session.user as any)?.role;
  return (
    <nav className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-6 flex-wrap">
        <Link href="/" className="font-bold text-lg">Quizzes</Link>
        <Link href="/quizzes" className="hover:text-[var(--accent)]">Browse</Link>
        <Link href="/quizzes/new" className="hover:text-[var(--accent)]">Create</Link>
        <Link href="/my/quizzes" className="hover:text-[var(--accent)]">My quizzes</Link>
        <Link href="/leaderboards" className="hover:text-[var(--accent)]">Leaderboards</Link>
        <Link href="/me" className="hover:text-[var(--accent)]">My points</Link>
        {role === "admin" && (
          <Link href="/admin" className="hover:text-[var(--accent)] text-amber-400">Admin</Link>
        )}
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-[var(--muted)]">{session.user?.email}</span>
          <button
            onClick={() => signOut()}
            className="px-3 py-1 border border-[var(--border)] rounded hover:bg-[var(--border)]"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
