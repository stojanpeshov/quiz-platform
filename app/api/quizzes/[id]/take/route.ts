import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase";
import { gradeQuiz, type Answer } from "@/lib/grading";
import { awardPoints, hasEarned, POINTS } from "@/lib/points";
import { QuizSchema } from "@/lib/schema";
import { evaluateAfterAttempt } from "@/lib/achievements";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await requireUser();
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.answers)) {
    return NextResponse.json({ error: "answers[] required" }, { status: 400 });
  }
  const answers = body.answers as Answer[];

  const { data: q } = await ctx.client
    .from("quizzes")
    .select("id, status, title, questions, author_id")
    .eq("id", id)
    .maybeSingle();

  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (q.status !== "published") {
    return NextResponse.json({ error: "Quiz is not takeable" }, { status: 409 });
  }

  const parsed = QuizSchema.safeParse({
    title: q.title,
    description: "",
    questions: q.questions,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Corrupted quiz data" }, { status: 500 });
  }

  const graded = gradeQuiz(parsed.data, answers);

  const { data: attempt, error: insErr } = await ctx.client
    .from("attempts")
    .insert({
      quiz_id: id,
      user_id: ctx.userId,
      score_pct: graded.scorePct,
      correct_count: graded.correctCount,
      total_count: graded.totalCount,
      answers,
      attempt_number: 1,
    })
    .select("id, attempt_number")
    .single();

  if (insErr) {
    const msg = insErr.message.includes("Attempt cap")
      ? "You have reached the 3-attempt limit for this quiz"
      : insErr.message;
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  await awardPoints(ctx.client, {
    userId: ctx.userId,
    eventType: "complete_attempt",
    points: POINTS.COMPLETE_ATTEMPT,
    description: `Completed attempt ${attempt!.attempt_number} on "${q.title}" (${graded.scorePct}%)`,
    refQuizId: id,
    refAttemptId: attempt!.id,
  });

  if (graded.scorePct >= 80) {
    const already = await hasEarned(ctx.client, ctx.userId, "score_80_first", id);
    if (!already) {
      await awardPoints(ctx.client, {
        userId: ctx.userId,
        eventType: "score_80_first",
        points: POINTS.SCORE_80_FIRST_TIME,
        description: `First time scoring ≥80% on "${q.title}"`,
        refQuizId: id,
        refAttemptId: attempt!.id,
      });
    }
  }

  if (graded.scorePct === 100) {
    const already = await hasEarned(ctx.client, ctx.userId, "score_100_first", id);
    if (!already) {
      await awardPoints(ctx.client, {
        userId: ctx.userId,
        eventType: "score_100_first",
        points: POINTS.SCORE_100_FIRST_TIME,
        description: `First time scoring 100% on "${q.title}"`,
        refQuizId: id,
        refAttemptId: attempt!.id,
      });
    }
  }

  // Evaluate achievements — non-blocking, errors must not fail the response
  let newlyEarned: Awaited<ReturnType<typeof evaluateAfterAttempt>> = [];
  try {
    newlyEarned = await evaluateAfterAttempt(ctx.client, {
      userId: ctx.userId,
      quizId: id,
      attemptId: attempt!.id,
      scorePct: graded.scorePct,
    });
  } catch (err) {
    console.error("Achievement evaluation failed:", err);
  }

  return NextResponse.json({
    attemptId: attempt!.id,
    attemptNumber: attempt!.attempt_number,
    score: graded.scorePct,
    correctCount: graded.correctCount,
    totalCount: graded.totalCount,
    perQuestion: graded.perQuestion,
    questions: parsed.data.questions,
    newlyEarned,
  });
}
