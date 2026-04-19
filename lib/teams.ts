// Server-side only. The webhook URL is fetched from platform_settings by the caller
// and passed in — it must never be sent to the client.

import type { EarnedAchievement } from "./achievements";

export type CardPayload = {
  achievement: EarnedAchievement;
  userName: string;
  quizTitle?: string;
  scorePct?: number;
  totalPoints?: number;
  platformUrl: string;
};

function buildAdaptiveCard(p: CardPayload) {
  const { achievement, userName, quizTitle, scorePct, totalPoints, platformUrl } = p;

  const facts: { title: string; value: string }[] = [];
  if (quizTitle) facts.push({ title: "Quiz", value: quizTitle });
  if (scorePct !== undefined) facts.push({ title: "Score", value: `${scorePct}%` });
  if (totalPoints !== undefined) facts.push({ title: "Total points", value: String(totalPoints) });

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: [
            {
              type: "TextBlock",
              text: `${achievement.icon}  Achievement unlocked`,
              weight: "Bolder",
              size: "Medium",
              color: "Accent",
            },
            {
              type: "TextBlock",
              text: `**${userName}** earned **${achievement.name}**`,
              wrap: true,
            },
            {
              type: "TextBlock",
              text: achievement.description,
              wrap: true,
              isSubtle: true,
              size: "Small",
            },
            ...(facts.length > 0 ? [{ type: "FactSet", facts }] : []),
          ],
          actions: [
            {
              type: "Action.OpenUrl",
              title: "View on platform",
              url: `${platformUrl}/me/achievements`,
            },
          ],
        },
      },
    ],
  };
}

/**
 * Post an achievement card to a Teams channel via an Incoming Webhook.
 * webhookUrl comes from platform_settings — never from client input.
 * Errors are logged but never thrown so the caller's response is never affected.
 */
export async function postAchievementCard(
  webhookUrl: string,
  payload: CardPayload
): Promise<void> {
  if (!webhookUrl) return;

  const body = buildAdaptiveCard(payload);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`Teams webhook error: ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    console.error("Teams webhook request failed:", err);
  }
}
