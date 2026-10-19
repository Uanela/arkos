import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";

// The "browser" resolve condition maps `ws` to a stub; use the Node build
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
    server: { deps: { inline: ["socket.io-client", "engine.io-client"] } },
  },
});
