import missingJsonSchemaGenerator from "../missing-json-schemas-generator";
import { OpenAPIV3 } from "openapi-types";
import { ArkosConfig } from "../../../../../exports";
import enhancedPrismaJsonSchemaGenerator from "../../../../../utils/prisma/enhaced-prisma-json-schema-generator";

// Mock the enhanced generator
jest.mock(
  "../../../../../utils/prisma/enhaced-prisma-json-schema-generator",
  () => ({
    generateModelSchemas: jest.fn(),
  })
);

describe("MissingJsonSchemasGenerator", () => {
  const mockEnhancedGenerator =
    enhancedPrismaJsonSchemaGenerator as jest.Mocked<
      typeof enhancedPrismaJsonSchemaGenerator
    >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("extractModelNameFromSchemaRef", () => {
    test("should extract model name from CreateUserModelSchema", () => {
      const result = missingJsonSchemaGenerator[
        "extractModelNameFromSchemaRef"
      ]("#/components/schemas/CreateUserModelSchema");
      expect(result).toBe("User");
    });

    test("should extract model name from FindManyPostModelSchema", () => {
      const result = missingJsonSchemaGenerator[
        "extractModelNameFromSchemaRef"
      ]("#/components/schemas/FindManyPostModelSchema");
      expect(result).toBe("Post");
    });

    test("should handle UpdateMany operations", () => {
      const result = missingJsonSchemaGenerator[
        "extractModelNameFromSchemaRef"
      ]("#/components/schemas/UpdateManyUserModelSchema");
      expect(result).toBe("ManyUser");
    });

    test("should handle auth-related schemas", () => {
      expect(
        missingJsonSchemaGenerator["extractModelNameFromSchemaRef"](
          "#/components/schemas/AuthSchema"
        )
      ).toBe("Auth");

      expect(
        missingJsonSchemaGenerator["extractModelNameFromSchemaRef"](
          "#/components/schemas/LoginSchema"
        )
      ).toBe("Auth");

      expect(
        missingJsonSchemaGenerator["extractModelNameFromSchemaRef"](
          "#/components/schemas/SignupSchema"
        )
      ).toBe("Auth");

      expect(
        missingJsonSchemaGenerator["extractModelNameFromSchemaRef"](
          "#/components/schemas/GetMeSchema"
        )
      ).toBe("Auth");
    });

    test("should handle schemas without ModelSchema suffix", () => {
      const result = missingJsonSchemaGenerator[
        "extractModelNameFromSchemaRef"
      ]("#/components/schemas/CreateUserSchema");
      expect(result).toBe("User");
    });

    test("should return null for invalid schema references", () => {
      expect(
        missingJsonSchemaGenerator["extractModelNameFromSchemaRef"](
          "invalid-ref"
        )
      ).toBeNull();

      expect(
        missingJsonSchemaGenerator["extractModelNameFromSchemaRef"](
          "#/components/invalid"
        )
      ).toBeNull();

      expect(
        missingJsonSchemaGenerator["extractModelNameFromSchemaRef"]("")
      ).toBeNull();
    });

    test("should handle undefined or null input", () => {
      expect(() => {
        missingJsonSchemaGenerator["extractModelNameFromSchemaRef"](
          undefined as any
        );
      }).toThrow();

      expect(() => {
        missingJsonSchemaGenerator["extractModelNameFromSchemaRef"](
          null as any
        );
      }).toThrow();
    });
  });

  describe("extractActionFromOperationId", () => {
    test("should extract bulk operations correctly", () => {
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"](
          "createManyUser"
        )
      ).toBe("createMany");
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"](
          "updateManyUser"
        )
      ).toBe("updateMany");
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"](
          "deleteManyUser"
        )
      ).toBe("deleteMany");
    });

    test("should extract single operations correctly", () => {
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"]("createUser")
      ).toBe("createOne");
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"]("updateUser")
      ).toBe("updateOne");
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"]("deleteUser")
      ).toBe("deleteOne");
    });

    test("should handle find operations", () => {
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"](
          "findUserById"
        )
      ).toBe("findOne");
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"](
          "findOneUser"
        )
      ).toBe("findOne");
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"]("findUsers")
      ).toBe("findMany");
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"](
          "findAllUsers"
        )
      ).toBe("findMany");
    });

    test("should handle auth operations", () => {
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"]("login")
      ).toBe("login");
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"]("login")
      ).toBe("login");
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"]("signup")
      ).toBe("signup");
      // expect(
      //   missingJsonSchemaGenerator["extractActionFromOperationId"]("userSignup")
      // ).toBe("signup");
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"]("getMe")
      ).toBe("getMe");
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"]("updateMe")
      ).toBe("updateMe");
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"](
          "updatePassword"
        )
      ).toBe("updatePassword");
    });

    test("should return null for unrecognized operations", () => {
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"](
          "invalidOperation"
        )
      ).toBeNull();
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"](
          "randomString"
        )
      ).toBeNull();
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"]("")
      ).toBeNull();
    });

    test("should handle undefined or null input", () => {
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"](
          undefined as any
        )
      ).toBeNull();
      expect(
        missingJsonSchemaGenerator["extractActionFromOperationId"](null as any)
      ).toBeNull();
    });
  });

  describe("extractModelNameFromOperationId", () => {
    test("should extract model names from standard operations", () => {
      expect(
        missingJsonSchemaGenerator["extractModelNameFromOperationId"](
          "createManyUser"
        )
      ).toBe("User");
      expect(
        missingJsonSchemaGenerator["extractModelNameFromOperationId"](
          "findUsers"
        )
      ).toBe("User");
      expect(
        missingJsonSchemaGenerator["extractModelNameFromOperationId"](
          "updateUser"
        )
      ).toBe("User");
      expect(
        missingJsonSchemaGenerator["extractModelNameFromOperationId"](
          "findUserById"
        )
      ).toBe("User");
    });

    test("should handle plural forms", () => {
      expect(
        missingJsonSchemaGenerator["extractModelNameFromOperationId"](
          "findPosts"
        )
      ).toBe("Post");
      expect(
        missingJsonSchemaGenerator["extractModelNameFromOperationId"](
          "createManyCategories"
        )
      ).toBe("Categorie"); // Note: simple 's' removal
    });

    test("should handle auth operations", () => {
      expect(
        missingJsonSchemaGenerator["extractModelNameFromOperationId"]("login")
      ).toBe("Auth");
      expect(
        missingJsonSchemaGenerator["extractModelNameFromOperationId"]("Login")
      ).toBe("Auth");
      expect(
        missingJsonSchemaGenerator["extractModelNameFromOperationId"]("signup")
      ).toBe("Auth");
      expect(
        missingJsonSchemaGenerator["extractModelNameFromOperationId"]("getMe")
      ).toBe("Auth");
      expect(
        missingJsonSchemaGenerator["extractModelNameFromOperationId"](
          "updatePassword"
        )
      ).toBe("Auth");
    });

    test("should handle edge cases", () => {
      expect(
        missingJsonSchemaGenerator["extractModelNameFromOperationId"]("")
      ).toBeNull();
      expect(
        missingJsonSchemaGenerator["extractModelNameFromOperationId"]("create")
      ).toBe(null);
      expect(
        missingJsonSchemaGenerator["extractModelNameFromOperationId"]("find")
      ).toBe(null);
    });

    test("should handle undefined or null input", () => {
      expect(
        missingJsonSchemaGenerator["extractModelNameFromOperationId"](
          undefined as any
        )
      ).toBeNull();
      expect(
        missingJsonSchemaGenerator["extractModelNameFromOperationId"](
          null as any
        )
      ).toBeNull();
    });
  });

  describe("extractSchemaRefsWithContext", () => {
    test("should extract refs from simple object", () => {
      const obj = {
        operationId: "createUser",
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateUserModelSchema" },
            },
          },
        },
      };

      const refs =
        missingJsonSchemaGenerator["extractSchemaRefsWithContext"](obj);

      expect(refs.size).toBe(1);
      expect(refs.has("#/components/schemas/CreateUserModelSchema")).toBe(true);
      expect(refs.get("#/components/schemas/CreateUserModelSchema")).toEqual({
        operationId: "createUser",
      });
    });

    test("should handle nested objects and arrays", () => {
      const obj = {
        operationId: "testOp",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/UserSchema" },
                },
              },
            },
          },
        },
        parameters: [
          {
            schema: { $ref: "#/components/schemas/QuerySchema" },
          },
        ],
      };

      const refs =
        missingJsonSchemaGenerator["extractSchemaRefsWithContext"](obj);

      expect(refs.size).toBe(2);
      expect(refs.has("#/components/schemas/UserSchema")).toBe(true);
      expect(refs.has("#/components/schemas/QuerySchema")).toBe(true);
    });

    test("should handle null and undefined values", () => {
      const obj = {
        operationId: "test",
        nullValue: null,
        undefinedValue: undefined,
        validRef: { $ref: "#/components/schemas/TestSchema" },
      };

      const refs =
        missingJsonSchemaGenerator["extractSchemaRefsWithContext"](obj);

      expect(refs.size).toBe(1);
      expect(refs.has("#/components/schemas/TestSchema")).toBe(true);
    });

    test("should handle empty objects and arrays", () => {
      const obj = {
        operationId: "test",
        emptyObject: {},
        emptyArray: [],
        validRef: { $ref: "#/components/schemas/TestSchema" },
      };

      const refs =
        missingJsonSchemaGenerator["extractSchemaRefsWithContext"](obj);

      expect(refs.size).toBe(1);
    });

    test("should handle primitive values", () => {
      const refs =
        missingJsonSchemaGenerator["extractSchemaRefsWithContext"]("string");
      expect(refs.size).toBe(0);

      const refs2 =
        missingJsonSchemaGenerator["extractSchemaRefsWithContext"](123);
      expect(refs2.size).toBe(0);

      const refs3 =
        missingJsonSchemaGenerator["extractSchemaRefsWithContext"](true);
      expect(refs3.size).toBe(0);
    });
  });

  describe("extractPathSchemaRefs", () => {
    test("should extract refs from OpenAPI paths", () => {
      const paths: OpenAPIV3.PathsObject = {
        "/users": {
          post: {
            operationId: "createUser",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/CreateUserModelSchema",
                  },
                },
              },
            },
            responses: {
              "201": {
                description: "Created",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/UserModelSchema" },
                  },
                },
              },
            },
          },
        },
      };

      const refs = missingJsonSchemaGenerator["extractPathSchemaRefs"](paths);

      expect(refs.size).toBe(2);
      expect(refs.has("#/components/schemas/CreateUserModelSchema")).toBe(true);
      expect(refs.has("#/components/schemas/UserModelSchema")).toBe(true);

      const createUserContext = refs.get(
        "#/components/schemas/CreateUserModelSchema"
      );
      expect(createUserContext).toEqual({
        method: "post",
        path: "/users",
        operationId: "createUser",
      });
    });

    test("should handle paths with null or undefined values", () => {
      const paths: OpenAPIV3.PathsObject = {
        "/users": {
          post: undefined,
          get: null,
        } as any,
        "/posts": null as any,
        "/valid": {
          get: {
            operationId: "getValid",
            responses: {
              "200": {
                description: "OK",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ValidSchema" },
                  },
                },
              },
            },
          },
        },
      };

      const refs = missingJsonSchemaGenerator["extractPathSchemaRefs"](paths);

      expect(refs.size).toBe(1);
      expect(refs.has("#/components/schemas/ValidSchema")).toBe(true);
    });

    test("should handle empty paths object", () => {
      const paths: OpenAPIV3.PathsObject = {};
      const refs = missingJsonSchemaGenerator["extractPathSchemaRefs"](paths);
      expect(refs.size).toBe(0);
    });
  });

  describe("getSchemaNameFromRef", () => {
    test("should extract schema name from valid refs", () => {
      expect(
        missingJsonSchemaGenerator["getSchemaNameFromRef"](
          "#/components/schemas/CreateUserModelSchema"
        )
      ).toBe("CreateUserModelSchema");

      expect(
        missingJsonSchemaGenerator["getSchemaNameFromRef"](
          "#/components/schemas/UserSchema"
        )
      ).toBe("UserSchema");
    });

    test("should return null for invalid refs", () => {
      expect(
        missingJsonSchemaGenerator["getSchemaNameFromRef"]("invalid")
      ).toBeNull();
      expect(
        missingJsonSchemaGenerator["getSchemaNameFromRef"](
          "#/invalid/schemas/Test"
        )
      ).toBeNull();
      expect(missingJsonSchemaGenerator["getSchemaNameFromRef"]("")).toBeNull();
    });

    test("should handle undefined or null input", () => {
      expect(() => {
        missingJsonSchemaGenerator["getSchemaNameFromRef"](undefined as any);
      }).toThrow();

      expect(() => {
        missingJsonSchemaGenerator["getSchemaNameFromRef"](null as any);
      }).toThrow();
    });
  });

  describe("generateMissingJsonSchemas", () => {
    const mockArkosConfig: ArkosConfig = {
      swagger: { mode: "prisma", strict: false },
    } as any;

    beforeEach(() => {
      mockEnhancedGenerator.generateModelSchemas.mockResolvedValue({
        CreateUserModelSchema: {
          type: "object",
          properties: { name: { type: "string" } },
        },
        FindManyUserModelSchema: {
          type: "object",
          properties: { where: { type: "object" } },
        },
      });
    });

    test("should generate missing schemas for valid paths", async () => {
      const paths: any = {
        "/users": {
          post: {
            operationId: "createUser",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/CreateUserModelSchema",
                  },
                },
              },
            },
          },
          get: {
            operationId: "findUsers",
            responses: {
              "200": {
                description: "OK",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/FindManyUserModelSchema",
                    },
                  },
                },
              },
            },
          },
        },
      };

      const currentJsonSchemas = {};

      const result =
        await missingJsonSchemaGenerator.generateMissingJsonSchemas(
          paths,
          currentJsonSchemas,
          mockArkosConfig
        );

      expect(mockEnhancedGenerator.generateModelSchemas).toHaveBeenCalledWith({
        modelName: "User",
        arkosConfig: mockArkosConfig,
        schemasToGenerate: expect.arrayContaining(["createOne", "findMany"]),
      });

      expect(result).toEqual({
        CreateUserModelSchema: {
          type: "object",
          properties: { name: { type: "string" } },
        },
        FindManyUserModelSchema: {
          type: "object",
          properties: { where: { type: "object" } },
        },
      });
    });

    test("should skip existing schemas", async () => {
      const paths: any = {
        "/users": {
          post: {
            operationId: "createUser",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/CreateUserModelSchema",
                  },
                },
              },
            },
          },
        },
      };

      const currentJsonSchemas = {
        CreateUserModelSchema: {
          type: "object",
          properties: { existing: true },
        },
      };

      const result =
        await missingJsonSchemaGenerator.generateMissingJsonSchemas(
          paths,
          currentJsonSchemas,
          mockArkosConfig
        );

      expect(mockEnhancedGenerator.generateModelSchemas).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });

    test("should handle auth schemas correctly", async () => {
      mockEnhancedGenerator.generateModelSchemas.mockResolvedValue({
        LoginSchema: {
          type: "object",
          properties: { email: { type: "string" } },
        },
        SignupSchema: {
          type: "object",
          properties: { email: { type: "string" } },
        },
      });

      const paths: any = {
        "/auth/login": {
          post: {
            operationId: "login",
            requestBody: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/LoginSchema" },
                },
              },
            },
          },
        },
        "/auth/signup": {
          post: {
            operationId: "signup",
            requestBody: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SignupSchema" },
                },
              },
            },
          },
        },
      };

      const result =
        await missingJsonSchemaGenerator.generateMissingJsonSchemas(
          paths,
          {},
          mockArkosConfig
        );

      expect(result).toEqual({
        LoginSchema: {
          type: "object",
          properties: { email: { type: "string" } },
        },
        SignupSchema: {
          type: "object",
          properties: { email: { type: "string" } },
        },
      });
    });

    test("should handle generation errors gracefully", async () => {
      mockEnhancedGenerator.generateModelSchemas.mockRejectedValue(
        new Error("Generation failed")
      );

      const paths: any = {
        "/users": {
          post: {
            operationId: "createUser",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/CreateUserModelSchema",
                  },
                },
              },
            },
          },
        },
      };

      // Should not throw
      const result =
        await missingJsonSchemaGenerator.generateMissingJsonSchemas(
          paths,
          {},
          mockArkosConfig
        );

      expect(result).toEqual({});
    });

    test("should handle refs without proper ModelSchema format", async () => {
      const paths: OpenAPIV3.PathsObject = {
        "/test": {
          get: {
            operationId: "test",
            responses: {
              "200": {
                description: "OK",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/SomeRandomRef" },
                  },
                },
              },
            },
          },
        },
      };

      const result =
        await missingJsonSchemaGenerator.generateMissingJsonSchemas(
          paths,
          {},
          mockArkosConfig
        );

      expect(mockEnhancedGenerator.generateModelSchemas).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });

    test("should handle undefined operationId gracefully", async () => {
      const paths: OpenAPIV3.PathsObject = {
        "/users": {
          post: {
            // No operationId
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/CreateUserModelSchema",
                  },
                },
              },
            },
          } as any,
        },
      };

      mockEnhancedGenerator.generateModelSchemas.mockResolvedValue({
        CreateUserModelSchema: { type: "object" },
      });

      await missingJsonSchemaGenerator.generateMissingJsonSchemas(
        paths,
        {},
        mockArkosConfig
      );

      // Should still work by falling back to schema ref analysis
      expect(mockEnhancedGenerator.generateModelSchemas).toHaveBeenCalled();
    });

    test("should handle empty paths gracefully", async () => {
      const result =
        await missingJsonSchemaGenerator.generateMissingJsonSchemas(
          {},
          {},
          mockArkosConfig
        );

      expect(result).toEqual({});
      expect(mockEnhancedGenerator.generateModelSchemas).not.toHaveBeenCalled();
    });
  });

  describe("analyzeMissingSchemas", () => {
    test("should analyze and categorize schema references", () => {
      const paths: any = {
        "/users": {
          post: {
            operationId: "createUser",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/CreateUserModelSchema",
                  },
                },
              },
            },
          },
        },
      };

      const currentJsonSchemas = {
        ExistingSchema: { type: "object" },
      };

      const result = missingJsonSchemaGenerator.analyzeMissingSchemas(
        paths,
        currentJsonSchemas
      );

      expect(result.allRefs).toHaveLength(1);
      expect(result.missingRefs).toHaveLength(1);
      expect(result.existingRefs).toHaveLength(0);
      expect(result.modelActions).toHaveLength(1);

      expect(result.modelActions[0]).toEqual({
        model: "User",
        action: "createOne",
        ref: "#/components/schemas/CreateUserModelSchema",
        operationId: "createUser",
      });
    });

    test("should handle mixed existing and missing schemas", () => {
      const paths: any = {
        "/users": {
          post: {
            operationId: "createUser",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/CreateUserModelSchema",
                  },
                },
              },
            },
          },
          get: {
            operationId: "findUsers",
            responses: {
              "200": {
                description: "OK",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ExistingUserSchema" },
                  },
                },
              },
            },
          },
        },
      };

      const currentJsonSchemas = {
        ExistingUserSchema: { type: "object" },
      };

      const result = missingJsonSchemaGenerator.analyzeMissingSchemas(
        paths,
        currentJsonSchemas
      );

      expect(result.allRefs).toHaveLength(2);
      expect(result.missingRefs).toHaveLength(1);
      expect(result.existingRefs).toHaveLength(1);
      expect(result.modelActions).toHaveLength(1);
    });

    test("should handle empty inputs", () => {
      const result = missingJsonSchemaGenerator.analyzeMissingSchemas({}, {});

      expect(result.allRefs).toHaveLength(0);
      expect(result.missingRefs).toHaveLength(0);
      expect(result.existingRefs).toHaveLength(0);
      expect(result.modelActions).toHaveLength(0);
    });
  });

  describe("extractActionFromSchemaRef (legacy method)", () => {
    test("should extract actions from schema references", () => {
      expect(
        missingJsonSchemaGenerator["extractActionFromSchemaRef"](
          "#/components/schemas/CreateManyUserModelSchema"
        )
      ).toBe("createMany");

      expect(
        missingJsonSchemaGenerator["extractActionFromSchemaRef"](
          "#/components/schemas/CreateUserModelSchema"
        )
      ).toBe("createOne");

      expect(
        missingJsonSchemaGenerator["extractActionFromSchemaRef"](
          "#/components/schemas/UpdateManyUserModelSchema"
        )
      ).toBe("updateMany");

      expect(
        missingJsonSchemaGenerator["extractActionFromSchemaRef"](
          "#/components/schemas/UpdateUserModelSchema"
        )
      ).toBe("updateOne");

      expect(
        missingJsonSchemaGenerator["extractActionFromSchemaRef"](
          "#/components/schemas/FindManyUserModelSchema"
        )
      ).toBe("findMany");
    });

    test("should handle auth-specific schemas", () => {
      expect(
        missingJsonSchemaGenerator["extractActionFromSchemaRef"](
          "#/components/schemas/LoginSchema"
        )
      ).toBe("login");

      expect(
        missingJsonSchemaGenerator["extractActionFromSchemaRef"](
          "#/components/schemas/UpdateMeSchema"
        )
      ).toBe("updateMe");

      expect(
        missingJsonSchemaGenerator["extractActionFromSchemaRef"](
          "#/components/schemas/UpdatePasswordSchema"
        )
      ).toBe("updatePassword");
    });

    test("should differentiate between UpdateMe and regular Update", () => {
      expect(
        missingJsonSchemaGenerator["extractActionFromSchemaRef"](
          "#/components/schemas/UpdateUserModelSchema"
        )
      ).toBe("updateOne");

      expect(
        missingJsonSchemaGenerator["extractActionFromSchemaRef"](
          "#/components/schemas/UpdateMeSchema"
        )
      ).toBe("updateMe");

      expect(
        missingJsonSchemaGenerator["extractActionFromSchemaRef"](
          "#/components/schemas/UpdatePasswordSchema"
        )
      ).toBe("updatePassword");
    });

    test("should return null for unrecognized schemas", () => {
      expect(
        missingJsonSchemaGenerator["extractActionFromSchemaRef"](
          "#/components/schemas/UnknownSchema"
        )
      ).toBeNull();

      expect(
        missingJsonSchemaGenerator["extractActionFromSchemaRef"]("invalid-ref")
      ).toBeNull();

      expect(
        missingJsonSchemaGenerator["extractActionFromSchemaRef"]("")
      ).toBeNull();
    });
  });

  describe("Edge Cases and Error Handling", () => {
    // test("should handle circular references without infinite loops", () => {
    //   const circular: any = { operationId: "test" };
    //   circular.self = circular;
    //   circular.schema = { $ref: "#/components/schemas/TestSchema" };

    //   const refs =
    //     missingJsonSchemaGenerator["extractSchemaRefsWithContext"](circular);
    //   expect(refs.size).toBe(1);
    //   expect(refs.has("#/components/schemas/TestSchema")).toBe(true);
    // });

    test("should handle very deeply nested objects", () => {
      let deep: any = { operationId: "test" };
      for (let i = 0; i < 100; i++) {
        deep = { nested: deep };
      }
      deep.schema = { $ref: "#/components/schemas/DeepSchema" };

      const refs =
        missingJsonSchemaGenerator["extractSchemaRefsWithContext"](deep);
      expect(refs.size).toBe(1);
    });

    test("should handle malformed OpenAPI paths", () => {
      const malformedPaths: any = {
        "/test": "not-an-object",
        "/valid": {
          get: {
            operationId: "validOp",
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ValidSchema" },
                  },
                },
              },
            },
          },
        },
      };

      const refs =
        missingJsonSchemaGenerator["extractPathSchemaRefs"](malformedPaths);
      expect(refs.size).toBe(1);
      expect(refs.has("#/components/schemas/ValidSchema")).toBe(true);
    });
  });
});
