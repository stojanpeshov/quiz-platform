import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase";
import { awardPoints, POINTS } from "@/lib/points";

/**
 * POST /api/quizzes/:id/publish
 * Transitions a draft to published. Awards PUBLISH_QUIZ points (idempotent check).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await requireUser();

  const { data: existing } = await ctx.client
    .from("quizzes")
    .select("id, author_id, status, title")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.author_id !== ctx.userId && ctx.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (existing.status !== "draft") {
    return NextResponse.json({ error: "Only drafts can be published" }, { status: 409 });
  }

  const { error } = await ctx.client
    .from("quizzes")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Award publish points only once per quiz (check point_events history)
  const { count } = await ctx.client
    .from("point_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "publish_quiz")
    .eq("ref_quiz_id", id);

  if ((count ?? 0) === 0) {
    await awardPoints(ctx.client, {
      userId: existing.author_id,
      eventType: "publish_quiz",
      points: POINTS.PUBLISH_QUIZ,
      description: `Published quiz "${existing.title}"`,
      refQuizId: id,
    });
  }

  return NextResponse.json({ ok: true });
}
