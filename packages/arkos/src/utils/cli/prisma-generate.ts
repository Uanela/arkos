import prismaSchemaParser from "../prisma/prisma-schema-parser";
import { kebabCase } from "../helpers/change-case.helpers";
import fs from "fs";
import { execSync } from "child_process";
import sheu from "../sheu";
import path from "path";

const GENERATED_PACKAGE_NAME = "@arkosjs/generated";

function getGeneratedPackageDir(): string {
  return path.resolve(process.cwd(), `node_modules/${GENERATED_PACKAGE_NAME}`);
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
import { Prisma, PrismaClient } from "@prisma/client";
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

function buildCjsContent(): string {
  return `
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaClient = void 0;
const client_1 = require("@prisma/client");
exports.PrismaClient = client_1.PrismaClient;
`;
}

function buildEsmContent(): string {
  return `
export { PrismaClient } from "@prisma/client";
`;
}

function buildPackageJson(): string {
  return JSON.stringify(
    {
      name: GENERATED_PACKAGE_NAME,
      version: "1.0.0",
      types: "./index.d.ts",
      main: "./cjs/index.js",
      module: "./esm/index.js",
      exports: {
        ".": {
          require: "./cjs/index.js",
          import: "./esm/index.js",
          types: "./index.d.ts",
        },
      },
    },
    null,
    2
  );
}

export default function prismaGenerateCommand() {
  execSync("npx prisma generate", { stdio: "inherit" });

  const pkgDir = getGeneratedPackageDir();

  fs.mkdirSync(path.join(pkgDir, "cjs"), { recursive: true });
  fs.mkdirSync(path.join(pkgDir, "esm"), { recursive: true });

  fs.writeFileSync(path.join(pkgDir, "index.d.ts"), buildTypesContent(), {
    encoding: "utf8",
  });

  fs.writeFileSync(path.join(pkgDir, "cjs", "index.js"), buildCjsContent(), {
    encoding: "utf8",
  });

  fs.writeFileSync(path.join(pkgDir, "esm", "index.js"), buildEsmContent(), {
    encoding: "utf8",
  });

  fs.writeFileSync(path.join(pkgDir, "package.json"), buildPackageJson(), {
    encoding: "utf8",
  });

  sheu.done(
    `Types and values for ${GENERATED_PACKAGE_NAME} and @prisma/client generated successfully!`
  );
}
