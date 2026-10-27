import type { TestProject } from "vitest/node";
import { startServer } from "./server.js";

declare module "vitest" {
  export interface ProvidedContext {
    serverUrl: string;
  }
}

export default async function setup(project: TestProject) {
  const server = await startServer();
  project.provide("serverUrl", server.url);
  return () => server.close();
}
