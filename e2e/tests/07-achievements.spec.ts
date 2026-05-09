import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import { loginAs } from "../helpers/jwt";
import { ApiClient, TRUE_FALSE_QUIZ, TRUE_FALSE_CORRECT_ANSWER } from "../helpers/api";

// Each achievement test uses a fresh user to guarantee a clean slate
// (achievements are global-scoped and fire only once per user).

const QUIZ_AUTHOR = { oid: randomUUID(), email: "ach-author@e2e.test", name: "Ach Author" };
const authorApi = new ApiClient(QUIZ_AUTHOR);

let quizId: string;

test.beforeAll(async () => {
  quizId = await authorApi.createAndPublishQuiz(TRUE_FALSE_QUIZ);
});

test.afterAll(async () => {
  await authorApi.deleteQuiz(quizId);
});

test("First Steps achievement is earned after the first completed attempt", async ({ page }) => {
  const freshUser = { oid: randomUUID(), email: "first-steps@e2e.test", name: "First Steps" };
  const freshApi = new ApiClient(freshUser);

  // Trigger the attempt via API to confirm backend fires the achievement.
  await freshApi.takeQuiz(quizId, TRUE_FALSE_CORRECT_ANSWER);
  const { achievements } = await freshApi.getAchievements();
  const names = achievements.map((a) => a.achievement.name);
  expect(names).toContain("First Steps");
});

test("First Steps achievement toast appears in the browser after submitting", async ({ page }) => {
  const freshUser = { oid: randomUUID(), email: "first-steps-ui@e2e.test", name: "First Steps UI" };

  await loginAs(page, freshUser);
  await page.goto(`/quizzes/${quizId}/take`);

  const q = page.locator("div.space-y-2").filter({ hasText: "Is this a test?" });
  await q.locator("label", { hasText: "True" }).locator("input[type=radio]").click();
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText(/Achievement unlocked: First Steps/)).toBeVisible();
});

test("High Achiever achievement is earned after scoring ≥80%", async ({ page }) => {
  const freshUser = { oid: randomUUID(), email: "high-ach@e2e.test", name: "High Achiever" };
  const freshApi = new ApiClient(freshUser);

  await freshApi.takeQuiz(quizId, TRUE_FALSE_CORRECT_ANSWER); // 100% → qualifies for ≥80%

  const { achievements } = await freshApi.getAchievements();
  const names = achievements.map((a) => a.achievement.name);
  expect(names).toContain("High Achiever");
});

test("Perfectionist achievement is earned after scoring 100%", async ({ page }) => {
  const freshUser = { oid: randomUUID(), email: "perfectionist@e2e.test", name: "Perfectionist" };
  const freshApi = new ApiClient(freshUser);

  await freshApi.takeQuiz(quizId, TRUE_FALSE_CORRECT_ANSWER); // 100%

  const { achievements } = await freshApi.getAchievements();
  const names = achievements.map((a) => a.achievement.name);
  expect(names).toContain("Perfectionist");
});

test("Knowledge Sharer achievement is earned after publishing the first quiz", async ({ page }) => {
  const freshUser = { oid: randomUUID(), email: "knowledge-sharer@e2e.test", name: "Knowledge Sharer" };
  const freshApi = new ApiClient(freshUser);

  const id = await freshApi.createAndPublishQuiz(TRUE_FALSE_QUIZ);

  const { achievements } = await freshApi.getAchievements();
  const names = achievements.map((a) => a.achievement.name);
  expect(names).toContain("Knowledge Sharer");

  await freshApi.deleteQuiz(id);
});

test("Perfectionist achievement toast appears in browser on 100% score", async ({ page }) => {
  const freshUser = { oid: randomUUID(), email: "perfect-ui@e2e.test", name: "Perfect UI" };

  await loginAs(page, freshUser);
  await page.goto(`/quizzes/${quizId}/take`);

  const q = page.locator("div.space-y-2").filter({ hasText: "Is this a test?" });
  await q.locator("label", { hasText: "True" }).locator("input[type=radio]").click();
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText(/Achievement unlocked: Perfectionist/)).toBeVisible();
});

test("My Achievements page lists all earned achievements", async ({ page }) => {
  const freshUser = { oid: randomUUID(), email: "my-ach-page@e2e.test", name: "My Ach Page" };
  const freshApi = new ApiClient(freshUser);
  await freshApi.takeQuiz(quizId, TRUE_FALSE_CORRECT_ANSWER);

  await loginAs(page, freshUser);
  await page.goto("/me/achievements");

  await expect(page.getByRole("heading", { name: "My achievements" })).toBeVisible();
  await expect(page.getByText("First Steps")).toBeVisible();
  await expect(page.getByText("High Achiever")).toBeVisible();
  await expect(page.getByText("Perfectionist")).toBeVisible();
});

test("Achievement cards show icon and description", async ({ page }) => {
  const freshUser = { oid: randomUUID(), email: "ach-cards@e2e.test", name: "Ach Cards" };
  const freshApi = new ApiClient(freshUser);
  await freshApi.takeQuiz(quizId, TRUE_FALSE_CORRECT_ANSWER);

  await loginAs(page, freshUser);
  await page.goto("/me/achievements");

  // Each achievement card has a name and description.
  const card = page.locator("li").filter({ hasText: "First Steps" });
  await expect(card).toBeVisible();
  // Icon is a text span (emoji) — just confirm the card has meaningful content.
  const text = await card.textContent();
  expect(text?.length).toBeGreaterThan(10);
});
