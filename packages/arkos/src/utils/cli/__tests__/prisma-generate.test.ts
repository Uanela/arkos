import prismaGenerateCommand from "../prisma-generate";
import fs from "fs";
import { execSync } from "child_process";
import path from "path";
import prismaSchemaParser from "../../prisma/prisma-schema-parser";
import { kebabCase } from "../../helpers/change-case.helpers";
import sheu from "../../sheu";

jest.mock("../../prisma/prisma-schema-parser");
jest.mock("../../helpers/change-case.helpers");
jest.mock("fs");
jest.mock("child_process");
jest.mock("../../sheu");
jest.mock("path");

const GENERATED_PACKAGE_NAME = "@arkosjs/generated";
const MOCK_PKG_DIR = `/project/node_modules/${GENERATED_PACKAGE_NAME}`;

describe("prismaGenerateCommand", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (prismaSchemaParser.models as any) = [
      { name: "User" },
      { name: "Post" },
      { name: "Category" },
    ];

    (kebabCase as jest.Mock).mockImplementation((str) => str.toLowerCase());
    (path.resolve as jest.Mock).mockReturnValue(MOCK_PKG_DIR);
    (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));
    (sheu.done as jest.Mock) = jest.fn();
  });

  it("should run prisma generate and write all output files", () => {
    prismaGenerateCommand();

    expect(execSync).toHaveBeenCalledWith("npx prisma generate", {
      stdio: "inherit",
    });

    expect(path.resolve).toHaveBeenCalledWith(
      process.cwd(),
      `node_modules/${GENERATED_PACKAGE_NAME}`
    );

    expect(fs.mkdirSync).toHaveBeenCalledWith(`${MOCK_PKG_DIR}/cjs`, {
      recursive: true,
    });
    expect(fs.mkdirSync).toHaveBeenCalledWith(`${MOCK_PKG_DIR}/esm`, {
      recursive: true,
    });

    // index.d.ts, cjs/index.js, esm/index.js, package.json
    expect(fs.writeFileSync).toHaveBeenCalledTimes(4);

    expect(sheu.done).toHaveBeenCalledWith(
      `Types and values for ${GENERATED_PACKAGE_NAME} and @prisma/client generated successfully!`
    );
  });

  it("should write index.d.ts with correct path and encoding", () => {
    prismaGenerateCommand();

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      `${MOCK_PKG_DIR}/index.d.ts`,
      expect.any(String),
      { encoding: "utf8" }
    );
  });

  it("should write cjs/index.js with correct path and encoding", () => {
    prismaGenerateCommand();

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      `${MOCK_PKG_DIR}/cjs/index.js`,
      expect.any(String),
      { encoding: "utf8" }
    );
  });

  it("should write esm/index.js with correct path and encoding", () => {
    prismaGenerateCommand();

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      `${MOCK_PKG_DIR}/esm/index.js`,
      expect.any(String),
      { encoding: "utf8" }
    );
  });

  it("should write package.json with correct path and encoding", () => {
    prismaGenerateCommand();

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      `${MOCK_PKG_DIR}/package.json`,
      expect.any(String),
      { encoding: "utf8" }
    );
  });

  it("should generate correct type definitions for models", () => {
    prismaGenerateCommand();

    const dtsCall = (fs.writeFileSync as jest.Mock).mock.calls.find((c) =>
      c[0].endsWith("index.d.ts")
    );
    const content = dtsCall[1];

    expect(content).toContain(
      "export type PrismaModels<T extends Record<string, any>> = {"
    );
    expect(content).toContain('"user": {');
    expect(content).toContain('"post": {');
    expect(content).toContain('"category": {');
    expect(content).toContain("Delegate: Prisma.UserDelegate;");
    expect(content).toContain("GetPayload: Prisma.UserGetPayload<T>;");
    expect(content).toContain("FindManyArgs: Prisma.UserFindManyArgs;");
  });

  it("should include all Prisma operation types for each model", () => {
    prismaGenerateCommand();

    const dtsCall = (fs.writeFileSync as jest.Mock).mock.calls.find((c) =>
      c[0].endsWith("index.d.ts")
    );
    const content = dtsCall[1];

    const expectedOperations = [
      "Delegate",
      "GetPayload",
      "FindManyArgs",
      "FindFirstArgs",
      "CreateArgs",
      "CreateManyArgs",
      "UpdateArgs",
      "UpdateManyArgs",
      "DeleteArgs",
      "DeleteManyArgs",
      "CountArgs",
    ];

    expectedOperations.forEach((op) => {
      expect(content).toContain(`${op}: Prisma.User${op}`);
    });
  });

  it("should include utility types in index.d.ts", () => {
    prismaGenerateCommand();

    const dtsCall = (fs.writeFileSync as jest.Mock).mock.calls.find((c) =>
      c[0].endsWith("index.d.ts")
    );
    const content = dtsCall[1];

    expect(content).toContain(
      "export type ExtractPrismaFilters<T> = T extends { where?: infer W; [x: string]: any } ? W : any;"
    );
    expect(content).toContain(
      "export type ExtractPrismaData<T> = T extends { data: infer D; [x: string]: any } ? D : any;"
    );
    expect(content).toContain(
      "export type ExtractPrismaQueryOptions<T, K extends keyof T = never> = Omit<T, K>;"
    );
    expect(content).toContain("export { PrismaClient };");
  });

  it("should include PrismaField interface in index.d.ts", () => {
    prismaGenerateCommand();

    const dtsCall = (fs.writeFileSync as jest.Mock).mock.calls.find((c) =>
      c[0].endsWith("index.d.ts")
    );
    const content = dtsCall[1];

    expect(content).toContain("export interface PrismaField {");
    expect(content).toContain("name: string;");
    expect(content).toContain("type: string;");
    expect(content).toContain("isRelation: boolean;");
  });

  it("should generate valid CJS content", () => {
    prismaGenerateCommand();

    const cjsCall = (fs.writeFileSync as jest.Mock).mock.calls.find((c) =>
      c[0].endsWith("cjs/index.js")
    );
    const content = cjsCall[1];

    expect(content).toContain('"use strict"');
    expect(content).toContain("exports.PrismaClient");
    expect(content).toContain('require("@prisma/client")');
  });

  it("should generate valid ESM content", () => {
    prismaGenerateCommand();

    const esmCall = (fs.writeFileSync as jest.Mock).mock.calls.find((c) =>
      c[0].endsWith("esm/index.js")
    );
    const content = esmCall[1];

    expect(content).toContain('export { PrismaClient } from "@prisma/client"');
  });

  it("should generate valid package.json with correct exports", () => {
    prismaGenerateCommand();

    const pkgCall = (fs.writeFileSync as jest.Mock).mock.calls.find((c) =>
      c[0].endsWith("package.json")
    );
    const parsed = JSON.parse(pkgCall[1]);

    expect(parsed.name).toBe(GENERATED_PACKAGE_NAME);
    expect(parsed.types).toBe("./index.d.ts");
    expect(parsed.main).toBe("./cjs/index.js");
    expect(parsed.module).toBe("./esm/index.js");
    expect(parsed.exports["."].require).toBe("./cjs/index.js");
    expect(parsed.exports["."].import).toBe("./esm/index.js");
    expect(parsed.exports["."].types).toBe("./index.d.ts");
  });

  it("should handle kebab case conversion for model names", () => {
    (kebabCase as jest.Mock).mockImplementation((str) =>
      str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
    );

    prismaGenerateCommand();

    expect(kebabCase).toHaveBeenCalledWith("User");
    expect(kebabCase).toHaveBeenCalledWith("Post");
    expect(kebabCase).toHaveBeenCalledWith("Category");
  });

  it("should handle empty models array", () => {
    (prismaSchemaParser.models as any) = [];

    prismaGenerateCommand();

    const dtsCall = (fs.writeFileSync as jest.Mock).mock.calls.find((c) =>
      c[0].endsWith("index.d.ts")
    );
    const content = dtsCall[1];

    expect(content).toContain(
      "export type PrismaModels<T extends Record<string, any>> = {"
    );
    expect(content).not.toContain('"user": {');
  });

  it("should handle single model", () => {
    (prismaSchemaParser.models as any) = [{ name: "User" }];

    prismaGenerateCommand();

    const dtsCall = (fs.writeFileSync as jest.Mock).mock.calls.find((c) =>
      c[0].endsWith("index.d.ts")
    );
    const content = dtsCall[1];

    expect(content).toContain('"user": {');
    expect(content).not.toContain('"post": {');
  });
});
