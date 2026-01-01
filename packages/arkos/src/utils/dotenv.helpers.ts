import path from "path";
import fs from "fs";
import dotenv from "dotenv";

/**
 * Loads environment variables in a prioritized order
 * 1. Base defaults (.env.defaults) - lowest priority
 * 2. Environment-specific (.env.{NODE_ENV})
 * 3. Environment-specific local (.env.{NODE_ENV}.local)
 * 4. Local environment overrides (.env.local)
 * 5. Main .env file (.env)
 * 6. Process environment variables - highest priority (already loaded by Node)
 */
export function loadEnvironmentVariables() {
  const ENV = process.env.NODE_ENV;
  const cwd = process.cwd();
  let loadedEnvs: string[] = [];

  const envFiles = [
    path.resolve(cwd, ".env.defaults"),
    path.resolve(cwd, ".env"),
    path.resolve(cwd, ".env.local"),
    path.resolve(cwd, `.env.${ENV}`),
    path.resolve(cwd, `.env.${ENV}.local`),
  ];

  envFiles.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      if (process.env.ARKOS_BUILD === "true" && filePath.endsWith(".local"))
        console.info(
          `Skipping the local ${filePath.replace(cwd, "")} files in production`
        );
      else {
        const result = dotenv.config({
          path: filePath,
          override: true,
          quiet: true,
        });

        if (result.error) {
          console.warn(`Warning: Error loading ${filePath}`, result.error);
        } else loadedEnvs.push(filePath);
      }
    }
  });

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

  if (loadedEnvs) return loadedEnvs;
}
