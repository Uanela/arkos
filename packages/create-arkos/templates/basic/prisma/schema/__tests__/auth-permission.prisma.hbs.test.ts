import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderTemplate } from "../../../../../src/utils/helpers/templates.helpers";

describe("AuthPermission model template rendering", () => {
  const templatePath = "basic/prisma/schema/auth-permission.prisma.hbs";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render AuthPermission model with enum action for non-SQLite providers", () => {
    // Test case 1: PostgreSQL provider
    const context1 = {
      prisma: {
        provider: "postgresql",
        idDatabaseType: "@default(cuid())",
      },
    };

    const result1 = renderTemplate(templatePath, context1);

    expect(result1).toContain("enum AuthPermissionAction {");
    expect(result1).toContain("View");
    expect(result1).toContain("Create");
    expect(result1).toContain("Update");
    expect(result1).toContain("Delete");
    expect(result1).toContain("action    AuthPermissionAction @default(View)");
    expect(result1).toContain("model AuthPermission {");
    expect(result1).toContain("@@unique([resource, action, roleId])");

    // Test case 2: MySQL provider
    const context2 = {
      prisma: {
        provider: "mysql",
        idDatabaseType: "@default(cuid())",
      },
    };

    const result2 = renderTemplate(templatePath, context2);
    expect(result2).toContain("enum AuthPermissionAction {");
    expect(result2).toContain("action    AuthPermissionAction @default(View)");
  });

  it("should render AuthPermission model with String action for SQLite provider", () => {
    const context = {
      prisma: {
        provider: "sqlite",
        idDatabaseType: "@default(cuid())",
      },
    };

    const result = renderTemplate(templatePath, context);

    expect(result).not.toContain("enum AuthPermissionAction {");
    expect(result).toContain('action    String   @default("View")');
    expect(result).toContain("model AuthPermission {");
    expect(result).toContain("@@unique([resource, action, roleId])");
  });

  it("should include MongoDB ObjectId annotation for roleId when using mongodb provider", () => {
    const context = {
      prisma: {
        provider: "mongodb",
        idDatabaseType: "@default(auto())",
      },
    };

    const result = renderTemplate(templatePath, context);

    expect(result).toContain("enum AuthPermissionAction {");
    expect(result).toContain("roleId    String    @db.ObjectId");
    expect(result).toContain("action    AuthPermissionAction @default(View)");
  });

  it("should not include MongoDB ObjectId annotation for roleId when using non-mongodb providers", () => {
    const context = {
      prisma: {
        provider: "postgresql",
        idDatabaseType: "@default(cuid())",
      },
    };

    const result = renderTemplate(templatePath, context);

    expect(result).toContain("enum AuthPermissionAction {");
    expect(result).toContain("roleId    String");
    expect(result).not.toContain("@db.ObjectId");
  });

  it("should handle different ID database types correctly", () => {
    const context = {
      prisma: {
        provider: "postgresql",
        idDatabaseType: "@default(uuid())",
      },
    };

    const result = renderTemplate(templatePath, context);

    expect(result).toContain("id        String   @default(uuid())");
    expect(result).toContain("enum AuthPermissionAction {");
  });

  it("should render the complete AuthPermission model structure", () => {
    const context = {
      prisma: {
        provider: "postgresql",
        idDatabaseType: "@default(cuid())",
      },
    };

    const result = renderTemplate(templatePath, context);

    // Check for all model fields
    expect(result).toContain("id        String");
    expect(result).toContain("resource  String");
    expect(result).toContain("action    AuthPermissionAction @default(View)");
    expect(result).toContain("roleId    String");
    expect(result).toContain(
      "role      AuthRole  @relation(fields: [roleId], references: [id])"
    );
    expect(result).toContain("createdAt DateTime  @default(now())");
    expect(result).toContain("updatedAt DateTime  @updatedAt");
    expect(result).toContain("@@unique([resource, action, roleId])");
  });
});
