import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import handlebars from "handlebars";
import templateCompiler from "../template-compiler";
import { ProjectConfig } from "../project-config-inquirer";

vi.mock("fs");
vi.mock("handlebars");

const mockFs = vi.mocked(fs);
const mockHandlebars = vi.mocked(handlebars);

describe("TemplateCompiler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("canCompileAuthenticationTemplates", () => {
    it("should return true when authentication is defined", async () => {
      const config: ProjectConfig = {
        authentication: { type: "static" },
      } as ProjectConfig;

      const result =
        await templateCompiler.canCompileAuthenticationTemplates(config);
      expect(result).toBe(true);
    });

    it("should return false when authentication is undefined", async () => {
      const config: ProjectConfig = {} as ProjectConfig;

      const result =
        await templateCompiler.canCompileAuthenticationTemplates(config);
      expect(result).toBe(false);
    });

    it("should return false when authentication is null", async () => {
      const config: ProjectConfig = {
        authentication: null,
      } as any;

      const result =
        await templateCompiler.canCompileAuthenticationTemplates(config);
      expect(result).toBe(false);
    });
  });

  describe("filesToBeSkipped", () => {
    it('should skip all auth files when authentication type is "define later"', () => {
      const config: ProjectConfig = {
        authentication: { type: "define later" },
        validation: { type: "zod" },
        typescript: true,
      } as ProjectConfig;

      const skippedFiles = templateCompiler.filesToBeSkipped(config);

      expect(skippedFiles).toContain("user.prisma.hbs");
      expect(skippedFiles).toContain("auth-permission.prisma.hbs");
      expect(skippedFiles).toContain("auth-role.prisma.hbs");
      expect(skippedFiles).toContain("user-role.prisma.hbs");
      expect(skippedFiles).toContain("login.schema.ts.hbs");
      expect(skippedFiles).toContain("auth.interceptors.ts.hbs");
      expect(skippedFiles).toContain("user.service.ts.hbs");
    });

    it('should skip dynamic auth files when authentication type is "static"', () => {
      const config: ProjectConfig = {
        authentication: { type: "static" },
        validation: { type: "zod" },
        typescript: true,
      } as ProjectConfig;

      const skippedFiles = templateCompiler.filesToBeSkipped(config);

      expect(skippedFiles).toContain("auth-permission.prisma.hbs");
      expect(skippedFiles).toContain("auth-role.prisma.hbs");
      expect(skippedFiles).toContain("user-role.prisma.hbs");
      expect(skippedFiles).toContain("create-auth-permission.schema.ts.hbs");
      expect(skippedFiles).toContain("auth-permission.service.ts.hbs");
      expect(skippedFiles).not.toContain("user.prisma.hbs");
      expect(skippedFiles).not.toContain("login.schema.ts.hbs");
    });

    it('should skip zod files when validation type is not "zod"', () => {
      const config: ProjectConfig = {
        authentication: { type: "static" },
        validation: { type: "class-validator" },
        typescript: true,
      } as ProjectConfig;

      const skippedFiles = templateCompiler.filesToBeSkipped(config);

      expect(skippedFiles).toContain("login.schema.ts.hbs");
      expect(skippedFiles).toContain("create-auth-permission.schema.ts.hbs");
      expect(skippedFiles).toContain("create-user.schema.ts.hbs");
      expect(skippedFiles).not.toContain("login.dto.ts.hbs");
    });

    it('should skip class-validator files when validation type is not "class-validator"', () => {
      const config: ProjectConfig = {
        authentication: { type: "static" },
        validation: { type: "zod" },
        typescript: true,
      } as ProjectConfig;

      const skippedFiles = templateCompiler.filesToBeSkipped(config);

      expect(skippedFiles).toContain("login.dto.ts.hbs");
      expect(skippedFiles).toContain("create-auth-permission.dto.ts.hbs");
      expect(skippedFiles).toContain("create-user.dto.ts.hbs");
      expect(skippedFiles).not.toContain("login.schema.ts.hbs");
    });

    it("should skip tsconfig when typescript is false", () => {
      const config: ProjectConfig = {
        authentication: { type: "static" },
        validation: { type: "zod" },
        typescript: false,
      } as ProjectConfig;

      const skippedFiles = templateCompiler.filesToBeSkipped(config);

      expect(skippedFiles).toContain("tsconfig.json.hbs");
      expect(skippedFiles).not.toContain("jsconfig.json.hbs");
    });

    it("should skip jsconfig when typescript is true", () => {
      const config: ProjectConfig = {
        authentication: { type: "static" },
        validation: { type: "zod" },
        typescript: true,
      } as ProjectConfig;

      const skippedFiles = templateCompiler.filesToBeSkipped(config);

      expect(skippedFiles).toContain("jsconfig.json.hbs");
      expect(skippedFiles).not.toContain("tsconfig.json.hbs");
    });
  });

  describe("compile", () => {
    const mockTemplate = vi.fn();

    beforeEach(() => {
      mockTemplate.mockReturnValue("compiled content");
      mockHandlebars.compile.mockReturnValue(mockTemplate);

      (mockFs as any).readdirSync = vi.fn();
      mockFs.readFileSync = vi.fn().mockReturnValue("template content");
      mockFs.mkdirSync = vi.fn();
      mockFs.writeFileSync = vi.fn();
    });

    it("should compile templates in directory structure", async () => {
      const config: ProjectConfig = {
        projectPath: "/output",
        typescript: true,
        authentication: { type: "static" },
        validation: { type: "zod" },
      } as ProjectConfig;

      mockFs.readdirSync.mockReturnValueOnce([
        { name: "template.ts.hbs", isDirectory: () => false },
        { name: "subdir", isDirectory: () => true },
      ] as any);

      mockFs.readdirSync.mockReturnValueOnce([
        { name: "nested.ts.hbs", isDirectory: () => false },
      ] as any);

      mockFs.readFileSync.mockReturnValue("template content");

      await templateCompiler.compile("/templates", config);

      expect(mockFs.readdirSync).toHaveBeenCalledWith("/templates", {
        withFileTypes: true,
      });
      expect(mockHandlebars.compile).toHaveBeenCalledWith("template content");
      expect(mockTemplate).toHaveBeenCalledWith({
        ...config,
        arkosCurrentVersion: "{{arkosCurrentVersion}}",
      });
    });

    it("should skip files listed in filesToBeSkipped", async () => {
      const config: ProjectConfig = {
        projectPath: "/output",
        typescript: true,
        authentication: { type: "define later" },
        validation: { type: "zod" },
      } as ProjectConfig;

      mockFs.readdirSync.mockReturnValueOnce([
        { name: "user.prisma.hbs", isDirectory: () => false },
        { name: "allowed.ts.hbs", isDirectory: () => false },
      ] as any);

      mockFs.readFileSync.mockReturnValue("template content");

      await templateCompiler.compile("/templates", config);

      expect(mockHandlebars.compile).toHaveBeenCalledTimes(1);
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
    });

    it("should handle typescript file extensions correctly", async () => {
      const config: ProjectConfig = {
        projectPath: "/output",
        typescript: true,
        authentication: { type: "static" },
        validation: { type: "zod" },
      } as ProjectConfig;

      mockFs.readdirSync.mockReturnValueOnce([
        { name: "component.ts.hbs", isDirectory: () => false },
      ] as any);

      mockFs.readFileSync.mockReturnValue("template content");

      await templateCompiler.compile("/templates", config);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        "/output/component.ts",
        "compiled content"
      );
    });

    it("should handle javascript file extensions correctly", async () => {
      const config: ProjectConfig = {
        projectPath: "/output",
        typescript: false,
        authentication: { type: "static" },
        validation: { type: "zod" },
      } as ProjectConfig;

      mockFs.readdirSync.mockReturnValueOnce([
        { name: "component.ts.hbs", isDirectory: () => false },
      ] as any);

      mockFs.readFileSync.mockReturnValue("template content");

      await templateCompiler.compile("/templates", config);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        "/output/component.js",
        "compiled content"
      );
    });

    it("should handle non-typescript templates correctly", async () => {
      const config: ProjectConfig = {
        projectPath: "/output",
        typescript: true,
        authentication: { type: "static" },
        validation: { type: "zod" },
      } as ProjectConfig;

      mockFs.readdirSync.mockReturnValueOnce([
        { name: "config.json.hbs", isDirectory: () => false },
      ] as any);

      mockFs.readFileSync.mockReturnValue("template content");

      await templateCompiler.compile("/templates", config);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        "/output/config.json",
        "compiled content"
      );
    });

    it("should create output directories recursively", async () => {
      const config: ProjectConfig = {
        projectPath: "/output",
        typescript: true,
        authentication: { type: "static" },
        validation: { type: "zod" },
      } as ProjectConfig;

      mockFs.readdirSync.mockReturnValueOnce([
        { name: "subdir", isDirectory: () => true },
      ] as any);

      mockFs.readdirSync.mockReturnValueOnce([
        { name: "nested.ts.hbs", isDirectory: () => false },
      ] as any);

      mockFs.readFileSync.mockReturnValue("template content");

      await templateCompiler.compile("/templates", config);

      expect(mockFs.mkdirSync).toHaveBeenCalledWith("/output/subdir", {
        recursive: true,
      });
    });

    it("should process nested directory structures", async () => {
      const config: ProjectConfig = {
        projectPath: "/output",
        typescript: true,
        authentication: { type: "static" },
        validation: { type: "zod" },
      } as ProjectConfig;

      mockFs.readdirSync
        .mockReturnValueOnce([
          { name: "level1", isDirectory: () => true },
        ] as any)
        .mockReturnValueOnce([
          { name: "level2", isDirectory: () => true },
        ] as any)
        .mockReturnValueOnce([
          { name: "deep.ts.hbs", isDirectory: () => false },
        ] as any);

      mockFs.readFileSync.mockReturnValue("deep template");

      await templateCompiler.compile("/templates", config);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        "/output/level1/level2/deep.ts",
        "compiled content"
      );
    });

    it("should pass correct context to handlebars templates", async () => {
      const config: ProjectConfig = {
        projectPath: "/output",
        typescript: true,
        authentication: { type: "dynamic" },
        validation: { type: "zod" },
        projectName: "test-project",
      } as ProjectConfig;

      mockFs.readdirSync.mockReturnValueOnce([
        { name: "test.ts.hbs", isDirectory: () => false },
      ] as any);

      mockFs.readFileSync.mockReturnValue("{{projectName}}");

      await templateCompiler.compile("/templates", config);

      expect(mockTemplate).toHaveBeenCalledWith({
        ...config,
        arkosCurrentVersion: "{{arkosCurrentVersion}}",
      });
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete zod + typescript + static auth scenario", () => {
      const config: ProjectConfig = {
        projectPath: "/output",
        typescript: true,
        authentication: { type: "static" },
        validation: { type: "zod" },
      } as ProjectConfig;

      const skippedFiles = templateCompiler.filesToBeSkipped(config);

      expect(skippedFiles).toContain("auth-permission.prisma.hbs");
      expect(skippedFiles).toContain("create-auth-permission.dto.ts.hbs");
      expect(skippedFiles).toContain("jsconfig.json.hbs");
      expect(skippedFiles).not.toContain("login.schema.ts.hbs");
      expect(skippedFiles).not.toContain("tsconfig.json.hbs");
    });

    it("should handle complete class-validator + javascript + define later auth scenario", () => {
      const config: ProjectConfig = {
        projectPath: "/output",
        typescript: false,
        authentication: { type: "define later" },
        validation: { type: "class-validator" },
      } as ProjectConfig;

      const skippedFiles = templateCompiler.filesToBeSkipped(config);

      expect(skippedFiles).toContain("user.prisma.hbs");
      expect(skippedFiles).toContain("login.schema.ts.hbs");
      expect(skippedFiles).toContain("login.dto.ts.hbs");
      expect(skippedFiles).toContain("tsconfig.json.hbs");
      expect(skippedFiles).not.toContain("jsconfig.json.hbs");
    });

    it("should handle dynamic authentication with all features enabled", () => {
      const config: ProjectConfig = {
        projectPath: "/output",
        typescript: true,
        authentication: { type: "dynamic" },
        validation: { type: "zod" },
      } as ProjectConfig;

      const skippedFiles = templateCompiler.filesToBeSkipped(config);

      expect(skippedFiles).toContain("login.dto.ts.hbs");
      expect(skippedFiles).toContain("jsconfig.json.hbs");
      expect(skippedFiles).not.toContain("auth-permission.prisma.hbs");
      expect(skippedFiles).not.toContain("login.schema.ts.hbs");
      expect(skippedFiles).not.toContain("tsconfig.json.hbs");
    });
  });

  describe("edge cases", () => {
    it("should handle empty authentication object", () => {
      const config: ProjectConfig = {
        authentication: {} as any,
        validation: { type: "zod" },
        typescript: true,
      } as ProjectConfig;

      const skippedFiles = templateCompiler.filesToBeSkipped(config);
      expect(Array.isArray(skippedFiles)).toBe(true);
    });

    it("should handle missing validation config", () => {
      const config: ProjectConfig = {
        authentication: { type: "static" },
        typescript: true,
      } as ProjectConfig;

      const skippedFiles = templateCompiler.filesToBeSkipped(config);

      expect(skippedFiles).toContain("login.schema.ts.hbs");
      expect(skippedFiles).toContain("login.dto.ts.hbs");
    });

    it("should handle undefined typescript config", () => {
      const config: ProjectConfig = {
        authentication: { type: "static" },
        validation: { type: "zod" },
      } as ProjectConfig;

      const skippedFiles = templateCompiler.filesToBeSkipped(config);

      expect(skippedFiles).toContain("tsconfig.json.hbs");
      expect(skippedFiles).not.toContain("jsconfig.json.hbs");
    });
  });
});
