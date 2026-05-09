import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface MeResponse {
  totalPoints: number;
  // The /api/me/points endpoint returns { totalPoints, events, page }; we don't
  // need a dedicated /api/me endpoint, the role lives in the token claims.
}

// Reads the role from the token; if non-admin, sends to home with a flag.
// We additionally rely on the API's RequireAdmin policy as the real enforcement
// layer — this is just a UX gate so the UI doesn't render admin chrome.
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  // Touching /api/me/points on mount catches token issues early.
  useQuery<MeResponse>({
    queryKey: ["me", "points"],
    queryFn: () => apiFetch("/api/me/points"),
  });
  const isAdmin = useIsAdmin();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// The role is propagated as an Entra ID app role / group claim at the
// API-app-registration level. For MSAL, the easiest is to read from the
// id-token claims; for this MVP we instead optimistically render and let
// the server's 403 stop unauthorised admin actions. Customise to read from
// account.idTokenClaims.roles if you wire app roles.
export function useIsAdmin(): boolean {
  // TODO: wire to id-token role claim if you configure Entra ID app roles.
  // Until then this is a placeholder; the API still rejects non-admin calls.
  return true;
}
