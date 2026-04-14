import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import sheu from "./sheu";
import { expandEnv } from "./expand-env";

/**
 * Loads and expands environment variables in a prioritized order
 *
 * 1. Main .env file (.env)
 * 2. Local environment overrides (.env.local)
 * 3. Environment-specific (.env.{NODE_ENV})
 * 5. Environment-specific local (.env.{NODE_ENV}.local)
 */
export function loadEnvironmentVariables() {
  const ENV = process.env.NODE_ENV;
  const cwd = process.cwd();

  const envFiles = [
    path.resolve(cwd, ".env"),
    path.resolve(cwd, ".env.local"),
    ...(ENV
      ? [
          path.resolve(cwd, `.env.${ENV}`),
          path.resolve(cwd, `.env.${ENV}.local`),
        ]
      : []),
  ];

  const existingEnvFiles: string[] = [];
  let mergedParsed: Record<string, string> = {};

  envFiles.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      if (process.env.ARKOS_BUILD === "true" && filePath.endsWith(".local")) {
        sheu.warn(
          `Skipping the local ${filePath.replace(cwd, "").replace("/", "")} file in production build`
        );
      } else {
        const parsed = dotenv.parse(fs.readFileSync(filePath));
        mergedParsed = { ...mergedParsed, ...parsed };
        existingEnvFiles.push(filePath);
      }
    }
  });

  const expanded = expandEnv({
    parsed: mergedParsed,
    processEnv: mergedParsed,
  });

  Object.assign(process.env, expanded.parsed || mergedParsed);

  return existingEnvFiles.reverse();
}
