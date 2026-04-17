import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase";

/**
 * GET /api/admin/export
 * Returns a CSV of all attempts joined with user + quiz info.
 */
export async function GET() {
  const ctx = await requireAdmin();

  const { data, error } = await ctx.client
    .from("attempts")
    .select(
      `id, attempt_number, score_pct, correct_count, total_count, completed_at,
       users(email, name),
       quizzes(title, author_id)`
    )
    .order("completed_at", { ascending: false })
    .limit(10000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = [
    ["attempt_id", "user_email", "user_name", "quiz_title", "attempt_number", "score_pct", "correct", "total", "completed_at"],
    ...(data ?? []).map((r: any) => [
      r.id,
      r.users?.email ?? "",
      r.users?.name ?? "",
      r.quizzes?.title ?? "",
      r.attempt_number,
      r.score_pct,
      r.correct_count,
      r.total_count,
      r.completed_at,
    ]),
  ];

  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="attempts-${Date.now()}.csv"`,
    },
  });
}
