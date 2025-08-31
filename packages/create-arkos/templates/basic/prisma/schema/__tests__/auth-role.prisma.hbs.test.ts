import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderTemplate } from "../../../../../src/utils/helpers/templates.helpers";

describe("AuthRole model template rendering", () => {
  const templatePath = "basic/prisma/schema/auth-role.prisma.hbs";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render AuthRole model with correct structure", () => {
    const context = {
      prisma: {
        provider: "postgresql",
        idDatabaseType: "@default(cuid())",
      },
    };

    const result = renderTemplate(templatePath, context);

    expect(result).toContain("model AuthRole {");
    expect(result).toContain("id          String");
    expect(result).toContain("name        String          @unique");
    expect(result).toContain("description String?");
    expect(result).toContain("permissions AuthPermission[]");
    expect(result).toContain("users       UserRole[]");
    expect(result).toContain("createdAt DateTime @default(now())");
    expect(result).toContain("updatedAt DateTime @updatedAt");
  });

  it("should handle different ID database types correctly", () => {
    // Test case 1: cuid() ID type
    const context1 = {
      prisma: {
        provider: "postgresql",
        idDatabaseType: "@default(cuid())",
      },
    };

    const result1 = renderTemplate(templatePath, context1);
    expect(result1).toContain("id          String          @default(cuid())");

    // Test case 2: uuid() ID type
    const context2 = {
      prisma: {
        provider: "postgresql",
        idDatabaseType: "@default(uuid())",
      },
    };

    const result2 = renderTemplate(templatePath, context2);
    expect(result2).toContain("id          String          @default(uuid())");

    // Test case 3: auto() ID type for MongoDB
    const context3 = {
      prisma: {
        provider: "mongodb",
        idDatabaseType: "@default(auto())",
      },
    };

    const result3 = renderTemplate(templatePath, context3);
    expect(result3).toContain("id          String          @default(auto())");
  });

  it("should render the same structure regardless of database provider", () => {
    const providers = ["postgresql", "mysql", "sqlite", "mongodb"];

    providers.forEach((provider) => {
      const context = {
        prisma: {
          provider,
          idDatabaseType: "@default(cuid())",
        },
      };

      const result = renderTemplate(templatePath, context);

      // AuthRole model structure should be the same for all providers
      expect(result).toContain("model AuthRole {");
      expect(result).toContain("name        String          @unique");
      expect(result).toContain("description String?");
      expect(result).toContain("permissions AuthPermission[]");
      expect(result).toContain("users       UserRole[]");
      expect(result).toContain("createdAt DateTime @default(now())");
      expect(result).toContain("updatedAt DateTime @updatedAt");
    });
  });

  it("should not contain any conditional logic based on provider", () => {
    const context = {
      prisma: {
        provider: "postgresql",
        idDatabaseType: "@default(cuid())",
      },
    };

    const result = renderTemplate(templatePath, context);

    // The template should not have any provider-specific conditional content
    // beyond the ID database type which is handled through the context
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{#unless");
    expect(result).not.toContain("{{else");
    expect(result).not.toContain("{{/if");
  });
});
