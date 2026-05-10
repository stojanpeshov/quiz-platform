import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { Navigate, useLocation } from "react-router-dom";
import { apiScope } from "../lib/msal";

// Gates routes behind an authenticated MSAL session. If logged out, redirects
// to /login and preserves the original destination. Replaces the
// useSession()+redirect pattern from the Next.js pages.
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const msalAuthed = useIsAuthenticated();
  const { inProgress } = useMsal();
  const loc = useLocation();

  const isE2E = (import.meta.env.VITE_E2E_MODE as string) === "true";

  // E2E mode: skip MSAL and check for a test token injected by Playwright.
  const isAuthed = isE2E
    ? !!localStorage.getItem("e2e_token")
    : msalAuthed;

  // Wait for MSAL to finish initializing / processing the redirect before
  // deciding the user is unauthenticated — avoids the flash-redirect loop.
  if (!isE2E && inProgress !== InteractionStatus.None) {
    return null;
  }

  if (!isAuthed) {
    return <Navigate to={`/login?from=${encodeURIComponent(loc.pathname)}`} replace />;
  }
  return <>{children}</>;
}

export function useEnsureToken() {
  const { instance, accounts } = useMsal();
  return async () => {
    const account = accounts[0];
    if (!account) return null;
    try {
      const r = await instance.acquireTokenSilent({ scopes: [apiScope], account });
      return r.accessToken;
    } catch {
      return null;
    }
  };
}
