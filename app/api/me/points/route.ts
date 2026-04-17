import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase";

/**
 * GET /api/me/points
 * Returns the current user's point_events (paginated) + total.
 */
export async function GET(req: NextRequest) {
  const ctx = await requireUser();
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: events, error } = await ctx.client
    .from("point_events")
    .select("id, event_type, points, description, ref_quiz_id, created_at")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: user } = await ctx.client
    .from("users")
    .select("total_points")
    .eq("id", ctx.userId)
    .single();

  return NextResponse.json({
    totalPoints: user?.total_points ?? 0,
    events: events ?? [],
    page,
  });
}
