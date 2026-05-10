import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

// Must stay in sync with E2eJwtConfig.SECRET in the backend.
const SECRET = "e2e-test-secret-key-must-32-chrs";
// Must match quizplatform.azure-ad.tenant-id in application-e2e.yml.
export const E2E_TENANT_ID = "e2e00000-0000-0000-0000-000000000000";

export interface TestUser {
  oid: string;
  email: string;
  name: string;
}

// Fixed OID — pre-seeded as admin by V9900__e2e_seed.sql.
export const CHARLIE: TestUser = {
  oid: "c0a00000-0000-0000-0000-000000000003",
  email: "charlie@e2e.test",
  name: "Charlie Admin",
};

/**
 * Create a test user with a fresh UUID for both OID and email so that
 * every test run inserts a brand-new row, avoiding the users.email unique
 * constraint violation that occurs when the same email is reused across runs.
 */
export function freshUser(displayName: string): TestUser {
  const oid = randomUUID();
  return { oid, email: `${oid}@e2e.test`, name: displayName };
}

export function signToken(user: TestUser): string {
  return jwt.sign(
    {
      oid: user.oid,
      tid: E2E_TENANT_ID,
      preferred_username: user.email,
      name: user.name,
    },
    SECRET,
    { algorithm: "HS256", expiresIn: "2h" },
  );
}

/**
 * Set the e2e auth token in localStorage before the page loads.
 * Call this before page.goto() so RequireAuth sees the token on first render.
 */
export async function loginAs(
  page: import("@playwright/test").Page,
  user: TestUser,
): Promise<void> {
  const token = signToken(user);
  await page.addInitScript((tok: string) => {
    localStorage.setItem("e2e_token", tok);
  }, token);
}
