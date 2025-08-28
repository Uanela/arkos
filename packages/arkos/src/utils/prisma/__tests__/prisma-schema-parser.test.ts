import parser from "../prisma-schema-parser";

jest.mock("fs", () => ({
  readdirSync: jest.fn(),
}));

describe("PrismaSchemaParser", () => {
  const mockGetPrismaSchemasContent = jest.spyOn(
    parser,
    "getPrismaSchemasContent"
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("parse()", () => {
    it("should return empty schema when no content is projest.ed", () => {
      mockGetPrismaSchemasContent.mockReturnValue("");

      const result = parser.parse();

      expect(result).toEqual({
        models: [],
        enums: [],
      });
    });

    it("should parse schema with models and enums", () => {
      const schemaContent = `
        enum Status {
          ACTIVE
          INACTIVE
        }

        model User {
          id    Int    @id @default(autoincrement())
          email String @unique
          status Status
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      const result = parser.parse();

      expect(result.models).toHaveLength(1);
      expect(result.enums).toHaveLength(1);
      expect(result.models[0].name).toBe("User");
      expect(result.enums[0].name).toBe("Status");
    });
  });

  describe("extractEnums()", () => {
    it("should extract enum with multiple values", () => {
      const schemaContent = `
        enum UserRole {
          ADMIN
          USER
          MODERATOR
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      const result = parser.parse();

      expect(result.enums).toHaveLength(1);
      expect(result.enums[0]).toEqual({
        name: "UserRole",
        values: ["ADMIN", "USER", "MODERATOR"],
      });
    });

    it("should extract multiple enums", () => {
      const schemaContent = `
        enum Status {
          ACTIVE
          INACTIVE
        }

        enum Role {
          USER
          ADMIN
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      const result = parser.parse();

      expect(result.enums).toHaveLength(2);
      expect(result.enums[0].name).toBe("Status");
      expect(result.enums[1].name).toBe("Role");
    });

    it("should handle enums with trailing commas", () => {
      const schemaContent = `
        enum Status {
          ACTIVE,
          INACTIVE,
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      const result = parser.parse();

      expect(result.enums[0].values).toEqual(["ACTIVE", "INACTIVE"]);
    });
  });

  describe("extractModels()", () => {
    it("should extract model with basic fields", () => {
      const schemaContent = `
        model User {
          id    Int    @id @default(autoincrement())
          email String @unique
          name  String?
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      const result = parser.parse();

      expect(result.models).toHaveLength(1);
      const user = result.models[0];
      expect(user.name).toBe("User");
      expect(user.fields).toHaveLength(3);

      // Check id field
      const idField = user.fields.find((f) => f.name === "id");
      expect(idField).toEqual({
        name: "id",
        type: "Int",
        isOptional: false,
        isRelation: false,
        isArray: false,
        connectionField: "",
        defaultValue: undefined, // autoincrement() is a function
        isId: true,
        isUnique: false,
        attributes: ["@id", "@default(autoincrement())"],
      });

      // Check email field
      const emailField = user.fields.find((f) => f.name === "email");
      expect(emailField).toEqual({
        name: "email",
        type: "String",
        isOptional: false,
        isRelation: false,
        isArray: false,
        connectionField: "",
        defaultValue: undefined,
        isId: false,
        isUnique: true,
        attributes: ["@unique"],
      });

      // Check name field (optional)
      const nameField = user.fields.find((f) => f.name === "name");
      expect(nameField?.isOptional).toBe(true);
    });

    it("should extract model with @@map directive", () => {
      const schemaContent = `
        model User {
          id    Int    @id
          email String

          @@map("users")
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      const result = parser.parse();

      expect(result.models[0].mapName).toBe("users");
    });

    it("should handle array fields", () => {
      const schemaContent = `
        model Post {
          id   Int      @id
          tags String[]
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      const result = parser.parse();

      const tagsField = result.models[0].fields.find((f) => f.name === "tags");
      expect(tagsField?.isArray).toBe(true);
      expect(tagsField?.type).toBe("String");
    });

    it("should extract relation fields with connection field", () => {
      const schemaContent = `
        model User {
          id       Int    @id
          posts    Post[]
        }

        model Post {
          id       Int  @id
          authorId Int
          author   User @relation(fields: [authorId], references: [id])
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      const result = parser.parse();

      const postModel = result.models.find((m) => m.name === "Post");
      const authorField = postModel?.fields.find((f) => f.name === "author");
      expect(authorField?.connectionField).toBe("authorId");
    });
  });

  describe("parseDefaultValue()", () => {
    beforeEach(() => {
      // We need to access the private method through any cast for testing
      mockGetPrismaSchemasContent.mockReturnValue("");
    });

    it("should parse string default values", () => {
      const schemaContent = `
        model User {
          name String @default("John Doe")
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      const result = parser.parse();
      const nameField = result.models[0].fields.find((f) => f.name === "name");
      expect(nameField?.defaultValue).toBe("John Doe");
    });

    it("should parse boolean default values", () => {
      const schemaContent = `
        model User {
          isActive Boolean @default(true)
          isDeleted Boolean @default(false)
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      const result = parser.parse();
      const isActiveField = result.models[0].fields.find(
        (f) => f.name === "isActive"
      );
      const isDeletedField = result.models[0].fields.find(
        (f) => f.name === "isDeleted"
      );

      expect(isActiveField?.defaultValue).toBe(true);
      expect(isDeletedField?.defaultValue).toBe(false);
    });

    it("should parse numeric default values", () => {
      const schemaContent = `
        model Product {
          price Int @default(0)
          rating Float @default(4.5)
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      const result = parser.parse();
      const priceField = result.models[0].fields.find(
        (f) => f.name === "price"
      );
      const ratingField = result.models[0].fields.find(
        (f) => f.name === "rating"
      );

      expect(priceField?.defaultValue).toBe(0);
      expect(ratingField?.defaultValue).toBe(4.5);
    });

    it("should parse enum default values", () => {
      const schemaContent = `
        enum Status {
          ACTIVE
          INACTIVE
        }

        model User {
          status Status @default(ACTIVE)
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      const result = parser.parse();
      const statusField = result.models[0].fields.find(
        (f) => f.name === "status"
      );
      expect(statusField?.defaultValue).toBe("ACTIVE");
    });

    it("should return undefined for function defaults", () => {
      const schemaContent = `
        model User {
          id Int @id @default(autoincrement())
          createdAt DateTime @default(now())
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      const result = parser.parse();
      const idField = result.models[0].fields.find((f) => f.name === "id");
      const createdAtField = result.models[0].fields.find(
        (f) => f.name === "createdAt"
      );

      expect(idField?.defaultValue).toBeUndefined();
      expect(createdAtField?.defaultValue).toBeUndefined();
    });
  });

  describe("isEnum()", () => {
    it("should return true for existing enum", () => {
      const schemaContent = `
        enum Status {
          ACTIVE
          INACTIVE
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      parser.parse();
      expect(parser.isEnum("Status")).toBe(true);
    });

    it("should return false for non-existing enum", () => {
      const schemaContent = `
        enum Status {
          ACTIVE
          INACTIVE
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      parser.parse();
      expect(parser.isEnum("Role")).toBe(false);
      expect(parser.isEnum("String")).toBe(false);
    });
  });

  describe("isModel()", () => {
    it("should return true for existing model", () => {
      const schemaContent = `
        model User {
          id Int @id
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      parser.parse();
      expect(parser.isModel("User")).toBe(true);
    });

    it("should return false for non-existing model", () => {
      const schemaContent = `
        model User {
          id Int @id
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      parser.parse();
      expect(parser.isModel("Post")).toBe(false);
      expect(parser.isModel("String")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle empty schema gracefully", () => {
      mockGetPrismaSchemasContent.mockReturnValue("");

      const result = parser.parse();

      expect(result).toEqual({
        models: [],
        enums: [],
      });
    });

    it("should handle schema with comments", () => {
      const schemaContent = `
        // This is a comment
        model User {
          id    Int    @id
          // This field stores the email
          email String @unique
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      const result = parser.parse();

      expect(result.models[0].fields).toHaveLength(2);
      expect(result.models[0].fields.map((f) => f.name)).toEqual([
        "id",
        "email",
      ]);
    });

    it("should handle malformed blocks gracefully", () => {
      const schemaContent = `
        model {
          invalid
        }
        
        enum {
          ALSO_INVALID
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      const result = parser.parse();

      expect(result.models).toHaveLength(0);
      expect(result.enums).toHaveLength(0);
    });

    it("should handle null content from helper", () => {
      mockGetPrismaSchemasContent.mockReturnValue(null as any);

      const result = parser.parse();

      expect(result).toEqual({
        models: [],
        enums: [],
      });
    });
  });

  describe("complex schema parsing", () => {
    it("should parse complex schema with relations", () => {
      const schemaContent = `
        enum UserRole {
          ADMIN
          USER
          MODERATOR
        }

        enum PostStatus {
          DRAFT
          PUBLISHED
          ARCHIVED
        }

        model User {
          id        Int      @id @default(autoincrement())
          email     String   @unique
          name      String?
          role      UserRole @default(USER)
          isActive  Boolean  @default(true)
          posts     Post[]
          profile   Profile?
          createdAt DateTime @default(now())
          updatedAt DateTime @updatedAt

          @@map("users")
        }

        model Profile {
          id     Int    @id @default(autoincrement())
          bio    String?
          avatar String?
          userId Int    @unique
          user   User   @relation(fields: [userId], references: [id])
        }

        model Post {
          id        Int        @id @default(autoincrement())
          title     String
          content   String?
          status    PostStatus @default(DRAFT)
          tags      String[]
          authorId  Int
          author    User       @relation(fields: [authorId], references: [id])
          createdAt DateTime   @default(now())
          updatedAt DateTime   @updatedAt

          @@map("posts")
        }
      `;
      mockGetPrismaSchemasContent.mockReturnValue(schemaContent);

      const result = parser.parse();

      // Check enums
      expect(result.enums).toHaveLength(2);
      expect(result.enums.map((e) => e.name)).toEqual([
        "UserRole",
        "PostStatus",
      ]);

      // Check models
      expect(result.models).toHaveLength(3);
      expect(result.models.map((m) => m.name)).toEqual([
        "User",
        "Profile",
        "Post",
      ]);

      // Check User model details
      const userModel = result.models.find((m) => m.name === "User")!;
      expect(userModel.mapName).toBe("users");
      expect(userModel.fields).toHaveLength(9);

      const roleField = userModel.fields.find((f) => f.name === "role")!;
      expect(roleField.type).toBe("UserRole");
      expect(roleField.defaultValue).toBe("USER");

      // Check relation field
      const profileRelationField = userModel.fields.find(
        (f) => f.name === "profile"
      )!;
      expect(profileRelationField.type).toBe("Profile");
      expect(profileRelationField.isOptional).toBe(true);

      // Check Post model relation
      const postModel = result.models.find((m) => m.name === "Post")!;
      const authorField = postModel.fields.find((f) => f.name === "author")!;
      expect(authorField.connectionField).toBe("authorId");

      // Test helper methods
      expect(parser.isEnum("UserRole")).toBe(true);
      expect(parser.isEnum("PostStatus")).toBe(true);
      expect(parser.isModel("User")).toBe(true);
      expect(parser.isModel("Profile")).toBe(true);
      expect(parser.isModel("Post")).toBe(true);
    });
  });
});
