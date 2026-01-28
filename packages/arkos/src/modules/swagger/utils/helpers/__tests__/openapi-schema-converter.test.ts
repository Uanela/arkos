import openApiSchemaConverter from "../openapi-schema-converter";
import { getArkosConfig } from "../../../../../server";
import { isClass, isZodSchema } from "../../../../../utils/dynamic-loader";
import zodToJsonSchema from "zod-to-json-schema";
import classValidatorToJsonSchema from "../class-validator-to-json-schema";

jest.mock("../../../../../server");
jest.mock("../../../../../utils/dynamic-loader");
jest.mock("zod-to-json-schema");
jest.mock("../../helpers/class-validator-to-json-schema");
jest.mock("fs");

const mockGetArkosConfig = getArkosConfig as jest.MockedFunction<
  typeof getArkosConfig
>;
const mockIsZodSchema = isZodSchema as jest.MockedFunction<typeof isZodSchema>;
const mockIsClass = isClass as jest.MockedFunction<typeof isClass>;
const mockZodToJsonSchema = zodToJsonSchema as jest.MockedFunction<
  typeof zodToJsonSchema
>;
const mockClassValidatorToJsonSchema =
  classValidatorToJsonSchema as jest.MockedFunction<
    typeof classValidatorToJsonSchema
  >;

