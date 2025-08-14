import { getSystemJsonSchemaPaths } from "../get-system-json-schema-paths";
import { OpenAPIV3 } from "openapi-types";

describe("getSystemJsonSchemaPaths", () => {
  describe("Basic Functionality", () => {
    test("should return a valid OpenAPI PathsObject", () => {
      const result = getSystemJsonSchemaPaths();

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(result).not.toBeNull();
    });

    test("should contain the /api/available-resources path", () => {
      const result = getSystemJsonSchemaPaths();

      expect(result).toHaveProperty("/api/available-resources");
      expect(result["/api/available-resources"]).toBeDefined();
    });

    test("should have GET method for /api/available-resources", () => {
      const result = getSystemJsonSchemaPaths();

      const path = result["/api/available-resources"];
      expect(path).toHaveProperty("get");
      expect(path?.get).toBeDefined();
    });
  });

  describe("OpenAPI Schema Structure Validation", () => {
    let pathDefinition: OpenAPIV3.OperationObject;

    beforeEach(() => {
      const result = getSystemJsonSchemaPaths();
      pathDefinition = result?.["/api/available-resources"]
        ?.get as OpenAPIV3.OperationObject;
    });

    test("should have correct basic properties", () => {
      expect(pathDefinition.tags).toEqual(["System"]);
      expect(pathDefinition.summary).toBe("Get available resources");
      expect(pathDefinition.description).toBe(
        "Returns a comprehensive list of all available API resource endpoints"
      );
      expect(pathDefinition.operationId).toBe("getAvailableResources");
    });

    test("should have valid tags array", () => {
      expect(Array.isArray(pathDefinition.tags)).toBe(true);
      expect(pathDefinition.tags).toHaveLength(1);
      expect(pathDefinition.tags?.[0]).toBe("System");
    });

    test("should have proper responses structure", () => {
      expect(pathDefinition.responses).toBeDefined();
      expect(pathDefinition.responses).toHaveProperty("200");
    });

    test("should have correct 200 response structure", () => {
      const response200 = pathDefinition.responses[
        "200"
      ] as OpenAPIV3.ResponseObject;

      expect(response200.description).toBe(
        "List of available resources retrieved successfully"
      );
      expect(response200.content).toBeDefined();
      expect(response200.content).toHaveProperty("application/json");
    });

    test("should have valid JSON content schema", () => {
      const response200 = pathDefinition.responses[
        "200"
      ] as OpenAPIV3.ResponseObject;
      const jsonContent = response200.content?.["application/json"];

      expect(jsonContent?.schema).toBeDefined();
      expect((jsonContent?.schema as any)?.type).toBe("object");
      expect((jsonContent?.schema as any)?.properties).toBeDefined();
    });

    test("should have correct data property schema", () => {
      const response200 = pathDefinition.responses[
        "200"
      ] as OpenAPIV3.ResponseObject;
      const jsonContent = response200.content?.["application/json"];

      const schema = (jsonContent as any).schema as OpenAPIV3.SchemaObject;
      const dataProperty = (schema as any).properties
        .data as OpenAPIV3.SchemaObject;

      expect(dataProperty.type).toBe("array");
      expect(dataProperty.description).toBe(
        "Array of available resource endpoints"
      );
      expect((dataProperty as any).items).toBeDefined();

      const items = (dataProperty as any).items as OpenAPIV3.SchemaObject;
      expect(items.type).toBe("string");
    });
  });

  describe("Immutability and Consistency", () => {
    test("should return the same structure on multiple calls", () => {
      const result1 = getSystemJsonSchemaPaths();
      const result2 = getSystemJsonSchemaPaths();

      expect(result1).toEqual(result2);
    });

    test("should not be the same object reference (new object each time)", () => {
      const result1 = getSystemJsonSchemaPaths();
      const result2 = getSystemJsonSchemaPaths();

      expect(result1).not.toBe(result2);
    });

    test("should allow modification without affecting subsequent calls", () => {
      const result1 = getSystemJsonSchemaPaths();

      // Modify the returned object
      (result1?.["/api/available-resources"]?.get as any).summary =
        "Modified summary";
      delete result1["/api/available-resources"]?.get?.description;

      const result2 = getSystemJsonSchemaPaths();
      const get2 = result2?.["/api/available-resources"]
        ?.get as OpenAPIV3.OperationObject;

      // Should not be affected by modifications to previous result
      expect(get2.summary).toBe("Get available resources");
      expect(get2.description).toBe(
        "Returns a comprehensive list of all available API resource endpoints"
      );
    });
  });

  describe("Type Safety and Schema Validation", () => {
    test("should conform to OpenAPIV3.PathsObject type", () => {
      const result = getSystemJsonSchemaPaths();

      // TypeScript compilation should catch type mismatches
      const pathsObject: OpenAPIV3.PathsObject = result;
      expect(pathsObject).toBeDefined();
    });

    test("should have valid HTTP method", () => {
      const result = getSystemJsonSchemaPaths();
      const pathItem = result["/api/available-resources"];

      // Should only have GET method
      expect(pathItem?.get).toBeDefined();
      expect(pathItem?.post).toBeUndefined();
      expect(pathItem?.put).toBeUndefined();
      expect(pathItem?.delete).toBeUndefined();
      expect(pathItem?.patch).toBeUndefined();
      expect(pathItem?.head).toBeUndefined();
      expect(pathItem?.options).toBeUndefined();
      expect(pathItem?.trace).toBeUndefined();
    });

    test("should have string values for required properties", () => {
      const result = getSystemJsonSchemaPaths();
      const operation = result?.["/api/available-resources"]
        ?.get as OpenAPIV3.OperationObject;

      expect(typeof operation.summary).toBe("string");
      expect(typeof operation.description).toBe("string");
      expect(typeof operation.operationId).toBe("string");
      expect(operation.summary?.length).toBeGreaterThan(0);
      expect(operation.description?.length).toBeGreaterThan(0);
      expect(operation.operationId?.length).toBeGreaterThan(0);
    });
  });

  describe("Response Schema Deep Validation", () => {
    test("should have no additional response codes", () => {
      const result = getSystemJsonSchemaPaths();
      const operation = result?.["/api/available-resources"]
        ?.get as OpenAPIV3.OperationObject;

      const responseKeys = Object.keys(operation.responses);
      expect(responseKeys).toEqual(["200"]);
    });

    test("should have complete schema object structure", () => {
      const result = getSystemJsonSchemaPaths();
      const operation = result?.["/api/available-resources"]
        ?.get as OpenAPIV3.OperationObject;
      const response200 = operation.responses[
        "200"
      ] as OpenAPIV3.ResponseObject;
      const jsonSchema = response200.content?.["application/json"]
        .schema as OpenAPIV3.SchemaObject;

      expect(jsonSchema.type).toBe("object");
      expect(jsonSchema.properties).toBeDefined();
      expect(Object.keys((jsonSchema as any).properties)).toEqual(["data"]);

      const dataSchema = (jsonSchema.properties as any)
        .data as OpenAPIV3.SchemaObject;
      expect(dataSchema.type).toBe("array");
      expect((dataSchema as any).items).toBeDefined();
      expect(dataSchema.description).toBeDefined();

      const itemsSchema = (dataSchema as any).items;
      expect(itemsSchema.type).toBe("string");
    });

    test("should not have additional schema properties", () => {
      const result = getSystemJsonSchemaPaths();
      const operation = result?.["/api/available-resources"]
        ?.get as OpenAPIV3.OperationObject;
      const response200 = operation.responses[
        "200"
      ] as OpenAPIV3.ResponseObject;
      const jsonSchema = response200?.content?.["application/json"]
        .schema as OpenAPIV3.SchemaObject;

      // Check that we don't have unexpected properties
      const allowedSchemaProperties = [
        "type",
        "properties",
        "required",
        "additionalProperties",
        "description",
        "title",
        "example",
        "examples",
      ];

      const actualProperties = Object.keys(jsonSchema);
      actualProperties.forEach((prop) => {
        expect(["type", "properties"].includes(prop)).toBe(true);
      });
    });
  });

  describe("Edge Cases and Robustness", () => {
    test("should handle property access without errors", () => {
      const result = getSystemJsonSchemaPaths();

      expect(() => {
        const path = result["/api/available-resources"];
        const get = path?.get;
        const tags = get?.tags;
        const responses = get?.responses;
        const response200 = responses?.["200"];
      }).not.toThrow();
    });

    test("should return object that can be JSON serialized", () => {
      const result = getSystemJsonSchemaPaths();

      expect(() => {
        JSON.stringify(result);
      }).not.toThrow();

      const serialized = JSON.stringify(result);
      const parsed = JSON.parse(serialized);

      expect(parsed).toEqual(result);
    });

    test("should have valid path format", () => {
      const result = getSystemJsonSchemaPaths();
      const paths = Object.keys(result);

      expect(paths).toHaveLength(1);
      expect(paths[0]).toBe("/api/available-resources");
      expect(paths[0]).toMatch(/^\/api\//); // Should start with /api/
    });
  });

  describe("OpenAPI Specification Compliance", () => {
    test("should have required OpenAPI operation properties", () => {
      const result = getSystemJsonSchemaPaths();
      const operation = result["/api/available-resources"]
        ?.get as OpenAPIV3.OperationObject;

      // Required by OpenAPI spec
      expect(operation.responses).toBeDefined();

      // Common best practices
      expect(operation.summary).toBeDefined();
      expect(operation.operationId).toBeDefined();
      expect(operation.tags).toBeDefined();
    });

    test("should have valid response content type", () => {
      const result = getSystemJsonSchemaPaths();
      const operation = result["/api/available-resources"]
        ?.get as OpenAPIV3.OperationObject;
      const response200 = operation.responses[
        "200"
      ] as OpenAPIV3.ResponseObject;

      expect(response200.content).toHaveProperty("application/json");

      const contentTypes = Object.keys(response200.content!);
      expect(contentTypes).toEqual(["application/json"]);
    });

    test("should not have parameters (since it is a simple GET)", () => {
      const result = getSystemJsonSchemaPaths();
      const operation = result["/api/available-resources"]
        ?.get as OpenAPIV3.OperationObject;

      expect(operation.parameters).toBeUndefined();
    });

    test("should not have request body (since it is a GET)", () => {
      const result = getSystemJsonSchemaPaths();
      const operation = result["/api/available-resources"]
        ?.get as OpenAPIV3.OperationObject;

      expect(operation.requestBody).toBeUndefined();
    });
  });
});
