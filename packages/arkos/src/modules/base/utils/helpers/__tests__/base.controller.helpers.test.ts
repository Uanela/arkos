import fs from "fs";
import * as modelsHelpers from "../../../../../utils/dynamic-loader";
import * as serverConfig from "../../../../../server";
import * as validateDtoModule from "../../../../../utils/validate-dto";
import * as validateSchemaModule from "../../../../../utils/validate-schema";
import { handleRequestBodyValidationAndTransformation } from "../../../base.middlewares";
import { ArkosRequest, ArkosResponse } from "../../../../../types";
import { getAppRoutes } from "../base.controller.helpers";
import { z } from "zod";

jest.mock("../../../../../utils/dynamic-loader");
jest.mock("../../../../../server");
jest.mock("../../../../../utils/validate-dto");
jest.mock("../../../../../utils/validate-schema");
jest.mock("fs");

(fs.readdirSync as jest.Mock).mockReturnValue(["schema.prisma", "migrations"]);
(fs.statSync as jest.Mock).mockImplementation((path) => ({
  isDirectory: () => path?.includes?.("migrations"),
  isFile: () => path.endsWith(".prisma"),
}));
(fs.readFileSync as jest.Mock).mockReturnValue(`
      model User {
        id        String   @id @default(uuid())
        email     String   @unique
        posts     Post[]
        profile   Profile?
      }

      model Post {
        id        String   @id @default(uuid())
        title     String
        author    User     @relation(fields: [authorId], references: [id])
        authorId  String
      }

      model Profile {
        id        String   @id @default(uuid())
        bio       String?
        user      User     @relation(fields: [userId], references: [id])
        userId    String   @unique
      }
    `);

// Recreate the schema parsing logic for testing
// const getAllPrismaFilesSpy = jest.spyOn(fs, "readdirSync");

