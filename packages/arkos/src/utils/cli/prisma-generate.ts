import prismaSchemaParser from "../prisma/prisma-schema-parser";
import { kebabCase } from "../helpers/change-case.helpers";
import fs from "fs";
import { execSync } from "child_process";
import sheu from "../sheu";
import path from "path";
import { crd } from "../helpers/fs.helpers";

function getGeneratedPackageDir(): string {
  return path.resolve(process.cwd(), `.arkos`);
}

function getPrismaGeneratedPath() {
  return prismaSchemaParser.config.clientOutput ? path.resolve(path.join(crd(), prismaSchemaParser.config.clientOutput)) : "@prisma/client"
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

export default function prismaGenerateCommand() {
  execSync("npx prisma generate", { stdio: "inherit" });

  const pkgDir = getGeneratedPackageDir();

  fs.mkdirSync(path.join(pkgDir, "esm"), { recursive: true });

  fs.writeFileSync(path.join(pkgDir, "index.d.ts"), buildTypesContent(), {
    encoding: "utf8",
  });

  fs.writeFileSync(path.join(pkgDir, "esm", "index.js"), buildEsmContent(), {
    encoding: "utf8",
  });

  sheu.done(
    `Types and values for arkos and prisma client generated successfully!`
  );
}

