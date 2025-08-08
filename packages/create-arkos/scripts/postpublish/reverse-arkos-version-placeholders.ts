import { getNpmPackageVersion } from "../../src/utils/helpers/npm.helpers";
import fs from "fs";

export default function reverseArkosVersionPlaceholders() {
  const arkosCurrentVersion = getNpmPackageVersion("arkos");
  const filePaths = ["./README.md", "./package.json"];

  filePaths.forEach((filePath) => {
    try {
      // Read the file
      const fileContent = fs.readFileSync(filePath, {
        encoding: "utf8",
      });

      // Replace all occurrences of the actual version back to placeholder
      // Create a regex that matches the exact version string
      const versionRegex = new RegExp(
        arkosCurrentVersion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "g"
      );
      const updatedContent = fileContent.replace(
        versionRegex,
        "{{arkosCurrentVersion}}"
      );

      fs.writeFileSync(filePath, updatedContent);

      // Count replacements made
      const originalMatches = fileContent.match(versionRegex);
      const replacementCount = originalMatches ? originalMatches.length : 0;

      console.info(
        `Reverse replacements made for ${filePath}: ${replacementCount}`
      );
    } catch (error) {
      console.error("Error reading file:", error);
      return null;
    }
  });
}
