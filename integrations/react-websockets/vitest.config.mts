import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    // Globals are required for @testing-library/react's automatic cleanup
    // between tests — it registers itself against the global `afterEach`.
    globals: true,
    include: ["tests/**/*.test.tsx"],
  },
});
