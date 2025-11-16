import { readFileSync, writeFileSync } from "fs";

interface ServerReplacement {
  filePath: string;
  replacement: string;
  old: string;
}

const serverReplacements: ServerReplacement[] = [
  {
    filePath: "dist/cjs/server.js",
    replacement:
      "__importDefault(require(`${process.cwd()}/arkos.config.${fs_helpers_1.getUserFileExtension()}`))",
    old: '"HandledByPostBuild"',
  },
  {
    filePath: "dist/cjs/server.js",
    replacement: `const fs_helpers_1 = require("./utils/helpers/fs.helpers");`,
    old: '("ImportMissing");',
  },
  {
    filePath: "dist/esm/server.js",
    replacement:
      "await importModule(`${process.cwd()}/arkos.config.${getUserFileExtension()}`)",
    old: '"HandledByPostBuild"',
  },
  {
    filePath: "dist/esm/server.js",
    replacement: `import { importModule } from "./utils/helpers/global.helpers";
import { getUserFileExtension } from "./utils/helpers/fs.helpers";
`,
    old: '("ImportMissing");',
  },
];

function replaceInServerFile(
  filePath: string,
  old: string,
  replacement: string
): void {
  try {
    const content = readFileSync(filePath, "utf-8");
    const updatedContent = content.replace(old, replacement);
    writeFileSync(filePath, updatedContent);
    console.info(`✅ Updated ${filePath}`);
  } catch (error) {
    console.error(`❌ Failed to update ${filePath}:`, error);
    process.exit(1);
  }
}

function main(): void {
  serverReplacements.forEach(({ filePath, replacement, old }) => {
    replaceInServerFile(filePath, old, replacement);
  });

  console.info("\n✅ All replacements completed successfully!");
}

main();
