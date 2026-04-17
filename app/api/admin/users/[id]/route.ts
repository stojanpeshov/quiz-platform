import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase";

/**
 * PATCH /api/admin/users/:id
 * Body: { role: 'user' | 'admin' }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await requireAdmin();
  const body = await req.json().catch(() => null);
  const role = body?.role;
  if (role !== "user" && role !== "admin") {
    return NextResponse.json({ error: "role must be 'user' or 'admin'" }, { status: 400 });
  }

  // Prevent admin from demoting themselves if they're the last admin
  if (role === "user" && id === ctx.userId) {
    const { count } = await ctx.client
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Cannot demote the last admin. Promote someone else first." },
        { status: 409 }
      );
    }
  }

  const { error } = await ctx.client.from("users").update({ role }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
