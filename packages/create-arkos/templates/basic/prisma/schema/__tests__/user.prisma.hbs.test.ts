import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderTemplate } from "../../../../../src/utils/helpers/templates.helpers";

describe("User model template rendering", () => {
  const templatePath = "basic/prisma/schema/user.prisma.hbs";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should read template from real path and render with different authentication types", () => {
    // Test case 1: Static authentication with SQLite
    const context1 = {
      authentication: {
        type: "static",
        usernameField: "email",
        multipleRoles: false,
      },
      prisma: {
        provider: "sqlite",
        idDatabaseType: "@default(cuid())",
      },
    };

    const result1 = renderTemplate(templatePath, context1);

    expect(result1).toContain("model User {");
    expect(result1).toContain("email  String   @unique");
    expect(result1).toContain(
      'role                String     @default("User")'
    );
    expect(result1).not.toContain("enum UserRole");

    // Test case 2: Dynamic authentication with PostgreSQL
    const context2 = {
      authentication: {
        type: "dynamic",
        usernameField: "username",
        multipleRoles: false,
      },
      prisma: {
        provider: "postgresql",
        idDatabaseType: "@default(uuid())",
      },
    };

    const result2 = renderTemplate(templatePath, context2);
    expect(result2).toContain("role                 UserRole?");
    expect(result2).not.toContain("enum UserRole");

    // Test case 3: Multiple roles with MySQL
    const context3 = {
      authentication: {
        type: "dynamic",
        usernameField: "email",
        multipleRoles: true,
      },
      prisma: {
        provider: "mysql",
        idDatabaseType: "@default(cuid())",
      },
    };

    const result3 = renderTemplate(templatePath, context3);
    expect(result3).toContain("roles                UserRole[]");
  });

  it('should handle "define later" authentication type', () => {
    const context = {
      authentication: {
        type: "define later",
        usernameField: "email",
      },
      prisma: {
        provider: "sqlite",
        idDatabaseType: "@default(cuid())",
      },
    };

    const result = renderTemplate(templatePath, context);
    expect(result.trim()).toBe("");
  });

  it("should handle static authentication with non-SQLite providers", () => {
    const context = {
      authentication: {
        type: "static",
        usernameField: "email",
      },
      prisma: {
        provider: "postgresql",
        idDatabaseType: "@default(uuid())",
      },
    };

    const result = renderTemplate(templatePath, context);
    expect(result).toContain("enum UserRole");
    expect(result).toContain("Admin");
    expect(result).toContain("User");
  });
});
