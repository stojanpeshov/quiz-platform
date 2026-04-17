import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase";

/**
 * POST /api/quizzes/:id/unpublish
 *
 * Business rule:
 *   Published quizzes are immutable. "Unpublish & Edit" archives the current
 *   version (preserving all attempts/ratings) and creates a NEW draft copy
 *   with the same content, linked via parent_quiz_id.
 *   When republished, the new draft becomes a new published row with its own scores.
 *
 * Returns: { newDraftId } — the id the UI should redirect to for editing.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await requireUser();

  const { data: existing } = await ctx.client
    .from("quizzes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.author_id !== ctx.userId && ctx.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (existing.status !== "published") {
    return NextResponse.json({ error: "Only published quizzes can be unpublished" }, { status: 409 });
  }

  // 1. Archive the current row
  const { error: archiveErr } = await ctx.client
    .from("quizzes")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", id);
  if (archiveErr) return NextResponse.json({ error: archiveErr.message }, { status: 500 });

  // 2. Create a new draft linked to the archived one
  const { data: draft, error: draftErr } = await ctx.client
    .from("quizzes")
    .insert({
      author_id: existing.author_id,
      title: existing.title,
      description: existing.description,
      questions: existing.questions,
      question_count: existing.question_count,
      status: "draft",
      parent_quiz_id: existing.id,
    })
    .select("id")
    .single();
  if (draftErr) return NextResponse.json({ error: draftErr.message }, { status: 500 });

  return NextResponse.json({ newDraftId: draft!.id });
}
