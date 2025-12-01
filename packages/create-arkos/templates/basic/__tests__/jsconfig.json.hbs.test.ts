import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderTemplate } from "../../../src/utils/helpers/templates.helpers";

describe("JavaScript config template rendering", () => {
  const templatePath = "basic/jsconfig.json.hbs";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the complete JavaScript config without modifications", () => {
    const context = {}; // No variables needed for this template

    const result = renderTemplate(templatePath, context);

    const config = JSON.parse(result);

    expect(config.compilerOptions).toBeDefined();
    expect(config.compilerOptions.target).toBe("ES6");
    expect(config.compilerOptions.module).toBe("Node16");
    expect(config.compilerOptions.moduleResolution).toBe("node16");
    expect(config.compilerOptions.rootDir).toBe(".");
    expect(config.compilerOptions.sourceMap).toBe(true);
    expect(config.compilerOptions.esModuleInterop).toBe(true);
    expect(config.compilerOptions.forceConsistentCasingInFileNames).toBe(true);
    expect(config.compilerOptions.allowJs).toBe(true);
    expect(config.compilerOptions.checkJs).toBe(false);

    // Check include patterns
    expect(config.include).toBeDefined();
    expect(config.include).toContain("src/**/*.js");
    expect(config.include).toContain("src/**/*.jsx");

    // Check exclude patterns
    expect(config.exclude).toBeDefined();
    expect(config.exclude).toContain("node_modules");
    expect(config.exclude).toContain(".build");
    expect(config.exclude).toContain("src/**/__tests__/**");
    expect(config.exclude).toContain("src/**/*.test.js");
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

  it("should produce valid JSON output", () => {
    const context = {};

    const result = renderTemplate(templatePath, context);

    // Should parse without throwing an error
    expect(() => JSON.parse(result)).not.toThrow();

    // Should be an object
    const config = JSON.parse(result);
    expect(typeof config).toBe("object");
  });

  it("should maintain the exact structure and formatting", () => {
    const context = {};

    const result = renderTemplate(templatePath, context);

    // Verify specific patterns are present
    expect(result).toContain('"target": "ES6"');
    expect(result).toContain('"module": "Node16"');
    expect(result).toContain('"moduleResolution": "node16"');
    expect(result).toContain('"rootDir": "."');
    expect(result).toContain('"sourceMap": true');
    expect(result).toContain('"esModuleInterop": true');
    expect(result).toContain('"forceConsistentCasingInFileNames": true');
    expect(result).toContain('"allowJs": true');
    expect(result).toContain('"checkJs": false');

    expect(result).toContain('"src/**/*.js"');
    expect(result).toContain('"src/**/*.jsx"');

    expect(result).toContain('"node_modules"');
    expect(result).toContain('".build"');
    expect(result).toContain('"src/**/__tests__/**"');
    expect(result).toContain('"src/**/*.test.js"');
  });

  it("should handle empty context without errors", () => {
    const context = {};

    expect(() => {
      renderTemplate(templatePath, context);
    }).not.toThrow();
  });

  it("should return a valid JSON string", () => {
    const context = {};

    const result = renderTemplate(templatePath, context);

    expect(typeof result).toBe("string");

    // Should be parseable as JSON
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty("compilerOptions");
    expect(parsed).toHaveProperty("include");
    expect(parsed).toHaveProperty("exclude");
  });
});
