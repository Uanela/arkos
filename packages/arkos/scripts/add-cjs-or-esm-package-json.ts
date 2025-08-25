import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

interface PackageJsonConfig {
  type: "module" | "commonjs";
}

const configs: Record<string, PackageJsonConfig> = {
  "dist/cjs/package.json": {
    type: "commonjs",
  },
  "dist/esm/package.json": {
    type: "module",
  },
};

function ensureDirectoryExists(filePath: string): void {
  const dir = dirname(filePath);
  try {
    mkdirSync(dir, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
}

function createPackageJson(filePath: string, config: PackageJsonConfig): void {
  ensureDirectoryExists(filePath);

  const packageJson = JSON.stringify(config, null, 2);

  try {
    writeFileSync(filePath, packageJson + "\n");
    console.info(`✅ Created ${filePath} with type: "${config.type}"`);
  } catch (error) {
    console.error(`❌ Failed to create ${filePath}:`, error);
    process.exit(1);
  }
}

function main(): void {
  Object.entries(configs).forEach(([filePath, config]) => {
    createPackageJson(filePath, config);
  });

  console.info("\nAll package.json files generated successfully!");
}

// Run the script
main();
