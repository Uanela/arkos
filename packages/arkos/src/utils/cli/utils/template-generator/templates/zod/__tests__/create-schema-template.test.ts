import { generateCreateSchemaTemplate } from "../create-schema-template";
import { TemplateOptions } from "../../../../template-generators";
import prismaSchemaParser from "../../../../../../prisma/prisma-schema-parser";
import * as fsHelpers from "../../../../../../helpers/fs.helpers";

jest.mock("../../../../../../prisma/prisma-schema-parser");
jest.mock("../../../../../../helpers/fs.helpers");
jest.mock("fs");

describe("generateCreateSchemaTemplate", () => {
  const mockGetUserFileExtension =
    fsHelpers.getUserFileExtension as jest.MockedFunction<
      typeof fsHelpers.getUserFileExtension
    >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Error Handling", () => {
    it("should throw error when modelName is not provided", () => {
      const options = {} as TemplateOptions;

      expect(() => generateCreateSchemaTemplate(options)).toThrow(
        "Module name is required for create-schema template"
      );
    });

    it("should throw error when modelName is undefined", () => {
      const options = { modelName: undefined } as any;

      expect(() => generateCreateSchemaTemplate(options)).toThrow(
        "Module name is required for create-schema template"
      );
    });

    it("should throw error when modelName is null", () => {
      const options = { modelName: null } as any;

      expect(() => generateCreateSchemaTemplate(options)).toThrow(
        "Module name is required for create-schema template"
      );
    });

    it("should throw error when model is not found in Prisma schema", () => {
      (prismaSchemaParser.models as any) = [];

      const options: TemplateOptions = {
        modelName: {
          pascal: "NonExistent",
          camel: "nonExistent",
          kebab: "non-existent",
        },
      };

      expect(() => generateCreateSchemaTemplate(options)).toThrow(
        "Model NonExistent not found in Prisma schema"
      );
    });
  });

  describe("Basic Schema Generation - TypeScript", () => {
    beforeEach(() => {
      mockGetUserFileExtension.mockReturnValue("ts");
      (prismaSchemaParser.isEnum as jest.Mock) = jest
        .fn()
        .mockReturnValue(false);
    });

    it("should generate schema with basic string fields", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Post",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "title",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "content",
              type: "String",
              isOptional: true,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "Post",
          camel: "post",
          kebab: "post",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).toContain('import { z } from "zod"');
      expect(result).toContain("const CreatePostSchema = z.object({");
      expect(result).toContain("title: z.string()");
      expect(result).toContain("content: z.string().optional()");
      expect(result).not.toContain("id:");
      expect(result).toContain(
        "export type CreatePostSchemaType = z.infer<typeof CreatePostSchema>"
      );
      expect(result).toContain("export default CreatePostSchema;");
    });

    it("should handle numeric fields", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Product",
          fields: [
            {
              name: "id",
              type: "Int",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "price",
              type: "Float",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "quantity",
              type: "Int",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "discount",
              type: "Decimal",
              isOptional: true,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "Product",
          camel: "product",
          kebab: "product",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).toContain("price: z.number()");
      expect(result).toContain("quantity: z.number()");
      expect(result).toContain("discount: z.number().optional()");
    });

    it("should handle boolean fields", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Post",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "published",
              type: "Boolean",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "featured",
              type: "Boolean",
              isOptional: true,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "Post",
          camel: "post",
          kebab: "post",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).toContain("published: z.boolean()");
      expect(result).toContain("featured: z.boolean().optional()");
    });

    it("should handle DateTime fields", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Event",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "startDate",
              type: "DateTime",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "endDate",
              type: "DateTime",
              isOptional: true,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "Event",
          camel: "event",
          kebab: "event",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).toContain(
        "startDate: z.date().or(z.string()).refine((val) => val instanceof Date || !isNaN(Date.parse(val)), 'Invalid date')"
      );
      expect(result).toContain(
        "endDate: z.date().or(z.string()).refine((val) => val instanceof Date || !isNaN(Date.parse(val)), 'Invalid date').optional()"
      );
    });

    it("should handle Json fields", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Config",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "settings",
              type: "Json",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "Config",
          camel: "config",
          kebab: "config",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).toContain("settings: z.any()");
    });

    it("should handle BigInt fields", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Transaction",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "amount",
              type: "BigInt",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "Transaction",
          camel: "transaction",
          kebab: "transaction",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).toContain("amount: z.bigint()");
    });

    it("should handle Bytes fields", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "File",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "data",
              type: "Bytes",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "File",
          camel: "file",
          kebab: "file",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).toContain("data: z.instanceof(Buffer)");
    });
  });

  describe("Basic Schema Generation - JavaScript", () => {
    beforeEach(() => {
      mockGetUserFileExtension.mockReturnValue("js");
      (prismaSchemaParser.isEnum as jest.Mock) = jest
        .fn()
        .mockReturnValue(false);
    });

    it("should not include type export for JavaScript", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Post",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "title",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "Post",
          camel: "post",
          kebab: "post",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).not.toContain("export type");
      expect(result).not.toContain("z.infer");
      expect(result).toContain("export default CreatePostSchema;");
    });
  });

  describe("Restricted Fields", () => {
    beforeEach(() => {
      mockGetUserFileExtension.mockReturnValue("ts");
      (prismaSchemaParser.isEnum as jest.Mock) = jest
        .fn()
        .mockReturnValue(false);
    });

    it("should exclude id, createdAt, updatedAt, deletedAt fields", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Post",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "title",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "createdAt",
              type: "DateTime",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "updatedAt",
              type: "DateTime",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "deletedAt",
              type: "DateTime",
              isOptional: true,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "Post",
          camel: "post",
          kebab: "post",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).not.toContain("id:");
      expect(result).not.toContain("createdAt:");
      expect(result).not.toContain("updatedAt:");
      expect(result).not.toContain("deletedAt:");
      expect(result).toContain("title:");
    });

    it("should exclude foreign key fields", () => {
      (prismaSchemaParser.models as any) = [
        { name: "Category", fields: [{ name: "id", type: "String" }] },
        {
          name: "Post",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "title",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "categoryId",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "category",
              type: "Category",
              isOptional: false,
              isArray: false,
              isRelation: true,
              foreignKeyField: "categoryId",
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "Post",
          camel: "post",
          kebab: "post",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).not.toContain("categoryId:");
      expect(result).toContain("category: z.object({ id: z.string() })");
    });
  });

  describe("Array Fields", () => {
    beforeEach(() => {
      mockGetUserFileExtension.mockReturnValue("ts");
      (prismaSchemaParser.isEnum as jest.Mock) = jest
        .fn()
        .mockReturnValue(false);
    });

    it("should handle array fields", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Post",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "tags",
              type: "String",
              isOptional: false,
              isArray: true,
              isRelation: false,
            },
            {
              name: "scores",
              type: "Int",
              isOptional: true,
              isArray: true,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "Post",
          camel: "post",
          kebab: "post",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).toContain("tags: z.array(z.string())");
      expect(result).toContain("scores: z.array(z.number()).optional()");
    });
  });

  describe("Enum Fields", () => {
    beforeEach(() => {
      mockGetUserFileExtension.mockReturnValue("ts");
    });

    it("should handle enum fields and import them", () => {
      (prismaSchemaParser.isEnum as jest.Mock) = jest.fn(
        (type: string) => type === "Role"
      );
      (prismaSchemaParser.models as any) = [
        {
          name: "User",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "name",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "role",
              type: "Role",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "User",
          camel: "user",
          kebab: "user",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).toContain('import { Role } from "@prisma/client"');
      expect(result).toContain("role: z.nativeEnum(Role)");
    });

    it("should handle multiple enum fields", () => {
      (prismaSchemaParser.isEnum as jest.Mock) = jest.fn(
        (type: string) => type === "Role" || type === "Status"
      );
      (prismaSchemaParser.models as any) = [
        {
          name: "User",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "role",
              type: "Role",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "status",
              type: "Status",
              isOptional: true,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "User",
          camel: "user",
          kebab: "user",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).toContain('import { Role, Status } from "@prisma/client"');
      expect(result).toContain("role: z.nativeEnum(Role)");
      expect(result).toContain("status: z.nativeEnum(Status).optional()");
    });

    it("should handle array of enums", () => {
      (prismaSchemaParser.isEnum as jest.Mock) = jest.fn(
        (type: string) => type === "Tag"
      );
      (prismaSchemaParser.models as any) = [
        {
          name: "Post",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "tags",
              type: "Tag",
              isOptional: false,
              isArray: true,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "Post",
          camel: "post",
          kebab: "post",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).toContain('import { Tag } from "@prisma/client"');
      expect(result).toContain("tags: z.array(z.nativeEnum(Tag))");
    });

    it("should not import enums when none are used", () => {
      (prismaSchemaParser.isEnum as jest.Mock) = jest
        .fn()
        .mockReturnValue(false);
      (prismaSchemaParser.models as any) = [
        {
          name: "Post",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "title",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "Post",
          camel: "post",
          kebab: "post",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).not.toContain('@prisma/client"');
    });
  });

  describe("Relation Fields", () => {
    beforeEach(() => {
      mockGetUserFileExtension.mockReturnValue("ts");
      (prismaSchemaParser.isEnum as jest.Mock) = jest
        .fn()
        .mockReturnValue(false);
    });

    it("should handle singular relation with default id reference", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Post",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "title",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "categoryId",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "category",
              type: "Category",
              isOptional: false,
              isArray: false,
              isRelation: true,
              foreignKeyField: "categoryId",
            },
          ],
        },
        {
          name: "Category",
          fields: [
            {
              name: "id",
              type: "String",
              isId: false,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "Post",
          camel: "post",
          kebab: "post",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).toContain("category: z.object({ id: z.string() })");
    });

    it("should handle optional relation", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Post",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "categoryId",
              type: "String",
              isOptional: true,
              isArray: false,
              isRelation: false,
            },
            {
              name: "category",
              type: "Category",
              isOptional: true,
              isArray: false,
              isRelation: true,
              foreignKeyField: "categoryId",
            },
          ],
        },
        {
          name: "Category",
          fields: [
            {
              name: "id",
              type: "String",
              isId: false,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "Post",
          camel: "post",
          kebab: "post",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).toContain(
        "category: z.object({ id: z.string() }).optional()"
      );
    });

    it("should handle relation with custom reference field", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Post",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "categorySlug",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "category",
              type: "Category",
              isOptional: false,
              isArray: false,
              isRelation: true,
              foreignKeyField: "categorySlug",
              foreignReferenceField: "slug",
            },
          ],
        },
        {
          name: "Category",
          fields: [
            {
              name: "slug",
              type: "String",
              isId: false,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "Post",
          camel: "post",
          kebab: "post",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).toContain("category: z.object({ slug: z.string() })");
    });

    it("should skip array relations", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Category",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "name",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "posts",
              type: "Post",
              isOptional: false,
              isArray: true,
              isRelation: true,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "Category",
          camel: "category",
          kebab: "category",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).not.toContain("posts:");
      expect(result).toContain("name:");
    });

    it("should handle relation with numeric reference field", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Post",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "categoryId",
              type: "Int",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "category",
              type: "Category",
              isOptional: false,
              isArray: false,
              isRelation: true,
              foreignKeyField: "categoryId",
            },
          ],
        },
        {
          name: "Category",
          fields: [
            {
              name: "id",
              type: "Int",
              isId: false,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "Post",
          camel: "post",
          kebab: "post",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).toContain("category: z.object({ id: z.number() })");
    });
  });

  describe("User Module Special Fields", () => {
    beforeEach(() => {
      mockGetUserFileExtension.mockReturnValue("ts");
      (prismaSchemaParser.isEnum as jest.Mock) = jest
        .fn()
        .mockReturnValue(false);
    });

    it("should add email validation for user module email field", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "User",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "email",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "name",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "User",
          camel: "user",
          kebab: "user",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).toContain("email: z.string().email()");
      expect(result).toContain("name: z.string()");
    });

    it("should add password validation for user module password field", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "User",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "password",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "User",
          camel: "user",
          kebab: "user",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).toContain(
        'password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number")'
      );
    });

    it("should apply both email and password validation for user module", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "User",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "email",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "password",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "name",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "User",
          camel: "user",
          kebab: "user",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).toContain("email: z.string().email()");
      expect(result).toContain(
        'password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number")'
      );
      expect(result).toContain("name: z.string()");
    });

    it("should not apply user validations to non-user modules", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Account",
          fields: [
            {
              name: "id",
              type: "String",
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "email",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "password",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const options: TemplateOptions = {
        modelName: {
          pascal: "Account",
          camel: "account",
          kebab: "account",
        },
      };

      const result = generateCreateSchemaTemplate(options);

      expect(result).toContain("email: z.string()");
      expect(result).not.toContain("z.string().email()");
      expect(result).toContain("password: z.string()");
      expect(result).not.toContain("min(8)");
    });
  });
});
