import { readFileSync, writeFileSync } from "fs";

interface ServerReplacement {
  filePath: string;
  replacement: string;
  old: string;
}

const serverReplacements: ServerReplacement[] = [
  {
    filePath: "dist/cjs/utils/helpers/arkos-config.helpers.js",
    replacement:
      'process.env.NO_CLI === "true" ? __importDefault(require(`${fs_helpers_1.crd()}/arkos.config.${fs_helpers_1.getUserFileExtension()}`)) : () => {}',
    old: '"ReplaceWithDynamicImport"',
  },
  {
    filePath: "dist/cjs/utils/helpers/arkos-config.helpers.js",
    replacement: `const fs_helpers_1 = require("./fs.helpers");`,
    old: '("ReplaceWithNeededImportsForArkosConfig");',
  },
  {
    filePath: "dist/esm/utils/helpers/arkos-config.helpers.js",
    replacement:
      'process.env.NO_CLI === "true" ? await importModule(`${crd()}/arkos.config.${getUserFileExtension()}`) : () => {}',
    old: '"ReplaceWithDynamicImport"',
  },
  {
    filePath: "dist/esm/utils/helpers/arkos-config.helpers.js",
    replacement: `import { importModule } from "./global.helpers.js";
import { getUserFileExtension, crd } from "./fs.helpers.js";
`,
    old: '("ReplaceWithNeededImportsForArkosConfig");',
  },
  {
    filePath: "dist/esm/utils/helpers/arkos-config.helpers.js",
    replacement: `import { importModule } from "./global.helpers.js";
import { getUserFileExtension, crd } from "./fs.helpers.js";
`,
    old: '("ReplaceWithNeededImportsForArkosConfig");',
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
