import { test, expect } from "@playwright/test";
import { freshUser, loginAs } from "../helpers/jwt";
import { ApiClient, ALL_TYPES_QUIZ } from "../helpers/api";

const AUTHOR = freshUser("Take Author");
const TAKER = freshUser("Take Taker");
const authorApi = new ApiClient(AUTHOR);
const takerApi = new ApiClient(TAKER);

let quizId: string;

test.beforeAll(async () => {
  quizId = await authorApi.createAndPublishQuiz(ALL_TYPES_QUIZ);
});

test.afterAll(async () => {
  await authorApi.deleteQuiz(quizId);
});

test("take a quiz — answer all four question types and submit", async ({ page }) => {
  await loginAs(page, TAKER);
  await page.goto(`/quizzes/${quizId}/take`);
  await expect(page.getByRole("heading", { name: ALL_TYPES_QUIZ.title })).toBeVisible();

  // Q1 single_choice: click "Option B" (correctAnswer index 1)
  const q1 = page.locator("div.space-y-2").filter({ hasText: "Pick option B" });
  await q1.locator("label", { hasText: "Option B" }).locator("input[type=radio]").click();

  // Q2 multiple_choice: check "Option A" and "Option C" (correctAnswers [0,2])
  const q2 = page.locator("div.space-y-2").filter({ hasText: "Pick A and C" });
  await q2.locator("label", { hasText: "Option A" }).locator("input[type=checkbox]").check();
  await q2.locator("label", { hasText: "Option C" }).locator("input[type=checkbox]").check();

  // Q3 true_false: click "True" (correctAnswer true)
  const q3 = page.locator("div.space-y-2").filter({ hasText: "Is this a true/false question?" });
  await q3.locator("label", { hasText: "True" }).locator("input[type=radio]").click();

  // Q4 short_text: type "hello"
  const q4 = page.locator("div.space-y-2").filter({ hasText: "Type the word" });
  await q4.locator("input[type=text]").fill("hello");

  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText(/Score:/)).toBeVisible();
});

test("result page shows per-question correct/incorrect feedback", async ({ page }) => {
  await loginAs(page, TAKER);
  await page.goto(`/quizzes/${quizId}/take`);

  // Answer all questions correctly.
  const q1 = page.locator("div.space-y-2").filter({ hasText: "Pick option B" });
  await q1.locator("label", { hasText: "Option B" }).locator("input[type=radio]").click();
  const q2 = page.locator("div.space-y-2").filter({ hasText: "Pick A and C" });
  await q2.locator("label", { hasText: "Option A" }).locator("input[type=checkbox]").check();
  await q2.locator("label", { hasText: "Option C" }).locator("input[type=checkbox]").check();
  const q3 = page.locator("div.space-y-2").filter({ hasText: "Is this a true/false question?" });
  await q3.locator("label", { hasText: "True" }).locator("input[type=radio]").click();
  const q4 = page.locator("div.space-y-2").filter({ hasText: "Type the word" });
  await q4.locator("input[type=text]").fill("hello");

  await page.getByRole("button", { name: "Submit" }).click();

  // All four questions should show "✓ Correct".
  await expect(page.getByText("✓ Correct").first()).toBeVisible();
  const corrects = await page.getByText("✓ Correct").count();
  expect(corrects).toBe(4);
});

test("scoring 100% shows attempt number and 100% score", async ({ page }) => {
  await loginAs(page, TAKER);
  await page.goto(`/quizzes/${quizId}/take`);

  const q1 = page.locator("div.space-y-2").filter({ hasText: "Pick option B" });
  await q1.locator("label", { hasText: "Option B" }).locator("input[type=radio]").click();
  const q2 = page.locator("div.space-y-2").filter({ hasText: "Pick A and C" });
  await q2.locator("label", { hasText: "Option A" }).locator("input[type=checkbox]").check();
  await q2.locator("label", { hasText: "Option C" }).locator("input[type=checkbox]").check();
  const q3 = page.locator("div.space-y-2").filter({ hasText: "Is this a true/false question?" });
  await q3.locator("label", { hasText: "True" }).locator("input[type=radio]").click();
  const q4 = page.locator("div.space-y-2").filter({ hasText: "Type the word" });
  await q4.locator("input[type=text]").fill("hello");

  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText(/Score: 100%/)).toBeVisible();
  await expect(page.getByText(/attempt #\d+/)).toBeVisible();
});

test("short_text answer matches case-insensitively", async ({ page }) => {
  // Use a fresh user so this test is not affected by the 3-attempt cap on TAKER.
  const caseUser = freshUser("Case User");
  await loginAs(page, caseUser);
  await page.goto(`/quizzes/${quizId}/take`);

  // Fill all questions; only Q4 tests case-insensitive matching.
  const q1 = page.locator("div.space-y-2").filter({ hasText: "Pick option B" });
  await q1.locator("label", { hasText: "Option B" }).locator("input[type=radio]").click();
  const q2 = page.locator("div.space-y-2").filter({ hasText: "Pick A and C" });
  await q2.locator("label", { hasText: "Option A" }).locator("input[type=checkbox]").check();
  await q2.locator("label", { hasText: "Option C" }).locator("input[type=checkbox]").check();
  const q3 = page.locator("div.space-y-2").filter({ hasText: "Is this a true/false question?" });
  await q3.locator("label", { hasText: "True" }).locator("input[type=radio]").click();

  // Q4 uses upper-case with extra spaces — the backend normalises before comparing.
  const q4 = page.locator("div.space-y-2").filter({ hasText: "Type the word" });
  await q4.locator("input[type=text]").fill("  HELLO  ");

  await page.getByRole("button", { name: "Submit" }).click();

  // Q4 should be marked correct despite case/whitespace difference.
  const feedback = page.locator("div.space-y-2")
    .filter({ hasText: "Type the word" })
    .locator(".text-sm.pt-2");
  await expect(feedback).toContainText("✓ Correct");
});

test("taking the same quiz a second time is allowed", async ({ page }) => {
  // Use a fresh user to avoid the 3-attempt cap accumulated by TAKER in prior tests.
  const repeatUser = freshUser("Repeat User");
  const repeatApi = new ApiClient(repeatUser);

  // First attempt via API.
  await repeatApi.takeQuiz(quizId, [
    { type: "single_choice", value: 0 },
    { type: "multiple_choice", value: [0] },
    { type: "true_false", value: false },
    { type: "short_text", value: "wrong" },
  ]);

  await loginAs(page, repeatUser);
  await page.goto(`/quizzes/${quizId}/take`);

  // The take page should render for a second attempt (not blocked).
  await expect(page.getByRole("heading", { name: ALL_TYPES_QUIZ.title })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();
});
