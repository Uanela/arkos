import {
  applyStrictRoutingRules,
  pathExists,
  validateRouterConfigConsistency,
} from "../dynamic-loader.helpers";
import { ArkosConfig, RouterConfig } from "../../../exports";

// Mock the dynamic-loader helpers
jest.mock("../../dynamic-loader", () => ({
  getModuleComponents: jest.fn(),
}));

describe("applyStrictRoutingRules", () => {
  const mockArkosConfig: ArkosConfig = {
    routers: {
      strict: false,
    },
  };

  describe("when strictMode is false", () => {
    it("should return the original config unchanged", () => {
      const config: RouterConfig<"auth"> = {
        disable: { getMe: true },
      };

      const result = applyStrictRoutingRules("auth", mockArkosConfig, config);

      expect(result).toEqual(config);
    });

    it("should return empty config when no moduleConfig provided", () => {
      const result = applyStrictRoutingRules("auth", mockArkosConfig);

      expect(result).toEqual({});
    });
  });

  describe("when strictMode is true", () => {
    const strictArkosConfig: ArkosConfig = {
      routers: {
        strict: true,
      },
    };

    describe("for auth module", () => {
      it("should disable all auth endpoints", () => {
        const result = applyStrictRoutingRules("auth", strictArkosConfig);

        expect(result.disable).toEqual({
          getMe: true,
          updateMe: true,
          deleteMe: true,
          login: true,
          logout: true,
          signup: true,
          updatePassword: true,
          findManyAuthAction: true,
        });
      });

      it("should preserve existing disable config and merge with strict rules", () => {
        const config: RouterConfig<"auth"> = {
          disable: { getMe: false },
        };

        const result = applyStrictRoutingRules(
          "auth",
          strictArkosConfig,
          config
        );

        expect(result.disable).toEqual({
          getMe: false, // preserved from original config
          updateMe: true,
          deleteMe: true,
          login: true,
          logout: true,
          signup: true,
          updatePassword: true,
          findManyAuthAction: true,
        });
      });

      it("should handle case insensitive module names", () => {
        const result = applyStrictRoutingRules("AUTH", strictArkosConfig);

        expect(result.disable).toMatchObject({
          getMe: true,
          login: true,
          signup: true,
        });
      });
    });

    describe("for file-upload module", () => {
      it("should disable all file-upload endpoints", () => {
        const result = applyStrictRoutingRules(
          "file-upload",
          strictArkosConfig
        );

        expect(result.disable).toEqual({
          findFile: true,
          uploadFile: true,
          updateFile: true,
          deleteFile: true,
        });
      });

      it("should preserve existing disable config and merge with strict rules", () => {
        const config: RouterConfig<"file-upload"> = {
          disable: { uploadFile: false },
        };

        const result = applyStrictRoutingRules(
          "file-upload",
          strictArkosConfig,
          config
        );

        expect(result.disable).toEqual({
          findFile: true,
          uploadFile: false, // preserved from original config
          updateFile: true,
          deleteFile: true,
        });
      });
    });

    describe("for prisma models", () => {
      it("should disable all CRUD endpoints", () => {
        const result = applyStrictRoutingRules("user", strictArkosConfig);

        expect(result.disable).toEqual({
          createOne: true,
          findOne: true,
          updateOne: true,
          deleteOne: true,
          createMany: true,
          findMany: true,
          updateMany: true,
          deleteMany: true,
        });
      });

      it("should preserve existing disable config and merge with strict rules", () => {
        const config: RouterConfig = {
          disable: { createOne: false },
        };

        const result = applyStrictRoutingRules(
          "user",
          strictArkosConfig,
          config
        );

        expect(result.disable).toEqual({
          createOne: false, // preserved from original config
          findOne: true,
          updateOne: true,
          deleteOne: true,
          createMany: true,
          findMany: true,
          updateMany: true,
          deleteMany: true,
        });
      });
    });

    it("should respect boolean disable config", () => {
      const config: RouterConfig<"auth"> = {
        disable: true,
      };

      const result = applyStrictRoutingRules("auth", strictArkosConfig, config);

      expect(result).toEqual({
        deleteMe: { disabled: true },
        disable: {
          deleteMe: true,
          findManyAuthAction: true,
          getMe: true,
          login: true,
          logout: true,
          signup: true,
          updateMe: true,
          updatePassword: true,
        },
        findManyAuthAction: { disabled: true },
        getMe: { disabled: true },
        login: { disabled: true },
        logout: { disabled: true },
        signup: { disabled: true },
        updateMe: { disabled: true },
        updatePassword: { disabled: true },
      });
    });
  });

  describe("when strictMode is no-bulk", () => {
    const noBulkArkosConfig: ArkosConfig = {
      routers: {
        strict: "no-bulk",
      },
    };

    it("should only apply to prisma models, not auth", () => {
      const result = applyStrictRoutingRules("auth", noBulkArkosConfig);

      expect(result).toEqual({});
    });

    it("should only apply to prisma models, not file-upload", () => {
      const result = applyStrictRoutingRules("file-upload", noBulkArkosConfig);

      expect(result).toEqual({});
    });

    it("should disable bulk operations for prisma models", () => {
      const result = applyStrictRoutingRules("user", noBulkArkosConfig);

      expect(result.disable).toEqual({
        createMany: true,
        updateMany: true,
        deleteMany: true,
      });
    });

    it("should preserve existing config for prisma models", () => {
      const config: RouterConfig = {
        disable: { findOne: true },
      };

      const result = applyStrictRoutingRules("user", noBulkArkosConfig, config);

      expect(result.disable).toEqual({
        findOne: true, // preserved
        createMany: true,
        updateMany: true,
        deleteMany: true,
      });
    });

    it("should respect boolean disable config for prisma models", () => {
      const config: RouterConfig = {
        disable: false,
      };

      const result = applyStrictRoutingRules("user", noBulkArkosConfig, config);

      expect(result).toEqual({
        createMany: { disabled: false },
        createOne: { disabled: false },
        deleteMany: { disabled: false },
        deleteOne: { disabled: false },
        disable: {
          createMany: false,
          createOne: false,
          deleteMany: false,
          deleteOne: false,
          findMany: false,
          findOne: false,
          updateMany: false,
          updateOne: false,
        },
        findMany: { disabled: false },
        updateMany: { disabled: false },
        findOne: { disabled: false },
        updateOne: { disabled: false },
      });
    });

    it("should respect no-bulk routing config for prisma models", () => {
      const config: RouterConfig = {
        updateOne: { disabled: true },
        disable: { findOne: false },
      };

      const result = applyStrictRoutingRules("user", noBulkArkosConfig, config);

      expect(result).toEqual({
        createMany: { disabled: true },
        deleteMany: { disabled: true },
        disable: {
          createMany: true,
          deleteMany: true,
          findOne: false,
          updateMany: true,
          updateOne: true,
        },
        findOne: { disabled: false },
        updateMany: { disabled: true },
        updateOne: { disabled: true },
      });
    });
  });

  describe("edge cases", () => {
    it("should handle undefined arkosConfig.routers", () => {
      const arkosConfig: ArkosConfig = {};

      const result = applyStrictRoutingRules("auth", arkosConfig);

      expect(result).toEqual({});
    });

    it("should handle undefined arkosConfig.routers.strict", () => {
      const arkosConfig: ArkosConfig = {
        routers: {},
      };

      const result = applyStrictRoutingRules("auth", arkosConfig);

      expect(result).toEqual({});
    });
  });
  describe("pathExists", () => {
    describe("when path exists", () => {
      it("should return true for existing file", async () => {
        const existingPath = "./package.json";

        const result = await pathExists(existingPath);

        expect(result).toBe(true);
      });

      it("should return true for existing directory", async () => {
        const existingPath = "./src";

        const result = await pathExists(existingPath);

        expect(result).toBe(true);
      });
    });

    describe("when path does not exist", () => {
      it("should return false for non-existing file", async () => {
        const nonExistingPath = "./non-existing-file.txt";

        const result = await pathExists(nonExistingPath);

        expect(result).toBe(false);
      });

      it("should return false for non-existing directory", async () => {
        const nonExistingPath = "./non-existing-directory";

        const result = await pathExists(nonExistingPath);

        expect(result).toBe(false);
      });

      it("should return false for invalid path", async () => {
        const invalidPath = "./invalid/deeply/nested/non-existing/path";

        const result = await pathExists(invalidPath);

        expect(result).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("should handle empty path", async () => {
        const emptyPath = "";

        const result = await pathExists(emptyPath);

        expect(result).toBe(false);
      });

      it("should handle relative paths", async () => {
        const relativePath = "../";

        const result = await pathExists(relativePath);

        expect(result).toBe(true);
      });
    });
  });

  describe("validateRouterConfigConsistency", () => {
    it("should not throw error when disable is undefined", () => {
      const config = {};
      expect(() => validateRouterConfigConsistency(config)).not.toThrow();
    });

    it("should not throw error when disable is boolean", () => {
      const config = { disable: true };
      expect(() => validateRouterConfigConsistency(config)).not.toThrow();
    });

    it("should not throw error when only old way is used", () => {
      const config = {
        disable: { findMany: true, createOne: false },
      };
      expect(() => validateRouterConfigConsistency(config)).not.toThrow();
    });

    it("should not throw error when only new way is used", () => {
      const config = {
        findMany: { disabled: true },
        createOne: { disabled: false },
      };
      expect(() => validateRouterConfigConsistency(config)).not.toThrow();
    });

    it("should not throw error when both ways have same value", () => {
      const config = {
        disable: { findMany: true, createOne: false },
        findMany: { disabled: true },
        createOne: { disabled: false },
      };
      expect(() => validateRouterConfigConsistency(config)).not.toThrow();
    });

    it("should not throw error when one value is undefined", () => {
      const config = {
        disable: { findMany: true },
        createOne: { disabled: false },
      };
      expect(() => validateRouterConfigConsistency(config)).not.toThrow();
    });

    it("should throw error when values conflict", () => {
      const config = {
        disable: { findMany: true },
        findMany: { disabled: false },
      };
      expect(() => validateRouterConfigConsistency(config)).toThrow(
        'Conflicting disabled values for endpoint "findMany": disable.findMany = true, but findMany.disabled = false'
      );
    });

    it("should throw error when multiple endpoints conflict", () => {
      const config = {
        disable: { findMany: true, createOne: false },
        findMany: { disabled: false },
        createOne: { disabled: false },
      };
      expect(() => validateRouterConfigConsistency(config)).toThrow(
        'Conflicting disabled values for endpoint "findMany"'
      );
    });

    it("should throw error with correct endpoint name in message", () => {
      const config = {
        disable: { updateOne: false },
        updateOne: { disabled: true },
      };
      expect(() => validateRouterConfigConsistency(config)).toThrow(
        "disable.updateOne = false, but updateOne.disabled = true"
      );
    });
  });
});
