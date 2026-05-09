import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { Navigate, useSearchParams } from "react-router-dom";
import { apiScope } from "../lib/msal";

export function LoginPage() {
  const { instance } = useMsal();
  const isAuthed = useIsAuthenticated();
  const [params] = useSearchParams();
  const from = params.get("from") ?? "/";
  if (isAuthed) return <Navigate to={from} replace />;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full p-6 rounded"
           style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <h1 className="text-2xl font-bold mb-2">Quiz Platform</h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          Sign in with your work account.
        </p>
        <button
          onClick={() => instance.loginRedirect({ scopes: [apiScope] })}
          className="w-full py-2 rounded font-medium"
          style={{ background: "var(--accent)", color: "var(--bg)" }}>
          Sign in with Microsoft
        </button>
      </div>
    </div>
  );
}
