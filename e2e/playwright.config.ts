import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  // Serial execution — tests share a real DB, so parallel workers would
  // interfere with point/achievement counts.
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    video: "on-first-retry",
  },
  webServer: [
    {
      // Start the backend on the e2e Spring profile (HMAC JWT, quiz_platform_e2e DB).
      command:
        "cd ../backend && mvn spring-boot:run -Dspring-boot.run.profiles=e2e -DskipTests -q",
      url: "http://localhost:8080/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // Start the frontend with the e2e Vite mode (VITE_E2E_MODE=true).
      command: "cd ../frontend && npm run dev -- --mode e2e",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
