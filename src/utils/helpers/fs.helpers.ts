import { promisify } from "util";
import fs from "fs";

export const statAsync = promisify(fs.stat);
export const accessAsync = promisify(fs.access);
export const mkdirAsync = promisify(fs.mkdir);

// // Runtime-agnostic approach with proper TypeScript support
// export const extension = (() => {
//   // Safely detect environment without direct import.meta reference
//   let currentFile = "";

//   // Try to determine the current file using environment-specific approaches
//   try {
//     if (typeof process !== "undefined" && process.env) {
//       // Node.js environment - use __filename
//       currentFile = __filename || "";
//     } else {
//       // Handle other environments (browser, Deno, etc.)
//       // This branch won't be reached in CommonJS builds
//       if (typeof (global as any)?.document === "undefined") {
//         // Non-browser environment that might support import.meta
//         // We'll use eval to prevent direct parsing of import.meta
//         currentFile = new Function(
//           "return typeof import.meta !== 'undefined' ? import.meta.url : ''"
//         )();
//       }
//     }
//   } catch (e) {
//     // Ignore errors during detection
//   }

//   // Check file extension
//   if (currentFile.endsWith(".ts") || currentFile.endsWith(".tsx")) {
//     return "ts";
//   }

//   // Use "any" type and conditional checks to avoid TypeScript errors
//   try {
//     // Check for Deno
//     const globalObj = globalThis as any;
//     if (typeof globalObj.Deno !== "undefined" && globalObj.Deno.emit) {
//       return "ts";
//     }

//     // Check for Bun
//     if (typeof globalObj.Bun !== "undefined") {
//       return "ts";
//     }

//     // Check for newer Node with TS support
//     if (
//       typeof process !== "undefined" &&
//       process.versions &&
//       parseInt((process.versions as any).node.split(".")[0]) >= 18
//     ) {
//       const isUsingTypeScript = new Error().stack?.includes?.(".ts:");
//       if (isUsingTypeScript) return "ts";
//     }
//   } catch (e) {
//     // Ignore errors during detection
//   }

//   return "js";
// })();

export let userFileExtension: "ts" | "js" | undefined;

/**
 * Immediately detects if the user's project uses TypeScript or JavaScript
 * @returns 'ts' | 'js'
 */
export const getUserFileExtension = (): "ts" | "js" => {
  if (userFileExtension) return userFileExtension;

  try {
    // Only works in Node.js environment
    const fs = require("fs");
    const path = require("path");

    // Get the project root
    const projectRoot = process.cwd();

    // Check for tsconfig.json in project root as the fastest check
    if (fs.existsSync(path.join(projectRoot, "tsconfig.json"))) {
      userFileExtension = "ts";
      return userFileExtension;
    }

    // Check common src directories
    const srcDirs = ["src", "source", "app", "lib"]
      .map((dir) => path.join(projectRoot, dir))
      .filter((dir) => fs.existsSync(dir) && fs.statSync(dir).isDirectory());

    // Add project root to directories to check
    srcDirs.push(projectRoot);

    // Check each directory for .ts files
    for (const dir of srcDirs) {
      const files = fs.readdirSync(dir);
      if (
        files.some((file: any) => file.endsWith(".ts") || file.endsWith(".tsx"))
      ) {
        userFileExtension = "ts";
        return userFileExtension;
      }
    }

    // Default to js if no TypeScript indicators found
    userFileExtension = "js";
    return userFileExtension;
  } catch (e) {
    // Fallback to js if any errors occur
    userFileExtension = "js";
    return userFileExtension;
  }
};
