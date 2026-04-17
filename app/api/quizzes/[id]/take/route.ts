import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase";
import { gradeQuiz, type Answer } from "@/lib/grading";
import { awardPoints, hasEarned, POINTS } from "@/lib/points";
import { QuizSchema } from "@/lib/schema";

/**
 * POST /api/quizzes/:id/take
 * Body: { answers: Answer[] }
 *
 * Validates quiz is published, user has < 3 attempts, grades, stores attempt,
 * awards points (completion + first-time 80/100 bonuses).
 */
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

  // Fetch quiz — must be published
  const { data: q } = await ctx.client
    .from("quizzes")
    .select("id, status, title, questions, author_id")
    .eq("id", id)
    .maybeSingle();

  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (q.status !== "published") {
    return NextResponse.json({ error: "Quiz is not takeable" }, { status: 409 });
  }

  // Parse the stored quiz (already validated on import, but be defensive)
  const parsed = QuizSchema.safeParse({
    title: q.title,
    description: "",
    questions: q.questions,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Corrupted quiz data" }, { status: 500 });
  }

  const graded = gradeQuiz(parsed.data, answers);

  // Insert attempt — trigger enforces 3-cap and sets attempt_number
  const { data: attempt, error: insErr } = await ctx.client
    .from("attempts")
    .insert({
      quiz_id: id,
      user_id: ctx.userId,
      score_pct: graded.scorePct,
      correct_count: graded.correctCount,
      total_count: graded.totalCount,
      answers,
      attempt_number: 1, // overwritten by trigger
    })
    .select("id, attempt_number")
    .single();

  if (insErr) {
    // Trigger raises on cap breach
    const msg = insErr.message.includes("Attempt cap")
      ? "You have reached the 3-attempt limit for this quiz"
      : insErr.message;
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  // Award base completion points
  await awardPoints(ctx.client, {
    userId: ctx.userId,
    eventType: "complete_attempt",
    points: POINTS.COMPLETE_ATTEMPT,
    description: `Completed attempt ${attempt!.attempt_number} on "${q.title}" (${graded.scorePct}%)`,
    refQuizId: id,
    refAttemptId: attempt!.id,
  });

  // First-time 80% bonus
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

  // First-time 100% bonus (additive on top of 80%)
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

  // Return the graded result + correct answers (always revealed per spec)
  return NextResponse.json({
    attemptId: attempt!.id,
    attemptNumber: attempt!.attempt_number,
    score: graded.scorePct,
    correctCount: graded.correctCount,
    totalCount: graded.totalCount,
    perQuestion: graded.perQuestion,
    questions: parsed.data.questions, // full questions with answers for review
  });
}
