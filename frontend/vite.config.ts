import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// During dev, proxy /api/** to the .NET backend so the FE can call it as
// same-origin (avoids CORS preflights for cookies and keeps URLs short).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL || "http://localhost:8080";
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": { target: apiUrl, changeOrigin: true, secure: false },
        "/health": { target: apiUrl, changeOrigin: true, secure: false },
      },
    },
  };
});
