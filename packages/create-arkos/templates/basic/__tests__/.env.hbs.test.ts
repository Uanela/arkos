import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderTemplate } from "../../../src/utils/helpers/templates.helpers";

describe("Environment variables template rendering", () => {
  const templatePath = "basic/.env.hbs";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the environment variables with the correct database URL", () => {
    const databaseProviders = [
      {
        provider: "postgresql",
        defaultDBurl: "postgresql://user:password@localhost:5432/mydb",
      },
      {
        provider: "mysql",
        defaultDBurl: "mysql://user:password@localhost:3306/mydb",
      },
      { provider: "sqlite", defaultDBurl: "file:./dev.db" },
      { provider: "mongodb", defaultDBurl: "mongodb://localhost:27017/mydb" },
    ];

    databaseProviders.forEach(({ provider, defaultDBurl }) => {
      const context = {
        prisma: {
          provider,
          defaultDBurl,
        },
      };

      const result = renderTemplate(templatePath, context);

      expect(result).toContain("# Database connection");
      expect(result).toContain(`DATABASE_URL=${defaultDBurl}`);
      expect(result).toContain("# JWT secrets");
      expect(result).toContain("JWT_SECRET=your-jwt-secret");
      expect(result).toContain("JWT_EXPIRES_IN=90d");
      expect(result).toContain("# Server configuration");
      expect(result).toContain("PORT=8000");
    });
  });

  it("should handle different database URL formats correctly", () => {
    const testCases = [
      {
        provider: "postgresql",
        defaultDBurl: "postgresql://user:password@localhost:5432/mydb",
        expected: "DATABASE_URL=postgresql://user:password@localhost:5432/mydb",
      },
      {
        provider: "sqlite",
        defaultDBurl: "file:./dev.db",
        expected: "DATABASE_URL=file:./dev.db",
      },
      {
        provider: "mysql",
        defaultDBurl: "mysql://user:password@localhost:3306/mydb?schema=public",
        expected:
          "DATABASE_URL=mysql://user:password@localhost:3306/mydb?schema",
      },
    ];

    testCases.forEach(({ provider, defaultDBurl, expected }) => {
      const context = {
        prisma: {
          provider,
          defaultDBurl,
        },
      };

      const result = renderTemplate(templatePath, context);
      expect(result).toContain(expected);
    });
  });

  it("should render the complete template structure with all sections", () => {
    const context = {
      prisma: {
        provider: "postgresql",
        defaultDBurl: "postgresql://user:password@localhost:5432/mydb",
      },
    };

    const result = renderTemplate(templatePath, context);

    // Check that all sections are present in the correct order
    const lines = result.trim().split("\n");

    expect(lines[0]).toBe("# Database connection");
    expect(lines[1]).toBe(
      "DATABASE_URL=postgresql://user:password@localhost:5432/mydb"
    );
    expect(lines[2]).toBe("");
    expect(lines[3]).toBe("# JWT secrets");
    expect(lines[4]).toBe("JWT_SECRET=your-jwt-secret");
    expect(lines[5]).toBe("JWT_EXPIRES_IN=90d");
    expect(lines[6]).toBe("");
    expect(lines[7]).toBe("# Server configuration");
    expect(lines[8]).toBe("PORT=8000");
  });

  it("should not contain any unresolved template variables", () => {
    const context = {
      prisma: {
        provider: "postgresql",
        defaultDBurl: "postgresql://user:password@localhost:5432/mydb",
      },
    };

    const result = renderTemplate(templatePath, context);

    // Ensure no Handlebars variables are left in the output
    expect(result).not.toContain("{{");
    expect(result).not.toContain("}}");
    expect(result).not.toContain("prisma.defaultDBurl");
  });

  it("should handle missing context values gracefully", () => {
    // Test with incomplete context
    const context = {
      prisma: {
        // Missing defaultDBurl
      },
    };

    const result = renderTemplate(templatePath, context);

    // Should still render the template structure
    expect(result).toContain("# Database connection");
    expect(result).toContain("DATABASE_URL="); // Empty value
    expect(result).toContain("# JWT secrets");
    expect(result).toContain("JWT_SECRET=your-jwt-secret");
    expect(result).toContain("# Server configuration");
    expect(result).toContain("PORT=8000");
  });
});
