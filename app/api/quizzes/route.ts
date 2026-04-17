import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase";
import { parseQuiz } from "@/lib/schema";
import { ZodError } from "zod";

/**
 * GET /api/quizzes
 * Returns published quizzes (and optionally the caller's drafts via ?mine=1)
 */
export async function GET(req: NextRequest) {
  const ctx = await requireUser();
  const mine = req.nextUrl.searchParams.get("mine") === "1";
  const excludeMine = req.nextUrl.searchParams.get("excludeMine") === "1";
  const sort = req.nextUrl.searchParams.get("sort") ?? "recent";

  let query = ctx.client
    .from("quizzes")
    .select(
      "id, title, description, difficulty, author_id, question_count, avg_rating, rating_count, attempt_count, status, published_at, created_at, users!author_id(name)"
    );

  if (mine) {
    query = query.eq("author_id", ctx.userId).neq("status", "archived");
  } else {
    query = query.eq("status", "published");
    if (excludeMine) {
      query = query.neq("author_id", ctx.userId);
    }
  }

  switch (sort) {
    case "rated":
      query = query.order("avg_rating", { ascending: false });
      break;
    case "popular":
      query = query.order("attempt_count", { ascending: false });
      break;
    default:
      query = query.order("published_at", { ascending: false, nullsFirst: false });
  }

  const { data, error } = await query.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quizzes: data ?? [] });
}

/**
 * POST /api/quizzes
 * Creates a new DRAFT quiz from either raw JSON or a validated object.
 * Body: { quiz: <Quiz object> }
 */
export async function POST(req: NextRequest) {
  const ctx = await requireUser();
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let quiz;
  try {
    quiz = parseQuiz(body.quiz);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: e.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid quiz payload" }, { status: 400 });
  }

  const { data, error } = await ctx.client
    .from("quizzes")
    .insert({
      author_id: ctx.userId,
      title: quiz.title,
      description: quiz.description,
      difficulty: quiz.difficulty || "intermediate",
      questions: quiz.questions,
      question_count: quiz.questions.length,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data!.id }, { status: 201 });
}