describe("OpenAPISchemaConverter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetArkosConfig.mockReturnValue({
      validation: { resolver: "zod" },
    } as any);
  });

  describe("convertResponseDefinition", () => {
    it("should convert shorthand schema to response object with default description", () => {
      const mockSchema = { _def: {} };
      mockIsZodSchema.mockReturnValue(true);
      mockZodToJsonSchema.mockReturnValue({ type: "object" });

      const result = openApiSchemaConverter.convertResponseDefinition(
        "200",
        mockSchema
      );

      expect(result).toEqual({
        description: "Success",
        content: {
          "application/json": {
            schema: { type: "object" },
          },
        },
      });
    });

    it("should use custom status code descriptions", () => {
      const mockSchema = { _def: {} };
      mockIsZodSchema.mockReturnValue(true);
      mockZodToJsonSchema.mockReturnValue({ type: "object" });

      const result404 = openApiSchemaConverter.convertResponseDefinition(
        "404",
        mockSchema
      );
      const result500 = openApiSchemaConverter.convertResponseDefinition(
        "500",
        mockSchema
      );
      const result999 = openApiSchemaConverter.convertResponseDefinition(
        "999",
        mockSchema
      );

      expect(result404.description).toBe("Not Found");
      expect(result500.description).toBe("Internal Server Error");
      expect(result999.description).toBe("Response");
    });

    it("should convert medium format with content schema and custom description", () => {
      const mockSchema = { _def: {} };
      const definition = {
        content: mockSchema,
        description: "Custom description",
      };

      mockIsZodSchema.mockReturnValue(true);
      mockZodToJsonSchema.mockReturnValue({ type: "object" });

      const result = openApiSchemaConverter.convertResponseDefinition(
        "200",
        definition
      );

      expect(result).toEqual({
        description: "Custom description",
        content: {
          "application/json": {
            schema: { type: "object" },
          },
        },
      });
    });

    it("should include headers and links in medium format", () => {
      const mockSchema = { _def: {} };
      const definition = {
        content: mockSchema,
        description: "Test",
        headers: { "X-Custom": { schema: { type: "string" } } },
        links: { next: { operationId: "getNext" } },
      };

      mockIsZodSchema.mockReturnValue(true);
      mockZodToJsonSchema.mockReturnValue({ type: "object" });

      const result = openApiSchemaConverter.convertResponseDefinition(
        "200",
        definition
      );

      expect(result.headers).toEqual({
        "X-Custom": { schema: { type: "string" } },
      });
      expect(result.links).toEqual({ next: { operationId: "getNext" } });
    });

    it("should convert full format with multiple content types", () => {
      const mockSchema1 = { _def: {} };
      const mockSchema2 = class TestDto {};
      const definition = {
        description: "Multi-format response",
        content: {
          "application/json": { schema: mockSchema1 },
          "text/xml": { schema: mockSchema2 },
        },
        headers: { "X-Test": {} },
      };

      mockIsZodSchema.mockImplementation((s) => s === mockSchema1);
      mockIsClass.mockImplementation((s) => s === mockSchema2);
      mockZodToJsonSchema.mockReturnValue({ type: "object" });
      mockClassValidatorToJsonSchema.mockReturnValue({ type: "string" });

      const result = openApiSchemaConverter.convertResponseDefinition(
        "200",
        definition
      );

      expect(result.content).toHaveProperty("application/json");
      expect(result.content).toHaveProperty("text/xml");
      expect(result.headers).toEqual({ "X-Test": {} });
    });

    it("should return definition as-is if no content property", () => {
      const definition = { description: "No content" };

      const result = openApiSchemaConverter.convertResponseDefinition(
        "200",
        definition
      );

      expect(result).toEqual(definition);
    });

    it("should handle class schemas", () => {
      class TestDto {}
      mockIsClass.mockReturnValue(true);
      mockGetArkosConfig.mockReturnValue({
        validation: { resolver: "class-validator" },
      } as any);
      mockClassValidatorToJsonSchema.mockReturnValue({ type: "object" });

      const result = openApiSchemaConverter.convertResponseDefinition(
        "200",
        TestDto
      );

      expect(result.content?.["application/json"].schema).toEqual({
        type: "object",
      });
    });
  });

  describe("convertRequestBodyDefinition", () => {
    it("should return undefined for falsy definition", () => {
      expect(
        openApiSchemaConverter.convertRequestBodyDefinition(null)
      ).toBeUndefined();
      expect(
        openApiSchemaConverter.convertRequestBodyDefinition(undefined)
      ).toBeUndefined();
    });

    it("should convert shorthand schema with required: true", () => {
      const mockSchema = { _def: {} };
      mockIsZodSchema.mockReturnValue(true);
      mockZodToJsonSchema.mockReturnValue({ type: "object" });

      const result =
        openApiSchemaConverter.convertRequestBodyDefinition(mockSchema);

      expect(result).toEqual({
        required: true,
        content: {
          "application/json": {
            schema: { type: "object" },
          },
        },
      });
    });

    it("should convert medium format with custom required and description", () => {
      const mockSchema = { _def: {} };
      const definition = {
        content: mockSchema,
        required: false,
        description: "Optional body",
      };

      mockIsZodSchema.mockReturnValue(true);
      mockZodToJsonSchema.mockReturnValue({ type: "object" });

      const result =
        openApiSchemaConverter.convertRequestBodyDefinition(definition);

      expect(result).toEqual({
        required: false,
        description: "Optional body",
        content: {
          "application/json": {
            schema: { type: "object" },
          },
        },
      });
    });

    it("should default required to true when not specified in medium format", () => {
      const mockSchema = { _def: {} };
      const definition = { content: mockSchema };

      mockIsZodSchema.mockReturnValue(true);
      mockZodToJsonSchema.mockReturnValue({ type: "object" });

      const result =
        openApiSchemaConverter.convertRequestBodyDefinition(definition);

      expect(result?.required).toBe(true);
    });

    it("should convert full format with multiple content types", () => {
      const mockSchema1 = { _def: {} };
      const mockSchema2 = class TestDto {};
      const definition = {
        required: true,
        description: "Upload file",
        content: {
          "application/json": { schema: mockSchema1 },
          "multipart/form-data": { schema: mockSchema2 },
        },
      };

      mockIsZodSchema.mockImplementation((s) => s === mockSchema1);
      mockIsClass.mockImplementation((s) => s === mockSchema2);
      mockZodToJsonSchema.mockReturnValue({ type: "object" });
      mockClassValidatorToJsonSchema.mockReturnValue({ type: "string" });

      const result =
        openApiSchemaConverter.convertRequestBodyDefinition(definition);

      expect(result?.content).toHaveProperty("application/json");
      expect(result?.content).toHaveProperty("multipart/form-data");
      expect(result?.description).toBe("Upload file");
    });

    it("should return definition as-is if no recognized format", () => {
      const definition = { someOtherProp: true };

      const result =
        openApiSchemaConverter.convertRequestBodyDefinition(definition);

      expect(result).toEqual(definition);
    });
  });

  describe("convertParameters", () => {
    it("should return undefined for undefined parameters", () => {
      expect(
        openApiSchemaConverter.convertParameters(undefined)
      ).toBeUndefined();
    });

    it("should preserve $ref parameters", () => {
      const params = [{ $ref: "#/components/parameters/UserId" }];

      const result = openApiSchemaConverter.convertParameters(params);

      expect(result).toEqual(params);
    });

    it("should convert schema in parameters", () => {
      const mockSchema = { _def: {} };
      const params = [
        {
          name: "userId",
          in: "path",
          schema: mockSchema,
        },
      ];

      mockIsZodSchema.mockReturnValue(true);
      mockZodToJsonSchema.mockReturnValue({ type: "string" });

      const result = openApiSchemaConverter.convertParameters(params);

      expect(result?.[0]).toEqual({
        name: "userId",
        in: "path",
        schema: { type: "string" },
      });
    });

    it("should preserve parameters without schema", () => {
      const params = [
        {
          name: "userId",
          in: "path",
          required: true,
        },
      ];

      const result = openApiSchemaConverter.convertParameters(params);

      expect(result).toEqual(params);
    });

    it("should handle mixed parameter types", () => {
      const mockSchema = { _def: {} };
      const params = [
        { $ref: "#/components/parameters/Common" },
        { name: "page", in: "query", schema: mockSchema },
        { name: "sort", in: "query", required: false },
      ];

      mockIsZodSchema.mockReturnValue(true);
      mockZodToJsonSchema.mockReturnValue({ type: "number" });

      const result: any = openApiSchemaConverter.convertParameters(params);

      expect(result?.[0]).toHaveProperty("$ref");
      expect(result?.[1].schema).toEqual({ type: "number" });
      expect(result?.[2]).toEqual(params[2]);
    });
  });

  describe("convertResponses", () => {
    it("should return undefined for undefined responses", () => {
      expect(
        openApiSchemaConverter.convertResponses(undefined)
      ).toBeUndefined();
    });

    it("should convert all responses in object", () => {
      const mockSchema1 = { _def: {} };
      const mockSchema2 = { _def: {} };
      const responses = {
        200: mockSchema1,
        404: mockSchema2,
      };

      mockIsZodSchema.mockReturnValue(true);
      mockZodToJsonSchema.mockReturnValue({ type: "object" });

      const result = openApiSchemaConverter.convertResponses(responses);

      expect(result).toHaveProperty("200");
      expect(result).toHaveProperty("404");
      expect(result?.["200"].description).toBe("Success");
      expect(result?.["404"].description).toBe("Not Found");
    });
  });

  describe("convertOpenAPIConfig", () => {
    it("should return config as-is for false", () => {
      expect(openApiSchemaConverter.convertOpenAPIConfig(false)).toBe(false);
    });

    it("should return config as-is for null", () => {
      expect(openApiSchemaConverter.convertOpenAPIConfig(null)).toBeNull();
    });

    it("should convert responses in config", () => {
      const mockSchema = { _def: {} };
      const config = {
        summary: "Test endpoint",
        responses: { 200: mockSchema },
      };

      mockIsZodSchema.mockReturnValue(true);
      mockZodToJsonSchema.mockReturnValue({ type: "object" });

      const result = openApiSchemaConverter.convertOpenAPIConfig(config);

      expect(result.summary).toBe("Test endpoint");
      expect(result.responses).toHaveProperty("200");
    });

    it("should convert requestBody in config", () => {
      const mockSchema = { _def: {} };
      const config = {
        summary: "Create resource",
        requestBody: mockSchema,
      };

      mockIsZodSchema.mockReturnValue(true);
      mockZodToJsonSchema.mockReturnValue({ type: "object" });

      const result = openApiSchemaConverter.convertOpenAPIConfig(config);

      expect(result.requestBody).toHaveProperty("content");
      expect(result.requestBody.required).toBe(true);
    });

    it("should convert parameters in config", () => {
      const mockSchema = { _def: {} };
      const config = {
        summary: "List resources",
        parameters: [{ name: "limit", in: "query", schema: mockSchema }],
      };

      mockIsZodSchema.mockReturnValue(true);
      mockZodToJsonSchema.mockReturnValue({ type: "number" });

      const result = openApiSchemaConverter.convertOpenAPIConfig(config);

      expect(result.parameters).toHaveLength(1);
      expect(result.parameters[0].schema).toEqual({ type: "number" });
    });

    it("should convert all properties together", () => {
      const mockSchema = { _def: {} };
      const config = {
        summary: "Complex endpoint",
        responses: { 200: mockSchema },
        requestBody: mockSchema,
        parameters: [{ name: "id", in: "path", schema: mockSchema }],
      };

      mockIsZodSchema.mockReturnValue(true);
      mockZodToJsonSchema.mockReturnValue({ type: "object" });

      const result = openApiSchemaConverter.convertOpenAPIConfig(config);

      expect(result).toHaveProperty("responses");
      expect(result).toHaveProperty("requestBody");
      expect(result).toHaveProperty("parameters");
      expect(result.summary).toBe("Complex endpoint");
    });

    it("should preserve other properties", () => {
      const config = {
        summary: "Test",
        tags: ["users"],
        operationId: "getUser",
        deprecated: true,
      };

      const result = openApiSchemaConverter.convertOpenAPIConfig(config);

      expect(result.tags).toEqual(["users"]);
      expect(result.operationId).toBe("getUser");
      expect(result.deprecated).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should throw error for unsupported schema type in convertToJsonSchema", () => {
      const invalidSchema = "not a schema";
      const definition = { content: invalidSchema };

      mockIsZodSchema.mockReturnValue(false);
      mockIsClass.mockReturnValue(false);

      expect(() => {
        openApiSchemaConverter.convertResponseDefinition("200", definition);
      }).toThrow("Unsupported schema type");
    });

    it("should handle JSON Schema objects directly", () => {
      const jsonSchema = {
        type: "object",
        properties: { name: { type: "string" } },
      };
      const definition = { content: jsonSchema };

      mockIsZodSchema.mockReturnValue(false);
      mockIsClass.mockReturnValue(false);

      const result = openApiSchemaConverter.convertResponseDefinition(
        "200",
        definition
      );

      expect(result.content?.["application/json"].schema).toEqual(jsonSchema);
    });

    it("should handle plain JSON Schema in shorthand format", () => {
      const jsonSchema = { type: "string", format: "uuid" };

      mockIsZodSchema.mockReturnValue(false);
      mockIsClass.mockReturnValue(false);

      const result = openApiSchemaConverter.convertResponseDefinition(
        "200",
        jsonSchema
      );

      expect(result.content?.["application/json"].schema).toEqual(jsonSchema);
    });
  });

  describe("resolver switching", () => {
    it("should use class-validator converter when resolver is class-validator", () => {
      class TestDto {}
      mockGetArkosConfig.mockReturnValue({
        validation: { resolver: "class-validator" },
      } as any);
      mockIsClass.mockReturnValue(true);
      mockClassValidatorToJsonSchema.mockReturnValue({ type: "object" });

      openApiSchemaConverter.convertResponseDefinition("200", TestDto);

      expect(mockClassValidatorToJsonSchema).toHaveBeenCalledWith(TestDto);
      expect(mockZodToJsonSchema).not.toHaveBeenCalled();
    });

    it("should use zod converter when resolver is zod", () => {
      const zodSchema = { _def: {} };
      mockGetArkosConfig.mockReturnValue({
        validation: { resolver: "zod" },
      } as any);
      mockIsZodSchema.mockReturnValue(true);
      mockZodToJsonSchema.mockReturnValue({ type: "object" });

      openApiSchemaConverter.convertResponseDefinition("200", zodSchema);

      expect(mockZodToJsonSchema).toHaveBeenCalledWith(zodSchema);
      expect(mockClassValidatorToJsonSchema).not.toHaveBeenCalled();
    });
  });

  describe("jsonSchemaToOpenApiParameters", () => {
    it("should convert flat object schema to parameters", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name"],
      };

      const result = openApiSchemaConverter.jsonSchemaToOpenApiParameters(
        "query",
        schema
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        in: "query",
        name: "name",
        required: true,
        schema: { type: "string" },
      });
      expect(result[1]).toEqual({
        in: "query",
        name: "age",
        required: false,
        schema: { type: "number" },
      });
    });

    it("should handle nested object properties with prefix", () => {
      const schema = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string" },
            },
          },
        },
      };

      const result = openApiSchemaConverter.jsonSchemaToOpenApiParameters(
        "query",
        schema
      );

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("user[name]");
      expect(result[1].name).toBe("user[email]");
    });

    it("should handle deeply nested objects", () => {
      const schema = {
        type: "object",
        properties: {
          filter: {
            type: "object",
            properties: {
              date: {
                type: "object",
                properties: {
                  from: { type: "string" },
                  to: { type: "string" },
                },
              },
            },
          },
        },
      };

      const result = openApiSchemaConverter.jsonSchemaToOpenApiParameters(
        "query",
        schema
      );

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("filter[date][from]");
      expect(result[1].name).toBe("filter[date][to]");
    });

    it("should include enum values in schema", () => {
      const schema = {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "inactive", "pending"] },
        },
      };

      const result = openApiSchemaConverter.jsonSchemaToOpenApiParameters(
        "query",
        schema
      );

      expect(result[0].schema).toEqual({
        type: "string",
        enum: ["active", "inactive", "pending"],
      });
    });

    it("should include format in schema", () => {
      const schema = {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          createdAt: { type: "string", format: "date-time" },
        },
      };

      const result = openApiSchemaConverter.jsonSchemaToOpenApiParameters(
        "query",
        schema
      );

      expect(result[0].schema).toEqual({
        type: "string",
        format: "email",
      });
      expect(result[1].schema).toEqual({
        type: "string",
        format: "date-time",
      });
    });

    it("should include both enum and format when present", () => {
      const schema = {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", enum: ["abc-123", "def-456"] },
        },
      };

      const result = openApiSchemaConverter.jsonSchemaToOpenApiParameters(
        "query",
        schema
      );

      expect(result[0].schema).toEqual({
        type: "string",
        format: "uuid",
        enum: ["abc-123", "def-456"],
      });
    });

    it("should handle different parameter types (path, header, cookie)", () => {
      const schema = {
        type: "object",
        properties: {
          userId: { type: "string" },
        },
      };

      const queryResult = openApiSchemaConverter.jsonSchemaToOpenApiParameters(
        "query",
        schema
      );
      const pathResult = openApiSchemaConverter.jsonSchemaToOpenApiParameters(
        "path",
        schema
      );
      const headerResult = openApiSchemaConverter.jsonSchemaToOpenApiParameters(
        "header",
        schema
      );
      const cookieResult = openApiSchemaConverter.jsonSchemaToOpenApiParameters(
        "cookie",
        schema
      );

      expect(queryResult[0].in).toBe("query");
      expect(pathResult[0].in).toBe("path");
      expect(headerResult[0].in).toBe("header");
      expect(cookieResult[0].in).toBe("cookie");
    });

    it("should return empty array for schema without properties", () => {
      const schema = { type: "object" };

      const result = openApiSchemaConverter.jsonSchemaToOpenApiParameters(
        "query",
        schema
      );

      expect(result).toEqual([]);
    });

    it("should return empty array for non-object schema", () => {
      const schema = { type: "string" };

      const result = openApiSchemaConverter.jsonSchemaToOpenApiParameters(
        "query",
        schema
      );

      expect(result).toEqual([]);
    });

    it("should handle schema with no required fields", () => {
      const schema = {
        type: "object",
        properties: {
          optional1: { type: "string" },
          optional2: { type: "number" },
        },
      };

      const result = openApiSchemaConverter.jsonSchemaToOpenApiParameters(
        "query",
        schema
      );

      expect(result[0].required).toBe(false);
      expect(result[1].required).toBe(false);
    });

    it("should handle schema with all required fields", () => {
      const schema = {
        type: "object",
        properties: {
          field1: { type: "string" },
          field2: { type: "number" },
        },
        required: ["field1", "field2"],
      };

      const result = openApiSchemaConverter.jsonSchemaToOpenApiParameters(
        "query",
        schema
      );

      expect(result[0].required).toBe(true);
      expect(result[1].required).toBe(true);
    });

    it("should handle mixed required and optional fields in nested objects", () => {
      const schema = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" },
            },
            required: ["name"],
          },
        },
      };

      const result = openApiSchemaConverter.jsonSchemaToOpenApiParameters(
        "query",
        schema
      );

      const nameParam = result.find((p) => p.name === "user[name]");
      const ageParam = result.find((p) => p.name === "user[age]");

      expect(nameParam?.required).toBe(true);
      expect(ageParam?.required).toBe(false);
    });

    it("should use prefix parameter when provided", () => {
      const schema = {
        type: "object",
        properties: {
          id: { type: "string" },
        },
      };

      const result = openApiSchemaConverter.jsonSchemaToOpenApiParameters(
        "query",
        schema,
        "parent"
      );

      expect(result[0].name).toBe("parent[id]");
    });

    it("should handle complex nested structure with mixed types", () => {
      const schema = {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          filters: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["active", "inactive"] },
              date: {
                type: "object",
                properties: {
                  from: { type: "string", format: "date" },
                  to: { type: "string", format: "date" },
                },
                required: ["from"],
              },
            },
            required: ["status"],
          },
          limit: { type: "number" },
        },
        required: ["id"],
      };

      const result = openApiSchemaConverter.jsonSchemaToOpenApiParameters(
        "query",
        schema
      );

      expect(result).toHaveLength(5);

      const idParam = result.find((p) => p.name === "id");
      expect(idParam?.required).toBe(true);
      expect(idParam?.schema.format).toBe("uuid");

      const statusParam = result.find((p) => p.name === "filters[status]");
      expect(statusParam?.required).toBe(true);
      expect(statusParam?.schema.enum).toEqual(["active", "inactive"]);

      const fromParam = result.find((p) => p.name === "filters[date][from]");
      expect(fromParam?.required).toBe(true);

      const toParam = result.find((p) => p.name === "filters[date][to]");
      expect(toParam?.required).toBe(false);
    });
  });

  describe("flattenSchemaCore", () => {
    it("should flatten flat object schema", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name"],
      };

      const result = openApiSchemaConverter.flattenSchemaCore(schema);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: "name",
        schema: { type: "string" },
        required: true,
      });
      expect(result[1]).toEqual({
        name: "age",
        schema: { type: "number" },
        required: false,
      });
    });

    it("should flatten nested objects with bracket notation", () => {
      const schema = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string" },
            },
          },
        },
      };

      const result = openApiSchemaConverter.flattenSchemaCore(schema);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("user[name]");
      expect(result[1].name).toBe("user[email]");
    });

    it("should flatten array items with [0] notation", () => {
      const schema = {
        type: "object",
        properties: {
          tags: {
            type: "array",
            items: { type: "string" },
          },
        },
      };

      const result = openApiSchemaConverter.flattenSchemaCore(schema);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("tags[0]");
      expect(result[0].schema.type).toBe("string");
    });

    it("should flatten array of objects", () => {
      const schema = {
        type: "object",
        properties: {
          users: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                age: { type: "number" },
              },
            },
          },
        },
      };

      const result = openApiSchemaConverter.flattenSchemaCore(schema);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("users[0][name]");
      expect(result[1].name).toBe("users[0][age]");
    });

    it("should flatten root array schema", () => {
      const schema = {
        type: "array",
        items: { type: "string" },
      };

      const result = openApiSchemaConverter.flattenSchemaCore(schema);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("[0]");
      expect(result[0].schema.type).toBe("string");
    });

    it("should flatten root array of objects", () => {
      const schema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            value: { type: "number" },
          },
        },
      };

      const result = openApiSchemaConverter.flattenSchemaCore(schema);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("[0][id]");
      expect(result[1].name).toBe("[0][value]");
    });

    it("should flatten deeply nested arrays", () => {
      const schema = {
        type: "object",
        properties: {
          matrix: {
            type: "array",
            items: {
              type: "array",
              items: { type: "number" },
            },
          },
        },
      };

      const result = openApiSchemaConverter.flattenSchemaCore(schema);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("matrix[0][0]");
      expect(result[0].schema.type).toBe("number");
    });

    it("should flatten mixed nested objects and arrays", () => {
      const schema = {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                  },
                },
              },
            },
          },
        },
      };

      const result = openApiSchemaConverter.flattenSchemaCore(schema);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("data[items][0][id]");
    });

    it("should preserve enum and format in flattened schema", () => {
      const schema = {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "inactive"] },
          email: { type: "string", format: "email" },
        },
      };

      const result = openApiSchemaConverter.flattenSchemaCore(schema);

      expect(result[0].schema).toEqual({
        type: "string",
        enum: ["active", "inactive"],
      });
      expect(result[1].schema).toEqual({
        type: "string",
        format: "email",
      });
    });

    it("should handle prefix parameter", () => {
      const schema = {
        type: "object",
        properties: {
          id: { type: "string" },
        },
      };

      const result = openApiSchemaConverter.flattenSchemaCore(schema, "parent");

      expect(result[0].name).toBe("parent[id]");
    });

    it("should return empty array for schema without properties", () => {
      const schema = { type: "object" };

      const result = openApiSchemaConverter.flattenSchemaCore(schema);

      expect(result).toEqual([]);
    });

    it("should return empty array for non-object non-array schema", () => {
      const schema = { type: "string" };

      const result = openApiSchemaConverter.flattenSchemaCore(schema);

      expect(result).toEqual([]);
    });

    it("should handle array items without type", () => {
      const schema = {
        type: "array",
        items: {
          properties: {
            name: { type: "string" },
          },
        },
      };

      const result = openApiSchemaConverter.flattenSchemaCore(schema);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("[0][name]");
    });
  });

  describe("flattenSchema", () => {
    it("should convert flattened array into schema object with properties", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name"],
      };

      const result = openApiSchemaConverter.flattenSchema(schema);

      expect(result.type).toBe("object");
      expect(result.properties["name"]).toBeDefined();
      expect(result.properties["age"]).toBeDefined();
      expect(result.properties.name).toEqual({ type: "string" });
      expect(result.properties.age).toEqual({ type: "number" });
      expect(result.required).toEqual(["name"]);
    });

    it("should flatten nested objects with bracket notation properties", () => {
      const schema = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string" },
            },
            required: ["name"],
          },
        },
      };

      const result = openApiSchemaConverter.flattenSchema(schema);

      expect(result.properties["user[name]"]).toBeDefined();
      expect(result.properties["user[email]"]).toBeDefined();
      expect(result.properties["user[name]"]).toEqual({ type: "string" });
      expect(result.required).toEqual(["user[name]"]);
    });

    it("should flatten arrays with [0] notation", () => {
      const schema = {
        type: "object",
        properties: {
          tags: {
            type: "array",
            items: { type: "string" },
          },
        },
      };

      const result = openApiSchemaConverter.flattenSchema(schema);

      expect(result.properties["tags[0]"]).toBeDefined();
      expect(result.properties["tags[0]"]).toEqual({ type: "string" });
    });

    it("should flatten array of objects", () => {
      const schema = {
        type: "object",
        properties: {
          users: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                age: { type: "number" },
              },
              required: ["name"],
            },
          },
        },
      };

      const result = openApiSchemaConverter.flattenSchema(schema);

      expect(result.properties["users[0][name]"]).toBeDefined();
      expect(result.properties["users[0][age]"]).toBeDefined();
      expect(result.required).toEqual(["users[0][name]"]);
    });

    it("should flatten deeply nested arrays", () => {
      const schema = {
        type: "object",
        properties: {
          matrix: {
            type: "array",
            items: {
              type: "array",
              items: { type: "number" },
            },
          },
        },
      };

      const result = openApiSchemaConverter.flattenSchema(schema);

      expect(result.properties["matrix[0][0]"]).toBeDefined();
      expect(result.properties["matrix[0][0]"]).toEqual({ type: "number" });
    });

    it("should preserve enum and format in flattened properties", () => {
      const schema = {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "inactive"] },
          email: { type: "string", format: "email" },
        },
      };

      const result = openApiSchemaConverter.flattenSchema(schema);

      expect(result.properties.status).toEqual({
        type: "string",
        enum: ["active", "inactive"],
      });
      expect(result.properties.email).toEqual({
        type: "string",
        format: "email",
      });
    });

    it("should preserve original schema type and other properties", () => {
      const schema = {
        type: "object",
        title: "User Schema",
        description: "A user object",
        properties: {
          name: { type: "string" },
        },
      };

      const result = openApiSchemaConverter.flattenSchema(schema);

      expect(result.type).toBe("object");
      expect(result.title).toBe("User Schema");
      expect(result.description).toBe("A user object");
    });

    it("should remove empty required array when no fields are required", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
      };

      const result = openApiSchemaConverter.flattenSchema(schema);

      expect(result.required).toBeUndefined();
    });

    it("should handle complex nested structures", () => {
      const schema = {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    value: { type: "number" },
                  },
                  required: ["id"],
                },
              },
            },
          },
        },
      };

      const result = openApiSchemaConverter.flattenSchema(schema);

      expect(result.properties["data[items][0][id]"]).toBeDefined();
      expect(result.properties["data[items][0][value]"]).toBeDefined();
      expect(result.required).toEqual(["data[items][0][id]"]);
    });

    it("should return schema with empty properties for schema without properties", () => {
      const schema = { type: "object" };

      const result = openApiSchemaConverter.flattenSchema(schema);

      expect(result.properties).toEqual({});
      expect(result.required).toBeUndefined();
    });

    it("should handle mixed required and optional nested fields", () => {
      const schema = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string" },
              age: { type: "number" },
            },
            required: ["name", "email"],
          },
        },
      };

      const result = openApiSchemaConverter.flattenSchema(schema);

      expect(result.required).toEqual(["user[name]", "user[email]"]);
      expect(result.required).not.toContain("user[age]");
    });
  });
});
