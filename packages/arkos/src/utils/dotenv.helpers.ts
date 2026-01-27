import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import sheu from "./sheu";

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

  const expanded = dotenvExpand.expand({
    parsed: mergedParsed,
    processEnv: mergedParsed,
  });

  Object.assign(process.env, expanded.parsed || mergedParsed);

  const requiredVars = ["DATABASE_URL"];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error(
      "Missing required environment variables:",
      missingVars.join(", ")
    );
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }

  return existingEnvFiles.reverse();
}
