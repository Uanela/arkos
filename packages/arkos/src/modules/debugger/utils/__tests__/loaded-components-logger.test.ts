import util from "util";
import loadedComponentsLogger from "../loaded-components-logger";
import { ModuleComponents } from "../../../../utils/dynamic-loader";
import sheu from "../../../../utils/sheu";

// Mock dependencies
jest.mock("../../../../utils/helpers/fs.helpers", () => ({
  getUserFileExtension: jest.fn(() => "ts"),
}));

jest.mock("../../../../utils/sheu", () => ({
  bold: jest.fn((text: any) => `**${text}**`),
}));

jest.mock("util", () => ({
  inspect: jest.fn((obj) => JSON.stringify(obj)),
}));

describe("LoadedComponentsLogger", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("ext property", () => {
    it("should initialize ext property with file extension", () => {
      expect(loadedComponentsLogger.ext).toBe("ts");
    });
  });

  describe("componentsToPath mapping", () => {
    it("should have correct path mappings for all components", () => {
      const { componentsToPath } = loadedComponentsLogger as any;

      expect(componentsToPath.authConfigs).toBe("{{module-name}}.auth.ts");
      expect(componentsToPath.prismaQueryOptions).toBe(
        "{{module-name}}.query.ts"
      );
      expect(componentsToPath.interceptors).toBe(
        "{{module-name}}.interceptors.ts"
      );
      expect(componentsToPath.interceptorsOld).toBe(
        "{{module-name}}.middlewares.ts"
      );
      expect(componentsToPath.router).toBe("{{module-name}}.router.ts");
      expect(componentsToPath.hooks).toBe("{{module-name}}.hooks.ts");
      expect(componentsToPath.dtos!.create).toBe(
        "create-{{module-name}}.dto.ts"
      );
      expect(componentsToPath.dtos!.update).toBe(
        "update-{{module-name}}.dto.ts"
      );
      expect(componentsToPath.schemas!.create).toBe(
        "create-{{module-name}}.schema.ts"
      );
      expect(componentsToPath.schemas!.update).toBe(
        "update-{{module-name}}.schema.ts"
      );
    });
  });

  describe("getComponentsNameList", () => {
    const moduleName = "user";

    it("should return empty array when no components are provided", () => {
      const components = {} as ModuleComponents;
      const result = loadedComponentsLogger.getComponentsNameList(
        moduleName,
        components
      );

      expect(result).toEqual([]);
    });

    it("should return file names for simple string components", () => {
      const components: any = {
        authConfigs: "auth data",
        router: "router data",
        hooks: "hooks data",
      };

      const result = loadedComponentsLogger.getComponentsNameList(
        moduleName,
        components
      );

      expect(result).toContain("user.auth.ts");
      expect(result).toContain("user.router.ts");
      expect(result).toContain("user.hooks.ts");
      expect(result).toHaveLength(3);
    });

    it("should handle dtos with create only", () => {
      const components: ModuleComponents = {
        dtos: {
          create: "create dto",
          update: undefined,
        },
      } as any;

      const result = loadedComponentsLogger.getComponentsNameList(
        moduleName,
        components
      );

      expect(result).toContain("create-user.dto.ts");
      expect(result).not.toContain("update-user.dto.ts");
      expect(result).toHaveLength(1);
    });

    it("should handle dtos with update only", () => {
      const components: ModuleComponents = {
        dtos: {
          create: undefined,
          update: "update dto",
        },
      } as any;

      const result = loadedComponentsLogger.getComponentsNameList(
        moduleName,
        components
      );

      expect(result).not.toContain("create-user.dto.ts");
      expect(result).toContain("update-user.dto.ts");
      expect(result).toHaveLength(1);
    });

    it("should handle dtos with both create and update", () => {
      const components: ModuleComponents = {
        dtos: {
          create: "create dto",
          update: "update dto",
        },
      } as any;

      const result = loadedComponentsLogger.getComponentsNameList(
        moduleName,
        components
      );

      expect(result).toContain("create-user.dto.ts");
      expect(result).toContain("update-user.dto.ts");
      expect(result).toHaveLength(2);
    });

    it("should handle schemas with create only", () => {
      const components: ModuleComponents = {
        schemas: {
          create: "create schema",
          update: undefined,
        },
      } as any;

      const result = loadedComponentsLogger.getComponentsNameList(
        moduleName,
        components
      );

      expect(result).toContain("create-user.schema.ts");
      expect(result).not.toContain("update-user.schema.ts");
      expect(result).toHaveLength(1);
    });

    it("should handle all component types together", () => {
      const components: ModuleComponents = {
        authConfigs: "auth data",
        router: "router data",
        dtos: {
          create: "create dto",
          update: "update dto",
        },
        schemas: {
          create: "create schema",
          update: undefined,
        },
      } as any;

      const result = loadedComponentsLogger.getComponentsNameList(
        moduleName,
        components
      );

      expect(result).toContain("user.auth.ts");
      expect(result).toContain("user.router.ts");
      expect(result).toContain("create-user.dto.ts");
      expect(result).toContain("update-user.dto.ts");
      expect(result).toContain("create-user.schema.ts");
      expect(result).toHaveLength(5);
    });
  });

  describe("getLogText", () => {
    it("should return log text with all components present", () => {
      const components: ModuleComponents = {
        authConfigs: { strategy: "jwt" },
        prismaQueryOptions: { where: { active: true } },
        router: { routes: ["GET", "POST"] },
        interceptors: ["interceptor1", "interceptor2"],
        hooks: { beforeCreate: "validate" },
      } as any;

      const result = loadedComponentsLogger.getLogText(components);

      expect(sheu.bold).toHaveBeenCalledWith("AuthConfigs:");
      expect(sheu.bold).toHaveBeenCalledWith("PrismaQueryOptions:");
      expect(sheu.bold).toHaveBeenCalledWith("Router:");
      expect(sheu.bold).toHaveBeenCalledWith("Interceptors:");
      expect(sheu.bold).toHaveBeenCalledWith("Hooks:");

      expect(util.inspect).toHaveBeenCalledWith(components.authConfigs, {
        depth: null,
        colors: true,
      });
      expect(util.inspect).toHaveBeenCalledWith(components.prismaQueryOptions, {
        depth: null,
        colors: true,
      });
      expect(util.inspect).toHaveBeenCalledWith(components.router, {
        depth: null,
        colors: true,
      });
      expect(util.inspect).toHaveBeenCalledWith(components.interceptors, {
        depth: null,
        colors: true,
      });
      expect(util.inspect).toHaveBeenCalledWith(components.hooks, {
        depth: null,
        colors: true,
      });

      expect(result).toContain("**AuthConfigs:**");
      expect(result).toContain("**PrismaQueryOptions:**");
      expect(result).toContain("**Router:**");
      expect(result).toContain("**Interceptors:**");
      expect(result).toContain("**Hooks:**");
    });

    it("should return log text with dashes for missing components", () => {
      const components: ModuleComponents = {
        authConfigs: undefined,
        prismaQueryOptions: undefined,
        router: undefined,
        interceptors: undefined,
        hooks: undefined,
      } as any;

      const result = loadedComponentsLogger.getLogText(components);

      expect(result).toContain("**AuthConfigs:** -");
      expect(result).toContain("**PrismaQueryOptions:** -");
      expect(result).toContain("**Router:** -");
      expect(result).toContain("**Interceptors:** -");
      expect(result).toContain("**Hooks:** -");

      expect(util.inspect).not.toHaveBeenCalled();
    });

    it("should handle mixed present and missing components", () => {
      const components: ModuleComponents = {
        authConfigs: { strategy: "jwt" },
        prismaQueryOptions: undefined,
        router: { routes: ["GET", "POST"] },
        interceptors: undefined,
        hooks: { beforeCreate: "validate" },
      } as any;

      const result = loadedComponentsLogger.getLogText(components);

      expect(result).toContain("**AuthConfigs:**");
      expect(result).toContain("**PrismaQueryOptions:** -");
      expect(result).toContain("**Router:**");
      expect(result).toContain("**Interceptors:** -");
      expect(result).toContain("**Hooks:**");

      expect(util.inspect).toHaveBeenCalledWith(components.authConfigs, {
        depth: null,
        colors: true,
      });
      expect(util.inspect).toHaveBeenCalledWith(components.router, {
        depth: null,
        colors: true,
      });
      expect(util.inspect).toHaveBeenCalledWith(components.hooks, {
        depth: null,
        colors: true,
      });
      expect(util.inspect).toHaveBeenCalledTimes(3);
    });
  });
});