describe("handleRequestBodyValidationAndTransformation", () => {
  let req: Partial<ArkosRequest>;
  let res: Partial<ArkosResponse>;
  let next: jest.Mock;

  beforeEach(() => {
    req = { body: { name: "test" } };
    res = {};
    next = jest.fn();

    jest.clearAllMocks();
  });

  it("should call validateDto when validation resolver is class-validator", async () => {
    // Arrange
    const transformedBody = { name: "transformed test" };

    (modelsHelpers.getModuleComponents as jest.Mock).mockReturnValue({
      dtos: { create: class CreateDto {} },
      schemas: {},
    });

    (serverConfig.getArkosConfig as jest.Mock).mockReturnValue({
      validation: {
        resolver: "class-validator",
        validationOptions: { forbidNonWhitelisted: true },
      },
    });

    (validateDtoModule.default as jest.Mock).mockResolvedValue(transformedBody);

    const middleware = handleRequestBodyValidationAndTransformation(
      modelsHelpers.getModuleComponents("user")?.dtos?.create
    );

    // Act
    await middleware(req as ArkosRequest, res as ArkosResponse, next);

    // Assert
    expect(validateDtoModule.default).toHaveBeenCalledTimes(1);
    expect(validateDtoModule.default).toHaveBeenCalledWith(
      modelsHelpers.getModuleComponents("user")?.dtos?.create,
      { name: "test" },
      {
        whitelist: true,
        forbidNonWhitelisted: true,
      }
    );
    expect(req.body).toEqual(transformedBody);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should call validateSchema when validation resolver is zod", async () => {
    // Arrange
    // const modelName = "TestModel";
    // const action = "update";
    const transformedBody = { name: "transformed test" };

    (modelsHelpers.getModuleComponents as jest.Mock).mockReturnValue({
      dtos: {},
      schemas: { update: { parse: () => {} } },
    });

    (serverConfig.getArkosConfig as jest.Mock).mockReturnValue({
      validation: {
        resolver: "zod",
      },
    });

    (validateSchemaModule.default as jest.Mock).mockResolvedValue(
      transformedBody
    );

    const middleware = handleRequestBodyValidationAndTransformation(
      z.object({})
    );

    // Act
    await middleware(req as ArkosRequest, res as ArkosResponse, next);

    // Assert
    expect(validateSchemaModule.default).toHaveBeenCalledTimes(1);
    expect(validateSchemaModule.default).toHaveBeenCalledWith(
      expect.objectContaining({ parse: expect.any(Function) }),
      expect.objectContaining({ name: "test" })
    );
    expect(req.body).toEqual(transformedBody);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should not validate when no validation resolver is configured", async () => {
    // Arrange
    const originalBody = { name: "test" };

    (modelsHelpers.getModuleComponents as jest.Mock).mockReturnValue({
      dtos: { create: class CreateDto {} },
      schemas: { create: { parse: () => {} } },
    });

    (serverConfig.getArkosConfig as jest.Mock).mockReturnValue({});

    const middleware = handleRequestBodyValidationAndTransformation(
      class CreateDto {}
    );

    // Act
    await middleware(req as ArkosRequest, res as ArkosResponse, next);

    // Assert
    expect(validateDtoModule.default).not.toHaveBeenCalled();
    expect(validateSchemaModule.default).not.toHaveBeenCalled();
    expect(req.body).toEqual(originalBody);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should not validate when validator is configured but no schema/dto exists", async () => {
    // Arrange
    const originalBody = { name: "test" };

    (modelsHelpers.getModuleComponents as jest.Mock).mockReturnValue({
      dtos: {},
      schemas: {},
    });

    (serverConfig.getArkosConfig as jest.Mock).mockReturnValue({
      validation: {
        resolver: "class-validator",
      },
    });

    const middleware = handleRequestBodyValidationAndTransformation(undefined);

    // Act
    await middleware(req as ArkosRequest, res as ArkosResponse, next);

    // Assert
    expect(validateDtoModule.default).not.toHaveBeenCalled();
    expect(validateSchemaModule.default).not.toHaveBeenCalled();
    expect(req.body).toEqual(originalBody);
    expect(next).toHaveBeenCalledTimes(1);
  });

  describe("getAppRoutes", () => {
    // Helper to create a mock Express app with different route configurations
    const createMockApp = (routerConfig: any) => {
      return {
        _router: {
          stack: routerConfig,
        },
      };
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should extract direct routes on the app", () => {
      // Mock a simple Express app with direct routes
      const mockApp = createMockApp([
        {
          route: {
            path: "/users",
            methods: { get: true, post: true },
          },
        },
        {
          route: {
            path: "/products",
            methods: { get: true },
          },
        },
      ]);

      // Set up mock return value
      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      // Call the function
      const routes = getAppRoutes();

      // Verify routes were extracted correctly
      expect(routes).toEqual([
        { method: "GET", path: "/users" },
        { method: "POST", path: "/users" },
        { method: "GET", path: "/products" },
      ]);
    });

    it("should extract routes from middleware with subrouters", () => {
      // Mock an Express app with middleware routers
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/list",
                  methods: { get: true },
                },
              },
              {
                route: {
                  path: "/create",
                  methods: { post: true },
                },
              },
            ],
          },
          regexp: /\/^\/api\/?(?=\/|$)/i,
        },
      ]);

      // Set up mock return value
      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      // Call the function
      const routes = getAppRoutes();

      // Verify routes were extracted with proper base path
      expect(routes).toEqual([
        { method: "GET", path: "/api/list" },
        { method: "POST", path: "/api/create" },
      ]);
    });

    it("should handle complex regex patterns in middleware paths", () => {
      // Mock an Express app with complex regex patterns
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/items",
                  methods: { get: true },
                },
              },
            ],
          },
          regexp: "/^\\/api\\/v1\\/?(?=\\/|$)/i",
        },
      ]);

      // Set up mock return value
      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      // Call the function
      const routes = getAppRoutes();

      // Verify routes were extracted with proper base path
      expect(routes).toEqual([{ method: "GET", path: "/api/v1/items" }]);
    });

    it("should handle simple regex patterns in middleware paths", () => {
      // Mock an Express app with simple regex patterns
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/details",
                  methods: { get: true },
                },
              },
            ],
          },
          regexp: "/^\\/admin\\/.*/",
        },
      ]);

      // Set up mock return value
      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      // Call the function
      const routes = getAppRoutes();

      // Verify routes were extracted with proper base path
      expect(routes).toEqual([{ method: "GET", path: "/admin/details" }]);
    });

    it("should handle middleware without regexp property", () => {
      // Mock an Express app with middleware without regexp
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/settings",
                  methods: { get: true, put: true },
                },
              },
            ],
          },
          // No regexp property
        },
      ]);

      // Set up mock return value
      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      // Call the function
      const routes = getAppRoutes();

      // Verify routes were extracted without base path
      expect(routes).toEqual([
        { method: "GET", path: "/settings" },
        { method: "PUT", path: "/settings" },
      ]);
    });

    it("should handle routes with regex patterns in route paths", () => {
      // Mock an Express app with regex in route paths
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/^/items\\/?(?=\\/|$)/i",
                  methods: { get: true },
                },
              },
            ],
          },
          regexp: "/^\\/api\\/?(?=\\/|$)/i",
        },
      ]);

      // Set up mock return value
      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      // Call the function
      const routes = getAppRoutes();

      // Verify routes were extracted with cleaned-up regex patterns
      expect(routes).toEqual([{ method: "GET", path: "/api//items/" }]);
    });

    it("should handle edge case with fallback regex pattern matching", () => {
      // Mock an Express app with a route path that needs fallback regex handling
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/?(?=some-path)/i",
                  methods: { get: true },
                },
              },
            ],
          },
          regexp: "/^\\/custom\\/?(?=\\/|$)/i",
        },
      ]);

      // Set up mock return value
      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      // Call the function
      const routes = getAppRoutes();

      // Verify routes were extracted using fallback pattern
      expect(routes).toEqual([{ method: "GET", path: "some-path" }]);
    });

    it("should handle a mix of direct routes and middleware routes", () => {
      // Mock an Express app with both direct routes and middleware routes
      const mockApp = createMockApp([
        {
          route: {
            path: "/home",
            methods: { get: true },
          },
        },
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/profile",
                  methods: { get: true },
                },
              },
            ],
          },
          regexp: "/^\\/user\\/?(?=\\/|$)/i",
        },
        {
          route: {
            path: "/about",
            methods: { get: true },
          },
        },
      ]);

      // Set up mock return value
      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      // Call the function
      const routes = getAppRoutes();

      // Verify routes were extracted correctly
      expect(routes).toEqual([
        { method: "GET", path: "/home" },
        { method: "GET", path: "/user/profile" },
        { method: "GET", path: "/about" },
      ]);
    });

    it("should handle multiple methods on the same route", () => {
      // Mock an Express app with multiple methods on the same route
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/resource",
                  methods: { get: true, post: true, put: true, delete: true },
                },
              },
            ],
          },
          regexp: "/^\\/api\\/v2\\/?(?=\\/|$)/i",
        },
      ]);

      // Set up mock return value
      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      // Call the function
      const routes = getAppRoutes();

      // Verify routes were extracted with all methods
      expect(routes).toEqual([
        { method: "GET", path: "/api/v2/resource" },
        { method: "POST", path: "/api/v2/resource" },
        { method: "PUT", path: "/api/v2/resource" },
        { method: "DELETE", path: "/api/v2/resource" },
      ]);
    });

    it("should handle nested path structures correctly", () => {
      // Mock an Express app with nested path structures
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/users/profile",
                  methods: { get: true },
                },
              },
            ],
          },
          regexp: "/^\\/api\\/v1\\/?(?=\\/|$)/i",
        },
      ]);

      // Set up mock return value
      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      // Call the function
      const routes = getAppRoutes();

      // Verify routes were extracted with proper nested structure
      expect(routes).toEqual([
        { method: "GET", path: "/api/v1/users/profile" },
      ]);
    });

    it("should handle middleware with empty route stacks", () => {
      // Mock an Express app with middleware that has empty route stacks
      const mockApp = createMockApp([
        {
          handle: {
            stack: [], // Empty stack
          },
          regexp: "/^\\/api\\/?(?=\\/|$)/i",
        },
      ]);

      // Set up mock return value
      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      // Call the function
      const routes = getAppRoutes();

      // Verify no routes were extracted
      expect(routes).toEqual([]);
    });

    it("should handle middleware without handle property", () => {
      // Mock an Express app with middleware without handle property
      const mockApp = createMockApp([
        {
          // No route or handle property
          name: "someMiddleware",
        },
      ]);

      // Set up mock return value
      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      // Call the function
      const routes = getAppRoutes();

      // Verify no routes were extracted
      expect(routes).toEqual([]);
    });
  });

  // Add these test cases to your existing describe("getAppRoutes") block

  describe("getAppRoutes - Additional Coverage Tests", () => {
    const createMockApp = (routerConfig: any) => {
      return {
        _router: {
          stack: routerConfig,
        },
      };
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should handle middleware without regexp but with handle.stack", () => {
      // This tests the case where middleware.regexp is undefined/null
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/test",
                  methods: { get: true },
                },
              },
            ],
          },
          // No regexp property
        },
      ]);

      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      const routes = getAppRoutes();

      expect(routes).toEqual([{ method: "GET", path: "/test" }]);
    });

    it("should handle regex patterns that don't match primary pattern", () => {
      // Test the simpleMatch fallback when the main regex pattern fails
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/fallback",
                  methods: { post: true },
                },
              },
            ],
          },
          regexp: "/^\/different-pattern\/something/",
        },
      ]);

      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      const routes = getAppRoutes();

      expect(routes).toEqual([{ method: "POST", path: "/fallback" }]);
    });

    it("should handle route paths that don't contain regex patterns", () => {
      // Test the normal path joining when routePath doesn't contain "/?(?="
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/normal-path",
                  methods: { get: true },
                },
              },
            ],
          },
          regexp: "/^\/api/?(?=/|$)/i",
        },
      ]);

      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      const routes = getAppRoutes();

      expect(routes).toEqual([{ method: "GET", path: "/normal-path" }]);
    });

    it("should handle route paths that start without slash", () => {
      // Test the case where routePath doesn't start with "/"
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "no-leading-slash",
                  methods: { put: true },
                },
              },
            ],
          },
          regexp: "/^\/base/?(?=/|$)/i",
        },
      ]);

      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      const routes = getAppRoutes();

      expect(routes).toEqual([{ method: "PUT", path: "no-leading-slash" }]);
    });

    it("should handle regex patterns with no match groups", () => {
      // Test when regex patterns don't match any of the expected formats
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/unmatched",
                  methods: { delete: true },
                },
              },
            ],
          },
          regexp: "/completely-different-pattern/",
        },
      ]);

      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      const routes = getAppRoutes();

      expect(routes).toEqual([{ method: "DELETE", path: "/unmatched" }]);
    });

    it("should handle pathMatch extraction failure", () => {
      // Test when pathMatch is null/undefined
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/?(?=unextractable-pattern)/i",
                  methods: { patch: true },
                },
              },
            ],
          },
          regexp: "/^\/api/?(?=/|$)/i",
        },
      ]);

      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      const routes = getAppRoutes();

      expect(routes).toEqual([
        { method: "PATCH", path: "unextractable-pattern" },
      ]);
    });

    it("should handle fallbackMatch failure", () => {
      // Test when both pathMatch and fallbackMatch fail
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/?(?=)/i", // Empty pattern that won't match fallbackMatch
                  methods: { get: true },
                },
              },
            ],
          },
          regexp: "/^\/api/?(?=/|$)/i",
        },
      ]);

      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      const routes = getAppRoutes();

      expect(routes).toEqual([{ method: "GET", path: "/i" }]); // After cleanup
    });

    it("should handle middleware with handle but no stack", () => {
      // Test middleware that has handle but no stack property
      const mockApp = createMockApp([
        {
          handle: {
            // No stack property
          },
          regexp: "/^\/api/?(?=/|$)/i",
        },
      ]);

      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      const routes = getAppRoutes();

      expect(routes).toEqual([]);
    });

    it("should handle basePath with trailing slash", () => {
      // Test the basePath.replace(/\/$/, "") logic
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/resource",
                  methods: { get: true },
                },
              },
            ],
          },
          regexp: "/^\/api//?(?=/|$)/i", // This should result in basePath with trailing slash
        },
      ]);

      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      const routes = getAppRoutes();

      expect(routes).toEqual([{ method: "GET", path: "/resource" }]);
    });

    it("should handle complex regex cleanup scenarios", () => {
      // Test various regex artifact cleanup scenarios
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/^complex$/?(?=more-stuff)/path",
                  methods: { post: true },
                },
              },
            ],
          },
          regexp: "/^\/api^$/?(?=/|$)/i",
        },
      ]);

      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      const routes = getAppRoutes();

      expect(routes).toEqual([{ method: "POST", path: "more-stuff" }]);
    });

    it("should handle middleware without regexp.toString method", () => {
      // Test when regexp doesn't have toString or causes issues
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/test-path",
                  methods: { get: true },
                },
              },
            ],
          },
          regexp: {
            // Object without proper toString that might cause issues
            source: "^\/weird-pattern",
          },
        },
      ]);

      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      const routes = getAppRoutes();

      expect(routes).toEqual([{ method: "GET", path: "/test-path" }]);
    });

    it("should handle null or undefined middleware properties", () => {
      // Test edge cases with null/undefined properties
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/null-test",
                  methods: { get: true },
                },
              },
            ],
          },
          regexp: null,
        },
      ]);

      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      const routes = getAppRoutes();

      expect(routes).toEqual([{ method: "GET", path: "/null-test" }]);
    });

    it("should handle regex with multiple capture groups", () => {
      // Test regex patterns with multiple capture groups to test the match[1] selection
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/multi-group",
                  methods: { get: true },
                },
              },
            ],
          },
          regexp: "/^(prefix)(\/api)/?(?=/|$)/i", // Multiple groups, should use match[1]
        },
      ]);

      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      const routes = getAppRoutes();

      expect(routes).toEqual([{ method: "GET", path: "/multi-group" }]);
    });

    it("should handle successful basePath extraction and path joining", () => {
      // Test a scenario where basePath is successfully extracted and joined
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "/users",
                  methods: { get: true },
                },
              },
            ],
          },
          regexp: /^\/api\/?(?=\/|$)/i, // This should extract "/api" as basePath
        },
      ]);

      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      const routes = getAppRoutes();

      expect(routes).toEqual([{ method: "GET", path: "/api/users" }]);
    });

    it("should handle non-leading slash route with successful basePath", () => {
      // Test case where routePath doesn't start with "/" and we have basePath
      const mockApp = createMockApp([
        {
          handle: {
            stack: [
              {
                route: {
                  path: "items", // No leading slash
                  methods: { post: true },
                },
              },
            ],
          },
          regexp: /^\/store\/?(?=\/|$)/i, // Should extract "/store"
        },
      ]);

      (serverConfig.getExpressApp as jest.Mock).mockReturnValue(mockApp);

      const routes = getAppRoutes();

      expect(routes).toEqual([{ method: "POST", path: "/store/items" }]);
    });
  });
});
