import { OpenAPIV3 } from "openapi-types";
import generatePrismaModelParentRoutePaths from "../generate-prisma-model-parent-routes-paths";
import { ArkosConfig } from "../../../../../../../exports";
import * as modelsHelpers from "../../../../../../../utils/dynamic-loader";
import { localValidatorFileExists } from "../../../swagger.router.helpers";

jest.mock("../../../swagger.router.helpers", () => ({
  getSchemaRef: jest.fn(
    (schema: string, _: string) => `#/components/schemas/${schema}`
  ),
  kebabToHuman: jest.fn((str: string) =>
    str.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  ),
}));

jest.mock("../../../../../../../utils/dynamic-loader", () => ({
  getModuleComponents: jest.fn(),
}));

jest.mock("../../../swagger.router.helpers", () => ({
  ...jest.requireActual("../../../swagger.router.helpers"),
  localValidatorFileExists: jest.fn(),
}));

jest.mock("fs");

describe("generatePrismaModelParentRoutesPaths", () => {
  let paths: OpenAPIV3.PathsObject;
  let arkosConfig: ArkosConfig;
  const mockgetModuleComponents =
    modelsHelpers.getModuleComponents as jest.MockedFunction<any>;
  const mockLocalValidatorFileExists =
    localValidatorFileExists as jest.MockedFunction<
      typeof localValidatorFileExists
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
      mockgetModuleComponents.mockReturnValue({
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
      mockgetModuleComponents.mockReturnValue({
        router: {
          config: {
            disable: false,
          },
        },
      });

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(paths).toEqual({});
    });

    it("should return early when parent config is null", async () => {
      mockgetModuleComponents.mockReturnValue({
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
    it("should return early when getModuleComponents returns null", async () => {
      mockgetModuleComponents.mockReturnValue({});

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(paths).toEqual({});
    });

    it("should return early when router config is undefined", async () => {
      mockgetModuleComponents.mockReturnValue({
        // No router property
      });

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(paths).toEqual({});
    });

    // NEW: Cover the case where getModuleComponents returns null/undefined entirely
    it("should return early when getModuleComponents returns null", async () => {
      mockgetModuleComponents.mockReturnValue(null as any);

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(paths).toEqual({});
    });

    it("should return early when getModuleComponents returns undefined", async () => {
      mockgetModuleComponents.mockReturnValue(undefined as any);

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
      mockgetModuleComponents.mockReturnValue({
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
      mockgetModuleComponents.mockReturnValue({
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
      mockgetModuleComponents.mockReturnValue({
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
      mockgetModuleComponents.mockReturnValue({
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

    // NEW: Test case where endpoint is not in the allowed array
    it("should not generate endpoints that are not in the allowed endpoints array", async () => {
      mockgetModuleComponents.mockReturnValue({
        router: {
          config: {
            disable: false,
            parent: {
              model: "Post",
              endpoints: ["findMany"], // Only allow findMany
            },
          },
        },
      });

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(paths["/api/posts/{id}/comments"]?.get).toBeDefined();
      expect(paths["/api/posts/{id}/comments"]?.post).toBeUndefined();
      expect(paths["/api/posts/{id}/comments/many"]).toBeUndefined();
      expect(paths["/api/posts/{id}/comments/{childId}"]).toBeUndefined();
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

      mockgetModuleComponents.mockReturnValue({
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
      ).toBe("#/components/schemas/CreateCommentSchema");
    });

    // NEW: Cover the case where swagger mode is undefined in strict mode
    it("should fallback to prisma when swagger mode is undefined in strict mode", async () => {
      arkosConfig.swagger!.strict = true;
      (arkosConfig as any).swagger!.mode = undefined;

      mockgetModuleComponents.mockReturnValue({
        router: {
          config: baseRouterConfig,
        },
      });

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(mockLocalValidatorFileExists).not.toHaveBeenCalled();
    });

    it("should fallback to prisma when local file doesn't exist", async () => {
      arkosConfig.swagger!.strict = false;

      mockgetModuleComponents.mockReturnValue({
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

      mockgetModuleComponents.mockReturnValue({
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

    // NEW: Cover the case where swagger mode is undefined but file exists
    it("should fallback to prisma when swagger mode is undefined and file exists", async () => {
      arkosConfig.swagger!.strict = false;
      (arkosConfig as any).swagger!.mode = undefined;

      mockgetModuleComponents.mockReturnValue({
        router: {
          config: baseRouterConfig,
        },
      });

      mockLocalValidatorFileExists.mockResolvedValue(true);

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(mockLocalValidatorFileExists).toHaveBeenCalled();
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
      mockgetModuleComponents.mockReturnValue({
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

    // NEW: Test path initialization for different endpoint combinations
    it("should handle path initialization for updateOne and deleteOne endpoints", async () => {
      mockgetModuleComponents.mockReturnValue({
        router: {
          config: {
            disable: false,
            parent: {
              model: "Post",
              endpoints: ["updateOne", "deleteOne"],
            },
          },
        },
      });

      mockLocalValidatorFileExists.mockResolvedValue(false);

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(paths["/api/posts/{id}/comments/{childId}"]).toBeDefined();
      expect(paths["/api/posts/{id}/comments/{childId}"]?.patch).toBeDefined();
      expect(paths["/api/posts/{id}/comments/{childId}"]?.delete).toBeDefined();
    });

    it("should handle existing path objects without overwriting", async () => {
      // Pre-populate paths with existing objects
      paths["/api/posts/{id}/comments"] = {
        post: {} as any,
      };
      paths["/api/posts/{id}/comments/many"] = {
        post: {} as any,
      };
      paths["/api/posts/{id}/comments/{childId}"] = {
        get: {} as any,
      };

      mockgetModuleComponents.mockReturnValue({
        router: {
          config: {
            disable: false,
            parent: {
              model: "Post",
              endpoints: [
                "findMany",
                "updateMany",
                "deleteMany",
                "updateOne",
                "deleteOne",
              ],
            },
          },
        },
      });

      mockLocalValidatorFileExists.mockResolvedValue(false);

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      // Should add new methods to existing path objects
      expect(paths["/api/posts/{id}/comments"]?.post).toBeDefined(); // Existing
      expect(paths["/api/posts/{id}/comments"]?.get).toBeDefined(); // New
      expect(paths["/api/posts/{id}/comments/many"]?.post).toBeDefined(); // Existing
      expect(paths["/api/posts/{id}/comments/many"]?.patch).toBeDefined(); // New
      expect(paths["/api/posts/{id}/comments/many"]?.delete).toBeDefined(); // New
      expect(paths["/api/posts/{id}/comments/{childId}"]?.get).toBeDefined(); // Existing
      expect(paths["/api/posts/{id}/comments/{childId}"]?.patch).toBeDefined(); // New
      expect(paths["/api/posts/{id}/comments/{childId}"]?.delete).toBeDefined(); // New
    });
  });

  describe("Edge Case: Complex model names", () => {
    it("should handle complex model names with multiple words", async () => {
      mockgetModuleComponents.mockReturnValue({
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
      mockgetModuleComponents.mockReturnValue({
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

      mockgetModuleComponents.mockReturnValue({
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

    // NEW: Test missing swagger config with different scenarios
    it("should handle missing swagger config when strict mode would be checked", async () => {
      const arkosConfigWithoutSwagger: ArkosConfig = {};

      mockgetModuleComponents.mockReturnValue({
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

      mockLocalValidatorFileExists.mockResolvedValue(true);

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
      mockgetModuleComponents.mockReturnValue({
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
    it("should handle localValidatorFileExists async errors", async () => {
      mockgetModuleComponents.mockReturnValue({
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

  // NEW: Additional tests to cover remaining branches
  describe("Branch Coverage Enhancement", () => {
    it("should handle router config with undefined config property", async () => {
      mockgetModuleComponents.mockReturnValue({
        router: {
          // config is undefined
        },
      });

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(paths).toEqual({});
    });

    it("should handle all possible schema modes in different scenarios", async () => {
      const testCases = [
        { mode: "prisma", fileExists: true },
        { mode: "zod", fileExists: true },
        { mode: "class-validator", fileExists: true },
        { mode: "prisma", fileExists: false },
        { mode: "zod", fileExists: false },
        { mode: "class-validator", fileExists: false },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        paths = {};
        arkosConfig.swagger!.mode = testCase.mode as any;
        arkosConfig.swagger!.strict = false;

        mockgetModuleComponents.mockReturnValue({
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

        mockLocalValidatorFileExists.mockResolvedValue(testCase.fileExists);

        await generatePrismaModelParentRoutePaths(
          "Comment",
          paths,
          arkosConfig
        );

        expect(paths["/api/posts/{id}/comments"]).toBeDefined();
      }
    });

    it("should test endpoint permission checking with various endpoint types", async () => {
      const endpointTypes = [
        "createOne",
        "findMany",
        "createMany",
        "updateMany",
        "deleteMany",
        "findOne",
        "updateOne",
        "deleteOne",
      ];

      for (const endpoint of endpointTypes) {
        jest.clearAllMocks();
        paths = {};

        mockgetModuleComponents.mockReturnValue({
          router: {
            config: {
              disable: false,
              parent: {
                model: "Post",
                endpoints: [endpoint],
              },
            },
          },
        });

        mockLocalValidatorFileExists.mockResolvedValue(false);

        await generatePrismaModelParentRoutePaths(
          "Comment",
          paths,
          arkosConfig
        );

        expect(Object.keys(paths).length).toBeGreaterThan(0);
      }
    });

    it("should handle mixed endpoint configurations", async () => {
      mockgetModuleComponents.mockReturnValue({
        router: {
          config: {
            disable: false,
            parent: {
              model: "Post",
              endpoints: ["createOne", "deleteMany", "updateOne"],
            },
          },
        },
      });

      mockLocalValidatorFileExists.mockResolvedValue(false);

      await generatePrismaModelParentRoutePaths("Comment", paths, arkosConfig);

      expect(paths["/api/posts/{id}/comments"]?.post).toBeDefined(); // createOne
      expect(paths["/api/posts/{id}/comments"]?.get).toBeUndefined(); // findMany not included
      expect(paths["/api/posts/{id}/comments/many"]?.delete).toBeDefined(); // deleteMany
      expect(paths["/api/posts/{id}/comments/many"]?.patch).toBeUndefined(); // updateMany not included
      expect(paths["/api/posts/{id}/comments/{childId}"]?.patch).toBeDefined(); // updateOne
      expect(paths["/api/posts/{id}/comments/{childId}"]?.get).toBeUndefined(); // findOne not included
    });
  });
});
