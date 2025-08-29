import { applyStrictRoutingRules, pathExists } from "../dynamic-loader.helpers";
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

      expect(result.disable).toBe(true);
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
        disable: true,
      };

      const result = applyStrictRoutingRules("user", noBulkArkosConfig, config);

      expect(result.disable).toBe(true);
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
      it("should return null for non-existing file", async () => {
        const nonExistingPath = "./non-existing-file.txt";

        const result = await pathExists(nonExistingPath);

        expect(result).toBeNull();
      });

      it("should return null for non-existing directory", async () => {
        const nonExistingPath = "./non-existing-directory";

        const result = await pathExists(nonExistingPath);

        expect(result).toBeNull();
      });

      it("should return null for invalid path", async () => {
        const invalidPath = "./invalid/deeply/nested/non-existing/path";

        const result = await pathExists(invalidPath);

        expect(result).toBeNull();
      });
    });

    describe("edge cases", () => {
      it("should handle empty path", async () => {
        const emptyPath = "";

        const result = await pathExists(emptyPath);

        expect(result).toBeNull();
      });

      it("should handle relative paths", async () => {
        const relativePath = "../";

        const result = await pathExists(relativePath);

        expect(result).toBe(true);
      });
    });
  });
});
