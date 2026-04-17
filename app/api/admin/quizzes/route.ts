import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase";

export async function GET() {
  const ctx = await requireAdmin();

  // Fetch quizzes
  const { data, error } = await ctx.client
    .from("quizzes")
    .select("id, title, status, attempt_count, avg_rating, rating_count, author_id, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("Admin quizzes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch user details separately
  const authorIds = [...new Set((data ?? []).map((q: any) => q.author_id))];
  const { data: users, error: usersError } = await ctx.client
    .from("users")
    .select("id, email, name")
    .in("id", authorIds);

  if (usersError) {
    console.error("Admin quizzes users error:", usersError);
  }

  const usersMap = new Map((users ?? []).map((u: any) => [u.id, u]));
  const quizzes = (data ?? []).map((q: any) => ({
    ...q,
    author_email: usersMap.get(q.author_id)?.email,
    author_name: usersMap.get(q.author_id)?.name
  }));

  return NextResponse.json({ quizzes });
}
