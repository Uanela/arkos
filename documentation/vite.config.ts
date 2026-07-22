import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import mdx from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import { resolve } from "path";

export default defineConfig({
  server: {
    port: 3001,
    allowedHosts: true
  },
  preview: {
    allowedHosts: true 
  },
  build: {
  },
  plugins: [
    mdx(await import("./source.config")),
    tailwindcss(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({
      prerender: {
        enabled: true,
        failOnError: false,
      },
    }),
    react(),
    // please see https://tanstack.com/start/latest/docs/framework/react/guide/hosting#nitro for guides on hosting
    nitro({
      preset: "node-server",
      prerender: {
        failOnError: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      // path: "path-browserify",
    },
    dedupe: ['react', 'react-dom']
  },
  ssr: {
    noExternal: ["react", "react-dom"],
    external: [
      "path",
      "node:fs",
      "node:url",
      "node:os",
      "fumadocs-mdx",
      "path",
      "fs",
    ],
  },
});
