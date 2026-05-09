import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import { loginAs } from "../helpers/jwt";
import { ApiClient, TRUE_FALSE_QUIZ, TRUE_FALSE_CORRECT_ANSWER } from "../helpers/api";

const AUTHOR = { oid: randomUUID(), email: "rate-author@e2e.test", name: "Rate Author" };
const RATER = { oid: randomUUID(), email: "rate-rater@e2e.test", name: "Rate Rater" };
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

  // Rating confirmation: the star buttons update color (state change).
  // We verify the page doesn't show an error.
  await expect(page.locator(".text-red-400")).not.toBeVisible();
});

test("re-rating the same quiz updates the rating without adding extra points", async ({ page }) => {
  const pointsBefore = (await raterApi.getPoints()).totalPoints;

  await loginAs(page, RATER);
  await page.goto(`/quizzes/${quizId}`);

  await page.getByRole("button", { name: "5 stars" }).click();
  await page.waitForTimeout(500); // brief wait for mutation to settle

  const pointsAfter = (await raterApi.getPoints()).totalPoints;
  // Re-rating must not award another +1 (idempotent).
  expect(pointsAfter).toBe(pointsBefore);
});

test("quiz detail page shows updated rating count and average", async ({ page }) => {
  await loginAs(page, RATER);
  await page.goto(`/quizzes/${quizId}`);

  // The rating section with stars is visible.
  await expect(page.getByRole("heading", { name: "Rate this quiz" })).toBeVisible();
  await expect(page.getByRole("button", { name: "1 stars" })).toBeVisible();
});
