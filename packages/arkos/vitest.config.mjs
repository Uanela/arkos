import { defineConfig } from "vitest/config";
// const { defineConfig } = require("vitest/config");

// module.exports = defineConfig({
//   test: { globals: true },
// });
export default defineConfig({
  test: {
    globals: true, // This enables global APIs
    environment: 'node',
 setupFiles: ['./vitest.setup.mjs']
  },
});
