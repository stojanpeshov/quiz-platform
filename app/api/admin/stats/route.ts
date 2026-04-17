import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase";

/**
 * GET /api/admin/stats
 * Platform-wide stats for the admin dashboard.
 */
export async function GET() {
  const ctx = await requireAdmin();

  const [
    { count: userCount },
    { count: quizCount },
    { count: publishedCount },
    { count: attemptCount },
    { count: ratingCount },
    { data: activeUsers7d },
    { data: topQuizzes },
    { data: topUsers },
  ] = await Promise.all([
    ctx.client.from("users").select("id", { count: "exact", head: true }),
    ctx.client.from("quizzes").select("id", { count: "exact", head: true }),
    ctx.client.from("quizzes").select("id", { count: "exact", head: true }).eq("status", "published"),
    ctx.client.from("attempts").select("id", { count: "exact", head: true }),
    ctx.client.from("ratings").select("quiz_id", { count: "exact", head: true }),
    ctx.client
      .from("attempts")
      .select("user_id")
      .gte("completed_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ctx.client
      .from("quizzes")
      .select("id, title, attempt_count, avg_rating")
      .eq("status", "published")
      .order("attempt_count", { ascending: false })
      .limit(5),
    ctx.client
      .from("users")
      .select("id, name, email, total_points")
      .order("total_points", { ascending: false })
      .limit(5),
  ]);

  const activeUserCount = new Set((activeUsers7d ?? []).map((r: any) => r.user_id)).size;

  return NextResponse.json({
    userCount: userCount ?? 0,
    quizCount: quizCount ?? 0,
    publishedQuizCount: publishedCount ?? 0,
    attemptCount: attemptCount ?? 0,
    ratingCount: ratingCount ?? 0,
    activeUsers7d: activeUserCount,
    topQuizzes: topQuizzes ?? [],
    topUsers: topUsers ?? [],
  });
}
