import classValidatorToJsonSchema, {
  resolveReferences,
  extractSchemaName,
} from "../class-validator-to-json-schema";

jest.mock("class-validator", () => ({
  getMetadataStorage: jest.fn(),
}));

jest.mock("class-transformer/cjs/storage", () => ({
  defaultMetadataStorage: {},
}));

jest.mock("class-validator-jsonschema", () => ({
  validationMetadatasToSchemas: jest.fn(),
}));

import { validationMetadatasToSchemas } from "class-validator-jsonschema";

class TestClass {}

describe("classValidatorToJsonSchema", () => {
  it("returns null when schema not found", () => {
    (validationMetadatasToSchemas as jest.Mock).mockReturnValue({});
    const result = classValidatorToJsonSchema(TestClass);
    expect(result).toBeNull();
  });

  it("returns resolved schema when exists", () => {
    (validationMetadatasToSchemas as jest.Mock).mockReturnValue({
      TestClass: { type: "object", properties: { a: { type: "string" } } },
    });

    const result = classValidatorToJsonSchema(TestClass);
    expect(result).toEqual({
      type: "object",
      properties: { a: { type: "string" } },
    });
  });
});

describe("resolveReferences", () => {
  it("returns schema if primitive or non-object", () => {
    expect(resolveReferences(null, {})).toBeNull();
    expect(resolveReferences("x", {})).toBe("x");
  });

  it("resolves reference", () => {
    const all = {
      A: { type: "object", properties: { x: { type: "number" } } },
    };

    const ref = { $ref: "#/components/schemas/A", extra: true };
    const result = resolveReferences(ref, all);

    expect(result).toEqual({
      type: "object",
      properties: { x: { type: "number" } },
      extra: true,
    });
  });

  it("returns circular reference marker", () => {
    const all = {
      A: { $ref: "#/components/schemas/A" },
    };

    const result = resolveReferences(
      { $ref: "#/components/schemas/A" },
      all,
      new Set()
    );

    expect(result).toEqual({
      $resolvedRef: "A",
      description: "Circular reference to A",
    });
  });

  it("handles arrays", () => {
    const arr = [{ $ref: "#/components/schemas/B" }];
    const all = {
      B: { type: "string" },
    };

    const result = resolveReferences(arr, all);
    expect(result).toEqual([{ type: "string" }]);
  });

  it("handles nested objects", () => {
    const schema = {
      a: {
        b: {
          $ref: "#/components/schemas/C",
        },
      },
    };

    const all = {
      C: { type: "boolean" },
    };

    const result = resolveReferences(schema, all);
    expect(result).toEqual({
      a: {
        b: { type: "boolean" },
      },
    });
  });

  it("keeps $ref if not found in schemas", () => {
    const schema = { $ref: "#/components/schemas/Unknown" };
    const result = resolveReferences(schema, {});
    expect(result).toEqual({ $ref: "#/components/schemas/Unknown" });
  });
});

describe("extractSchemaName", () => {
  it("extracts final part of ref path", () => {
    expect(extractSchemaName("#/components/schemas/MyClass")).toBe("MyClass");
  });
});
