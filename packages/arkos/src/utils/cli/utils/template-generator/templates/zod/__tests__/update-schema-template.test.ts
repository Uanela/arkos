import { generateUpdateSchemaTemplate } from "../update-schema-template";
import { TemplateOptions } from "../../../../template-generators";
import prismaSchemaParser from "../../../../../../prisma/prisma-schema-parser";
import * as fsHelpers from "../../../../../../helpers/fs.helpers";
import { isArray } from "class-validator";

jest.mock("../../../../../../prisma/prisma-schema-parser");
jest.mock("../../../../../../helpers/fs.helpers");
jest.mock("fs");

describe("generateUpdateSchemaTemplate", () => {
  const mockGetUserFileExtension =
    fsHelpers.getUserFileExtension as jest.MockedFunction<
      typeof fsHelpers.getUserFileExtension
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserFileExtension.mockReturnValue("ts");
    (prismaSchemaParser.isEnum as jest.Mock) = jest.fn().mockReturnValue(false);
  });

  it("should throw error when modelName is missing", () => {
    expect(() => generateUpdateSchemaTemplate({} as TemplateOptions)).toThrow(
      "Module name is required for update-schema template"
    );
  });

  it("should throw error when model not found", () => {
    (prismaSchemaParser.models as any) = [];

    expect(() =>
      generateUpdateSchemaTemplate({
        modelName: {
          pascal: "NotFound",
          camel: "notFound",
          kebab: "not-found",
        },
      })
    ).toThrow("Model NotFound not found in Prisma schema");
  });

  it("should generate update schema with optional fields", () => {
    (prismaSchemaParser.models as any) = [
      {
        name: "Post",
        fields: [
          { name: "id", type: "String", isId: true },
          { name: "title", type: "String" },
          { name: "content", type: "String", isOptional: true },
          { name: "createdAt", type: "DateTime" },
        ],
      },
    ];

    const result = generateUpdateSchemaTemplate({
      modelName: { pascal: "Post", camel: "post", kebab: "post" },
    });

    expect(result).toContain("title: z.string().optional()");
    expect(result).toContain("content: z.string().optional()");
    expect(result).not.toContain("id:");
    expect(result).not.toContain("createdAt:");
    expect(result).toContain(
      "export type UpdatePostSchemaType = z.infer<typeof UpdatePostSchema>"
    );
  });

  it("should handle user module special validations", () => {
    (prismaSchemaParser.models as any) = [
      {
        name: "User",
        fields: [
          { name: "id", type: "String", isId: true },
          { name: "email", type: "String" },
          { name: "password", type: "String" },
        ],
      },
    ];

    const result = generateUpdateSchemaTemplate({
      modelName: { pascal: "User", camel: "user", kebab: "user" },
    });

    expect(result).toContain("email: z.string().email().optional()");
    expect(result).toContain(
      'regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number")'
    );
  });

  it("should exclude foreign key fields but include relations", () => {
    (prismaSchemaParser.models as any) = [
      {
        name: "Category",
        fields: [
          { name: "id", type: "String" },
          { name: "name", type: "String" },
        ],
      },
      {
        name: "Post",
        fields: [
          { name: "id", type: "String", isId: true },
          { name: "categoryId", type: "String" },
          {
            name: "category",
            type: "Category",
            isRelation: true,
            foreignKeyField: "categoryId",
          },
        ],
      },
    ];

    const result = generateUpdateSchemaTemplate({
      modelName: { pascal: "Post", camel: "post", kebab: "post" },
    });

    expect(result).not.toContain("categoryId");
    expect(result).toContain(
      "category: z.object({ id: z.string() }).optional()"
    );
  });

  it("should handle enums correctly", () => {
    (prismaSchemaParser.isEnum as jest.Mock) = jest.fn(
      (type) => type === "ProductStatus"
    );
    (prismaSchemaParser.models as any) = [
      {
        name: "Product",
        fields: [
          { name: "id", type: "String", isId: true },
          { name: "status", type: "ProductStatus" },
          { name: "name", type: "String" },
        ],
      },
    ];

    const result = generateUpdateSchemaTemplate({
      modelName: { pascal: "Product", camel: "product", kebab: "product" },
    });

    expect(result).toContain("status: z.nativeEnum(ProductStatus).optional()");
    expect(result).toContain("name: z.string().optional()");
    expect(result).toContain('import { ProductStatus } from "@prisma/client"');
  });

  it("should handle array fields correctly", () => {
    (prismaSchemaParser.models as any) = [
      {
        name: "Product",
        fields: [
          { name: "id", type: "String", isId: true },
          { name: "tags", type: "String", isArray: true },
          { name: "scores", type: "Int", isArray: true, isOptional: true },
        ],
      },
    ];

    const result = generateUpdateSchemaTemplate({
      modelName: { pascal: "Product", camel: "product", kebab: "product" },
    });

    expect(result).toContain("tags: z.array(z.string()).optional()");
    expect(result).toContain("scores: z.array(z.number()).optional()");
  });

  it("should handle enum arrays correctly", () => {
    (prismaSchemaParser.isEnum as jest.Mock) = jest.fn(
      (type) => type === "Tag"
    );
    (prismaSchemaParser.models as any) = [
      {
        name: "Post",
        fields: [
          { name: "id", type: "String", isId: true },
          { name: "tags", type: "Tag", isArray: true },
        ],
      },
    ];

    const result = generateUpdateSchemaTemplate({
      modelName: { pascal: "Post", camel: "post", kebab: "post" },
    });

    expect(result).toContain("tags: z.array(z.nativeEnum(Tag)).optional()");
    expect(result).toContain('import { Tag } from "@prisma/client"');
  });

  it("should handle all field types correctly", () => {
    (prismaSchemaParser.models as any) = [
      {
        name: "Test",
        fields: [
          { name: "id", type: "String", isId: true },
          { name: "name", type: "String" },
          { name: "age", type: "Int" },
          { name: "price", type: "Float" },
          { name: "isActive", type: "Boolean" },
          { name: "createdAt", type: "DateTime" },
          { name: "data", type: "Json" },
          { name: "bigNumber", type: "BigInt" },
          { name: "fileData", type: "Bytes" },
        ],
      },
    ];

    const result = generateUpdateSchemaTemplate({
      modelName: { pascal: "Test", camel: "test", kebab: "test" },
    });

    expect(result).toContain("name: z.string().optional()");
    expect(result).toContain("age: z.number().optional()");
    expect(result).toContain("price: z.number().optional()");
    expect(result).toContain("isActive: z.boolean().optional()");
    expect(result).toContain("data: z.any().optional()");
    expect(result).toContain("bigNumber: z.bigint().optional()");
    expect(result).toContain("fileData: z.instanceof(Buffer).optional()");
  });

  it("should generate JavaScript without type exports", () => {
    mockGetUserFileExtension.mockReturnValue("js");
    (prismaSchemaParser.models as any) = [
      {
        name: "Post",
        fields: [
          { name: "id", type: "String", isId: true },
          { name: "title", type: "String" },
        ],
      },
    ];

    const result = generateUpdateSchemaTemplate({
      modelName: { pascal: "Post", camel: "post", kebab: "post" },
    });

    expect(result).not.toContain("export type");
    expect(result).toContain("export default UpdatePostSchema;");
  });

  it("should exclude restricted fields", () => {
    (prismaSchemaParser.models as any) = [
      {
        name: "Post",
        fields: [
          { name: "id", type: "String", isId: true },
          { name: "title", type: "String" },
          { name: "publishedAt", type: "DateTime" },
          { name: "reactions", type: "PostReaction", isArray: true },
          { name: "createdAt", type: "DateTime" },
          { name: "updatedAt", type: "DateTime" },
          { name: "deletedAt", type: "DateTime", isOptional: true },
        ],
      },
    ];

    const result = generateUpdateSchemaTemplate({
      modelName: { pascal: "Post", camel: "post", kebab: "post" },
    });

    expect(result).not.toContain("id:");
    expect(result).not.toContain("createdAt:");
    expect(result).not.toContain("updatedAt:");
    expect(result).not.toContain("deletedAt:");
    expect(result).toContain("title: z.string().optional()");
  });
});
