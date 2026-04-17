import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase";
import { awardPoints, hasEarned, POINTS } from "@/lib/points";

/**
 * POST /api/quizzes/:id/rate
 * Body: { stars: 1..5 }
 *
 * Upserts the user's rating. Awards +1 only on first-ever rating of this quiz.
 * Cannot rate your own quiz.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await requireUser();
  const body = await req.json().catch(() => null);
  const stars = Number(body?.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "stars must be an integer 1..5" }, { status: 400 });
  }

  const { data: q } = await ctx.client
    .from("quizzes")
    .select("id, author_id, status, title")
    .eq("id", id)
    .maybeSingle();

  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (q.status !== "published") {
    return NextResponse.json({ error: "Can only rate published quizzes" }, { status: 409 });
  }
  if (q.author_id === ctx.userId) {
    return NextResponse.json({ error: "Cannot rate your own quiz" }, { status: 409 });
  }

  // Require at least one attempt before rating — keeps ratings honest
  const { count: attemptCount } = await ctx.client
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", id)
    .eq("user_id", ctx.userId);
  if ((attemptCount ?? 0) === 0) {
    return NextResponse.json({ error: "Take the quiz at least once before rating" }, { status: 409 });
  }

  const { error } = await ctx.client
    .from("ratings")
    .upsert(
      { quiz_id: id, user_id: ctx.userId, stars, updated_at: new Date().toISOString() },
      { onConflict: "quiz_id,user_id" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Award +1 only on first rating of this quiz
  const already = await hasEarned(ctx.client, ctx.userId, "rate_quiz", id);
  if (!already) {
    await awardPoints(ctx.client, {
      userId: ctx.userId,
      eventType: "rate_quiz",
      points: POINTS.RATE_QUIZ,
      description: `Rated "${q.title}"`,
      refQuizId: id,
    });
  }

  return NextResponse.json({ ok: true });
}
