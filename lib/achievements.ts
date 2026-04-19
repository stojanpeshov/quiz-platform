import type { SupabaseClient } from "@supabase/supabase-js";

export type EarnedAchievement = {
  userAchievementId: string;
  achievementId: string;
  name: string;
  description: string;
  icon: string;
  cardType: string;
  refQuizId: string | null;
  refAttemptId: string | null;
};

// Real-time condition types evaluated inline after each event.
// Nightly types (score_top_n, rating_top_n, quiz_attempt_count, quiz_avg_rating)
// are handled by evaluate_nightly_achievements() in the DB.
const REALTIME_TYPES = [
  "score_threshold",
  "completion_count",
  "publish_count",
  "points_milestone",
] as const;

async function insertAchievement(
  client: SupabaseClient,
  userId: string,
  achievementId: string,
  refQuizId: string | null,
  refAttemptId: string | null
): Promise<string | null> {
  const { data, error } = await client
    .from("user_achievements")
    .insert({ user_id: userId, achievement_id: achievementId, ref_quiz_id: refQuizId, ref_attempt_id: refAttemptId })
    .select("id")
    .single();
  // 23505 = unique_violation — already earned, expected and silent
  if (error) return null;
  return data.id;
}

async function loadActiveAchievements(
  client: SupabaseClient,
  types: readonly string[]
) {
  const { data } = await client
    .from("achievements")
    .select("id, name, description, icon, condition_type, condition_value, scope, card_type")
    .eq("active", true)
    .in("condition_type", types);
  return data ?? [];
}

/**
 * Evaluate achievements after a quiz attempt is completed.
 * Checks: score_threshold (per_quiz), completion_count (global), points_milestone (global).
 */
export async function evaluateAfterAttempt(
  client: SupabaseClient,
  {
    userId,
    quizId,
    attemptId,
    scorePct,
  }: { userId: string; quizId: string; attemptId: string; scorePct: number }
): Promise<EarnedAchievement[]> {
  const achievements = await loadActiveAchievements(client, REALTIME_TYPES);
  if (!achievements.length) return [];

  // Fetch counts needed for condition checks in a single query
  const [{ count: completionCount }, { data: user }] = await Promise.all([
    client
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    client.from("users").select("total_points").eq("id", userId).single(),
  ]);

  const totalPoints = user?.total_points ?? 0;
  const totalCompletions = completionCount ?? 0;

  const earned: EarnedAchievement[] = [];

  for (const ach of achievements) {
    const cv = ach.condition_value as Record<string, number>;
    let met = false;
    let refQuizId: string | null = null;

    switch (ach.condition_type) {
      case "score_threshold":
        met = scorePct >= cv.min_pct;
        refQuizId = ach.scope === "per_quiz" ? quizId : null;
        break;
      case "completion_count":
        met = totalCompletions >= cv.n;
        break;
      case "points_milestone":
        met = totalPoints >= cv.points;
        break;
    }

    if (!met) continue;

    const id = await insertAchievement(client, userId, ach.id, refQuizId, attemptId);
    if (!id) continue;

    earned.push({
      userAchievementId: id,
      achievementId: ach.id,
      name: ach.name,
      description: ach.description,
      icon: ach.icon,
      cardType: ach.card_type,
      refQuizId,
      refAttemptId: attemptId,
    });
  }

  return earned;
}

/**
 * Evaluate achievements after a quiz is published.
 * Checks: publish_count (global), points_milestone (global).
 */
export async function evaluateAfterPublish(
  client: SupabaseClient,
  { userId, quizId }: { userId: string; quizId: string }
): Promise<EarnedAchievement[]> {
  const achievements = await loadActiveAchievements(client, ["publish_count", "points_milestone"]);
  if (!achievements.length) return [];

  const [{ count: publishCount }, { data: user }] = await Promise.all([
    client
      .from("quizzes")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId)
      .eq("status", "published"),
    client.from("users").select("total_points").eq("id", userId).single(),
  ]);

  const totalPoints = user?.total_points ?? 0;
  const totalPublished = publishCount ?? 0;

  const earned: EarnedAchievement[] = [];

  for (const ach of achievements) {
    const cv = ach.condition_value as Record<string, number>;
    let met = false;

    switch (ach.condition_type) {
      case "publish_count":
        met = totalPublished >= cv.n;
        break;
      case "points_milestone":
        met = totalPoints >= cv.points;
        break;
    }

    if (!met) continue;

    const id = await insertAchievement(client, userId, ach.id, null, null);
    if (!id) continue;

    earned.push({
      userAchievementId: id,
      achievementId: ach.id,
      name: ach.name,
      description: ach.description,
      icon: ach.icon,
      cardType: ach.card_type,
      refQuizId: null,
      refAttemptId: null,
    });
  }

  return earned;
}

/**
 * Evaluate achievements after a quiz is rated.
 * Checks: points_milestone (global) for the rater.
 * Author achievements (quiz_avg_rating, rating_top_n) are handled nightly.
 */
export async function evaluateAfterRating(
  client: SupabaseClient,
  { userId }: { userId: string }
): Promise<EarnedAchievement[]> {
  const achievements = await loadActiveAchievements(client, ["points_milestone"]);
  if (!achievements.length) return [];

  const { data: user } = await client
    .from("users")
    .select("total_points")
    .eq("id", userId)
    .single();

  const totalPoints = user?.total_points ?? 0;
  const earned: EarnedAchievement[] = [];

  for (const ach of achievements) {
    const cv = ach.condition_value as Record<string, number>;
    if (totalPoints < cv.points) continue;

    const id = await insertAchievement(client, userId, ach.id, null, null);
    if (!id) continue;

    earned.push({
      userAchievementId: id,
      achievementId: ach.id,
      name: ach.name,
      description: ach.description,
      icon: ach.icon,
      cardType: ach.card_type,
      refQuizId: null,
      refAttemptId: null,
    });
  }

  return earned;
}
