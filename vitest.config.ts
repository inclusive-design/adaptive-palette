import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  test: {
    globals: true,
    clearMocks: true,
    // Every test file runs once per browser, and module loading dominates the run: the
    // imports take several times longer than the tests themselves. Under that contention a
    // test occasionally overruns a timeout and fails where it passes on its own -- a
    // different one each run, in any of the three browsers. One retry absorbs that; a real
    // failure still fails both attempts.
    retry: 1,
    // `initAdaptivePaletteGlobals()` runs in a `beforeAll` in 26 of these files and loads the
    // symbol data, so the default 10s hook budget is the first thing contention breaks.
    hookTimeout: 30000,
    testTimeout: 30000,
    projects: [
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
      },
      {
        extends: true,
        test: {
          name: "launcher",
          include: ["./launcher/**/*.test.?(c|m)[jt]s"],
          environment: "node",
          // These bind the one fixed port the launcher is allowed to use, so two of
          // them at once would collide.
          fileParallelism: false,
        }
      }
    ]
  },
});
