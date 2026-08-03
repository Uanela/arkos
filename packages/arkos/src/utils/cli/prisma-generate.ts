import prismaSchemaParser from "../prisma/prisma-schema-parser";
import { kebabCase } from "../helpers/change-case.helpers";
import fs from "fs";
import sheu from "../sheu";
import path from "path";
import { crd } from "../helpers/fs.helpers";
import { bundler } from "../bundler";

function getGeneratedPackageDir(): string {
  return path.resolve(process.cwd(), `.arkos`);
}

function getPrismaGeneratedPath() {
  return prismaSchemaParser.config.clientOutput ? path.resolve(path.join(crd(), prismaSchemaParser.config.clientOutput)) : "@prisma/client";
}

function buildTypesContent(): string {
  const modelEntries = prismaSchemaParser.models
    .map(
      (model) => `
  "${kebabCase(model.name)}": {
    Delegate: Prisma.${model.name}Delegate;
    GetPayload: Prisma.${model.name}GetPayload<T>;
    FindManyArgs: Prisma.${model.name}FindManyArgs;
    FindFirstArgs: Prisma.${model.name}FindFirstArgs;
    CreateArgs: Prisma.${model.name}CreateArgs;
    CreateManyArgs: Prisma.${model.name}CreateManyArgs;
    UpdateArgs: Prisma.${model.name}UpdateArgs;
    UpdateManyArgs: Prisma.${model.name}UpdateManyArgs;
    DeleteArgs: Prisma.${model.name}DeleteArgs;
    DeleteManyArgs: Prisma.${model.name}DeleteManyArgs;
    CountArgs: Prisma.${model.name}CountArgs;
  };`
    )
    .join("");

  return `
import { Prisma, PrismaClient } from "${getPrismaGeneratedPath()}";
import { ServiceBaseContext } from "arkos/services";
import { ArkosPrismaInput } from "arkos/prisma";

export interface PrismaField {
  name: string;
  type: string;
  isOptional: boolean;
  isArray: boolean;
  foreignKeyField?: string;
  foreignReferenceField?: string;
  isRelation: boolean;
  defaultValue?: any;
  isId?: boolean;
  isUnique?: boolean;
  attributes: string[];
}

export type PrismaModels<T extends Record<string, any>> = {${modelEntries}
};

export type ExtractPrismaFilters<T> = T extends { where?: infer W; [x: string]: any } ? W : any;
export type ExtractPrismaData<T> = T extends { data: infer D; [x: string]: any } ? D : any;
export type ExtractPrismaQueryOptions<T, K extends keyof T = never> = Omit<T, K>;

export { PrismaClient };
`;
}

function buildEsmContent(): string {
  return `
export { PrismaClient } from "${getPrismaGeneratedPath()}";
`;
}

/**
 * Adds/updates the `@arkosjs/generated` path alias in the project's
 * tsconfig.json, pointing it at the generated `.arkos/index.d.ts` file.
 * Reuses Bundler's tolerant JSONC parser so comments/trailing commas in
 * the user's tsconfig don't break parsing.
 */
function updateTsConfigPaths(): void {
  const tsconfigPath = path.join(crd(), "tsconfig.json");

  if (!fs.existsSync(tsconfigPath)) {
    sheu.warn(
      "tsconfig.json not found, skipping @arkosjs/generated path mapping.", { timestamp: true }
    );
    return;
  }

  let tsconfig: any;
  try {
    tsconfig = bundler.readJsonWithComments(tsconfigPath);
  } catch (err) {
    sheu.warn(
      `Failed to parse tsconfig.json, skipping @arkosjs/generated path mapping: ${(err as Error).message
      }`
    );
    return;
  }

  tsconfig.compilerOptions ??= {};
  tsconfig.compilerOptions.paths ??= {};

  const generatedDtsPath = "./.arkos/index.d.ts";
  const existing = tsconfig.compilerOptions.paths["@arkosjs/generated"];

  if (Array.isArray(existing) && existing.includes(generatedDtsPath))
    return;

  tsconfig.compilerOptions.paths["@arkosjs/generated"] = [generatedDtsPath];

  fs.writeFileSync(
    tsconfigPath,
    JSON.stringify(tsconfig, null, 2) + "\n",
    "utf8"
  );

  sheu.done(`@arkosjs/generated path mapping added to tsconfig.json!`);
}

function updateGitIgnore(): void {
  const gitignorePath = path.join(crd(), ".gitignore");

  if (!fs.existsSync(gitignorePath)) {
    sheu.warn(
      ".gitignore not found, skipping .arkos ignore entry.",
      { timestamp: true }
    );
    return;
  }

  const content = fs.readFileSync(gitignorePath, "utf8");
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim());

  if (lines.includes(".arkos")) return;

  const updated =
    content.replace(/\s*$/, "") + "\n.arkos\n";

  fs.writeFileSync(gitignorePath, updated, "utf8");

  sheu.done(".arkos added to .gitignore!");
}

export default function prismaGenerateCommand() {
  // TODO: is throwing because of memory do not yet why
  // workaround is generate apart
  // execSync("npx prisma generate", { stdio: "inherit" });
  const pkgDir = getGeneratedPackageDir();
  fs.mkdirSync(path.join(pkgDir, "esm"), { recursive: true });
  fs.writeFileSync(path.join(pkgDir, "index.d.ts"), buildTypesContent(), {
    encoding: "utf8",
  });
  fs.writeFileSync(path.join(pkgDir, "esm", "index.js"), buildEsmContent(), {
    encoding: "utf8",
  });
  updateTsConfigPaths();
  updateGitIgnore();
  sheu.done(
    `Types and values for arkos and prisma client generated successfully!`
  );
}
