import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderTemplate } from "../../../src/utils/helpers/templates.helpers";

describe("Arkos config template rendering", () => {
  const templatePath = "basic/arkos.config.ts.hbs";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render TypeScript version when typescript is true", () => {
    const context = {
      typescript: true,
    };

    const result = renderTemplate(templatePath, context);

    expect(result).toContain("import { ArkosConfig } from 'arkos'");
    expect(result).toContain("const config: ArkosConfig = {}");
    expect(result).not.toContain("/** @type {import('arkos').ArkosConfig} */");
    expect(result).not.toContain("const config = {}");
  });

  it("should render JavaScript version when typescript is false", () => {
    const context = {
      typescript: false,
    };

    const result = renderTemplate(templatePath, context);

    expect(result).not.toContain("import { ArkosConfig } from 'arkos'");
    expect(result).not.toContain("const config: ArkosConfig = {}");
    expect(result).toContain("/** @type {import('arkos').ArkosConfig} */");
    expect(result).toContain("const config = {}");
  });

  it("should render JavaScript version when typescript is undefined", () => {
    const context = {}; // typescript not defined

    const result = renderTemplate(templatePath, context);

    expect(result).not.toContain("import { ArkosConfig } from 'arkos'");
    expect(result).not.toContain("const config: ArkosConfig");
    expect(result).toContain("/** @type {import('arkos').ArkosConfig} */");
    expect(result).toContain("const config");
  });

  it("should include the export default statement in both versions", () => {
    // Test TypeScript version
    const contextTS = {
      typescript: true,
    };

    const resultTS = renderTemplate(templatePath, contextTS);
    expect(resultTS).toContain("export default config");

    // Test JavaScript version
    const contextJS = {
      typescript: false,
    };

    const resultJS = renderTemplate(templatePath, contextJS);
    expect(resultJS).toContain("export default config");
  });

  it("should not contain any unresolved template variables", () => {
    const context = {
      typescript: true,
    };

    const result = renderTemplate(templatePath, context);

    // Ensure no Handlebars variables are left in the output
    expect(result).not.toContain("{{");
    expect(result).not.toContain("}}");
    expect(result).not.toContain("#if");
    expect(result).not.toContain("typescript");
  });

  it("should render complete TypeScript config structure", () => {
    const context = {
      typescript: true,
    };

    const result = renderTemplate(templatePath, context);

    const expected = `import { ArkosConfig } from 'arkos'

const config: ArkosConfig = {
  routers: {
    strict: "no-bulk"
  },
  swagger: {
    mode: 'prisma',
    strict: false,
  },
  middlewares: {
    cors: {
      allowedOrigins: process.env.NODE_ENV !== "production" ? "*" : "your-production-url"
    },
  }
}

export default config`;

    expect(result.trim()).toBe(expected);
  });

  it("should render complete JavaScript config structure", () => {
    const context = {
      typescript: false,
    };

    const result = renderTemplate(templatePath, context);

    const expected = `/** @type {import('arkos').ArkosConfig} */
const config = {
  routers: {
    strict: "no-bulk"
  },
  swagger: {
    mode: 'prisma',
    strict: false,
  },
  middlewares: {
    cors: {
      allowedOrigins: process.env.NODE_ENV !== "production" ? "*" : "your-production-url"
    },
  }
}

export default config`;

    expect(result.trim()).toBe(expected);
  });
});
