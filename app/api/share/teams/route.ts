import { NextRequest, NextResponse } from "next/server";
import { requireUser, getServiceClient } from "@/lib/supabase";
import { postAchievementCard } from "@/lib/teams";
import type { EarnedAchievement } from "@/lib/achievements";

/**
 * POST /api/share/teams
 * Body: { userAchievementId: string }
 *
 * Auth-gated: only the achievement's owner can share it.
 * Webhook URL is read from platform_settings — never from client input.
 */
export async function POST(req: NextRequest) {
  const ctx = await requireUser();
  const body = await req.json().catch(() => null);
  const { userAchievementId } = body ?? {};

  if (!userAchievementId) {
    return NextResponse.json({ error: "userAchievementId required" }, { status: 400 });
  }

  // Fetch the achievement row — verifies ownership via user_id check
  const { data: ua } = await ctx.client
    .from("user_achievements")
    .select(`
      id, user_id, shared_to_teams_at, ref_quiz_id, ref_attempt_id,
      achievement:achievements(id, name, description, icon, card_type),
      quiz:quizzes(title),
      user:users(name, total_points)
    `)
    .eq("id", userAchievementId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (!ua) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ua.shared_to_teams_at) {
    return NextResponse.json({ error: "Already shared" }, { status: 409 });
  }

  // Read settings via service client (bypasses RLS on platform_settings)
  const svc = getServiceClient();
  const { data: settings } = await svc
    .from("platform_settings")
    .select("key, value")
    .in("key", ["teams_webhook_url", "teams_notify_enabled"]);

  const settingsMap = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));
  const webhookUrl = settingsMap["teams_webhook_url"] ?? "";
  const enabled = settingsMap["teams_notify_enabled"] !== "false";

  if (!enabled || !webhookUrl) {
    return NextResponse.json({ error: "Teams sharing is not configured" }, { status: 503 });
  }

  const ach = ua.achievement as any;
  const earnedAchievement: EarnedAchievement = {
    userAchievementId: ua.id,
    achievementId: ach.id,
    name: ach.name,
    description: ach.description,
    icon: ach.icon,
    cardType: ach.card_type,
    refQuizId: ua.ref_quiz_id,
    refAttemptId: ua.ref_attempt_id,
  };

  const user = ua.user as any;
  const quiz = ua.quiz as any;

  await postAchievementCard(webhookUrl, {
    achievement: earnedAchievement,
    userName: user?.name ?? "A colleague",
    quizTitle: quiz?.title,
    totalPoints: user?.total_points,
    platformUrl: process.env.NEXTAUTH_URL ?? "",
  });

  // Record that this achievement was shared
  await ctx.client
    .from("user_achievements")
    .update({ shared_to_teams_at: new Date().toISOString() })
    .eq("id", userAchievementId);

  return NextResponse.json({ ok: true });
}
