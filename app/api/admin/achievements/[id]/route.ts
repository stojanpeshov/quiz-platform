import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase";

/** PATCH /api/admin/achievements/:id — update name/description/icon/active/condition */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await requireAdmin();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body required" }, { status: 400 });

  const allowed = ["name", "description", "icon", "condition_type", "condition_value", "scope", "earner_type", "card_type", "active"];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  const { data, error } = await ctx.client
    .from("achievements")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ achievement: data });
}

/** DELETE /api/admin/achievements/:id — hard delete (only if no user_achievements reference it) */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await requireAdmin();

  const { count } = await ctx.client
    .from("user_achievements")
    .select("id", { count: "exact", head: true })
    .eq("achievement_id", id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Cannot delete: users have already earned this achievement. Deactivate it instead." },
      { status: 409 }
    );
  }

  const { error } = await ctx.client.from("achievements").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
