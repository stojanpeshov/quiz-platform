import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Service-role client — bypasses RLS. Use ONLY for:
 *  - Auth/user upsert (before the user is established)
 *  - Scheduled/cron code running as the system
 *  - Admin-only operations where the caller is already verified
 */
export function getServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type UserCtx = {
  client: SupabaseClient;
  userId: string;
  role: "user" | "admin";
};

/**
 * User-scoped client — establishes the current user in the DB session
 * so RLS policies fire correctly.
 *
 * Architecture note: we use the service-role key, but each API handler
 * calls set_current_user(user_id, role) before issuing queries. RLS
 * policies read these via current_setting('app.user_id'). See 002_rls.sql.
 *
 * Primary authorization still happens in API route code (requireUser /
 * requireAdmin + ownership checks). RLS is defense in depth.
 */
export async function getUserClient(): Promise<UserCtx | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const userId = (session.user as any).id as string;
  const role = ((session.user as any).role as "user" | "admin") ?? "user";

  const client = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Bind the session variables RLS policies depend on.
  // NOTE: PostgREST opens a fresh connection per request on Supabase,
  // so this setting lives for the duration of this request's statements.
  const { error } = await client.rpc("set_current_user", {
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw new Error(`set_current_user failed: ${error.message}`);

  return { client, userId, role };
}

export async function requireUser(): Promise<UserCtx> {
  const ctx = await getUserClient();
  if (!ctx) throw new Response("Unauthorized", { status: 401 });
  return ctx;
}

export async function requireAdmin(): Promise<UserCtx> {
  const ctx = await requireUser();
  if (ctx.role !== "admin") throw new Response("Forbidden", { status: 403 });
  return ctx;
}
