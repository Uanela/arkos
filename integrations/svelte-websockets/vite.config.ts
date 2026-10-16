import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";

// Tests resolve with the "browser" condition (for Svelte's client build),
// which maps `ws` to a stub that throws. socket.io-client runs in Node here,
// so point `ws` at its real Node entry.
const wsRoot = dirname(createRequire(import.meta.url).resolve("ws/package.json"));

export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  resolve: {
    alias: { ws: join(wsRoot, "wrapper.mjs") },
  },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.ts"],
    globalSetup: ["test/global-setup.ts"],
    testTimeout: 10_000,
    // Process socket.io-client through Vite so the `ws` alias applies
    server: { deps: { inline: ["socket.io-client", "engine.io-client"] } },
  },
});
