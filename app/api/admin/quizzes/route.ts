import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase";

export async function GET() {
  const ctx = await requireAdmin();
  const { data, error } = await ctx.client
    .from("quizzes")
    .select("id, title, status, attempt_count, avg_rating, rating_count, author_id, created_at, users!inner(email)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const quizzes = (data ?? []).map((q: any) => ({ ...q, author_email: q.users?.email }));
  return NextResponse.json({ quizzes });
}
