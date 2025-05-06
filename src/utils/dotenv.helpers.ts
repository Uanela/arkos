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

  // Define files in order of increasing priority
  const envFiles = [
    path.resolve(cwd, `.env.defaults`),
    path.resolve(cwd, `.env.${ENV}`),
    path.resolve(cwd, `.env.${ENV}.local`), // Environment-specific local overrides
    path.resolve(cwd, ".env.local"),
    path.resolve(cwd, ".env"),
  ];

  // Load each file if it exists
  envFiles.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      if (ENV === "production" && filePath.endsWith(".local"))
        console.info(
          `Skipping the local ${filePath.replace(cwd, "")} files in production`
        );
      else {
        const result = dotenv.config({ path: filePath, override: true });

        if (result.error) {
          console.warn(`Warning: Error loading ${filePath}`, result.error);
        } else loadedEnvs.push(filePath);
      }
    }
  });

  // Validate required environment variables if needed
  const requiredVars = ["DATABASE_URL"]; // Add your required vars
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error(
      "Missing required environment variables:",
      missingVars.join(", ")
    );
    // Optionally throw an error based on your framework's needs
    // throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  if (loadedEnvs) return loadedEnvs;
}
