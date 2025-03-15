// Runtime-agnostic approach with proper TypeScript support
export const extension = (() => {
  // Safely detect environment without direct import.meta reference
  let currentFile = "";

  // Try to determine the current file using environment-specific approaches
  try {
    if (typeof process !== "undefined" && process.env) {
      // Node.js environment - use __filename
      currentFile = __filename || "";
    } else {
      // Handle other environments (browser, Deno, etc.)
      // This branch won't be reached in CommonJS builds
      if (typeof (global as any)?.document === "undefined") {
        // Non-browser environment that might support import.meta
        // We'll use eval to prevent direct parsing of import.meta
        currentFile = new Function(
          "return typeof import.meta !== 'undefined' ? import.meta.url : ''"
        )();
      }
    }
  } catch (e) {
    // Ignore errors during detection
  }

  // Check file extension
  if (currentFile.endsWith(".ts") || currentFile.endsWith(".tsx")) {
    return "ts";
  }

  // Use "any" type and conditional checks to avoid TypeScript errors
  try {
    // Check for Deno
    const globalObj = globalThis as any;
    if (typeof globalObj.Deno !== "undefined" && globalObj.Deno.emit) {
      return "ts";
    }

    // Check for Bun
    if (typeof globalObj.Bun !== "undefined") {
      return "ts";
    }

    // Check for newer Node with TS support
    if (
      typeof process !== "undefined" &&
      process.versions &&
      parseInt((process.versions as any).node.split(".")[0]) >= 18
    ) {
      const isUsingTypeScript = new Error().stack?.includes(".ts:");
      if (isUsingTypeScript) return "ts";
    }
  } catch (e) {
    // Ignore errors during detection
  }

  return "js";
})();
