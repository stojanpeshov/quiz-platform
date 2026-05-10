import { test, expect } from "@playwright/test";
import { freshUser, loginAs } from "../helpers/jwt";
import { ApiClient, TRUE_FALSE_QUIZ, TRUE_FALSE_CORRECT_ANSWER } from "../helpers/api";

const AUTHOR = freshUser("Rate Author");
const RATER = freshUser("Rate Rater");
const authorApi = new ApiClient(AUTHOR);
const raterApi = new ApiClient(RATER);

let quizId: string;

test.beforeAll(async () => {
  quizId = await authorApi.createAndPublishQuiz(TRUE_FALSE_QUIZ);
  // Rater must attempt before rating.
  await raterApi.takeQuiz(quizId, TRUE_FALSE_CORRECT_ANSWER);
});

test.afterAll(async () => {
  await authorApi.deleteQuiz(quizId);
});

test("rate a quiz after completing an attempt", async ({ page }) => {
  await loginAs(page, RATER);
  await page.goto(`/quizzes/${quizId}`);

  await page.getByRole("button", { name: "4 stars" }).click();

  // Verify no error is shown.
  await expect(page.locator(".text-red-400")).not.toBeVisible();
});

test("re-rating the same quiz updates the rating without adding extra points", async ({ page }) => {
  const pointsBefore = (await raterApi.getPoints()).totalPoints;

  await loginAs(page, RATER);
  await page.goto(`/quizzes/${quizId}`);

  await page.getByRole("button", { name: "5 stars" }).click();
  await page.waitForTimeout(500);

  const pointsAfter = (await raterApi.getPoints()).totalPoints;
  // Re-rating must not award another +1 (idempotent).
  expect(pointsAfter).toBe(pointsBefore);
});

test("quiz detail page shows rating section with star buttons", async ({ page }) => {
  await loginAs(page, RATER);
  await page.goto(`/quizzes/${quizId}`);

  await expect(page.getByRole("heading", { name: "Rate this quiz" })).toBeVisible();
  await expect(page.getByRole("button", { name: "1 stars" })).toBeVisible();
});
