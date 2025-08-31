import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderTemplate } from "../../../src/utils/helpers/templates.helpers";

describe("TypeScript config template rendering", () => {
  const templatePath = "basic/tsconfig.json.hbs";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the complete TypeScript config without modifications", () => {
    const context = {}; // No variables needed for this template

    const result = renderTemplate(templatePath, context);

    // Parse the result as JSON to ensure it's valid
    const config = JSON.parse(result);

    // Check compiler options
    expect(config.compilerOptions).toBeDefined();
    expect(config.compilerOptions.target).toBe("ES6");
    expect(config.compilerOptions.module).toBe("Node16");
    expect(config.compilerOptions.moduleResolution).toBe("node16");
    expect(config.compilerOptions.rootDir).toBe("./src");
    expect(config.compilerOptions.strict).toBe(true);
    expect(config.compilerOptions.sourceMap).toBe(true);
    expect(config.compilerOptions.inlineSources).toBe(true);
    expect(config.compilerOptions.removeComments).toBe(true);
    expect(config.compilerOptions.esModuleInterop).toBe(true);
    expect(config.compilerOptions.experimentalDecorators).toBe(true);
    expect(config.compilerOptions.emitDecoratorMetadata).toBe(true);
    expect(config.compilerOptions.forceConsistentCasingInFileNames).toBe(true);

    // Check include patterns
    expect(config.include).toBeDefined();
    expect(config.include).toContain("src/**/*.ts");
    expect(config.include).toContain("src/**/*.tsx");

    // Check exclude patterns
    expect(config.exclude).toBeDefined();
    expect(config.exclude).toContain("node_modules");
    expect(config.exclude).toContain(".build");
    expect(config.exclude).toContain("src/**/__tests__/**");
    expect(config.exclude).toContain("src/**/*.test.ts");
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
    expect(result).toContain('"rootDir": "./src"');
    expect(result).toContain('"strict": true');
    expect(result).toContain('"sourceMap": true');
    expect(result).toContain('"inlineSources": true');
    expect(result).toContain('"removeComments": true');
    expect(result).toContain('"esModuleInterop": true');
    expect(result).toContain('"experimentalDecorators": true');
    expect(result).toContain('"emitDecoratorMetadata": true');
    expect(result).toContain('"forceConsistentCasingInFileNames": true');

    expect(result).toContain('"src/**/*.ts"');
    expect(result).toContain('"src/**/*.tsx"');

    expect(result).toContain('"node_modules"');
    expect(result).toContain('".build"');
    expect(result).toContain('"src/**/__tests__/**"');
    expect(result).toContain('"src/**/*.test.ts"');
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

  it("should differentiate from jsconfig by including TypeScript-specific options", () => {
    const context = {};

    const result = renderTemplate(templatePath, context);
    const config = JSON.parse(result);

    // TypeScript-specific options that wouldn't be in jsconfig
    expect(config.compilerOptions.strict).toBe(true);
    expect(config.compilerOptions.experimentalDecorators).toBe(true);
    expect(config.compilerOptions.emitDecoratorMetadata).toBe(true);

    // TypeScript file extensions in include
    expect(config.include).toContain("src/**/*.ts");
    expect(config.include).toContain("src/**/*.tsx");
    expect(config.include).not.toContain("src/**/*.js");
    expect(config.include).not.toContain("src/**/*.jsx");

    // TypeScript test file extensions in exclude
    expect(config.exclude).toContain("src/**/*.test.ts");
    expect(config.exclude).not.toContain("src/**/*.test.js");
  });
});
