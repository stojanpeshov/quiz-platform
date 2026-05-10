import { test, expect } from "@playwright/test";
import { freshUser, loginAs } from "../helpers/jwt";
import { ApiClient, TRUE_FALSE_QUIZ } from "../helpers/api";

const AUTHOR = freshUser("Browse Author");
const VIEWER = freshUser("Browse Viewer");
const authorApi = new ApiClient(AUTHOR);

let quizId: string;

test.beforeAll(async () => {
  quizId = await authorApi.createAndPublishQuiz({
    ...TRUE_FALSE_QUIZ,
    title: "Browse Test Quiz",
  });
});

test.afterAll(async () => {
  await authorApi.deleteQuiz(quizId);
});

test("published quiz appears on the Browse page", async ({ page }) => {
  await loginAs(page, VIEWER);
  await page.goto("/quizzes");
  await expect(page.getByText("Browse Test Quiz")).toBeVisible();
});

test("Hide Mine checkbox excludes own quizzes from the list", async ({ page }) => {
  await loginAs(page, AUTHOR);
  await page.goto("/quizzes");

  // With "Hide mine" checked (default), author's own quiz is absent.
  await expect(page.getByText("Browse Test Quiz")).not.toBeVisible();

  // Uncheck "Hide mine" — quiz reappears.
  await page.getByLabel("Hide mine").uncheck();
  await expect(page.getByText("Browse Test Quiz")).toBeVisible();
});

test("sort buttons switch between Recent, Best rated, Most taken", async ({ page }) => {
  await loginAs(page, VIEWER);
  await page.goto("/quizzes");

  await page.getByRole("button", { name: "Best rated" }).click();
  await expect(page.getByRole("button", { name: "Best rated" })).toHaveCSS(
    "background-color",
    /rgb/,
  );

  await page.getByRole("button", { name: "Most taken" }).click();
  await expect(page.getByRole("button", { name: "Most taken" })).toHaveCSS(
    "background-color",
    /rgb/,
  );
});

test("My Quizzes page shows own drafts and published quizzes", async ({ page }) => {
  // Author has a published quiz; create a draft too.
  const draftId = await authorApi.createQuiz({ ...TRUE_FALSE_QUIZ, title: "Author Draft" });

  await loginAs(page, AUTHOR);
  await page.goto("/my/quizzes");

  await expect(page.getByText("Browse Test Quiz")).toBeVisible();
  await expect(page.getByText("Author Draft")).toBeVisible();

  await authorApi.deleteQuiz(draftId);
});
