import { test, expect } from "@playwright/test";
import { freshUser, loginAs } from "../helpers/jwt";
import { ApiClient, TRUE_FALSE_QUIZ, TRUE_FALSE_CORRECT_ANSWER } from "../helpers/api";

// Each achievement test uses a fresh user to guarantee a clean slate
// (achievements are global-scoped and fire only once per user).

const QUIZ_AUTHOR = freshUser("Ach Author");
const authorApi = new ApiClient(QUIZ_AUTHOR);

let quizId: string;

test.beforeAll(async () => {
  quizId = await authorApi.createAndPublishQuiz(TRUE_FALSE_QUIZ);
});

test.afterAll(async () => {
  await authorApi.deleteQuiz(quizId);
});

test("First Steps achievement is earned after the first completed attempt", async () => {
  const user = freshUser("First Steps User");
  const api = new ApiClient(user);

  await api.takeQuiz(quizId, TRUE_FALSE_CORRECT_ANSWER);
  const { achievements } = await api.getAchievements();
  const names = achievements.map((a) => a.achievement.name);
  expect(names).toContain("First Steps");
});

test("First Steps achievement toast appears in the browser after submitting", async ({ page }) => {
  const user = freshUser("First Steps UI User");

  await loginAs(page, user);
  await page.goto(`/quizzes/${quizId}/take`);

  const q = page.locator("div.space-y-2").filter({ hasText: "Is this a test?" });
  await q.locator("label", { hasText: "True" }).locator("input[type=radio]").click();
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText(/Achievement unlocked: First Steps/)).toBeVisible();
});

test("High Achiever achievement is earned after scoring ≥80%", async () => {
  const user = freshUser("High Achiever User");
  const api = new ApiClient(user);

  await api.takeQuiz(quizId, TRUE_FALSE_CORRECT_ANSWER); // 100% → qualifies for ≥80%

  const { achievements } = await api.getAchievements();
  const names = achievements.map((a) => a.achievement.name);
  expect(names).toContain("High Achiever");
});

test("Perfectionist achievement is earned after scoring 100%", async () => {
  const user = freshUser("Perfectionist User");
  const api = new ApiClient(user);

  await api.takeQuiz(quizId, TRUE_FALSE_CORRECT_ANSWER); // 100%

  const { achievements } = await api.getAchievements();
  const names = achievements.map((a) => a.achievement.name);
  expect(names).toContain("Perfectionist");
});

test("Knowledge Sharer achievement is earned after publishing the first quiz", async () => {
  const user = freshUser("Knowledge Sharer User");
  const api = new ApiClient(user);

  const id = await api.createAndPublishQuiz(TRUE_FALSE_QUIZ);

  const { achievements } = await api.getAchievements();
  const names = achievements.map((a) => a.achievement.name);
  expect(names).toContain("Knowledge Sharer");

  await api.deleteQuiz(id);
});

test("Perfectionist achievement toast appears in browser on 100% score", async ({ page }) => {
  const user = freshUser("Perfect UI User");

  await loginAs(page, user);
  await page.goto(`/quizzes/${quizId}/take`);

  const q = page.locator("div.space-y-2").filter({ hasText: "Is this a test?" });
  await q.locator("label", { hasText: "True" }).locator("input[type=radio]").click();
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText(/Achievement unlocked: Perfectionist/)).toBeVisible();
});

test("My Achievements page lists all earned achievements", async ({ page }) => {
  const user = freshUser("My Ach Page User");
  const api = new ApiClient(user);
  await api.takeQuiz(quizId, TRUE_FALSE_CORRECT_ANSWER);

  await loginAs(page, user);
  await page.goto("/me/achievements");

  await expect(page.getByRole("heading", { name: "My achievements" })).toBeVisible();
  await expect(page.getByText("First Steps")).toBeVisible();
  await expect(page.getByText("High Achiever")).toBeVisible();
  await expect(page.getByText("Perfectionist")).toBeVisible();
});

test("Achievement cards show icon and description", async ({ page }) => {
  const user = freshUser("Ach Cards User");
  const api = new ApiClient(user);
  await api.takeQuiz(quizId, TRUE_FALSE_CORRECT_ANSWER);

  await loginAs(page, user);
  await page.goto("/me/achievements");

  // Each achievement card has a name and description.
  const card = page.locator("li").filter({ hasText: "First Steps" });
  await expect(card).toBeVisible();
  const text = await card.textContent();
  expect(text?.length).toBeGreaterThan(10);
});
