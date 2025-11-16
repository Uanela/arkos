import { readFileSync, writeFileSync } from "fs";

interface ServerReplacement {
  filePath: string;
  replacement: string;
}

const serverReplacements: ServerReplacement[] = [
  {
    filePath: "dist/cjs/server.js",
    replacement:
      "__importDefault(require(`${process.cwd()}/arkos.config.${fs_helpers_1.getUserFileExtension()}`))",
  },
  {
    filePath: "dist/esm/server.js",
    replacement:
      "await importModule(`${process.cwd()}/arkos.config.${getUserFileExtension()}`)",
  },
];

function replaceInServerFile(filePath: string, replacement: string): void {
  try {
    const content = readFileSync(filePath, "utf-8");
    const updatedContent = content.replace(
      /"HandledByPostBuild"/g,
      replacement
    );
    writeFileSync(filePath, updatedContent);
    console.info(`✅ Updated ${filePath}`);
  } catch (error) {
    console.error(`❌ Failed to update ${filePath}:`, error);
    process.exit(1);
  }
}

function main(): void {
  serverReplacements.forEach(({ filePath, replacement }) => {
    replaceInServerFile(filePath, replacement);
  });

  console.info("\n✅ All replacements completed successfully!");
}

main();
