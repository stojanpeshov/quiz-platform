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
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
    video: "on-first-retry",
  },
  webServer: [
    {
      // Start the backend on the e2e Spring profile (HMAC JWT, quiz_platform_e2e DB).
      // Port 8081 keeps it isolated from the regular dev backend on :8080.
      command:
        "cd ../backend && mvn spring-boot:run -Dspring-boot.run.profiles=e2e -DskipTests -q -Dspring-boot.run.jvmArguments='-Dserver.port=8081'",
      url: "http://localhost:8081/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // Start the frontend with the e2e Vite mode (VITE_E2E_MODE=true) on a
      // dedicated port so it never clobbers the regular dev server on :5173.
      command: "cd ../frontend && npm run dev -- --mode e2e --port 5174",
      url: "http://localhost:5174",
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
