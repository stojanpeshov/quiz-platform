import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase";

/**
 * GET /api/me/achievements
 * Returns the calling user's earned achievements, newest first.
 */
export async function GET() {
  const ctx = await requireUser();

  const { data, error } = await ctx.client
    .from("user_achievements")
    .select(`
      id, earned_at, shared_to_teams_at, ref_quiz_id, ref_attempt_id,
      achievement:achievements(id, name, description, icon, card_type, scope, condition_type),
      quiz:quizzes(id, title)
    `)
    .eq("user_id", ctx.userId)
    .order("earned_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ achievements: data ?? [] });
}
