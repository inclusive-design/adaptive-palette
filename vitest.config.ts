import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "server",
          include: ["./src/server/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
        }
      },
      {
        extends: true,
        test: {
          name: "client",
          include: ["./src/client/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            // https://vitest.dev/config/browser/playwright
            instances: [
              { browser: "chromium" },
              { browser: "firefox" },
              { browser: "webkit" },
            ],
          },
        }
      }
    ]
  },
});
