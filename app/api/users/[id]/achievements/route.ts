import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase";

/**
 * GET /api/users/:id/achievements
 * Public (authenticated) — all earned achievements for any user are visible.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await requireUser();

  const { data: target } = await ctx.client
    .from("users")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await ctx.client
    .from("user_achievements")
    .select(`
      id, earned_at, shared_to_teams_at, ref_quiz_id,
      achievement:achievements(id, name, description, icon, card_type, scope, condition_type),
      quiz:quizzes(id, title)
    `)
    .eq("user_id", id)
    .order("earned_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ user: target, achievements: data ?? [] });
}
