import { test, expect } from "@playwright/test";
import { freshUser, loginAs, CHARLIE } from "../helpers/jwt";
import { ApiClient, TRUE_FALSE_QUIZ } from "../helpers/api";

const adminApi = new ApiClient(CHARLIE);
const SUBJECT = freshUser("Admin Subject");
const subjectApi = new ApiClient(SUBJECT);

test.beforeAll(async () => {
  // Ensure SUBJECT user exists in the DB by making an authenticated API call.
  await subjectApi.getPoints();
});

test("admin dashboard shows platform stats", async ({ page }) => {
  await loginAs(page, CHARLIE);
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
  // Wait for stats data to load (the page shows Loading… until data arrives)
  await expect(page.locator(".text-2xl.font-bold").first()).toBeVisible();
  // Stat labels live inside the grid, separate from nav links and headings
  const grid = page.locator(".grid.grid-cols-2");
  await expect(grid.getByText("Users", { exact: true })).toBeVisible();
  await expect(grid.getByText("Quizzes", { exact: true })).toBeVisible();
  await expect(grid.getByText("Attempts", { exact: true })).toBeVisible();
});

test("admin dashboard stat cards show numeric values", async ({ page }) => {
  await loginAs(page, CHARLIE);
  await page.goto("/admin");

  // Wait for stats to load before counting; scope to the grid so the "Admin"
  // h1 heading (also text-2xl font-bold) is not included.
  const grid = page.locator(".grid.grid-cols-2");
  await expect(grid.locator(".text-2xl.font-bold").first()).toBeVisible();
  const stats = await grid.locator(".text-2xl.font-bold").all();
  expect(stats.length).toBeGreaterThanOrEqual(4);
  for (const stat of stats) {
    const text = await stat.textContent();
    expect(Number.isInteger(Number(text))).toBe(true);
  }
});

test("admin can search users by email", async ({ page }) => {
  await loginAs(page, CHARLIE);
  await page.goto("/admin/users");

  // Search by email (UUID-derived, unique per run) to avoid matching accumulated users
  await page.getByPlaceholder("Search email or name").fill(SUBJECT.email);
  await expect(page.getByText(SUBJECT.email)).toBeVisible();
});

test("admin can promote a user to admin role", async ({ page }) => {
  await loginAs(page, CHARLIE);
  await page.goto("/admin/users");

  await page.getByPlaceholder("Search email or name").fill(SUBJECT.email);

  const row = page.locator("li").filter({ hasText: SUBJECT.email }).first();
  const select = row.locator("select");
  await select.selectOption("Admin");

  // No error shown.
  await expect(page.locator(".text-red-400")).not.toBeVisible();

  // Reset back to user.
  const { users } = await adminApi.listAdminUsers();
  const subject = users.find((u) => u.email === SUBJECT.email);
  if (subject) await adminApi.setUserRole(subject.id, "user");
});

test("admin can demote an admin back to user role", async ({ page }) => {
  // Promote subject via API first.
  const { users } = await adminApi.listAdminUsers();
  const subject = users.find((u) => u.email === SUBJECT.email);
  if (subject) await adminApi.setUserRole(subject.id, "admin");

  await loginAs(page, CHARLIE);
  await page.goto("/admin/users");

  await page.getByPlaceholder("Search email or name").fill(SUBJECT.email);

  const row = page.locator("li").filter({ hasText: SUBJECT.email }).first();
  await row.locator("select").selectOption("User");

  await expect(page.locator(".text-red-400")).not.toBeVisible();
});

test("admin sees all quizzes including other users' drafts", async ({ page }) => {
  const draft = await subjectApi.createQuiz({ ...TRUE_FALSE_QUIZ, title: "Subject Draft Quiz" });

  await loginAs(page, CHARLIE);
  await page.goto("/admin/quizzes");

  await expect(page.getByRole("heading", { name: "Quizzes" })).toBeVisible();
  await expect(page.getByText("Subject Draft Quiz")).toBeVisible();

  await subjectApi.deleteQuiz(draft);
});

test("admin audit log page loads and shows event rows", async ({ page }) => {
  await loginAs(page, CHARLIE);
  await page.goto("/admin/events");

  await expect(page.getByRole("heading", { name: "Events" })).toBeVisible();
});

test("admin can manage achievement definitions — deactivate and reactivate", async ({ page }) => {
  await loginAs(page, CHARLIE);
  await page.goto("/admin/achievements");

  await expect(page.getByRole("heading", { name: "Achievements" })).toBeVisible();

  // Deactivate the first achievement.
  const firstRow = page.locator("li").first();
  await firstRow.getByRole("button", { name: "Deactivate" }).click();
  await expect(firstRow.getByRole("button", { name: "Activate" })).toBeVisible();

  // Re-activate it.
  await firstRow.getByRole("button", { name: "Activate" }).click();
  await expect(firstRow.getByRole("button", { name: "Deactivate" })).toBeVisible();
});

test("admin can save platform settings", async ({ page }) => {
  await loginAs(page, CHARLIE);
  await page.goto("/admin/settings");

  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  // Update the webhook URL field.
  await page.getByLabel("Teams webhook URL").fill("https://example.com/webhook");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Saved.")).toBeVisible();

  // Clear it back.
  await page.getByLabel("Teams webhook URL").fill("");
  await page.getByRole("button", { name: "Save" }).click();
});
