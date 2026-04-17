import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase";

/**
 * GET /api/admin/events?userId=&eventType=&page=
 * Full audit log of point events.
 */
export async function GET(req: NextRequest) {
  const ctx = await requireAdmin();
  const userId = req.nextUrl.searchParams.get("userId");
  const eventType = req.nextUrl.searchParams.get("eventType");
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));
  const pageSize = 100;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = ctx.client
    .from("point_events")
    .select("id, user_id, event_type, points, description, ref_quiz_id, created_at")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (userId) q = q.eq("user_id", userId);
  if (eventType) q = q.eq("event_type", eventType);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [], page });
}
