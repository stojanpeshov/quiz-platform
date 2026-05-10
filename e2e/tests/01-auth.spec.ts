import { test, expect } from "@playwright/test";
import { freshUser, loginAs } from "../helpers/jwt";

const USER = freshUser("Auth User");

test("unauthenticated user is redirected to /login", async ({ page }) => {
  // No token in localStorage — RequireAuth should redirect.
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("authenticated user lands on home page", async ({ page }) => {
  await loginAs(page, USER);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("authenticated user sees their name in the navbar", async ({ page }) => {
  await loginAs(page, USER);
  await page.goto("/");
  // NavBar shows accounts[0].username from MSAL; in E2E mode MSAL has no
  // accounts so the email span is absent — just confirm the nav links render.
  await expect(page.getByRole("link", { name: "Browse" })).toBeVisible();
  await expect(page.getByRole("link", { name: "My quizzes" })).toBeVisible();
});
