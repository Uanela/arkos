import { getNpmPackageVersion } from "../../src/utils/helpers/npm.helpers";
import fs from "fs";

export default function handleArkosVersionPlaceholder() {
  const arkosCurrentVersion = getNpmPackageVersion("arkos");
  const filePaths = [
    "./dist/utils/template-compiler.js",
    "./README.md",
    "./package.json",
  ];

  filePaths.forEach((filePath) => {
    try {
      // Read the file
      const fileContent = fs.readFileSync(filePath, {
        encoding: "utf8",
      });

      // Replace all occurrences of "{{arkosCurreVersion}}" with arkos.js current version
      const updatedContent = fileContent.replace(
        /\{\{arkosCurrentVersion\}\}/g,
        `${arkosCurrentVersion}`
      );

      fs.writeFileSync(filePath, updatedContent);

      // Count replacements made
      const originalMatches = fileContent.match(/\{\{arkosCurrentVersion\}\}/g);
      const replacementCount = originalMatches ? originalMatches.length : 0;

      console.info(`Replacements made for ${filePath}: ${replacementCount}`);
    } catch (error) {
      console.error("Error reading file:", error);
      return null;
    }
  });
}
