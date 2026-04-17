import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase";
import { parseQuiz, stripAnswers } from "@/lib/schema";
import { ZodError } from "zod";

/**
 * GET /api/quizzes/:id
 * Owner/admin get full quiz; everyone else gets answers stripped.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await requireUser();
  const { data, error } = await ctx.client
    .from("quizzes")
    .select("*, users!author_id(name)")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = data.author_id === ctx.userId;
  const isAdmin = ctx.role === "admin";

  if (data.status !== "published" && !isOwner && !isAdmin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Build quiz object for schema helpers
  const quizObj = {
    title: data.title,
    description: data.description,
    questions: data.questions,
  };

  const { data: myRating } = await ctx.client
    .from("ratings")
    .select("stars")
    .eq("quiz_id", id)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  const payload =
    isOwner || isAdmin
      ? { ...data, author_name: data.users?.name }
      : { ...data, author_name: data.users?.name, questions: (stripAnswers(quizObj as any) as any).questions };

  return NextResponse.json({ quiz: payload, myRating: myRating?.stars ?? 0 });
}

/**
 * PATCH /api/quizzes/:id
 * Edit quiz — only allowed when status = 'draft'.
 * Body: { quiz: <Quiz object> }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await requireUser();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  let quiz;
  try {
    quiz = parseQuiz(body.quiz);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid quiz" }, { status: 400 });
  }

  // Fetch to check status + ownership (RLS already ensures ownership/admin for update)
  const { data: existing } = await ctx.client
    .from("quizzes")
    .select("status, author_id")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "draft") {
    return NextResponse.json(
      { error: "Only drafts can be edited. Unpublish first (will create a new version)." },
      { status: 409 }
    );
  }

  const { error } = await ctx.client
    .from("quizzes")
    .update({
      title: quiz.title,
      description: quiz.description,
      difficulty: quiz.difficulty || "intermediate",
      questions: quiz.questions,
      question_count: quiz.questions.length,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/quizzes/:id
 * Allowed for owner or admin (RLS enforces this).
 * Cascades to attempts/ratings via FK.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await requireUser();
  const { error } = await ctx.client.from("quizzes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
