import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderTemplate } from "../../../../../src/utils/helpers/templates.helpers";

describe("Schema Prisma template rendering", () => {
  const templatePath = "basic/prisma/schema/schema.prisma.hbs";
  const providers = [
    "postgresql",
    "mysql",
    "sqlite",
    "sqlserver",
    "cockroachdb",
    "mongodb",
  ];

  const render = (provider: string) =>
    renderTemplate(templatePath, { prisma: { provider } });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the prisma-client generator with generated output", () => {
    providers.forEach((provider) => {
      const result = render(provider);

      expect(result).toContain("generator client {");
      expect(result).toContain('provider = "prisma-client"');
      expect(result).toContain('output   = "../../src/generated/prisma"');
    });
  });

  it("should render the datasource with the correct provider", () => {
    providers.forEach((provider) => {
      const result = render(provider);

      expect(result).toContain("datasource db {");
      expect(result).toContain(`provider = "${provider}"`);
    });
  });

  it("should add the datasource url to the schema for mongodb (prisma 6 fallback)", () => {
    const result = render("mongodb");

    expect(result).toContain('url      = env("DATABASE_URL")');
  });

  it("should not add the datasource url for relational providers", () => {
    providers
      .filter((provider) => provider !== "mongodb")
      .forEach((provider) => {
        const result = render(provider);

        expect(result).not.toContain('url      = env("DATABASE_URL")');
      });
  });

  it("should render the complete structure for mongodb", () => {
    const result = render("mongodb");

    expect(result.trim()).toBe(`generator client {
  provider = "prisma-client"
  output   = "../../src/generated/prisma"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}`);
  });

  it("should render the complete structure for a relational provider", () => {
    const result = render("postgresql");

    expect(result.trim()).toBe(`generator client {
  provider = "prisma-client"
  output   = "../../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}`);
  });

  it("should not contain any unresolved template variables", () => {
    providers.forEach((provider) => {
      const result = render(provider);

      expect(result).not.toContain("{{");
      expect(result).not.toContain("}}");
      expect(result).not.toContain("#if");
      expect(result).not.toContain("#unless");
    });
  });
});
