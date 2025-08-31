import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderTemplate } from "../../../src/utils/helpers/templates.helpers";

describe(".gitignore template rendering", () => {
  const templatePath = "basic/.gitignore.hbs";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the complete .gitignore content without modifications", () => {
    const context = {}; // No variables needed for this template

    const result = renderTemplate(templatePath, context);

    // Check that all major sections are present
    expect(result).toContain("# Dependencies");
    expect(result).toContain("/node_modules");
    expect(result).toContain(".pnp.js");

    expect(result).toContain("# Environment files");
    expect(result).toContain(".env");
    expect(result).toContain(".env.local");

    expect(result).toContain("# Build and output directories");
    expect(result).toContain("/build");
    expect(result).toContain("/dist");

    expect(result).toContain("# Arkos.js' base uploads directory");
    expect(result).toContain("/uploads");

    expect(result).toContain("# TypeScript cache and declaration files");
    expect(result).toContain("*.tsbuildinfo");

    expect(result).toContain("# Logs");
    expect(result).toContain("logs");
    expect(result).toContain("*.log");

    expect(result).toContain("# IDE and editor directories");
    expect(result).toContain("/.idea");
    expect(result).toContain("/.vscode");

    expect(result).toContain("# OS files");
    expect(result).toContain(".DS_Store");
    expect(result).toContain("Thumbs.db");

    expect(result).toContain("# Testing");
    expect(result).toContain("/coverage");
    expect(result).toContain("/.nyc_output");

    expect(result).toContain("# Temporary files");
    expect(result).toContain("*.tmp");
    expect(result).toContain("*.temp");

    expect(result).toContain("# Misc");
    expect(result).toContain(".serverless/");
    expect(result).toContain(".fusebox/");
  });

  it("should not contain any template variables", () => {
    const context = {};

    const result = renderTemplate(templatePath, context);

    // Ensure no Handlebars variables are present
    expect(result).not.toContain("{{");
    expect(result).not.toContain("}}");
    expect(result).not.toContain("#if");
    expect(result).not.toContain("#unless");
  });

  it("should render the exact expected content", () => {
    const context = {};

    const result = renderTemplate(templatePath, context);

    // Verify specific patterns are present
    expect(result).toContain("package-lock.json");
    expect(result).toContain("yarn.lock");
    expect(result).toContain("pnpm-lock.yaml");
    expect(result).toContain(".npm");

    expect(result).toContain("*.env");
    expect(result).toContain(".env.development");
    expect(result).toContain(".env.test");
    expect(result).toContain(".env.production");

    expect(result).toContain("/.dist");
    expect(result).toContain("/out");
    expect(result).toContain("/.build");

    expect(result).toContain("/src/**/*.js.map");
    expect(result).toContain("/src/**/*.d.ts");
    expect(result).toContain("/types/generated/*");

    expect(result).toContain("npm-debug.log*");
    expect(result).toContain("yarn-debug.log*");
    expect(result).toContain("yarn-error.log*");

    expect(result).toContain("*.swp");
    expect(result).toContain("*.swo");
    expect(result).toContain(".project");

    expect(result).toContain("ehthumbs.db");
    expect(result).toContain("Desktop.ini");
    expect(result).toContain("$RECYCLE.BIN/");

    expect(result).toContain("/cypress/screenshots");
    expect(result).toContain("/cypress/videos");
    expect(result).toContain("/.jest-cache");

    expect(result).toContain(".cache/");
    expect(result).toContain(".eslintcache");
    expect(result).toContain(".stylelintcache");

    expect(result).toContain(".dynamodb/");
    expect(result).toContain(".webpack/");
    expect(result).toContain(".next/");
    expect(result).toContain(".nuxt/");
    expect(result).toContain(".docz/");
    expect(result).toContain(".vercel");

    expect(result).toContain("*.db");
  });

  it("should handle empty context without errors", () => {
    const context = {};

    expect(() => {
      renderTemplate(templatePath, context);
    }).not.toThrow();
  });

  it("should return a string with multiple lines", () => {
    const context = {};

    const result = renderTemplate(templatePath, context);

    expect(typeof result).toBe("string");
    expect(result.split("\n").length).toBeGreaterThan(50); // Should have many lines
  });
});
