import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase";
import { awardPoints, POINTS } from "@/lib/points";
import { evaluateAfterPublish } from "@/lib/achievements";

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

  let newlyEarned: Awaited<ReturnType<typeof evaluateAfterPublish>> = [];
  try {
    newlyEarned = await evaluateAfterPublish(ctx.client, {
      userId: existing.author_id,
      quizId: id,
    });
  } catch (err) {
    console.error("Achievement evaluation failed:", err);
  }

  return NextResponse.json({ ok: true, newlyEarned });
}
