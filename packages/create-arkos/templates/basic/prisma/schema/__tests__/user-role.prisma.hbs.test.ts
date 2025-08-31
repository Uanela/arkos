import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderTemplate } from "../../../../../src/utils/helpers/templates.helpers";

describe("UserRole model template rendering", () => {
  const templatePath = "basic/prisma/schema/user-role.prisma.hbs";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render anything for non-dynamic authentication types", () => {
    // Test case 1: Static authentication
    const context1 = {
      authentication: {
        type: "static",
        multipleRoles: true,
      },
      prisma: {
        provider: "postgresql",
        idDatabaseType: "@default(cuid())",
      },
    };

    const result1 = renderTemplate(templatePath, context1);
    expect(result1.trim()).toBe("");

    // Test case 2: Define later authentication
    const context2 = {
      authentication: {
        type: "define later",
        multipleRoles: false,
      },
      prisma: {
        provider: "sqlite",
        idDatabaseType: "@default(cuid())",
      },
    };

    const result2 = renderTemplate(templatePath, context2);
    expect(result2.trim()).toBe("");
  });

  it("should render UserRole model for dynamic authentication with single role", () => {
    const context = {
      authentication: {
        type: "dynamic",
        multipleRoles: false,
      },
      prisma: {
        provider: "postgresql",
        idDatabaseType: "@default(cuid())",
      },
    };

    const result = renderTemplate(templatePath, context);

    expect(result).toContain("model UserRole {");
    expect(result).toContain("userId    String     @unique");
    expect(result).toContain(
      "user      User       @relation(fields: [userId], references: [id])"
    );
    expect(result).toContain("roleId    String");
    expect(result).toContain(
      "role      AuthRole   @relation(fields: [roleId], references: [id])"
    );
    expect(result).toContain("createdAt DateTime   @default(now())");
    expect(result).toContain("updatedAt DateTime   @updatedAt");
    expect(result).not.toContain("@@unique([userId, roleId])");
  });

  it("should render UserRole model for dynamic authentication with multiple roles", () => {
    const context = {
      authentication: {
        type: "dynamic",
        multipleRoles: true,
      },
      prisma: {
        provider: "postgresql",
        idDatabaseType: "@default(cuid())",
      },
    };

    const result = renderTemplate(templatePath, context);

    expect(result).toContain("model UserRole {");
    expect(result).toContain("userId    String");
    expect(result).not.toContain("userId    String     @unique");
    expect(result).toContain(
      "user      User       @relation(fields: [userId], references: [id])"
    );
    expect(result).toContain("roleId    String");
    expect(result).toContain(
      "role      AuthRole   @relation(fields: [roleId], references: [id])"
    );
    expect(result).toContain("createdAt DateTime   @default(now())");
    expect(result).toContain("updatedAt DateTime   @updatedAt");
    expect(result).toContain("@@unique([userId, roleId])");
  });

  it("should include MongoDB ObjectId annotation for roleId when using mongodb provider", () => {
    const context = {
      authentication: {
        type: "dynamic",
        multipleRoles: true,
      },
      prisma: {
        provider: "mongodb",
        idDatabaseType: "@default(auto())",
      },
    };

    const result = renderTemplate(templatePath, context);

    expect(result).toContain("roleId    String     @db.ObjectId");
    expect(result).toContain(
      "role      AuthRole   @relation(fields: [roleId], references: [id])"
    );
  });

  it("should not include MongoDB ObjectId annotation for non-mongodb providers", () => {
    const context = {
      authentication: {
        type: "dynamic",
        multipleRoles: false,
      },
      prisma: {
        provider: "postgresql",
        idDatabaseType: "@default(cuid())",
      },
    };

    const result = renderTemplate(templatePath, context);

    expect(result).toContain("roleId    String");
    expect(result).not.toContain("@db.ObjectId");
    expect(result).toContain(
      "role      AuthRole   @relation(fields: [roleId], references: [id])"
    );
  });

  it("should handle different ID database types correctly", () => {
    const context = {
      authentication: {
        type: "dynamic",
        multipleRoles: false,
      },
      prisma: {
        provider: "postgresql",
        idDatabaseType: "@default(uuid())",
      },
    };

    const result = renderTemplate(templatePath, context);

    expect(result).toContain("id        String     @default(uuid())");
    expect(result).toContain("userId    String     @unique");
  });
});
