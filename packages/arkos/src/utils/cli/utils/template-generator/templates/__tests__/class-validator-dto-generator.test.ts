import classValidatorDtoGenerator from "../class-validator-dto-generator";
import prismaSchemaParser from "../../../../../prisma/prisma-schema-parser";
import * as fsHelpers from "../../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../../template-generators";

jest.mock("../../../../../prisma/prisma-schema-parser");
jest.mock("../../../../../helpers/fs.helpers");
jest.mock("fs");

describe("ClassValidatorDtoGenerator", () => {
  const mockGetUserFileExtension =
    fsHelpers.getUserFileExtension as jest.MockedFunction<
      typeof fsHelpers.getUserFileExtension
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserFileExtension.mockReturnValue("ts");
    (prismaSchemaParser.isEnum as jest.Mock) = jest.fn().mockReturnValue(false);
  });

  describe("generateBaseDto (ModelDto)", () => {
    describe("Error Handling", () => {
      it("should throw error when modelName is not provided", () => {
        expect(() =>
          classValidatorDtoGenerator.generateBaseDto({} as any)
        ).toThrow("Module name is required for DTO template");
      });

      it("should throw error when model is not found in Prisma schema", () => {
        (prismaSchemaParser.models as any) = [];

        expect(() =>
          classValidatorDtoGenerator.generateBaseDto({
            modelName: {
              pascal: "NonExistent",
              camel: "nonExistent",
              kebab: "non-existent",
            },
          })
        ).toThrow("Model NonExistent not found in Prisma schema");
      });
    });

    describe("Naming Convention", () => {
      it("should generate DTO with ModelDto naming (not ModelBaseDto)", () => {
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
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateBaseDto({
          modelName: { pascal: "User", camel: "user", kebab: "user" },
        });

        expect(result).toContain("export default class UserDto {");
        expect(result).not.toContain("UserBaseDto");
      });
    });

    describe("Field Inclusion", () => {
      it("should include all fields including id, createdAt, updatedAt", () => {
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
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateBaseDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  id!: string;"
        );
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  title!: string;"
        );
        expect(result).toContain(
          " @IsDate()\n  createdAt!: Date;"
        );
        expect(result).toContain(
          " @IsDate()\n  updatedAt!: Date;"
        );
      });

      it("should handle optional fields correctly", () => {
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
                name: "description",
                type: "String",
                isOptional: true,
                isArray: false,
                isRelation: false,
              },
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateBaseDto({
          modelName: { pascal: "Product", camel: "product", kebab: "product" },
        });

        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  name!: string;"
        );
        expect(result).toContain(
          "@IsOptional()\n  @IsString()\n  description?: string;"
        );
      });

      it("should handle all field types correctly", () => {
        (prismaSchemaParser.models as any) = [
          {
            name: "Entity",
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
                name: "age",
                type: "Int",
                isOptional: false,
                isArray: false,
                isRelation: false,
              },
              {
                name: "score",
                type: "Float",
                isOptional: false,
                isArray: false,
                isRelation: false,
              },
              {
                name: "active",
                type: "Boolean",
                isOptional: false,
                isArray: false,
                isRelation: false,
              },
              {
                name: "birthDate",
                type: "DateTime",
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
                name: "bigNum",
                type: "BigInt",
                isOptional: false,
                isArray: false,
                isRelation: false,
              },
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateBaseDto({
          modelName: { pascal: "Entity", camel: "entity", kebab: "entity" },
        });

        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  name!: string;"
        );
        expect(result).toContain(
          "@IsNumber()\n  age!: number;"
        );
        expect(result).toContain(
          "@IsNumber()\n  score!: number;"
        );
        expect(result).toContain(
          "@IsBoolean()\n  active!: boolean;"
        );
        expect(result).toContain(
          "@IsDate()\n  birthDate!: Date;"
        );
        expect(result).toContain(
          "@IsObject()\n  metadata!: any;"
        );
        expect(result).toContain(
          "@IsNumber()\n  bigNum!: bigint;"
        );
      });
    });

    describe("Relations Exclusion", () => {
      it("should exclude all relations (single and array)", () => {
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
                name: "authorId",
                type: "String",
                isOptional: false,
                isArray: false,
                isRelation: false,
              },
              {
                name: "author",
                type: "User",
                isOptional: false,
                isArray: false,
                isRelation: true,
                foreignKeyField: "authorId",
              },
              {
                name: "comments",
                type: "Comment",
                isOptional: false,
                isArray: true,
                isRelation: true,
              },
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateBaseDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  title!: string;"
        );
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  authorId!: string;"
        );
        expect(result).not.toContain("author:");
        expect(result).not.toContain("comments:");
        expect(result).not.toContain("ValidateNested");
        expect(result).not.toContain("class-transformer");
      });

      it("should exclude optional relations", () => {
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
        ];

        const result = classValidatorDtoGenerator.generateBaseDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).not.toContain("category:");
        expect(result).toContain(
          "@IsString()\n  categoryId?: string;"
        );
      });
    });

    describe("User Module - Password Exclusion", () => {
      it("should exclude password field for user module", () => {
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

        const result = classValidatorDtoGenerator.generateBaseDto({
          modelName: { pascal: "User", camel: "user", kebab: "user" },
        });

        expect(result).toContain(
          "@IsNotEmpty()\n  @IsEmail()\n  email!: string;"
        );
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  name!: string;"
        );
        expect(result).not.toContain("password:");
      });

      it("should include password field for non-user modules", () => {
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
                name: "password",
                type: "String",
                isOptional: false,
                isArray: false,
                isRelation: false,
              },
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateBaseDto({
          modelName: { pascal: "Account", camel: "account", kebab: "account" },
        });

        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  password!: string;"
        );
      });

      it("should apply @IsEmail for user module email field", () => {
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
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateBaseDto({
          modelName: { pascal: "User", camel: "user", kebab: "user" },
        });

        expect(result).toContain(
          "@IsNotEmpty()\n  @IsEmail()\n  email!: string;"
        );
        expect(result).not.toContain("@IsNotEmpty()\n  @IsString()\n  email");
      });
    });

    describe("Enums", () => {
      it("should handle enum fields with proper imports", () => {
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
                name: "role",
                type: "Role",
                isOptional: false,
                isArray: false,
                isRelation: false,
              },
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateBaseDto({
          modelName: { pascal: "User", camel: "user", kebab: "user" },
        });

        expect(result).toContain('import { Role } from "@prisma/client"');
        expect(result).toContain(
          "@IsEnum(Role)\n  role!: Role;"
        );
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

        const result = classValidatorDtoGenerator.generateBaseDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).not.toContain("!:");
        expect(result).not.toContain("?:");
        expect(result).toContain("title: string;");
        expect(result).toContain("content: string;");
      });
    });
  });

  describe("generateQueryDto", () => {
    describe("Error Handling", () => {
      it("should throw error when modelName is not provided", () => {
        expect(() =>
          classValidatorDtoGenerator.generateQueryDto({} as any)
        ).toThrow("Module name is required for DTO template");
      });

      it("should throw error when model is not found in Prisma schema", () => {
        (prismaSchemaParser.models as any) = [];

        expect(() =>
          classValidatorDtoGenerator.generateQueryDto({
            modelName: {
              pascal: "NonExistent",
              camel: "nonExistent",
              kebab: "non-existent",
            },
          })
        ).toThrow("Model NonExistent not found in Prisma schema");
      });
    });

    describe("Filter Classes Generation", () => {
      it("should generate StringFilter for string fields", () => {
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

        const result = classValidatorDtoGenerator.generateQueryDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).toContain("class StringFilter {");
        expect(result).toContain("icontains?: string;");
      });

      it("should generate NumberFilter for numeric fields", () => {
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
                name: "price",
                type: "Float",
                isOptional: false,
                isArray: false,
                isRelation: false,
              },
              {
                name: "stock",
                type: "Int",
                isOptional: false,
                isArray: false,
                isRelation: false,
              },
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateQueryDto({
          modelName: { pascal: "Product", camel: "product", kebab: "product" },
        });

        expect(result).toContain("class NumberFilter {");
        expect(result).toContain("equals?: number;");
        expect(result).toContain("gte?: number;");
        expect(result).toContain("lte?: number;");
      });

      it("should generate BooleanFilter for boolean fields", () => {
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
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateQueryDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).not.toContain("class BooleanFilter {");
        expect(result).toContain(
          "@IsOptional()\n  @IsBoolean()\n  published?: boolean;"
        );
      });

      it("should generate DateTimeFilter for DateTime fields", () => {
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
                name: "publishedAt",
                type: "DateTime",
                isOptional: false,
                isArray: false,
                isRelation: false,
              },
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateQueryDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).toContain("class DateTimeFilter {");
        expect(result).toContain("equals?: string;");
        expect(result).toContain("gte?: string;");
        expect(result).toContain("lte?: string;");
      });

      it("should generate enum filters with proper naming", () => {
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
                name: "role",
                type: "Role",
                isOptional: false,
                isArray: false,
                isRelation: false,
              },
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateQueryDto({
          modelName: { pascal: "User", camel: "user", kebab: "user" },
        });

        expect(result).toContain('import { Role } from "@prisma/client"');
        expect(result).not.toContain("class RoleFilter {");
        expect(result).toContain(
          "@IsOptional()\n  @IsEnum(Role)\n  role?: Role;"
        );
      });
    });

    describe("Filter Classes Spacing", () => {
      it("should have proper spacing between filter classes", () => {
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
                name: "active",
                type: "Boolean",
                isOptional: false,
                isArray: false,
                isRelation: false,
              },
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateQueryDto({
          modelName: { pascal: "Product", camel: "product", kebab: "product" },
        });

        expect(result).toMatch(
          /class StringFilter \{[\s\S]*?\}\n\nclass NumberFilter \{/
        );
        expect(result).not.toMatch(
          /class NumberFilter \{[\s\S]*?\}\n\nclass BooleanFilter \{/
        );
      });

      it("should have spacing before and after filter classes section", () => {
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

        const result = classValidatorDtoGenerator.generateQueryDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        // Should have newline after imports before filter classes
        expect(result).toMatch(
          /from "class-validator";\nimport { Type, Transform } from \"class-transformer\";\n\nclass StringFilter/
        );
        // Should have newline after filter classes before main DTO
        expect(result).toMatch(/\}\n\nexport default class PostQueryDto/);
      });
    });

    describe("Relation Filters", () => {
      it("should generate relation filter for single relations", () => {
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
                name: "authorId",
                type: "String",
                isOptional: false,
                isArray: false,
                isRelation: false,
              },
              {
                name: "author",
                type: "User",
                isOptional: false,
                isArray: false,
                isRelation: true,
                foreignKeyField: "authorId",
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
              {
                name: "name",
                type: "String",
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
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateQueryDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).toContain("class UserForQueryPostDto {");
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  id!: string;"
        );
      });

      it("should skip array relations", () => {
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
                name: "posts",
                type: "Post",
                isOptional: false,
                isArray: true,
                isRelation: true,
              },
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateQueryDto({
          modelName: { pascal: "User", camel: "user", kebab: "user" },
        });

        expect(result).not.toContain("posts:");
        expect(result).not.toContain("PostRelationFilter");
      });

      it("should only include reference field in nested DTOs (single level)", () => {
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
              {
                name: "name",
                type: "String",
                isOptional: false,
                isArray: false,
                isRelation: false,
              },
              {
                name: "parentId",
                type: "String",
                isOptional: true,
                isArray: false,
                isRelation: false,
              },
              {
                name: "parent",
                type: "Category",
                isOptional: true,
                isArray: false,
                isRelation: true,
                foreignKeyField: "parentId",
              },
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateQueryDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).toContain("class CategoryForQueryPostDto {");
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  id!: string;"
        );
        expect(result).toContain(
          "@IsOptional()\n  @ValidateNested()\n  @Type(() => CategoryForQueryPostDto)\n  category?: CategoryForQueryPostDto;"
        );

        const categoryDtoMatch = result.match(
          /class CategoryForQueryPostDto \{([\s\S]*?)\}/
        );
        if (categoryDtoMatch) {
          expect(categoryDtoMatch[1]).not.toContain("name");
          expect(categoryDtoMatch[1]).not.toContain("parentId");
          expect(categoryDtoMatch[1]).not.toContain("parent");
        }
      });
    });

    describe("Password Exclusion", () => {
      it("should exclude password from main QueryDto for user module", () => {
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

        const result = classValidatorDtoGenerator.generateQueryDto({
          modelName: { pascal: "User", camel: "user", kebab: "user" },
        });

        expect(result).toContain(
          "@IsOptional()\n  @ValidateNested()\n  @Type(() => StringFilter)\n  email?: StringFilter;"
        );
        expect(result).toContain(
          "@IsOptional()\n  @ValidateNested()\n  @Type(() => StringFilter)\n  name?: StringFilter;"
        );
        expect(result).not.toContain("password?:");
      });

      it("should exclude password from relation nested DTOs for user model", () => {
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
                name: "authorId",
                type: "String",
                isOptional: false,
                isArray: false,
                isRelation: false,
              },
              {
                name: "author",
                type: "User",
                isOptional: false,
                isArray: false,
                isRelation: true,
                foreignKeyField: "authorId",
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

        const result = classValidatorDtoGenerator.generateQueryDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).toContain("class UserForQueryPostDto {");
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  id!: string;"
        );

        const userDtoMatch = result.match(
          /class UserForQueryPostDto \{([\s\S]*?)\}/
        );
        if (userDtoMatch) {
          expect(userDtoMatch[1]).not.toContain("password");
          expect(userDtoMatch[1]).not.toContain("email");
          expect(userDtoMatch[1]).not.toContain("name");
        }
      });

      it("should include password for non-user modules", () => {
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
                name: "password",
                type: "String",
                isOptional: false,
                isArray: false,
                isRelation: false,
              },
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateQueryDto({
          modelName: { pascal: "Account", camel: "account", kebab: "account" },
        });

        expect(result).toContain(
          "@IsOptional()\n  @ValidateNested()\n  @Type(() => StringFilter)\n  password?: StringFilter;"
        );
      });
    });

    describe("Import Organization", () => {
      it("should import all validators used in filter classes", () => {
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
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateQueryDto({
          modelName: { pascal: "Product", camel: "product", kebab: "product" },
        });

        expect(result).toContain("IsOptional");
        expect(result).toContain("ValidateNested");
        expect(result).toContain("IsString");
        expect(result).toContain("IsNumber");
      });

      it("should import Type from class-transformer", () => {
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

        const result = classValidatorDtoGenerator.generateQueryDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).not.toContain(
          'import { Type } from "class-transformer"'
        );
      });

      it("should import enums when used", () => {
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
                name: "role",
                type: "Role",
                isOptional: false,
                isArray: false,
                isRelation: false,
              },
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateQueryDto({
          modelName: { pascal: "User", camel: "user", kebab: "user" },
        });

        expect(result).toContain('import { Role } from "@prisma/client"');
        expect(result).toContain("IsEnum");
      });
    });

    describe("All Fields Optional", () => {
      it("should generate simple nested DTOs for single relations", () => {
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
                name: "authorId",
                type: "String",
                isOptional: false,
                isArray: false,
                isRelation: false,
              },
              {
                name: "author",
                type: "User",
                isOptional: false,
                isArray: false,
                isRelation: true,
                foreignKeyField: "authorId",
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
              {
                name: "name",
                type: "String",
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
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateQueryDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).toContain("class UserForQueryPostDto {");
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  id!: string;"
        );
        expect(result).not.toContain("UserRelationFilter");
      });

      it("should include meta fields (page, limit, sort, fields)", () => {
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

        const result = classValidatorDtoGenerator.generateQueryDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).toContain(
          "@IsNumber()\n  @Transform(({ value }) => (value ? Number(value) : undefined))\n  page?: number;"
        );
        expect(result).toContain(
          "@IsNumber()\n  @Max(100)\n  @Transform(({ value }) => (value ? Number(value) : undefined))\n  limit?: number;"
        );
        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @IsString()\n  @Type(() => String)\n  sort?: string;"
        );
        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @IsString()\n  @Type(() => String)\n  fields?: string;"
        );
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
            ],
          },
        ];

        const result = classValidatorDtoGenerator.generateQueryDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).not.toContain("?:");
        expect(result).toContain("title: StringFilter;");
        expect(result).toContain("contains: string;");
      });
    });
  });

  describe("generateUpdateDto", () => {
    const mockGetUserFileExtension =
      fsHelpers.getUserFileExtension as jest.MockedFunction<
        typeof fsHelpers.getUserFileExtension
      >;

    beforeEach(() => {
      jest.clearAllMocks();
      mockGetUserFileExtension.mockReturnValue("ts");
      (prismaSchemaParser.isEnum as jest.Mock) = jest
        .fn()
        .mockReturnValue(false);
    });

    describe("Error Handling", () => {
      it("should throw error when modelName is not provided", () => {
        expect(() =>
          classValidatorDtoGenerator.generateUpdateDto({} as TemplateOptions)
        ).toThrow("Module name is required for DTO template");
      });

      it("should throw error when model is not found in Prisma schema", () => {
        (prismaSchemaParser.models as any) = [];

        expect(() =>
          classValidatorDtoGenerator.generateUpdateDto({
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
          modelName: { pascal: "Product", camel: "product", kebab: "product" },
        });

        expect(result).toContain(
          'import { IsOptional, IsNotEmpty, IsString, IsNumber, IsBoolean, IsDate } from "class-validator"'
        );
        expect(result).toContain("export default class UpdateProductDto {");
        expect(result).toContain(
          "@IsString()\n  name?: string;"
        );
        expect(result).toContain(
          "@IsOptional()\n  @IsNumber()\n  price?: number;"
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        // Both should be optional in update
        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @IsString()\n  title?: string;"
        );
        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @IsString()\n  content?: string;"
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @IsString()\n  status?: string;"
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
          modelName: { pascal: "File", camel: "file", kebab: "file" },
        });

        expect(result).toContain(
          "@IsOptional()\n  @IsNumber()\n  size?: bigint;"
        );
        expect(result).toContain(
          "@IsOptional()\n  @IsObject()\n  metadata?: any;"
        );
        expect(result).toContain(
          "@IsOptional()\n  data?: Buffer;"
        );
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @IsArray()\n  @IsString({ each: true })\n  tags?: string[];"
        );
        expect(result).toContain(
          "@IsOptional()\n  @IsArray()\n  @IsNumber({ each: true })\n  scores?: number[];"
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
          modelName: { pascal: "User", camel: "user", kebab: "user" },
        });

        expect(result).toContain(
          'import { Role, Status } from "@prisma/client"'
        );
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
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
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  id!: string;"
        );
        // Should be optional even though it was required in create
        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @ValidateNested()\n  @Type(() => CategoryForUpdatePostDto)\n  category?: CategoryForUpdatePostDto;"
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).toContain("class CategoryForUpdatePostDto {");
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  name!: string;"
        );
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
          modelName: { pascal: "Order", camel: "order", kebab: "order" },
        });

        expect(result).toContain("class ProductForUpdateOrderDto {");
        expect(result).toContain(
          "@IsNumber()\n  code!: number;"
        );
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @ValidateNested()\n  @Type(() => CategoryForUpdatePostDto)\n  category?: CategoryForUpdatePostDto;"
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
          modelName: {
            pascal: "Category",
            camel: "category",
            kebab: "category",
          },
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
          modelName: { pascal: "Order", camel: "order", kebab: "order" },
        });

        expect(result).toContain("class UserForUpdateOrderDto {");
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  id!: string;"
        );
        expect(result).toContain("class ProductForUpdateOrderDto {");
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  code!: string;"
        );
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
          modelName: { pascal: "User", camel: "user", kebab: "user" },
        });

        expect(result).toContain(
          'import { IsOptional, IsNotEmpty, IsEmail, IsString } from "class-validator"'
        );
        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @IsEmail()\n  email?: string;"
        );
        expect(result).not.toContain("@IsNotEmpty()\n  @IsString()\n  email");
        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @IsString()\n  name?: string;"
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
          modelName: { pascal: "User", camel: "user", kebab: "user" },
        });

        expect(result).toContain(
          'import { IsOptional, IsNotEmpty, IsString, MinLength, Matches } from "class-validator"'
        );
        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @IsString()\n  @MinLength(8)"
        );
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
          modelName: { pascal: "User", camel: "user", kebab: "user" },
        });

        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @IsEmail()\n  email?: string;"
        );
        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @IsString()\n  @MinLength(8)"
        );
        expect(result).toContain("@Matches");
        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @IsString()\n  name?: string;"
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
          modelName: { pascal: "Account", camel: "account", kebab: "account" },
        });

        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @IsString()\n  email?: string;"
        );
        expect(result).not.toContain("@IsEmail()");
        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @IsString()\n  password?: string;"
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
          modelName: { pascal: "Simple", camel: "simple", kebab: "simple" },
        });

        expect(result).toContain(
          'import { IsOptional, IsNotEmpty, IsString } from "class-validator"'
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
          modelName: { pascal: "Article", camel: "article", kebab: "article" },
        });

        // All should have @IsOptional and ? modifier
        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @IsString()\n  title?: string;"
        );
        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @IsString()\n  slug?: string;"
        );
        expect(result).toContain(
          "@IsOptional()\n  @IsBoolean()\n  published?: boolean;"
        );

        // Should not have any required fields (!)
        expect(result).not.toContain("title!: string;");
        expect(result).not.toContain("slug!: string;");
        expect(result).not.toContain("published!: boolean;");
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

        const result = classValidatorDtoGenerator.generateUpdateDto({
          modelName: { pascal: "Product", camel: "product", kebab: "product" },
        });

        // Count @IsOptional occurrences (should match number of non-restricted fields)
        const isOptionalCount = (result.match(/@IsOptional\(\)/g) || []).length;
        expect(isOptionalCount).toBe(3); // name, price, description

        // Verify all fields have @IsOptional
        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @IsString()\n  name?: string;"
        );
        expect(result).toContain(
          "@IsOptional()\n  @IsNumber()\n  price?: number;"
        );
        expect(result).toContain(
          "@IsOptional()\n  @IsNotEmpty()\n  @IsString()\n  description?: string;"
        );
      });
    });
  });

  describe("generateCreateDto", () => {
    const mockGetUserFileExtension =
      fsHelpers.getUserFileExtension as jest.MockedFunction<
        typeof fsHelpers.getUserFileExtension
      >;

    beforeEach(() => {
      jest.clearAllMocks();
      mockGetUserFileExtension.mockReturnValue("ts");
      (prismaSchemaParser.isEnum as jest.Mock) = jest
        .fn()
        .mockReturnValue(false);
    });

    describe("Error Handling", () => {
      it("should throw error when modelName is not provided", () => {
        expect(() =>
          classValidatorDtoGenerator.generateCreateDto({} as TemplateOptions)
        ).toThrow("Module name is required for DTO template");
      });

      it("should throw error when model is not found in Prisma schema", () => {
        (prismaSchemaParser.models as any) = [];

        expect(() =>
          classValidatorDtoGenerator.generateCreateDto({
            modelName: {
              pascal: "NonExistent",
              camel: "nonExistent",
              kebab: "non-existent",
            },
          })
        ).toThrow("Model NonExistent not found in Prisma schema");
      });
    });

    describe("Basic Field Types", () => {
      it("should generate DTO with string, number, boolean, and date fields", () => {
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: { pascal: "Product", camel: "product", kebab: "product" },
        });

        expect(result).toContain(
          'import { IsNotEmpty, IsString, IsNumber, IsBoolean, IsDate } from "class-validator"'
        );
        expect(result).toContain("export default class CreateProductDto {");
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  name!: string;"
        );
        expect(result).toContain(
          "@IsNumber()\n  price!: number;"
        );
        expect(result).toContain(
          "@IsBoolean()\n  inStock!: boolean;"
        );
        expect(result).toContain(
          "@IsDate()\n  releaseDate!: Date;"
        );
        expect(result).not.toContain("id:");
      });

      it("should handle optional fields with @IsOptional decorator", () => {
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  title!: string;"
        );
        expect(result).toContain(
          "@IsOptional()\n  @IsString()\n  content?: string;"
        );
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).toContain(
          "@IsString()\n  status?: string;"
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: { pascal: "File", camel: "file", kebab: "file" },
        });

        expect(result).toContain(
          "@IsNumber()\n  size!: bigint;"
        );
        expect(result).toContain(
          "@IsObject()\n  metadata!: any;"
        );
        expect(result).toContain("data!: Buffer;");
        expect(result).not.toContain("@IsBuffer");
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).not.toContain("!: string;");
        expect(result).not.toContain("?: string;");
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).not.toContain("id:");
        expect(result).not.toContain("createdAt:");
        expect(result).not.toContain("updatedAt:");
        expect(result).not.toContain("deletedAt:");
        expect(result).not.toContain("categoryId:");
        expect(result).toContain("title!: string;");
        expect(result).toContain("category!");
      });
    });

    describe("Array Fields", () => {
      it("should handle array fields with { each: true }", () => {
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).toContain(
          "@IsNotEmpty()\n  @IsArray()\n  @IsString({ each: true })\n  tags!: string[];"
        );
        expect(result).toContain(
          "@IsOptional()\n  @IsArray()\n  @IsNumber({ each: true })\n  scores?: number[];"
        );
      });
    });

    describe("Enum Fields", () => {
      it("should handle enums with proper imports and @IsEnum decorator", () => {
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: { pascal: "User", camel: "user", kebab: "user" },
        });

        expect(result).toContain(
          'import { Role, Status } from "@prisma/client"'
        );
        expect(result).toContain(
          "@IsEnum(Role)\n  role!: Role;"
        );
        expect(result).toContain(
          "@IsEnum(Status)\n  status?: Status;"
        );
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).toContain('import { Tag } from "@prisma/client"');
        expect(result).toContain(
          "@IsArray()\n  @IsEnum(Tag, { each: true })\n  tags!: Tag[];"
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).not.toContain('@prisma/client"');
      });
    });

    describe("Relation Fields", () => {
      it("should handle singular relations with inline nested DTOs using default id reference", () => {
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

        const result = classValidatorDtoGenerator.generateCreateDto({
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
        expect(result).not.toContain("post.sub-dtos");
        expect(result).toContain("class CategoryForCreatePostDto {");
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  id!: string;"
        );
        expect(result).toContain(
          "@ValidateNested()\n  @Type(() => CategoryForCreatePostDto)\n  category!: CategoryForCreatePostDto;"
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).toContain("class CategoryForCreatePostDto {");
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  name!: string;"
        );
        expect(result).not.toContain(
          "CategoryForCreatePostDto {\n  @IsString()\n  id"
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: { pascal: "Order", camel: "order", kebab: "order" },
        });

        expect(result).toContain("class ProductForCreateOrderDto {");
        expect(result).toContain(
          "@IsNumber()\n  code!: number;"
        );
      });

      it("should handle optional relations", () => {
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: { pascal: "Post", camel: "post", kebab: "post" },
        });

        expect(result).toContain(
          "@IsOptional()\n  @ValidateNested()\n  @Type(() => CategoryForCreatePostDto)\n  category?: CategoryForCreatePostDto;"
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: {
            pascal: "Category",
            camel: "category",
            kebab: "category",
          },
        });

        expect(result).not.toContain("posts:");
        expect(result).toContain("name!: string;");
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: { pascal: "Order", camel: "order", kebab: "order" },
        });

        expect(result).toContain("class UserForCreateOrderDto {");
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  id!: string;"
        );
        expect(result).toContain("class ProductForCreateOrderDto {");
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  code!: string;"
        );
      });
    });

    describe("User Module Special Validations", () => {
      it("should apply @IsEmail() for email field (not @IsString)", () => {
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: { pascal: "User", camel: "user", kebab: "user" },
        });

        expect(result).toContain(
          'import { IsNotEmpty, IsEmail, IsString } from "class-validator"'
        );
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsEmail()\n  email!: string;"
        );
        expect(result).not.toContain("@IsNotEmpty()\n  @IsString()\n  email");
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  name!: string;"
        );
      });

      it("should apply password validation with MinLength and Matches", () => {
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: { pascal: "User", camel: "user", kebab: "user" },
        });

        expect(result).toContain(
          'import { IsNotEmpty, IsString, MinLength, Matches } from "class-validator"'
        );
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  @MinLength(8)"
        );
        expect(result).toContain(
          '@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/, { message: "Password must contain at least one uppercase letter, one lowercase letter, and one number" })'
        );
        expect(result).toContain("password!: string;");
      });

      it("should apply both email and password validations together", () => {
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: { pascal: "User", camel: "user", kebab: "user" },
        });

        expect(result).toContain(
          "@IsNotEmpty()\n  @IsEmail()\n  email!: string;"
        );
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  @MinLength(8)"
        );
        expect(result).toContain("@Matches");
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  name!: string;"
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: { pascal: "Account", camel: "account", kebab: "account" },
        });

        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  email!: string;"
        );
        expect(result).not.toContain("@IsEmail()");
        expect(result).toContain(
          "@IsNotEmpty()\n  @IsString()\n  password!: string;"
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

        const result = classValidatorDtoGenerator.generateCreateDto({
          modelName: { pascal: "Simple", camel: "simple", kebab: "simple" },
        });

        expect(result).toContain(
          'import { IsNotEmpty, IsString } from "class-validator"'
        );
        expect(result).not.toContain("IsOptional");
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

        const result = classValidatorDtoGenerator.generateCreateDto({
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
  });
});
