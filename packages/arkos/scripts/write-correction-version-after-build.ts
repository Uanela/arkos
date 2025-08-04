#!/usr/bin/env node

import fs from "fs";
import path from "path";

/**
 * Replace {{version}} placeholder with actual version from package.json
 */
function replaceVersionPlaceholder() {
  try {
    // Read package.json
    const packageJsonPath = path.join(process.cwd(), "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      console.error("Error: package.json not found in current directory");
      process.exit(1);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const version = packageJson.version;

    if (!version) {
      console.error("Error: No version found in package.json");
      process.exit(1);
    }

    console.info(`Found version: ${version}`);

    // Define target file paths
    const targetFiles = [
      "dist/esm/utils/cli/utils/cli.helpers.js",
      "dist/esm/utils/cli/utils/cli.helpers.mjs",
      "dist/cjs/utils/cli/utils/cli.helpers.js",
    ];

    let filesProcessed = 0;
    let filesUpdated = 0;

    // Process each target file
    targetFiles.forEach((filePath) => {
      const fullPath = path.join(process.cwd(), filePath);

      if (!fs.existsSync(fullPath)) {
        console.warn(`Warning: File not found - ${filePath}`);
        return;
      }

      try {
        // Read file content
        let content = fs.readFileSync(fullPath, "utf8");
        const originalContent = content;

        // Replace all instances of {{version}} with actual version
        content = content.replace(/\{\{version\}\}/g, version);

        // Write back only if content changed
        if (content !== originalContent) {
          fs.writeFileSync(fullPath, content, "utf8");
          console.info(`✓ Updated: ${filePath}`);
          filesUpdated++;
        } else {
          console.info(`- No changes needed: ${filePath}`);
        }

        filesProcessed++;
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
      }
    });

    console.info(
      `\nSummary: ${filesProcessed} files processed, ${filesUpdated} files updated`
    );
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

// Run the script
replaceVersionPlaceholder();
