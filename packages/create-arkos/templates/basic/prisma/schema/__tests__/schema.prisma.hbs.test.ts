import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderTemplate } from "../../../../../src/utils/helpers/templates.helpers";

describe("Schema Prisma template rendering", () => {
  const templatePath = "basic/prisma/schema/schema.prisma.hbs";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the client generator and datasource with the correct provider", () => {
    const providers = ["postgresql", "mysql", "sqlite", "mongodb"];

    providers.forEach((provider) => {
      const context = {
        prisma: {
          provider,
        },
      };

      const result = renderTemplate(templatePath, context);

      expect(result).toContain("generator client {");
      expect(result).toContain('provider = "prisma-client-js"');
      expect(result).toContain("datasource db {");
      expect(result).toContain(`provider = "${provider}"`);
      expect(result).toContain('url      = env("DATABASE_URL")');
      expect(result).toContain("}");
    });
  });

  it("should handle different database providers correctly", () => {
    // Test PostgreSQL
    const context1 = {
      prisma: {
        provider: "postgresql",
      },
    };

    const result1 = renderTemplate(templatePath, context1);
    expect(result1).toContain('provider = "postgresql"');

    // Test MySQL
    const context2 = {
      prisma: {
        provider: "mysql",
      },
    };

    const result2 = renderTemplate(templatePath, context2);
    expect(result2).toContain('provider = "mysql"');

    // Test SQLite
    const context3 = {
      prisma: {
        provider: "sqlite",
      },
    };

    const result3 = renderTemplate(templatePath, context3);
    expect(result3).toContain('provider = "sqlite"');

    // Test MongoDB
    const context4 = {
      prisma: {
        provider: "mongodb",
      },
    };

    const result4 = renderTemplate(templatePath, context4);
    expect(result4).toContain('provider = "mongodb"');
  });

  it("should render the complete template structure", () => {
    const context = {
      prisma: {
        provider: "postgresql",
      },
    };

    const result = renderTemplate(templatePath, context);

    // Check for exact expected structure
    const expected = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`;

    expect(result.trim()).toBe(expected);
  });

  it("should not contain any unresolved template variables", () => {
    const context = {
      prisma: {
        provider: "postgresql",
      },
    };

    const result = renderTemplate(templatePath, context);

    // Ensure no Handlebars variables are left in the output
    expect(result).not.toContain("{{");
    expect(result).not.toContain("}}");
    expect(result).not.toContain("#if");
    expect(result).not.toContain("#unless");
  });
});
