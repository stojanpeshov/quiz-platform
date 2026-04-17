import type { SupabaseClient } from "@supabase/supabase-js";

export const POINTS = {
  PUBLISH_QUIZ: 20,
  COMPLETE_ATTEMPT: 5,
  SCORE_80_FIRST_TIME: 10,
  SCORE_100_FIRST_TIME: 15,
  RATE_QUIZ: 1,
} as const;

type AwardArgs = {
  userId: string;
  eventType: string;
  points: number;
  description: string;
  refQuizId?: string;
  refAttemptId?: string;
};

/**
 * Award points by calling the DB function — keeps total_points in sync.
 * Caller must pass a service-role or equivalent client.
 */
export async function awardPoints(
  client: SupabaseClient,
  a: AwardArgs
): Promise<void> {
  const { error } = await client.rpc("award_points", {
    p_user_id: a.userId,
    p_event_type: a.eventType,
    p_points: a.points,
    p_description: a.description,
    p_ref_quiz_id: a.refQuizId ?? null,
    p_ref_attempt_id: a.refAttemptId ?? null,
  });
  if (error) throw new Error(`award_points failed: ${error.message}`);
}

/**
 * Has the user already earned this specific bonus for this quiz?
 * Used to enforce "first time" rules on 80%+ and 100% bonuses.
 */
export async function hasEarned(
  client: SupabaseClient,
  userId: string,
  eventType: string,
  quizId: string
): Promise<boolean> {
  const { count } = await client
    .from("point_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", eventType)
    .eq("ref_quiz_id", quizId);
  return (count ?? 0) > 0;
}
