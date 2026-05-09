import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import { loginAs } from "../helpers/jwt";
import { ApiClient, TRUE_FALSE_QUIZ, TRUE_FALSE_CORRECT_ANSWER } from "../helpers/api";

const USER = { oid: randomUUID(), email: "points-user@e2e.test", name: "Points User" };
const QUIZ_AUTHOR = { oid: randomUUID(), email: "points-author@e2e.test", name: "Points Author" };
const userApi = new ApiClient(USER);
const authorApi = new ApiClient(QUIZ_AUTHOR);

let quizId: string;

test.beforeAll(async () => {
  quizId = await authorApi.createAndPublishQuiz(TRUE_FALSE_QUIZ);
});

test.afterAll(async () => {
  await authorApi.deleteQuiz(quizId);
});

test("completing an attempt adds +5 to the point history", async ({ page }) => {
  await userApi.takeQuiz(quizId, TRUE_FALSE_CORRECT_ANSWER);

  await loginAs(page, USER);
  await page.goto("/me/points");

  // The +5 attempt event appears in the list.
  await expect(page.getByText("+5").first()).toBeVisible();
});

test("scoring 100% shows +10 and +15 bonus events in point history", async ({ page }) => {
  // The beforeAll already took the quiz with a correct answer.
  await loginAs(page, USER);
  await page.goto("/me/points");

  // 100% on first attempt → +5 attempt + +10 (≥80%) + +15 (=100%)
  await expect(page.getByText("+15").first()).toBeVisible();
  await expect(page.getByText("+10").first()).toBeVisible();
  await expect(page.getByText("+5").first()).toBeVisible();
});

test("total points displayed on My Points page matches the sum of events", async ({ page }) => {
  await loginAs(page, USER);
  await page.goto("/me/points");

  const totalText = await page.locator("p.text-3xl").textContent();
  const total = parseInt(totalText ?? "0", 10);

  const { totalPoints } = await userApi.getPoints();
  expect(total).toBe(totalPoints);
});

test("publishing a quiz adds a +20 publish_quiz event", async ({ page }) => {
  const freshUser = { oid: randomUUID(), email: "pub-points@e2e.test", name: "Pub Points" };
  const freshApi = new ApiClient(freshUser);
  const id = await freshApi.createAndPublishQuiz(TRUE_FALSE_QUIZ);

  await loginAs(page, freshUser);
  await page.goto("/me/points");

  await expect(page.getByText("+20").first()).toBeVisible();

  await freshApi.deleteQuiz(id);
});

test("rating a quiz adds a +1 rate_quiz event", async ({ page }) => {
  const raterUser = { oid: randomUUID(), email: "rate-pts@e2e.test", name: "Rate Pts" };
  const raterApi = new ApiClient(raterUser);
  await raterApi.takeQuiz(quizId, TRUE_FALSE_CORRECT_ANSWER);
  await raterApi.rateQuiz(quizId, 4);

  await loginAs(page, raterUser);
  await page.goto("/me/points");

  await expect(page.getByText("+1").first()).toBeVisible();
});
