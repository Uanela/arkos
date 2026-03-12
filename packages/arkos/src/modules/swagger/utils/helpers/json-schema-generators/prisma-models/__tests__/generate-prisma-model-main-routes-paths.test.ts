import { generatePrismaModelMainRoutesPaths } from "../generate-prisma-model-main-routes-paths";
import { isAuthenticationEnabled } from "../../../../../../../utils/helpers/arkos-config.helpers";
import { getArkosConfig } from "../../../../../../../server";
import loadableRegistry from "../../../../../../../components/arkos-loadable-registry";

jest.mock("../../../../../../../utils/dynamic-loader");
jest.mock("../../../../../../../utils/helpers/arkos-config.helpers");
jest.mock("../../../../../../../server");
jest.mock("fs");

describe("generatePrismaModelMainRoutesPaths", () => {
  let paths: any = {};

  beforeEach(() => {
    jest.clearAllMocks();
    (loadableRegistry as any).items = new Map();
    (isAuthenticationEnabled as jest.Mock).mockReturnValue(true);
    (getArkosConfig as jest.Mock).mockReturnValue({
      validation: { resolver: "prisma" },
      swagger: { strict: false },
    });
    paths = {};
  });

  describe("Basic Functionality", () => {
    it("should generate all CRUD routes for a basic model", () => {
      generatePrismaModelMainRoutesPaths("User", paths);

      expect(paths["/api/users"]).toBeDefined();
      expect(paths["/api/users"].post).toBeDefined(); // createOne
      expect(paths["/api/users"].get).toBeDefined(); // findMany
      expect(paths["/api/users/many"]).toBeDefined();
      expect(paths["/api/users/many"].post).toBeDefined(); // createMany
      expect(paths["/api/users/many"].patch).toBeDefined(); // updateMany
      expect(paths["/api/users/many"].delete).toBeDefined(); // deleteMany
      expect(paths["/api/users/{id}"]).toBeDefined();
      expect(paths["/api/users/{id}"].get).toBeDefined(); // findOne
      expect(paths["/api/users/{id}"].patch).toBeDefined(); // updateOne
      expect(paths["/api/users/{id}"].delete).toBeDefined(); // deleteOne
    });

    it("should use correct naming conventions for a PascalCase model", () => {
      generatePrismaModelMainRoutesPaths("UserProfile", paths);

      expect(paths["/api/user-profiles"]).toBeDefined();
      expect(paths["/api/user-profiles"].post?.operationId).toBe(
        "createUserProfile"
      );
      expect(paths["/api/user-profiles"].get?.operationId).toBe(
        "findUserProfiles"
      );
    });
  });

  describe("Individual Endpoint Disabling", () => {
    function registerDisabled(...endpoints: string[]) {
      const store: Record<string, any> = {};
      for (const ep of endpoints) store[ep] = { disabled: true };
      loadableRegistry.register({
        __type: "ArkosRouteHook",
        moduleName: "",
        _store: store,
      } as any);
    }

    it("should skip createOne when disabled", () => {
      registerDisabled("createOne");
      generatePrismaModelMainRoutesPaths("User", paths);

      expect(paths["/api/users"].post).toBeUndefined();
      expect(paths["/api/users"].get).toBeDefined(); // findMany still present
    });

    it("should skip findMany when disabled", () => {
      registerDisabled("findMany");
      generatePrismaModelMainRoutesPaths("User", paths);

      expect(paths["/api/users"].get).toBeUndefined();
      expect(paths["/api/users"].post).toBeDefined(); // createOne still present
    });

    it("should skip createMany when disabled", () => {
      registerDisabled("createMany");
      generatePrismaModelMainRoutesPaths("User", paths);

      expect(paths["/api/users/many"].post).toBeUndefined();
    });

    it("should skip updateMany when disabled", () => {
      registerDisabled("updateMany");
      generatePrismaModelMainRoutesPaths("User", paths);

      expect(paths["/api/users/many"].patch).toBeUndefined();
    });

    it("should skip deleteMany when disabled", () => {
      registerDisabled("deleteMany");
      generatePrismaModelMainRoutesPaths("User", paths);

      expect(paths["/api/users/many"].delete).toBeUndefined();
    });

    it("should skip findOne when disabled", () => {
      registerDisabled("findOne");
      generatePrismaModelMainRoutesPaths("User", paths);

      expect(paths["/api/users/{id}"].get).toBeUndefined();
    });

    it("should skip updateOne when disabled", () => {
      registerDisabled("updateOne");
      generatePrismaModelMainRoutesPaths("User", paths);

      expect(paths["/api/users/{id}"].patch).toBeUndefined();
    });

    it("should skip deleteOne when disabled", () => {
      registerDisabled("deleteOne");
      generatePrismaModelMainRoutesPaths("User", paths);

      expect(paths["/api/users/{id}"].delete).toBeUndefined();
    });
  });

  describe("Schema Mode Selection", () => {
    it("should use prisma schema refs when resolver is prisma and not strict", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        validation: { resolver: "prisma" },
        swagger: { strict: false },
      });

      generatePrismaModelMainRoutesPaths("User", paths);

      expect(
        paths["/api/users"].post?.requestBody?.content?.["application/json"]
          ?.schema?.$ref
      ).toBe("#/components/schemas/CreateUserModelSchema");
    });

    it("should use configured resolver mode when strict is true", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        validation: { resolver: "zod" },
        swagger: { strict: true },
      });

      generatePrismaModelMainRoutesPaths("User", paths);

      expect(
        paths["/api/users"].post?.requestBody?.content?.["application/json"]
          ?.schema?.$ref
      ).toBe("#/components/schemas/CreateUserSchema");
    });

    it("should use configured resolver when route has validation body", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        validation: { resolver: "zod" },
        swagger: { strict: false },
      });

      loadableRegistry.register({
        __type: "ArkosRouteHook",
        moduleName: "",
        _store: {
          createOne: { validation: { body: "createUserSchema" } },
        },
      } as any);

      generatePrismaModelMainRoutesPaths("User", paths);

      expect(
        paths["/api/users"].post?.requestBody?.content?.["application/json"]
          ?.schema?.$ref
      ).toBe("#/components/schemas/CreateUserSchema");
    });

    it("should fall back to prisma when validation is false on route", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        validation: { resolver: "zod" },
        swagger: { strict: false },
      });

      loadableRegistry.register({
        __type: "ArkosRouteHook",
        moduleName: "",
        _store: {
          createOne: { validation: false },
        },
      } as any);

      generatePrismaModelMainRoutesPaths("User", paths);

      expect(
        paths["/api/users"].post?.requestBody?.content?.["application/json"]
          ?.schema?.$ref
      ).toBe("#/components/schemas/CreateUserModelSchema");
    });
  });

  describe("Path Merging", () => {
    it("should merge routes when path already exists", () => {
      paths["/api/users"] = {
        options: { summary: "Existing OPTIONS method" },
      };

      generatePrismaModelMainRoutesPaths("User", paths);

      expect(paths["/api/users"].options).toBeDefined();
      expect(paths["/api/users"].post).toBeDefined();
      expect(paths["/api/users"].get).toBeDefined();
    });

    it("should use custom passed route path properties and not override them", () => {
      const successResponse = {
        description: "user found",
        content: {
          "application/json": {
            schema: { properties: { name: { type: "string" } } },
          },
        },
      };

      paths["/api/users"] = { get: { responses: { "200": successResponse } } };
      generatePrismaModelMainRoutesPaths(
        "User",
        paths
        // paths
      );

      expect(paths["/api/users"]?.get?.responses?.["200"]).toEqual(
        successResponse
      );
    });
  });

  describe("Response Structure Validation", () => {
    it("should generate correct OpenAPI structure for createOne", () => {
      generatePrismaModelMainRoutesPaths("User", paths);

      const createRoute = paths["/api/users"].post;
      expect(createRoute.tags).toContain("Users");
      expect(createRoute.summary).toBe("Create a new User");
      expect(createRoute.operationId).toBe("createUser");
      expect(createRoute.requestBody.required).toBe(true);
      expect(createRoute.responses["201"]).toBeDefined();
      expect(createRoute.responses["400"]).toBeDefined();
      expect(createRoute.responses["401"]).toBeDefined();
      expect(createRoute.responses["403"]).toBeDefined();
      expect(createRoute.security).toEqual([{ BearerAuth: [] }]);
    });

    it("should generate correct OpenAPI structure for findMany with default parameters", () => {
      generatePrismaModelMainRoutesPaths("User", paths);

      const findManyRoute = paths["/api/users"].get;
      expect(findManyRoute.parameters).toHaveLength(5); // sort, page, limit, fields
      expect(findManyRoute.parameters[0].name).toBe("page");
      expect(findManyRoute.parameters[1].name).toBe("limit");
      expect(findManyRoute.parameters[2].name).toBe("search");
      expect(findManyRoute.parameters[3].name).toBe("fields");
      expect(findManyRoute.parameters[4].name).toBe("sort");
      expect(
        findManyRoute.responses["200"].content["application/json"].schema
          .properties.total
      ).toBeDefined();
      expect(
        findManyRoute.responses["200"].content["application/json"].schema
          .properties.results
      ).toBeDefined();
      expect(
        findManyRoute.responses["200"].content["application/json"].schema
          .properties.data
      ).toBeDefined();
    });

    it("should generate correct OpenAPI structure for deleteOne", () => {
      generatePrismaModelMainRoutesPaths("User", paths);

      const deleteOneRoute = paths["/api/users/{id}"].delete;
      expect(deleteOneRoute.responses["204"]).toBeDefined();
      expect(deleteOneRoute.responses["404"]).toBeDefined();
      const idParam = deleteOneRoute.parameters.find(
        (p: any) => p.name === "id"
      );
      expect(idParam).toBeDefined();
      expect(idParam.required).toBe(true);
    });

    it("should not include auth error responses when authentication is disabled", () => {
      (isAuthenticationEnabled as jest.Mock).mockReturnValue(false);

      generatePrismaModelMainRoutesPaths("User", paths);

      expect(paths["/api/users"].post?.responses?.["401"]).toBeUndefined();
      expect(paths["/api/users"].post?.responses?.["403"]).toBeUndefined();
    });
  });

  describe("Multiple Endpoint Combinations", () => {
    function registerDisabled(...endpoints: string[]) {
      const store: Record<string, any> = {};
      for (const ep of endpoints) store[ep] = { disabled: true };
      loadableRegistry.register({
        __type: "ArkosRouteHook",
        moduleName: "",
        _store: store,
      } as any);
    }

    it("should handle multiple disabled endpoints", () => {
      registerDisabled("createOne", "updateMany", "deleteOne");

      generatePrismaModelMainRoutesPaths("User", paths);

      expect(paths["/api/users"].post).toBeUndefined(); // createOne disabled
      expect(paths["/api/users"].get).toBeDefined(); // findMany enabled
      expect(paths["/api/users/many"].patch).toBeUndefined(); // updateMany disabled
      expect(paths["/api/users/many"].post).toBeDefined(); // createMany enabled
      expect(paths["/api/users/{id}"].delete).toBeUndefined(); // deleteOne disabled
      expect(paths["/api/users/{id}"].get).toBeDefined(); // findOne enabled
    });

    it("should handle scenario where only single-record operations are enabled", () => {
      registerDisabled("findMany", "createMany", "updateMany", "deleteMany");

      generatePrismaModelMainRoutesPaths("User", paths);

      expect(paths["/api/users"].post).toBeDefined(); // createOne
      expect(paths["/api/users"].get).toBeUndefined(); // findMany disabled
      expect(paths["/api/users/many"]).toBeUndefined(); // no many operations
      expect(paths["/api/users/{id}"]).toBeDefined(); // single record operations
    });

    it("should handle scenario where only batch operations are enabled", () => {
      registerDisabled("createOne", "findOne", "updateOne", "deleteOne");

      generatePrismaModelMainRoutesPaths("User", paths);

      expect(paths["/api/users"].post).toBeUndefined(); // createOne disabled
      expect(paths["/api/users"].get).toBeDefined(); // findMany enabled
      expect(paths["/api/users/many"]).toBeDefined(); // batch operations enabled
      expect(paths["/api/users/{id}"]).toBeUndefined(); // no single record operations
    });
  });
});
