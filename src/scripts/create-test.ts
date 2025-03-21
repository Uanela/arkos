// File: scripts/create-test.js
import fs from "fs";
import path from "path";

// Get file path from command line
const filePath = process.argv[2];
if (!filePath) {
  console.error("Please provide a file path relative to src/");
  process.exit(1);
}

// Calculate paths
const srcPath = path.join("src", filePath);
const fileName = path.basename(srcPath);
const dirName = path.dirname(srcPath);
const testDirPath = path.join(dirName, "__tests__");
const testFilePath = path.join(
  testDirPath,
  `${fileName.replace(/\.(js|ts)$/, "")}.test.ts`
);

// Ensure the test directory exists
if (!fs.existsSync(testDirPath)) {
  fs.mkdirSync(testDirPath, { recursive: true });
}

// Create the test file with a basic template
const moduleName = path.basename(fileName, path.extname(fileName));
const relativePath = path.relative(testDirPath, dirName);

const testFileContent = `import { describe, it, expect, vi } from 'vitest';
import { ${moduleName} } from '${
  relativePath === "" ? ".." : relativePath
}/${moduleName}';

describe('${moduleName}', () => {
  it('should work as expected', () => {
    // Add your test here
    expect(true).toBe(true);
  });
});
`;

fs.writeFileSync(testFilePath, testFileContent);
console.log(`Created test file: ${testFilePath}`);
