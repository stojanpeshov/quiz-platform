# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02-quiz-lifecycle.spec.ts >> edit a draft quiz and save
- Location: tests/02-quiz-lifecycle.spec.ts:34:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Updated Quiz Title')
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for getByText('Updated Quiz Title')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - navigation [ref=e3]:
    - generic [ref=e4]:
      - link "Quiz Platform" [ref=e5] [cursor=pointer]:
        - /url: /
      - generic [ref=e6]:
        - link "Home" [ref=e7] [cursor=pointer]:
          - /url: /
        - link "Browse" [ref=e8] [cursor=pointer]:
          - /url: /quizzes
        - link "Create" [ref=e9] [cursor=pointer]:
          - /url: /quizzes/new
        - link "My quizzes" [ref=e10] [cursor=pointer]:
          - /url: /my/quizzes
        - link "Leaderboards" [ref=e11] [cursor=pointer]:
          - /url: /leaderboards
        - link "My points" [ref=e12] [cursor=pointer]:
          - /url: /me/points
        - link "Achievements" [ref=e13] [cursor=pointer]:
          - /url: /me/achievements
        - link "Admin" [ref=e14] [cursor=pointer]:
          - /url: /admin
    - button "Sign out" [ref=e16] [cursor=pointer]
  - main [ref=e17]:
    - generic [ref=e18]:
      - heading "My quizzes" [level=1] [ref=e19]
      - link "+ New" [ref=e20] [cursor=pointer]:
        - /url: /quizzes/new
      - list [ref=e21]:
        - listitem [ref=e22]:
          - link "E2E True/False Quiz draft · 1 q" [ref=e23] [cursor=pointer]:
            - /url: /quizzes/a0089aa9-0345-4cf2-acef-a6dde264aa84
            - generic [ref=e24]: E2E True/False Quiz
            - generic [ref=e25]: draft · 1 q
        - listitem [ref=e26]:
          - link "My Draft Quiz draft · 1 q" [ref=e27] [cursor=pointer]:
            - /url: /quizzes/eed94fcc-ebc0-4d65-a93c-f62e0d023972
            - generic [ref=e28]: My Draft Quiz
            - generic [ref=e29]: draft · 1 q
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { randomUUID } from "crypto";
  3   | import { loginAs } from "../helpers/jwt";
  4   | import { ApiClient, TRUE_FALSE_QUIZ } from "../helpers/api";
  5   | 
  6   | const USER = {
  7   |   oid: randomUUID(),
  8   |   email: "lifecycle-user@e2e.test",
  9   |   name: "Lifecycle User",
  10  | };
  11  | const api = new ApiClient(USER);
  12  | 
  13  | test("create a new draft quiz via the JSON editor", async ({ page }) => {
  14  |   await loginAs(page, USER);
  15  |   await page.goto("/quizzes/new");
  16  | 
  17  |   const quizJson = JSON.stringify({
  18  |     title: "My Draft Quiz",
  19  |     description: "Created in test",
  20  |     difficulty: "beginner",
  21  |     questions: [
  22  |       { type: "true_false", question: "Is this a test?", correctAnswer: true },
  23  |     ],
  24  |   }, null, 2);
  25  | 
  26  |   await page.locator("textarea").fill(quizJson);
  27  |   await page.getByRole("button", { name: "Create draft" }).click();
  28  | 
  29  |   // Should redirect to the edit page for the new draft.
  30  |   await expect(page).toHaveURL(/\/my\/quizzes\/.+\/edit/);
  31  |   await expect(page.getByRole("heading", { name: "Edit draft" })).toBeVisible();
  32  | });
  33  | 
  34  | test("edit a draft quiz and save", async ({ page }) => {
  35  |   const id = await api.createQuiz(TRUE_FALSE_QUIZ);
  36  | 
  37  |   await loginAs(page, USER);
  38  |   await page.goto(`/my/quizzes/${id}/edit`);
  39  |   await expect(page.getByRole("heading", { name: "Edit draft" })).toBeVisible();
  40  | 
  41  |   // Modify the title in the textarea.
  42  |   const textarea = page.locator("textarea");
  43  |   const current = await textarea.inputValue();
  44  |   const updated = current.replace('"title": "E2E True/False Quiz"', '"title": "Updated Quiz Title"');
  45  |   await textarea.fill(updated);
  46  |   await page.getByRole("button", { name: "Save" }).click();
  47  | 
  48  |   // Save redirects to My Quizzes.
  49  |   await expect(page).toHaveURL("/my/quizzes");
> 50  |   await expect(page.getByText("Updated Quiz Title")).toBeVisible();
      |                                                      ^ Error: expect(locator).toBeVisible() failed
  51  | 
  52  |   await api.deleteQuiz(id);
  53  | });
  54  | 
  55  | test("publish a draft quiz — quiz appears in the list as Published", async ({ page }) => {
  56  |   const id = await api.createQuiz(TRUE_FALSE_QUIZ);
  57  | 
  58  |   await loginAs(page, USER);
  59  |   await page.goto("/my/quizzes");
  60  | 
  61  |   // Find the quiz row and click Publish.
  62  |   const row = page.locator("li").filter({ hasText: TRUE_FALSE_QUIZ.title });
  63  |   await row.getByRole("button", { name: "Publish" }).click();
  64  | 
  65  |   // Status badge changes to Published.
  66  |   await expect(row.getByText("Published")).toBeVisible();
  67  | 
  68  |   await api.deleteQuiz(id);
  69  | });
  70  | 
  71  | test("publishing awards +20 points and shows the Knowledge Sharer achievement toast", async ({ page }) => {
  72  |   const freshUser = { oid: randomUUID(), email: "pub-ach@e2e.test", name: "Pub Ach" };
  73  |   const freshApi = new ApiClient(freshUser);
  74  |   const id = await freshApi.createQuiz(TRUE_FALSE_QUIZ);
  75  | 
  76  |   await loginAs(page, freshUser);
  77  |   await page.goto("/my/quizzes");
  78  | 
  79  |   const row = page.locator("li").filter({ hasText: TRUE_FALSE_QUIZ.title });
  80  |   await row.getByRole("button", { name: "Publish" }).click();
  81  | 
  82  |   // Achievement toast appears immediately.
  83  |   await expect(page.getByText(/Achievement unlocked: Knowledge Sharer/)).toBeVisible();
  84  | 
  85  |   // Points increased by 20.
  86  |   await page.goto("/me/points");
  87  |   await expect(page.getByText("20")).toBeVisible();
  88  | 
  89  |   await freshApi.deleteQuiz(id);
  90  | });
  91  | 
  92  | test("Unpublish & Edit archives the quiz and creates a new draft", async ({ page }) => {
  93  |   const id = await api.createAndPublishQuiz(TRUE_FALSE_QUIZ);
  94  | 
  95  |   await loginAs(page, USER);
  96  |   await page.goto("/my/quizzes");
  97  | 
  98  |   const row = page.locator("li").filter({ hasText: TRUE_FALSE_QUIZ.title });
  99  |   await row.getByRole("button", { name: "Unpublish & edit" }).click();
  100 | 
  101 |   // Redirected to the new draft's edit page.
  102 |   await expect(page).toHaveURL(/\/my\/quizzes\/.+\/edit/);
  103 |   await expect(page.getByRole("heading", { name: "Edit draft" })).toBeVisible();
  104 | 
  105 |   // The new draft URL is different from the original.
  106 |   const newDraftUrl = page.url();
  107 |   expect(newDraftUrl).not.toContain(id);
  108 | });
  109 | 
  110 | test("delete a quiz — it disappears from My Quizzes", async ({ page }) => {
  111 |   const id = await api.createQuiz({ ...TRUE_FALSE_QUIZ, title: "Quiz To Delete" });
  112 | 
  113 |   await loginAs(page, USER);
  114 |   await page.goto("/my/quizzes");
  115 | 
  116 |   const row = page.locator("li").filter({ hasText: "Quiz To Delete" });
  117 |   await expect(row).toBeVisible();
  118 |   await row.getByRole("button", { name: "Delete" }).click();
  119 | 
  120 |   await expect(page.getByText("Quiz To Delete")).not.toBeVisible();
  121 | });
  122 | 
```