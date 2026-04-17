import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase";

/**
 * GET /api/leaderboards?view=best_rated|most_taken|global|per_quiz&quizId=...
 *
 * - best_rated: top quizzes by avg_rating (min 3 ratings)
 * - most_taken: top quizzes by attempt_count
 * - global: top users by total_points
 * - per_quiz: top 10 users on a specific quiz (best score, fewer attempts wins ties)
 */
export async function GET(req: NextRequest) {
  const ctx = await requireUser();
  const view = req.nextUrl.searchParams.get("view") ?? "global";

  switch (view) {
    case "best_rated": {
      const { data, error } = await ctx.client
        .from("quizzes")
        .select("id, title, avg_rating, rating_count, attempt_count, author_id")
        .eq("status", "published")
        .gte("rating_count", 3)
        .order("avg_rating", { ascending: false })
        .order("rating_count", { ascending: false })
        .limit(20);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ view, rows: data ?? [] });
    }

    case "most_taken": {
      const { data, error } = await ctx.client
        .from("quizzes")
        .select("id, title, attempt_count, avg_rating, rating_count, author_id")
        .eq("status", "published")
        .order("attempt_count", { ascending: false })
        .limit(20);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ view, rows: data ?? [] });
    }

    case "global": {
      const { data, error } = await ctx.client
        .from("users")
        .select("id, name, email, total_points")
        .order("total_points", { ascending: false })
        .limit(50);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ view, rows: data ?? [] });
    }

    case "per_quiz": {
      const quizId = req.nextUrl.searchParams.get("quizId");
      if (!quizId) return NextResponse.json({ error: "quizId required" }, { status: 400 });

      // Best score per user on this quiz, tiebreak by fewer attempts
      const { data, error } = await ctx.client.rpc("per_quiz_leaderboard", { p_quiz_id: quizId });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ view, rows: data ?? [] });
    }

    default:
      return NextResponse.json({ error: "Unknown view" }, { status: 400 });
  }
}
