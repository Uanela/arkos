import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import handlebars from "handlebars";

const BASIC_TEMPLATES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function registerHelpers() {
  handlebars.registerHelper("eq", (a: any, b: any) => a === b);
  handlebars.registerHelper("neq", (a: any, b: any) => a !== b);
  handlebars.registerHelper("or", (...args: any[]) => {
    const conditions = args.slice(0, -1);
    return conditions.some((a) => !!a);
  });
}

function render(relativeTemplatePath: string, context: Record<string, any>) {
  const fullPath = path.join(BASIC_TEMPLATES_DIR, relativeTemplatePath);
  return handlebars.compile(fs.readFileSync(fullPath, "utf8"))(context);
}

const PROVIDERS = [
  "none",
  "postgresql",
  "mysql",
  "sqlite",
  "sqlserver",
  "cockroachdb",
  "mongodb",
];

describe("package.json.hbs template", () => {
  beforeAll(registerHelpers);

  const baseContext = (provider: string, validationType?: string) => ({
    projectName: "test-project",
    typescript: true,
    prisma: { provider, idDatabaseType: "@id @default(uuid())" },
    ...(validationType ? { validation: { type: validationType } } : {}),
  });

  it.each(PROVIDERS)(
    "should render valid JSON for provider %s with no validation",
    (provider) => {
      const output = render("package.json.hbs", baseContext(provider));
      expect(() => JSON.parse(output)).not.toThrow();
    }
  );

  it.each(
    PROVIDERS.flatMap((provider) =>
      ["zod", "class-validator", "hybrid"].map((validation) => [
        provider,
        validation,
      ])
    )
  )(
    "should render valid JSON for provider %s with %s validation",
    (provider, validation) => {
      const output = render(
        "package.json.hbs",
        baseContext(provider as string, validation as string)
      );
      expect(() => JSON.parse(output)).not.toThrow();
    }
  );

  it("should use Prisma 6 and skip driver adapters for mongodb", () => {
    const pkg = JSON.parse(
      render("package.json.hbs", baseContext("mongodb", "zod"))
    );

    expect(pkg.dependencies["@prisma/client"]).toBe("6.19.3");
    expect(pkg.devDependencies.prisma).toBe("6.19.3");
    expect(pkg.dependencies["@prisma/adapter-pg"]).toBeUndefined();
    expect(pkg.dependencies["@prisma/adapter-mariadb"]).toBeUndefined();
    expect(pkg.dependencies["@prisma/adapter-better-sqlite3"]).toBeUndefined();
    expect(pkg.dependencies["@prisma/adapter-mssql"]).toBeUndefined();
  });

  it("should use Prisma 7 with the matching adapter for relational providers", () => {
    const postgres = JSON.parse(
      render("package.json.hbs", baseContext("postgresql", "zod"))
    );
    expect(postgres.dependencies["@prisma/client"]).toBe("7.9.1");
    expect(postgres.devDependencies.prisma).toBe("7.9.1");
    expect(postgres.dependencies["@prisma/adapter-pg"]).toBe("7.9.1");

    const mysql = JSON.parse(render("package.json.hbs", baseContext("mysql")));
    expect(mysql.dependencies["@prisma/adapter-mariadb"]).toBe("7.9.1");
  });

  it("should render valid JSON for provider=mongodb validation=none and relational validation=none", () => {
    const mongodb = render("package.json.hbs", baseContext("mongodb"));
    const postgres = render("package.json.hbs", baseContext("postgresql"));

    expect(JSON.parse(mongodb).dependencies["@prisma/client"]).toBe("6.19.3");
    expect(JSON.parse(postgres).dependencies["@prisma/adapter-pg"]).toBe(
      "7.9.1"
    );
  });
});

describe("schema.prisma.hbs template", () => {
  beforeAll(registerHelpers);

  it.each(PROVIDERS.filter((p) => p !== "none"))(
    "should scaffold the prisma-client generator with generated output for %s",
    (provider) => {
      const output = render("prisma/schema/schema.prisma.hbs", {
        prisma: { provider },
      });

      expect(output).toContain('provider = "prisma-client"');
      expect(output).toContain('output   = "../../src/generated/prisma"');
      expect(output).toContain(`provider = "${provider}"`);
    }
  );
});

describe("src/utils/prisma/index.ts.hbs template", () => {
  beforeAll(registerHelpers);

  it("should use the generated client without an adapter for mongodb", () => {
    const output = render("src/utils/prisma/index.ts.hbs", {
      typescript: true,
      prisma: { provider: "mongodb" },
    });

    expect(output).toContain("@/src/generated/prisma/client");
    expect(output).toContain("new PrismaClient()");
    expect(output).not.toContain("@prisma/adapter");
  });

  it("should use the generated Prisma client with an adapter for postgresql", () => {
    const output = render("src/utils/prisma/index.ts.hbs", {
      typescript: true,
      prisma: { provider: "postgresql" },
    });

    expect(output).toContain("@/src/generated/prisma/client");
    expect(output).toContain("@prisma/adapter-pg");
    expect(output).toContain("new PrismaClient({ adapter })");
  });
});
