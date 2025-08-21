import { OpenAPIV3 } from "openapi-types";
import generatePrismaModelParentRoutePaths from "../generate-prisma-model-parent-routes-paths";
import { ArkosConfig } from "../../../../../../../exports";
import * as modelsHelpers from "../../../../../../../utils/helpers/models.helpers";

jest.mock("../../../swagger.router.helpers", () => ({
  getSchemaRef: jest.fn(
    (schema: string, _: string) => `#/components/schemas/${schema}`
  ),
  kebabToHuman: jest.fn((str: string) =>
    str.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  ),
}));

jest.mock("../../../../../../../utils/helpers/models.helpers", () => ({
  importModuleComponents: jest.fn(),
  localValidatorFileExists: jest.fn(),
}));

describe("generatePrismaModelParentRoutesPaths", () => {
  let paths: OpenAPIV3.PathsObject;
  let arkosConfig: ArkosConfig;
  const mockimportModuleComponents =
    modelsHelpers.importModuleComponents as jest.MockedFunction<
      typeof modelsHelpers.importModuleComponents
    >;
  const mockLocalValidatorFileExists =
    modelsHelpers.localValidatorFileExists as jest.MockedFunction<
      typeof modelsHelpers.localValidatorFileExists
    >;

  beforeEach(() => {
    paths = {};
    arkosConfig = {
      swagger: {
        mode: "prisma",
        strict: false,
      },
    };
    jest.clearAllMocks();
  });

  describe("Edge Case: Router completely disabled", () => {
    it("should return early when router is completely disabled", async () => {
      mockimportModuleComponents.mockResolvedValue({
        router: {
          config: {
            disable: true,
          },
        },
      });

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(paths).toEqual({});
    });
  });

  describe("Edge Case: No parent configuration", () => {
    it("should return early when no parent config is provided", async () => {
      mockimportModuleComponents.mockResolvedValue({
        router: {
          config: {
            disable: false,
            // No parent config
          },
        },
      });

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(paths).toEqual({});
    });

    it("should return early when parent config is null", async () => {
      mockimportModuleComponents.mockResolvedValue({
        router: {
          config: {
            disable: false,
            parent: null,
          },
        },
      });

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(paths).toEqual({});
    });
  });

  describe("Edge Case: No model modules", () => {
    it("should return early when importModuleComponents returns null", async () => {
      mockimportModuleComponents.mockResolvedValue({});

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(paths).toEqual({});
    });

    it("should return early when router config is undefined", async () => {
      mockimportModuleComponents.mockResolvedValue({
        // No router property
      });

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(paths).toEqual({});
    });
  });

  describe("Edge Case: Different endpoint configurations", () => {
    const baseRouterConfig = {
      disable: false,
      parent: {
        model: "Post",
        endpoints: "*" as const,
      },
    };

    beforeEach(() => {
      mockLocalValidatorFileExists.mockResolvedValue(false);
    });

    it("should generate all endpoints when endpoints is '*'", async () => {
      mockimportModuleComponents.mockResolvedValue({
        router: {
          config: baseRouterConfig,
        },
      });

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      // Should have all 7 endpoint combinations
      expect(Object.keys(paths)).toHaveLength(3);
      expect(paths["/api/posts/{id}/comments"]).toBeDefined();
      expect(paths["/api/posts/{id}/comments/many"]).toBeDefined();
      expect(paths["/api/posts/{id}/comments/{childId}"]).toBeDefined();
    });

    it("should generate all endpoints when endpoints is undefined", async () => {
      mockimportModuleComponents.mockResolvedValue({
        router: {
          config: {
            disable: false,
            parent: {
              model: "Post",
              // endpoints is undefined
            },
          },
        },
      });

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(Object.keys(paths)).toHaveLength(3);
    });

    it("should generate only specified endpoints when endpoints is an array", async () => {
      mockimportModuleComponents.mockResolvedValue({
        router: {
          config: {
            disable: false,
            parent: {
              model: "Post",
              endpoints: ["createOne", "findMany"],
            },
          },
        },
      });

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(Object.keys(paths)).toHaveLength(1);
      expect(paths["/api/posts/{id}/comments"]).toBeDefined();
      expect(paths["/api/posts/{id}/comments"]?.post).toBeDefined();
      expect(paths["/api/posts/{id}/comments"]?.get).toBeDefined();
      expect(paths["/api/posts/{id}/comments/many"]).toBeUndefined();
      expect(paths["/api/posts/{id}/comments/{childId}"]).toBeUndefined();
    });

    it("should generate no endpoints when endpoints is an empty array", async () => {
      mockimportModuleComponents.mockResolvedValue({
        router: {
          config: {
            disable: false,
            parent: {
              model: "Post",
              endpoints: [],
            },
          },
        },
      });

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(paths).toEqual({});
    });
  });

  describe("Edge Case: Schema mode determination", () => {
    const baseRouterConfig = {
      disable: false,
      parent: {
        model: "Post",
        endpoints: ["createOne"] as const,
      },
    };

    it("should use swagger mode when strict is true", async () => {
      arkosConfig.swagger!.strict = true;
      arkosConfig.swagger!.mode = "zod";

      mockimportModuleComponents.mockResolvedValue({
        router: {
          config: baseRouterConfig,
        },
      });

      mockLocalValidatorFileExists.mockResolvedValue(true);

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(mockLocalValidatorFileExists).not.toHaveBeenCalled();
      expect(
        (paths["/api/posts/{id}/comments"]?.post?.requestBody as any)?.content[
          "application/json"
        ]?.schema?.$ref
      ).toBe("#/components/schemas/CreateComment");
    });

    it("should fallback to prisma when local file doesn't exist", async () => {
      arkosConfig.swagger!.strict = false;

      mockimportModuleComponents.mockResolvedValue({
        router: {
          config: baseRouterConfig,
        },
      });

      mockLocalValidatorFileExists.mockResolvedValue(false);

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(mockLocalValidatorFileExists).toHaveBeenCalledWith(
        "create",
        "Comment",
        arkosConfig
      );
    });

    it("should use swagger mode when local file exists and not strict", async () => {
      arkosConfig.swagger!.strict = false;
      arkosConfig.swagger!.mode = "class-validator";

      mockimportModuleComponents.mockResolvedValue({
        router: {
          config: baseRouterConfig,
        },
      });

      mockLocalValidatorFileExists.mockResolvedValue(true);

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(mockLocalValidatorFileExists).toHaveBeenCalledWith(
        "create",
        "Comment",
        arkosConfig
      );
    });
  });

  describe("Edge Case: Path object initialization", () => {
    const baseRouterConfig = {
      disable: false,
      parent: {
        model: "Post",
        endpoints: ["findMany", "updateMany", "deleteMany"] as const,
      },
    };

    it("should initialize path objects when they don't exist", async () => {
      mockimportModuleComponents.mockResolvedValue({
        router: {
          config: baseRouterConfig,
        },
      });

      mockLocalValidatorFileExists.mockResolvedValue(false);

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(paths["/api/posts/{id}/comments"]).toBeDefined();
      expect(paths["/api/posts/{id}/comments"]?.get).toBeDefined();
      expect(paths["/api/posts/{id}/comments/many"]).toBeDefined();
      expect(paths["/api/posts/{id}/comments/many"]?.patch).toBeDefined();
      expect(paths["/api/posts/{id}/comments/many"]?.delete).toBeDefined();
    });
  });

  describe("Edge Case: Complex model names", () => {
    it("should handle complex model names with multiple words", async () => {
      mockimportModuleComponents.mockResolvedValue({
        router: {
          config: {
            disable: false,
            parent: {
              model: "BlogPost",
              endpoints: ["createOne"],
            },
          },
        },
      });

      mockLocalValidatorFileExists.mockResolvedValue(false);

      await generatePrismaModelParentRoutePaths(
        "UserComment",
        paths,
        arkosConfig
      );

      expect(paths["/api/blog-posts/{id}/user-comments"]).toBeDefined();
      expect(
        paths["/api/blog-posts/{id}/user-comments"]?.post?.operationId
      ).toBe("createUserCommentForBlogPost");
    });

    it("should handle single character model names", async () => {
      mockimportModuleComponents.mockResolvedValue({
        router: {
          config: {
            disable: false,
            parent: {
              model: "A",
              endpoints: ["createOne"],
            },
          },
        },
      });

      mockLocalValidatorFileExists.mockResolvedValue(false);

      await generatePrismaModelParentRoutePaths("B", paths, arkosConfig);

      expect(paths["/api/as/{id}/bs"]).toBeDefined();
    });
  });

  describe("Edge Case: Missing swagger configuration", () => {
    it("should handle missing swagger config gracefully", async () => {
      const arkosConfigWithoutSwagger: ArkosConfig = {};

      mockimportModuleComponents.mockResolvedValue({
        router: {
          config: {
            disable: false,
            parent: {
              model: "Post",
              endpoints: ["createOne"],
            },
          },
        },
      });

      mockLocalValidatorFileExists.mockResolvedValue(false);

      await generatePrismaModelParentRoutePaths(
        "Comment",
        paths,
        arkosConfigWithoutSwagger
      );

      expect(paths["/api/posts/{id}/comments"]).toBeDefined();
      expect(mockLocalValidatorFileExists).toHaveBeenCalled();
    });
  });

  describe("Comprehensive endpoint generation", () => {
    const fullRouterConfig = {
      disable: false,
      parent: {
        model: "Post",
        endpoints: "*" as const,
      },
    };

    beforeEach(() => {
      mockimportModuleComponents.mockResolvedValue({
        router: {
          config: fullRouterConfig,
        },
      });
      mockLocalValidatorFileExists.mockResolvedValue(false);
    });

    it("should generate createOne endpoint with correct structure", async () => {
      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      const createEndpoint = paths["/api/posts/{id}/comments"]?.post;
      expect(createEndpoint).toBeDefined();
      expect(createEndpoint?.operationId).toBe("createCommentForPost");
      expect(createEndpoint?.responses["201"]).toBeDefined();
      expect((createEndpoint?.responses["404"] as any)?.description).toBe(
        "Post not found"
      );
      expect(createEndpoint?.security).toEqual([{ BearerAuth: [] }]);
    });

    it("should generate findMany endpoint with pagination parameters", async () => {
      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      const findManyEndpoint = paths["/api/posts/{id}/comments"]?.get;
      expect(findManyEndpoint).toBeDefined();
      expect(findManyEndpoint?.parameters).toHaveLength(6);

      const pageParam = findManyEndpoint?.parameters?.find(
        (p: any) => p.name === "page"
      );
      expect((pageParam as any)?.schema?.minimum).toBe(1);

      const limitParam = findManyEndpoint?.parameters?.find(
        (p: any) => p.name === "limit"
      );
      expect((limitParam as any)?.schema?.maximum).toBe(100);
    });

    it("should generate deleteMany endpoint with filter requirement", async () => {
      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      const deleteManyEndpoint = paths["/api/posts/{id}/comments/many"]?.delete;
      expect(deleteManyEndpoint).toBeDefined();
      expect((deleteManyEndpoint?.responses["400"] as any)?.description).toBe(
        "Missing filter criteria"
      );
    });

    it("should generate findOne endpoint with childId parameter", async () => {
      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      const findOneEndpoint = paths["/api/posts/{id}/comments/{childId}"]?.get;
      expect(findOneEndpoint).toBeDefined();

      const childIdParam = findOneEndpoint?.parameters?.find(
        (p: any) => p.name === "childId"
      );
      expect(childIdParam).toBeDefined();
      expect((childIdParam as any)?.description).toBe(
        "Unique identifier of the Comment"
      );
    });

    it("should generate deleteOne endpoint with 204 response", async () => {
      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      const deleteOneEndpoint =
        paths["/api/posts/{id}/comments/{childId}"]?.delete;
      expect(deleteOneEndpoint).toBeDefined();
      expect(deleteOneEndpoint?.responses["204"]).toBeDefined();
      expect((deleteOneEndpoint?.responses["204"] as any)?.description).toBe(
        "Comment deleted successfully"
      );
    });
  });

  describe("Integration with async dependencies", () => {
    it("should handle async errors gracefully", async () => {
      mockimportModuleComponents.mockRejectedValue(
        new Error("Module import failed")
      );

      await expect(
        generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig)
      ).rejects.toThrow("Module import failed");
    });

    it("should handle localValidatorFileExists async errors", async () => {
      mockimportModuleComponents.mockResolvedValue({
        router: {
          config: {
            disable: false,
            parent: {
              model: "Post",
              endpoints: ["createOne"],
            },
          },
        },
      });

      mockLocalValidatorFileExists.mockRejectedValue(
        new Error("File check failed")
      );

      await expect(
        generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig)
      ).rejects.toThrow("File check failed");
    });
  });
});
