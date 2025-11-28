import { generateUpdateDtoTemplate } from "../update-dto-template";
import { TemplateOptions } from "../../../../template-generators";
import prismaSchemaParser from "../../../../../../prisma/prisma-schema-parser";
import * as fsHelpers from "../../../../../../helpers/fs.helpers";

jest.mock("../../../../../../prisma/prisma-schema-parser");
jest.mock("../../../../../../helpers/fs.helpers");
jest.mock("fs");

describe("generateUpdateDtoTemplate", () => {
  const mockGetUserFileExtension =
    fsHelpers.getUserFileExtension as jest.MockedFunction<
      typeof fsHelpers.getUserFileExtension
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserFileExtension.mockReturnValue("ts");
    (prismaSchemaParser.isEnum as jest.Mock) = jest.fn().mockReturnValue(false);
  });

  describe("Error Handling", () => {
    it("should throw error when modelName is not provided", () => {
      expect(() => generateUpdateDtoTemplate({} as TemplateOptions)).toThrow(
        "Module name is required for update-dto template"
      );
    });

    it("should throw error when model is not found in Prisma schema", () => {
      (prismaSchemaParser.models as any) = [];

      expect(() =>
        generateUpdateDtoTemplate({
          modelName: {
            pascal: "NonExistent",
            camel: "nonExistent",
            kebab: "non-existent",
          },
        })
      ).toThrow("Model NonExistent not found in Prisma schema");
    });
  });

  describe("Basic Field Types - All Optional", () => {
    it("should generate DTO with all fields optional including string, number, boolean, and date", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Product",
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
              name: "price",
              type: "Float",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "inStock",
              type: "Boolean",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "releaseDate",
              type: "DateTime",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "Product", camel: "product", kebab: "product" },
      });

      expect(result).toContain(
        'import { IsOptional, IsString, IsNumber, IsBoolean, IsDate } from "class-validator"'
      );
      expect(result).toContain("export default class UpdateProductDto {");
      expect(result).toContain(
        "@IsOptional()\n  @IsString()\n  name?: string;"
      );
      expect(result).toContain(
        "@IsOptional()\n  @IsNumber({})\n  price?: number;"
      );
      expect(result).toContain(
        "@IsOptional()\n  @IsBoolean()\n  inStock?: boolean;"
      );
      expect(result).toContain(
        "@IsOptional()\n  @IsDate()\n  releaseDate?: Date;"
      );
      expect(result).not.toContain("id:");
    });

    it("should make required fields from create optional in update", () => {
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
              isOptional: false, // Required in create
              isArray: false,
              isRelation: false,
            },
            {
              name: "content",
              type: "String",
              isOptional: true, // Optional in create
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "Post", camel: "post", kebab: "post" },
      });

      // Both should be optional in update
      expect(result).toContain(
        "@IsOptional()\n  @IsString()\n  title?: string;"
      );
      expect(result).toContain(
        "@IsOptional()\n  @IsString()\n  content?: string;"
      );
      expect(result).not.toContain("title!:");
    });

    it("should handle fields with default values as optional", () => {
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
              name: "status",
              type: "String",
              isOptional: false,
              defaultValue: "draft",
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "Post", camel: "post", kebab: "post" },
      });

      expect(result).toContain(
        "@IsOptional()\n  @IsString()\n  status?: string;"
      );
    });

    it("should handle special types: BigInt, Json, Bytes", () => {
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
              name: "size",
              type: "BigInt",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "metadata",
              type: "Json",
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

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "File", camel: "file", kebab: "file" },
      });

      expect(result).toContain(
        "@IsOptional()\n  @IsNumber({})\n  size?: bigint;"
      );
      expect(result).toContain(
        "@IsOptional()\n  @IsObject()\n  metadata?: any;"
      );
      expect(result).toContain("@IsOptional()\n  data?: Buffer;");
    });
  });

  describe("JavaScript vs TypeScript", () => {
    it("should not include type modifiers for JavaScript", () => {
      mockGetUserFileExtension.mockReturnValue("js");
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

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "Post", camel: "post", kebab: "post" },
      });

      expect(result).not.toContain("!:");
      expect(result).not.toContain("?:");
      expect(result).toContain("title: string;");
      expect(result).toContain("content: string;");
    });
  });

  describe("Restricted Fields", () => {
    it("should exclude id, createdAt, updatedAt, deletedAt, and foreign keys", () => {
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
          ],
        },
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

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "Post", camel: "post", kebab: "post" },
      });

      expect(result).not.toContain("id:");
      expect(result).not.toContain("createdAt:");
      expect(result).not.toContain("updatedAt:");
      expect(result).not.toContain("deletedAt:");
      expect(result).not.toContain("categoryId:");
      expect(result).toContain("title?:");
      expect(result).toContain("category?");
    });
  });

  describe("Array Fields", () => {
    it("should handle array fields with { each: true } and make them optional", () => {
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

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "Post", camel: "post", kebab: "post" },
      });

      expect(result).toContain(
        "@IsOptional()\n  @IsArray()\n  @IsString(, { each: true })\n  tags?: string[];"
      );
      expect(result).toContain(
        "@IsOptional()\n  @IsArray()\n  @IsNumber({}, { each: true })\n  scores?: number[];"
      );
    });
  });

  describe("Enum Fields", () => {
    it("should handle enums with proper imports and @IsEnum decorator, all optional", () => {
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

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "User", camel: "user", kebab: "user" },
      });

      expect(result).toContain('import { Role, Status } from "@prisma/client"');
      expect(result).toContain(
        "@IsOptional()\n  @IsEnum(Role)\n  role?: Role;"
      );
      expect(result).toContain(
        "@IsOptional()\n  @IsEnum(Status)\n  status?: Status;"
      );
    });

    it("should handle array of enums with optional decorator", () => {
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

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "Post", camel: "post", kebab: "post" },
      });

      expect(result).toContain('import { Tag } from "@prisma/client"');
      expect(result).toContain(
        "@IsOptional()\n  @IsArray()\n  @IsEnum(Tag, { each: true })\n  tags?: Tag[];"
      );
    });

    it("should not import enums when none are used", () => {
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

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "Post", camel: "post", kebab: "post" },
      });

      expect(result).not.toContain('@prisma/client"');
    });
  });

  describe("Relation Fields - All Optional", () => {
    it("should handle singular relations as optional with inline nested DTOs using ForUpdate naming", () => {
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
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "category",
              type: "Category",
              isOptional: false, // Required in create
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
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "Post", camel: "post", kebab: "post" },
      });

      const lines = result.split("\n");
      const hasMatchingLine = lines.some(
        (line) =>
          line.includes("ValidateNested") &&
          line.includes("class-validator") &&
          line.includes("import")
      );
      expect(hasMatchingLine).toBe(true);
      expect(result).toContain('import { Type } from "class-transformer"');
      expect(result).toContain("class CategoryForUpdatePostDto {");
      expect(result).toContain("@IsString()\n  id!: string;");
      // Should be optional even though it was required in create
      expect(result).toContain(
        "@IsOptional()\n  @ValidateNested()\n  @Type(() => CategoryForUpdatePostDto)\n  category?: CategoryForUpdatePostDto;"
      );
    });

    it("should handle relations with custom reference field", () => {
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
              name: "categoryName",
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
              foreignKeyField: "categoryName",
              foreignReferenceField: "name",
            },
          ],
        },
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
          ],
        },
      ];

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "Post", camel: "post", kebab: "post" },
      });

      expect(result).toContain("class CategoryForUpdatePostDto {");
      expect(result).toContain("@IsString()\n  name!: string;");
      expect(result).not.toContain(
        "CategoryForUpdatePostDto {\n  @IsString()\n  id"
      );
    });

    it("should handle relations with numeric reference field", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Order",
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
              name: "productCode",
              type: "Int",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "product",
              type: "Product",
              isOptional: false,
              isArray: false,
              isRelation: true,
              foreignKeyField: "productCode",
              foreignReferenceField: "code",
            },
          ],
        },
        {
          name: "Product",
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
              name: "code",
              type: "Int",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "Order", camel: "order", kebab: "order" },
      });

      expect(result).toContain("class ProductForUpdateOrderDto {");
      expect(result).toContain("@IsNumber({})\n  code!: number;");
    });

    it("should handle already optional relations (still optional)", () => {
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
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "Post", camel: "post", kebab: "post" },
      });

      expect(result).toContain(
        "@IsOptional()\n  @ValidateNested()\n  @Type(() => CategoryForUpdatePostDto)\n  category?: CategoryForUpdatePostDto;"
      );
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

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "Category", camel: "category", kebab: "category" },
      });

      expect(result).not.toContain("posts:");
      expect(result).toContain("name?:");
    });

    it("should handle multiple relations with different reference fields", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Order",
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
              name: "userId",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "user",
              type: "User",
              isOptional: false,
              isArray: false,
              isRelation: true,
              foreignKeyField: "userId",
            },
            {
              name: "productCode",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "product",
              type: "Product",
              isOptional: false,
              isArray: false,
              isRelation: true,
              foreignKeyField: "productCode",
              foreignReferenceField: "code",
            },
          ],
        },
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
          ],
        },
        {
          name: "Product",
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
              name: "code",
              type: "String",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "Order", camel: "order", kebab: "order" },
      });

      expect(result).toContain("class UserForUpdateOrderDto {");
      expect(result).toContain("@IsString()\n  id!: string;");
      expect(result).toContain("class ProductForUpdateOrderDto {");
      expect(result).toContain("@IsString()\n  code!: string;");
    });
  });

  describe("User Module Special Validations", () => {
    it("should apply @IsEmail() for email field but keep it optional", () => {
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

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "User", camel: "user", kebab: "user" },
      });

      expect(result).toContain(
        'import { IsOptional, IsEmail, IsString } from "class-validator"'
      );
      expect(result).toContain(
        "@IsOptional()\n  @IsEmail()\n  email?: string;"
      );
      expect(result).not.toContain("@IsString()\n  email");
      expect(result).toContain(
        "@IsOptional()\n  @IsString()\n  name?: string;"
      );
    });

    it("should apply password validation with MinLength and Matches but keep it optional", () => {
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

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "User", camel: "user", kebab: "user" },
      });

      expect(result).toContain(
        'import { IsOptional, IsString, MinLength, Matches } from "class-validator"'
      );
      expect(result).toContain("@IsOptional()\n  @IsString()\n  @MinLength(8)");
      expect(result).toContain(
        '@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/, { message: "Password must contain at least one uppercase letter, one lowercase letter, and one number" })'
      );
      expect(result).toContain("password?: string;");
    });

    it("should apply both email and password validations together, all optional", () => {
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

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "User", camel: "user", kebab: "user" },
      });

      expect(result).toContain(
        "@IsOptional()\n  @IsEmail()\n  email?: string;"
      );
      expect(result).toContain("@IsOptional()\n  @IsString()\n  @MinLength(8)");
      expect(result).toContain("@Matches");
      expect(result).toContain(
        "@IsOptional()\n  @IsString()\n  name?: string;"
      );
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

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "Account", camel: "account", kebab: "account" },
      });

      expect(result).toContain(
        "@IsOptional()\n  @IsString()\n  email?: string;"
      );
      expect(result).not.toContain("@IsEmail()");
      expect(result).toContain(
        "@IsOptional()\n  @IsString()\n  password?: string;"
      );
      expect(result).not.toContain("@MinLength");
      expect(result).not.toContain("@Matches");
    });
  });

  describe("Import Organization", () => {
    it("should only import validators that are used", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Simple",
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
          ],
        },
      ];

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "Simple", camel: "simple", kebab: "simple" },
      });

      expect(result).toContain(
        'import { IsOptional, IsString } from "class-validator"'
      );
      expect(result).not.toContain("IsNumber");
      expect(result).not.toContain("class-transformer");
    });

    it("should import class-transformer only when relations exist", () => {
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
              isId: true,
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "Post", camel: "post", kebab: "post" },
      });

      expect(result).toContain('import { Type } from "class-transformer"');
      const lines = result.split("\n");
      const hasMatchingLine = lines.some(
        (line) =>
          line.includes("ValidateNested") &&
          line.includes("class-validator") &&
          line.includes("import")
      );
      expect(hasMatchingLine).toBe(true);
    });
  });

  describe("All Fields Optional Principle", () => {
    it("should make ALL fields optional regardless of Prisma schema definition", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Article",
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
              isOptional: false, // Required in schema
              isArray: false,
              isRelation: false,
            },
            {
              name: "slug",
              type: "String",
              isOptional: false, // Required in schema
              isArray: false,
              isRelation: false,
            },
            {
              name: "published",
              type: "Boolean",
              isOptional: false, // Required in schema
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "Article", camel: "article", kebab: "article" },
      });

      // All should have @IsOptional and ? modifier
      expect(result).toContain(
        "@IsOptional()\n  @IsString()\n  title?: string;"
      );
      expect(result).toContain(
        "@IsOptional()\n  @IsString()\n  slug?: string;"
      );
      expect(result).toContain(
        "@IsOptional()\n  @IsBoolean()\n  published?: boolean;"
      );

      // Should not have any required fields (!)
      expect(result).not.toContain("title!:");
      expect(result).not.toContain("slug!:");
      expect(result).not.toContain("published!:");
    });

    it("should ensure every field has IsOptional decorator", () => {
      (prismaSchemaParser.models as any) = [
        {
          name: "Product",
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
              name: "price",
              type: "Float",
              isOptional: false,
              isArray: false,
              isRelation: false,
            },
            {
              name: "description",
              type: "String",
              isOptional: true, // Already optional in schema
              isArray: false,
              isRelation: false,
            },
          ],
        },
      ];

      const result = generateUpdateDtoTemplate({
        modelName: { pascal: "Product", camel: "product", kebab: "product" },
      });

      // Count @IsOptional occurrences (should match number of non-restricted fields)
      const isOptionalCount = (result.match(/@IsOptional\(\)/g) || []).length;
      expect(isOptionalCount).toBe(3); // name, price, description

      // Verify all fields have @IsOptional
      expect(result).toContain(
        "@IsOptional()\n  @IsString()\n  name?: string;"
      );
      expect(result).toContain(
        "@IsOptional()\n  @IsNumber({})\n  price?: number;"
      );
      expect(result).toContain(
        "@IsOptional()\n  @IsString()\n  description?: string;"
      );
    });
  });
});
