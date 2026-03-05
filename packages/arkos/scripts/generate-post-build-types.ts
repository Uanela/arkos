import { writeFileSync } from "fs";

const GENERATED_PACKAGE = "@arkosjs/generated";

const TYPES_CONTENT = `\
// Auto-generated: re-exports from ${GENERATED_PACKAGE}
// This file is overwritten by scripts/generate-post-build-types.ts at build time.
export type * from '${GENERATED_PACKAGE}';
export { PrismaClient } from '${GENERATED_PACKAGE}';
`;

const CJS_CONTENT = `\
// Auto-generated: re-exports from ${GENERATED_PACKAGE}
// This file is overwritten by scripts/generate-post-build-types.ts at build time.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaClient = void 0;
const generated_1 = require("${GENERATED_PACKAGE}");
exports.PrismaClient = generated_1.PrismaClient;
`;

const ESM_CONTENT = `\
// Auto-generated: re-exports from ${GENERATED_PACKAGE}
// This file is overwritten by scripts/generate-post-build-types.ts at build time.
export { PrismaClient } from '${GENERATED_PACKAGE}';
`;

const targets = [
  { path: "dist/types/generated.d.ts", content: TYPES_CONTENT },
  { path: "dist/cjs/generated.js", content: CJS_CONTENT },
  { path: "dist/esm/generated.js", content: ESM_CONTENT },
];

function main(): void {
  targets.forEach(({ path, content }) => {
    try {
      writeFileSync(path, content, "utf-8");
      console.info(`Updated ${path}`);
    } catch (error) {
      console.error(`Failed to update ${path}:`, error);
      process.exit(1);
    }
  });

  console.info("\nAll generated files overwritten successfully!");
}

main();
