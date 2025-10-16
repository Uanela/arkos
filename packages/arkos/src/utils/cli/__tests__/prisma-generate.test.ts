import prismaGenerateCommand from "../prisma-generate";
import prismaSchemaParser from "../../prisma/prisma-schema-parser";
import { kebabCase } from "../../helpers/change-case.helpers";
import fs from "fs";
import { execSync } from "child_process";
import sheu from "../../sheu";
import path from "path";

// Mock dependencies
jest.mock("../../prisma/prisma-schema-parser");
jest.mock("../../helpers/change-case.helpers");
jest.mock("fs");
jest.mock("child_process");
jest.mock("../../sheu");
jest.mock("path");

describe("prismaGenerateCommand", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (prismaSchemaParser.models as any) = [
      { name: "User" },
      { name: "Post" },
      { name: "Category" },
    ];

    (kebabCase as jest.Mock).mockImplementation((str) => str.toLowerCase());
    (path.resolve as jest.Mock).mockReturnValue(
      "/project/types/modules/base/base.service.d.ts"
    );
    (sheu.done as jest.Mock) = jest.fn();
  });

  it("should generate prisma types and write base service file", () => {
    prismaGenerateCommand();

    expect(execSync).toHaveBeenCalledWith("npx prisma generate", {
      stdio: "inherit",
    });
    expect(path.resolve).toHaveBeenCalledWith(
      __dirname.replace("/__tests__", ""),
      "../../../types/modules/base/base.service.d.ts"
    );
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(sheu.done).toHaveBeenCalledWith(
      "Types for @prisma/client and base service generated successfully!"
    );
  });

  it("should generate correct type definitions for models", () => {
    prismaGenerateCommand();

    const writeFileCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const fileContent = writeFileCall[1];

    expect(fileContent).toContain(
      "export declare type ModelsGetPayload<T extends Record<string, any>> = {"
    );
    expect(fileContent).toContain('"user": {');
    expect(fileContent).toContain('"post": {');
    expect(fileContent).toContain('"category": {');
    expect(fileContent).toContain("Delegate: Prisma.UserDelegate");
    expect(fileContent).toContain("GetPayload: Prisma.UserGetPayload<T>");
    expect(fileContent).toContain("FindManyArgs: Prisma.UserFindManyArgs");
  });

  it("should handle kebab case conversion for model names", () => {
    (kebabCase as jest.Mock).mockImplementation(
      (str) => `kebab-${str.toLowerCase()}`
    );

    prismaGenerateCommand();

    const writeFileCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const fileContent = writeFileCall[1];

    expect(fileContent).toContain('"kebab-user": {');
    expect(fileContent).toContain('"kebab-post": {');
    expect(kebabCase).toHaveBeenCalledWith("User");
    expect(kebabCase).toHaveBeenCalledWith("Post");
    expect(kebabCase).toHaveBeenCalledWith("Category");
  });

  it("should generate all BaseService method signatures", () => {
    prismaGenerateCommand();

    const writeFileCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const fileContent = writeFileCall[1];

    expect(fileContent).toContain(
      "createOne<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['CreateArgs'], 'data'>>"
    );
    expect(fileContent).toContain(
      "createMany<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['CreateManyArgs'], 'data'>>"
    );
    expect(fileContent).toContain(
      "count<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['CountArgs'], 'where'>>"
    );
    expect(fileContent).toContain(
      "findMany<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['FindManyArgs'], 'where'>>"
    );
    expect(fileContent).toContain(
      "findById<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['FindFirstArgs'], 'where'>>"
    );
    expect(fileContent).toContain(
      "findOne<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['FindFirstArgs'], 'where'>>"
    );
    expect(fileContent).toContain(
      "updateOne<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['UpdateArgs'], 'where' | 'data'>>"
    );
    expect(fileContent).toContain(
      "updateMany<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['UpdateManyArgs'], 'where' | 'data'>>"
    );
    expect(fileContent).toContain(
      "deleteOne<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['DeleteArgs'], 'where'>>"
    );
    expect(fileContent).toContain(
      "deleteMany<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['DeleteManyArgs'], 'where'>>"
    );
  });

  it("should include utility types in generated file", () => {
    prismaGenerateCommand();

    const writeFileCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const fileContent = writeFileCall[1];

    expect(fileContent).toContain(
      "export type ExtractFilters<T> = T extends { where?: infer W; [x: string]: any } ? W : any;"
    );
    expect(fileContent).toContain(
      "export type ExtractQueryOptions<T, K extends keyof T = never> = Omit<T, K>;"
    );
    expect(fileContent).toContain(
      "export type ExtractData<T> = T extends { data: infer D; [x: string]: any } ? D : any;"
    );
  });

  it("should write file with correct encoding and path", () => {
    prismaGenerateCommand();

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/project/types/modules/base/base.service.d.ts",
      expect.any(String),
      { encoding: "utf8" }
    );
  });

  it("should handle empty models array", () => {
    (prismaSchemaParser.models as any) = [];

    prismaGenerateCommand();

    const writeFileCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const fileContent = writeFileCall[1];

    expect(fileContent).toContain(
      "export declare type ModelsGetPayload<T extends Record<string, any>> = {"
    );
    expect(fileContent).not.toContain('"user": {');
  });

  it("should handle single model", () => {
    (prismaSchemaParser.models as any) = [{ name: "User" }];

    prismaGenerateCommand();

    const writeFileCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const fileContent = writeFileCall[1];

    expect(fileContent).toContain('"user": {');
    expect(fileContent).not.toContain('"post": {');
  });

  it("should handle models with special characters in names", () => {
    (prismaSchemaParser.models as any) = [
      { name: "UserProfile" },
      { name: "OrderItem" },
    ];

    (kebabCase as jest.Mock).mockImplementation((str) =>
      str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
    );

    prismaGenerateCommand();

    const writeFileCall = (fs.writeFileSync as jest.Mock).mock.calls[0];

    expect(kebabCase).toHaveBeenCalledWith("UserProfile");
    expect(kebabCase).toHaveBeenCalledWith("OrderItem");
  });

  it("should include all Prisma operation types for each model", () => {
    prismaGenerateCommand();

    const writeFileCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const fileContent = writeFileCall[1];

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

    expectedOperations.forEach((operation) => {
      expect(fileContent).toContain(`${operation}: Prisma.User${operation}`);
    });
  });

  it("should generate proper BaseService class structure", () => {
    prismaGenerateCommand();

    const writeFileCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const fileContent = writeFileCall[1];

    expect(fileContent).toContain("export declare class BaseService<");
    expect(fileContent).toContain(
      "TModelName extends keyof ModelsGetPayload<any>"
    );
    expect(fileContent).toContain("modelName: TModelName");
    expect(fileContent).toContain("relationFields: ModelGroupRelationFields");
    expect(fileContent).toContain("prisma: any");
    expect(fileContent).toContain("constructor(modelName: TModelName)");
  });
});
