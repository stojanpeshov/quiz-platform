import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase";

/**
 * GET /api/admin/users — list all users with stats
 */
export async function GET(req: NextRequest) {
  const ctx = await requireAdmin();
  const search = req.nextUrl.searchParams.get("q") ?? "";

  let query = ctx.client
    .from("users")
    .select("id, email, name, role, total_points, created_at, last_login_at")
    .order("total_points", { ascending: false })
    .limit(200);

  if (search) query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}
