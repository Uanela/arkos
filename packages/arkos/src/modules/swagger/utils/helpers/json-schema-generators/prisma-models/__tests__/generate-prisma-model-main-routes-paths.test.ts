import { generatePrismaModelMainRoutesPaths } from "../generate-prisma-model-main-routes-paths";
import {
  getSchemaRef,
  kebabToHuman,
  localValidatorFileExists,
} from "../../../swagger.router.helpers";
import pluralize from "pluralize";
import { isEndpointDisabled } from "../../../../../../base/utils/helpers/base.router.helpers";
import { kebabCase, pascalCase } from "../../../../../../../exports/utils";
import { getModuleComponents } from "../../../../../../../utils/dynamic-loader";

// Mock all dependencies
jest.mock("../../../swagger.router.helpers");
jest.mock("pluralize");
jest.mock("../../../../../../base/utils/helpers/base.router.helpers");
jest.mock("../../../../../../../exports/utils");
jest.mock("../../../../../../../utils/dynamic-loader");
jest.mock("fs");

describe("generatePrismaModelMainRoutesPaths", () => {
  let paths: any = {};
  let arkosConfig: any;
  let mockModuleComponents: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize test data
    paths = {};
    arkosConfig = {
      swagger: {
        mode: "prisma",
        strict: false,
      },
    };

    mockModuleComponents = {
      router: {
        config: {},
      },
    };

    // Setup default mock implementations
    (kebabCase as jest.Mock).mockImplementation((str) =>
      str
        .toLowerCase()
        .replace(/([A-Z])/g, "-$1")
        .replace(/^-/, "")
    );
    (pascalCase as jest.Mock).mockImplementation(
      (str) => str.charAt(0).toUpperCase() + str.slice(1)
    );
    (kebabToHuman as jest.Mock).mockImplementation((str) =>
      str.replace(/-/g, " ").replace(/\b\w/g, (l: any) => l.toUpperCase())
    );
    (pluralize.plural as jest.Mock).mockImplementation((str) => str + "s");
    (getSchemaRef as jest.Mock).mockImplementation(
      (schema, _) => `#/components/schemas/${schema}`
    );
    (isEndpointDisabled as jest.Mock).mockReturnValue(false);
    (getModuleComponents as jest.Mock).mockReturnValue(mockModuleComponents);
    (localValidatorFileExists as jest.Mock).mockReturnValue(false);
  });

  describe("Basic Functionality", () => {
    it("should generate all CRUD routes for a basic model", async () => {
      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      // Check that all main routes are created
      expect(paths["/api/users"]).toBeDefined();
      expect(paths["/api/users"].post).toBeDefined(); // Create One
      expect(paths["/api/users"].get).toBeDefined(); // Find Many
      expect(paths["/api/users/many"]).toBeDefined();
      expect(paths["/api/users/many"].post).toBeDefined(); // Create Many
      expect(paths["/api/users/many"].patch).toBeDefined(); // Update Many
      expect(paths["/api/users/many"].delete).toBeDefined(); // Delete Many
      expect(paths["/api/users/{id}"]).toBeDefined();
      expect(paths["/api/users/{id}"].get).toBeDefined(); // Find One
      expect(paths["/api/users/{id}"].patch).toBeDefined(); // Update One
      expect(paths["/api/users/{id}"].delete).toBeDefined(); // Delete One
    });

    it("should use correct naming conventions", async () => {
      (kebabCase as jest.Mock).mockReturnValue("user-profile");
      (pascalCase as jest.Mock).mockReturnValue("UserProfile");
      (kebabToHuman as jest.Mock).mockReturnValue("User Profile");
      (pluralize.plural as jest.Mock).mockReturnValue("User Profiles");

      generatePrismaModelMainRoutesPaths("UserProfile", paths, arkosConfig);

      expect(kebabCase).toHaveBeenCalledWith("UserProfile");
      expect(pascalCase).toHaveBeenCalledWith("UserProfile");
      expect(kebabToHuman).toHaveBeenCalledWith("user-profile");
      expect(pluralize.plural).toHaveBeenCalledWith("user-profile");
      expect(pluralize.plural).toHaveBeenCalledWith("User Profile");
    });

    it("should call getModuleComponents with correct parameters", async () => {
      generatePrismaModelMainRoutesPaths("Product", paths, arkosConfig);

      expect(getModuleComponents).toHaveBeenCalledWith("Product");
    });
  });

  describe("Router Configuration - Complete Disable", () => {
    it("should skip route generation when router is completely disabled", async () => {
      mockModuleComponents.router.config = { disable: true };
      (getModuleComponents as jest.Mock).mockReturnValue(mockModuleComponents);

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      expect(Object.keys(paths)).toHaveLength(0);
    });

    it("should handle missing router config gracefully", async () => {
      mockModuleComponents.router = undefined;
      (getModuleComponents as jest.Mock).mockReturnValue(mockModuleComponents);

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      // Should still generate routes when router config is undefined
      expect(paths["/api/users"]).toBeDefined();
    });

    it("should handle missing model modules gracefully", async () => {
      (getModuleComponents as jest.Mock).mockReturnValue(null);

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      // Should still generate routes when model modules are null
      expect(paths["/api/users"]).toBeDefined();
    });
  });

  describe("Individual Endpoint Disabling", () => {
    it("should skip createOne when disabled", async () => {
      (isEndpointDisabled as jest.Mock).mockImplementation(
        (_, endpoint) => endpoint === "createOne"
      );

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      expect(paths["/api/users"]).toBeDefined();
      expect(paths["/api/users"].post).toBeUndefined();
      expect(paths["/api/users"].get).toBeDefined(); // findMany should still exist
    });

    it("should skip findMany when disabled", async () => {
      (isEndpointDisabled as jest.Mock).mockImplementation(
        (_, endpoint) => endpoint === "findMany"
      );

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      expect(paths["/api/users"]).toBeDefined();
      expect(paths["/api/users"].get).toBeUndefined();
      expect(paths["/api/users"].post).toBeDefined(); // createOne should still exist
    });

    it("should skip createMany when disabled", async () => {
      (isEndpointDisabled as jest.Mock).mockImplementation(
        (_, endpoint) => endpoint === "createMany"
      );

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      expect(paths["/api/users/many"]).toBeDefined();
      expect(paths["/api/users/many"].post).toBeUndefined();
    });

    it("should skip updateMany when disabled", async () => {
      (isEndpointDisabled as jest.Mock).mockImplementation(
        (_, endpoint) => endpoint === "updateMany"
      );

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      expect(paths["/api/users/many"]).toBeDefined();
      expect(paths["/api/users/many"].patch).toBeUndefined();
    });

    it("should skip deleteMany when disabled", async () => {
      (isEndpointDisabled as jest.Mock).mockImplementation(
        (_, endpoint) => endpoint === "deleteMany"
      );

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      expect(paths["/api/users/many"]).toBeDefined();
      expect(paths["/api/users/many"].delete).toBeUndefined();
    });

    it("should skip findOne when disabled", async () => {
      (isEndpointDisabled as jest.Mock).mockImplementation(
        (_, endpoint) => endpoint === "findOne"
      );

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      expect(paths["/api/users/{id}"].get).toBeUndefined();
    });

    it("should skip updateOne when disabled", async () => {
      (isEndpointDisabled as jest.Mock).mockImplementation(
        (_, endpoint) => endpoint === "updateOne"
      );

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      expect(paths["/api/users/{id}"]).toBeDefined();
      expect(paths["/api/users/{id}"].patch).toBeUndefined();
    });

    it("should skip deleteOne when disabled", async () => {
      (isEndpointDisabled as jest.Mock).mockImplementation(
        (_, endpoint) => endpoint === "deleteOne"
      );

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      expect(paths["/api/users/{id}"]).toBeDefined();
      expect(paths["/api/users/{id}"].delete).toBeUndefined();
    });
  });

  describe("Schema Mode Selection", () => {
    it("should use swagger mode when strict is true", async () => {
      arkosConfig.swagger.strict = true;
      arkosConfig.swagger.mode = "zod";

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      expect(getSchemaRef).toHaveBeenCalledWith("CreateUser", "zod");
      expect(localValidatorFileExists).not.toHaveBeenCalled();
    });

    it("should fall back to prisma when swagger mode is undefined and strict is true", async () => {
      arkosConfig.swagger.strict = true;
      arkosConfig.swagger.mode = undefined;

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      expect(getSchemaRef).toHaveBeenCalledWith("CreateUser", "prisma");
    });

    it("should use prisma when local file does not exist and not strict", async () => {
      arkosConfig.swagger.strict = false;
      (localValidatorFileExists as jest.Mock).mockReturnValue(false);

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      expect(getSchemaRef).toHaveBeenCalledWith("CreateUser", "prisma");
    });

    it("should use swagger mode when local file exists and not strict", async () => {
      arkosConfig.swagger.strict = false;
      arkosConfig.swagger.mode = "class-validator";
      (localValidatorFileExists as jest.Mock).mockReturnValue(true);

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      expect(getSchemaRef).toHaveBeenCalledWith(
        "CreateUser",
        "class-validator"
      );
    });

    it("should call localValidatorFileExists for each action when not strict", async () => {
      arkosConfig.swagger.strict = false;
      (localValidatorFileExists as jest.Mock).mockReturnValue(false);

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      // Should be called for each CRUD operation
      expect(localValidatorFileExists).toHaveBeenCalledTimes(6); // create, findMany, createMany, updateMany, findOne, update
    });
  });

  describe("Edge Cases - Path Merging", () => {
    it("should merge routes when path already exists", async () => {
      // Pre-populate paths with existing route
      paths["/api/users"] = {
        options: {
          summary: "Existing OPTIONS method",
        },
      };

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      // Should preserve existing method and add new ones
      expect(paths["/api/users"].options).toBeDefined();
      expect(paths["/api/users"].post).toBeDefined();
      expect(paths["/api/users"].get).toBeDefined();
    });

    it("should handle complex model names", async () => {
      (kebabCase as jest.Mock).mockReturnValue("user-billing-address");
      (pascalCase as jest.Mock).mockReturnValue("UserBillingAddress");
      (kebabToHuman as jest.Mock).mockReturnValue("User Billing Address");
      (pluralize.plural as jest.Mock).mockImplementation((str) => str + "s");

      generatePrismaModelMainRoutesPaths(
        "UserBillingAddress",
        paths,
        arkosConfig
      );

      expect(paths["/api/user-billing-addresss"]).toBeDefined(); // Note: pluralize mock adds 's'
    });
  });

  describe("Edge Cases - Empty/Invalid Inputs", () => {
    it("should handle empty model name", async () => {
      (kebabCase as jest.Mock).mockReturnValue("");
      (pascalCase as jest.Mock).mockReturnValue("");
      (kebabToHuman as jest.Mock).mockReturnValue("");
      (pluralize.plural as jest.Mock).mockReturnValue("");

      generatePrismaModelMainRoutesPaths("", paths, arkosConfig);

      expect(paths["/api/"]).toBeDefined();
    });

    it("should handle undefined arkosConfig", async () => {
      expect(generatePrismaModelMainRoutesPaths("User", paths, {})).toBe(
        undefined
      );
    });

    it("should handle empty paths object", async () => {
      expect(generatePrismaModelMainRoutesPaths("User", {}, arkosConfig)).toBe(
        undefined
      );
    });

    it("should handle arkosConfig without swagger property", async () => {
      arkosConfig = {};

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      // Should still work with default behavior
      expect(paths["/api/users"]).toBeDefined();
    });
  });

  describe("Response Structure Validation", () => {
    it("should generate correct OpenAPI structure for createOne", async () => {
      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      const createRoute = paths["/api/users"].post;
      expect(createRoute.tags).toEqual(["Users"]);
      expect(createRoute.summary).toBe("Create a new User");
      expect(createRoute.operationId).toBe("createUser");
      expect(createRoute.requestBody.required).toBe(true);
      expect(createRoute.responses["201"]).toBeDefined();
      expect(createRoute.responses["400"]).toBeDefined();
      expect(createRoute.responses["401"]).toBeDefined();
      expect(createRoute.responses["403"]).toBeDefined();
      expect(createRoute.security).toEqual([{ BearerAuth: [] }]);
    });

    it("should generate correct OpenAPI structure for findMany", async () => {
      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      const findManyRoute = paths["/api/users"].get;
      expect(findManyRoute.parameters).toHaveLength(5); // filter, sort, page, limit, fields
      expect(findManyRoute.parameters[0].name).toBe("filters");
      expect(findManyRoute.parameters[1].name).toBe("sort");
      expect(findManyRoute.parameters[2].name).toBe("page");
      expect(findManyRoute.parameters[3].name).toBe("limit");
      expect(findManyRoute.parameters[4].name).toBe("fields");
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

    it("should generate correct OpenAPI structure for updateMany", async () => {
      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      const updateManyRoute = paths["/api/users/many"].patch;
      expect(updateManyRoute.parameters).toHaveLength(1); // filter
      expect(updateManyRoute.parameters[0].required).toBe(true);
      expect(updateManyRoute.requestBody.required).toBe(true);
    });

    it("should generate correct OpenAPI structure for deleteOne", async () => {
      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      const deleteOneRoute = paths["/api/users/{id}"].delete;
      expect(deleteOneRoute.responses["204"]).toBeDefined();
      expect(deleteOneRoute.responses["404"]).toBeDefined();
      expect(deleteOneRoute.parameters[0].name).toBe("id");
      expect(deleteOneRoute.parameters[0].required).toBe(true);
    });
  });

  describe("Multiple Endpoint Combinations", () => {
    it("should handle multiple disabled endpoints", async () => {
      (isEndpointDisabled as jest.Mock).mockImplementation((_, endpoint) =>
        ["createOne", "updateMany", "deleteOne"].includes(endpoint)
      );

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      expect(paths["/api/users"].post).toBeUndefined(); // createOne disabled
      expect(paths["/api/users"].get).toBeDefined(); // findMany enabled
      expect(paths["/api/users/many"].patch).toBeUndefined(); // updateMany disabled
      expect(paths["/api/users/many"].post).toBeDefined(); // createMany enabled
      expect(paths["/api/users/{id}"].delete).toBeUndefined(); // deleteOne disabled
      expect(paths["/api/users/{id}"].get).toBeDefined(); // findOne enabled
    });

    it("should handle scenario where only single-record operations are enabled", async () => {
      (isEndpointDisabled as jest.Mock).mockImplementation((_, endpoint) =>
        ["findMany", "createMany", "updateMany", "deleteMany"].includes(
          endpoint
        )
      );

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      expect(paths["/api/users"].post).toBeDefined(); // createOne
      expect(paths["/api/users"].get).toBeUndefined(); // findMany disabled
      expect(paths["/api/users/many"]).toBeUndefined(); // no many operations
      expect(paths["/api/users/{id}"]).toBeDefined(); // single record operations
    });

    it("should handle scenario where only batch operations are enabled", async () => {
      (isEndpointDisabled as jest.Mock).mockImplementation((_, endpoint) =>
        ["createOne", "findOne", "updateOne", "deleteOne"].includes(endpoint)
      );

      generatePrismaModelMainRoutesPaths("User", paths, arkosConfig);

      expect(paths["/api/users"].post).toBeUndefined(); // createOne disabled
      expect(paths["/api/users"].get).toBeDefined(); // findMany enabled
      expect(paths["/api/users/many"]).toBeDefined(); // batch operations enabled
      expect(paths["/api/users/{id}"]).toBeUndefined(); // no single record operations
    });
  });
});
