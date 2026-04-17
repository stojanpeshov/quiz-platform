"use client";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="max-w-md w-full bg-[var(--card)] border border-[var(--border)] rounded-lg p-8">
        <h1 className="text-2xl font-bold mb-2">Quiz Platform</h1>
        <p className="text-[var(--muted)] mb-6">
          Sign in with your company Microsoft account.
        </p>
        <button
          onClick={() => signIn("azure-ad", { callbackUrl: "/quizzes" })}
          className="w-full bg-[var(--accent)] text-black font-semibold py-2 rounded hover:opacity-90"
        >
          Sign in with Microsoft
        </button>
        <p className="text-xs text-[var(--muted)] mt-6">
          Access restricted to members of your organization's Entra ID tenant.
        </p>
      </div>
    </div>
  );
}
