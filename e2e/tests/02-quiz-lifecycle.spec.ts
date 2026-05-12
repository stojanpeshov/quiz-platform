import { test, expect } from "@playwright/test";
import { freshUser, loginAs } from "../helpers/jwt";
import { ApiClient, TRUE_FALSE_QUIZ } from "../helpers/api";

const USER = freshUser("Lifecycle User");
const api = new ApiClient(USER);

test("create a new draft quiz via the JSON editor", async ({ page }) => {
  await loginAs(page, USER);
  await page.goto("/quizzes/new");

  const quizJson = JSON.stringify({
    title: "My Draft Quiz",
    description: "Created in test",
    difficulty: "beginner",
    questions: [
      { type: "true_false", question: "Is this a test?", correctAnswer: true },
    ],
  }, null, 2);

  await page.locator("textarea").fill(quizJson);
  await page.getByRole("button", { name: "Create draft" }).click();

  // Should redirect to the edit page for the new draft.
  await expect(page).toHaveURL(/\/my\/quizzes\/.+\/edit/);
  await expect(page.getByRole("heading", { name: "Edit draft" })).toBeVisible();
});

test("edit a draft quiz and save", async ({ page }) => {
  const id = await api.createQuiz(TRUE_FALSE_QUIZ);

  await loginAs(page, USER);
  await page.goto(`/my/quizzes/${id}/edit`);
  await expect(page.getByRole("heading", { name: "Edit draft" })).toBeVisible();

  // Wait for the textarea to be populated from the GET /api/quizzes/:id response
  // before reading its content; the heading renders before the API call resolves.
  const textarea = page.locator("textarea");
  await expect(textarea).not.toHaveValue("");
  const current = await textarea.inputValue();
  const updated = current.replace('"title": "E2E True/False Quiz"', '"title": "Updated Quiz Title"');
  await textarea.fill(updated);
  await page.getByRole("button", { name: "Save" }).click();

  // Save redirects to My Quizzes.
  await expect(page).toHaveURL("/my/quizzes");
  await expect(page.getByText("Updated Quiz Title")).toBeVisible();

  await api.deleteQuiz(id);
});

test("publish a draft quiz — quiz appears in the list as Published", async ({ page }) => {
  const id = await api.createQuiz(TRUE_FALSE_QUIZ);

  await loginAs(page, USER);
  await page.goto("/my/quizzes");

  // Find the quiz row and click Publish.
  const row = page.locator("li").filter({ hasText: TRUE_FALSE_QUIZ.title });
  await row.getByRole("button", { name: "Publish" }).click();

  // Status badge changes to Published.
  await expect(row.getByText("Published")).toBeVisible();

  await api.deleteQuiz(id);
});

test("publishing awards +20 points and shows the Knowledge Sharer achievement toast", async ({ page }) => {
  const pubUser = freshUser("Pub Ach User");
  const pubApi = new ApiClient(pubUser);
  const id = await pubApi.createQuiz(TRUE_FALSE_QUIZ);

  await loginAs(page, pubUser);
  await page.goto("/my/quizzes");

  const row = page.locator("li").filter({ hasText: TRUE_FALSE_QUIZ.title });
  await row.getByRole("button", { name: "Publish" }).click();

  // Achievement toast appears immediately.
  await expect(page.getByText(/Achievement unlocked: Knowledge Sharer/)).toBeVisible();

  // Points increased by 20 (+20 publish event visible in the list).
  await page.goto("/me/points");
  await expect(page.getByText("+20")).toBeVisible();

  await pubApi.deleteQuiz(id);
});

test("Unpublish & Edit archives the quiz and creates a new draft", async ({ page }) => {
  const id = await api.createAndPublishQuiz(TRUE_FALSE_QUIZ);

  await loginAs(page, USER);
  await page.goto("/my/quizzes");

  const row = page.locator("li").filter({ hasText: TRUE_FALSE_QUIZ.title });
  await row.getByRole("button", { name: "Unpublish & edit" }).click();

  // Redirected to the new draft's edit page.
  await expect(page).toHaveURL(/\/my\/quizzes\/.+\/edit/);
  await expect(page.getByRole("heading", { name: "Edit draft" })).toBeVisible();

  // The new draft URL is different from the original.
  const newDraftUrl = page.url();
  expect(newDraftUrl).not.toContain(id);
});

test("delete a quiz — it disappears from My Quizzes", async ({ page }) => {
  const id = await api.createQuiz({ ...TRUE_FALSE_QUIZ, title: "Quiz To Delete" });

  await loginAs(page, USER);
  await page.goto("/my/quizzes");

  const row = page.locator("li").filter({ hasText: "Quiz To Delete" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Delete" }).click();

  await expect(page.getByText("Quiz To Delete")).not.toBeVisible();
});
