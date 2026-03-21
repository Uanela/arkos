import { PrismaJsonSchemaGenerator } from "../prisma-json-schema-generator";
import prismaSchemaParser from "../prisma-schema-parser";
import { getArkosConfig } from "../../../exports";
import loadableRegistry from "../../../components/arkos-loadable-registry";
import { isAuthenticationEnabled } from "../../helpers/arkos-config.helpers";

jest.mock("../../../modules/swagger/utils/helpers/swagger.router.helpers");
jest.mock("../../../exports", () => ({
  ...jest.requireActual("../../../exports"),
  getArkosConfig: jest.fn(),
}));
jest.mock("../../helpers/arkos-config.helpers");

// Mock all dependencies
jest.mock("../../helpers/deepmerge.helper");
jest.mock("../../dynamic-loader");
jest.mock("fs");

describe("PrismaJsonSchemaGenerator", () => {
  let generator: PrismaJsonSchemaGenerator;

  const mockSchema = {
    models: [
      {
        name: "User",
        mapName: "users",
        fields: [
          {
            name: "id",
            type: "Int",
            isId: true,
            isOptional: false,
            isArray: false,
            foreignKeyField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: ["@id", "@default(autoincrement())"],
          },
          {
            name: "email",
            type: "String",
            isId: false,
            isOptional: false,
            isArray: false,
            foreignKeyField: "",
            defaultValue: undefined,
            isUnique: true,
            attributes: ["@unique"],
          },
          {
            name: "name",
            type: "String",
            isId: false,
            isOptional: true,
            isArray: false,
            foreignKeyField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: [],
          },
          {
            name: "password",
            type: "String",
            isId: false,
            isOptional: false,
            isArray: false,
            foreignKeyField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: [],
          },
          {
            name: "role",
            type: "UserRole",
            isId: false,
            isOptional: false,
            isArray: false,
            foreignKeyField: "",
            defaultValue: "USER",
            isUnique: false,
            attributes: ["@default(USER)"],
          },
          {
            name: "profileId",
            type: "Int",
            isId: false,
            isOptional: true,
            isArray: false,
            foreignKeyField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: [],
          },
          {
            name: "profile",
            type: "Profile",
            isId: false,
            isOptional: true,
            isArray: false,
            foreignKeyField: "profileId",
            foreignRefenceField: "id",
            defaultValue: undefined,
            isUnique: false,
            attributes: ["@relation(fields: [profileId], references: [id])"],
          },
          {
            name: "posts",
            type: "Post",
            isId: false,
            isOptional: false,
            isArray: true,
            foreignKeyField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: [],
          },
          {
            name: "createdAt",
            type: "DateTime",
            isId: false,
            isOptional: false,
            isArray: false,
            foreignKeyField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: ["@default(now())"],
          },
        ],
      },
      {
        name: "Profile",
        mapName: undefined,
        fields: [
          {
            name: "id",
            type: "Int",
            isId: true,
            isOptional: false,
            isArray: false,
            foreignKeyField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: ["@id"],
          },
          {
            name: "bio",
            type: "String",
            isId: false,
            isOptional: true,
            isArray: false,
            foreignKeyField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: [],
          },
        ],
      },
      {
        name: "Post",
        mapName: undefined,
        fields: [
          {
            name: "id",
            type: "Int",
            isId: true,
            isOptional: false,
            isArray: false,
            foreignKeyField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: ["@id"],
          },
          {
            name: "title",
            type: "String",
            isId: false,
            isOptional: false,
            isArray: false,
            foreignKeyField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: [],
          },
          {
            name: "authorId",
            type: "Int",
            isId: false,
            isOptional: false,
            isArray: false,
            foreignKeyField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: [],
          },
          {
            name: "author",
            type: "User",
            isId: false,
            isOptional: false,
            isArray: false,
            foreignKeyField: "authorId",
            defaultValue: undefined,
            isUnique: false,
            attributes: ["@relation(fields: [authorId], references: [id])"],
          },
        ],
      },
    ],
    enums: [
      {
        name: "UserRole",
        values: ["ADMIN", "USER", "MODERATOR"],
      },
    ],
  };

  const mockPrismaSchemaParser = prismaSchemaParser as any;

  beforeEach(() => {
    generator = new PrismaJsonSchemaGenerator();
    jest.clearAllMocks();
    (loadableRegistry as any).items = new Map();
    mockPrismaSchemaParser.parse = jest.fn().mockReturnValue(mockSchema);
    (getArkosConfig as jest.Mock).mockReturnValue(mockArkosConfig);
    (isAuthenticationEnabled as jest.Mock).mockReturnValue(true);
  });

  mockPrismaSchemaParser.models = mockSchema.models;
  (generator as any).schema = mockSchema;
  mockDeepmerge.mockImplementation((a, b) => ({ ...a, ...b }));
});

describe("generateCreateSchema", () => {
  it("should generate create schema excluding ID and auto fields", () => {
    const userModel = mockSchema.models.find((m) => m.name === "User")!;
    const schema = generator.generateCreateSchema(userModel);

    expect(schema.type).toBe("object");
    expect(schema.properties).toHaveProperty("email");
    expect(schema.properties).toHaveProperty("name");
    expect(schema.properties).toHaveProperty("password");
    expect(schema.properties).toHaveProperty("role");
    expect(schema.properties).not.toHaveProperty("id");
    expect(schema.properties).not.toHaveProperty("createdAt");
    expect(schema.properties).not.toHaveProperty("posts");
  });

  it("should include relation field with a single reference field for single relations", () => {
    const userModel = mockSchema.models.find((m) => m.name === "User")!;
    const schema = generator.generateCreateSchema(userModel);

    expect(schema.properties).toHaveProperty("profile");
    expect(schema.properties?.profile.properties).toHaveProperty("id");
    expect(schema.properties).not.toHaveProperty("profileId");
  });

  it("should mark required fields correctly", () => {
    const userModel = mockSchema.models.find((m) => m.name === "User")!;
    const schema = generator.generateCreateSchema(userModel);

    expect(schema.required).toContain("email");
    expect(schema.required).toContain("password");
    expect(schema.required).not.toContain("name");
    expect(schema.required).not.toContain("role");
  });

  it("should handle auth model restrictions", () => {
    const authModel = {
      ...mockSchema.models.find((m) => m.name === "User")!,
      name: "auth",
    };
    const schema = generator.generateCreateSchema(authModel);

    expect(schema.properties).not.toHaveProperty("role");
    expect(schema.properties).not.toHaveProperty("isActive");
  });
});

describe("generateUpdateSchema", () => {
  it("should generate update schema with all fields optional", () => {
    const userModel = mockSchema.models.find((m) => m.name === "User")!;
    const schema = (generator as any).generateUpdateSchema(userModel);

    expect(schema.type).toBe("object");
    expect(schema.required).toEqual([]);
    expect(schema.properties).toHaveProperty("email");
    expect(schema.properties).toHaveProperty("name");
    expect(schema.properties).not.toHaveProperty("id");
    expect(schema.properties).not.toHaveProperty("createdAt");
  });
});

describe("generateResponseSchema", () => {
  it("should generate response schema with all fields", () => {
    const userModel = mockSchema.models.find((m) => m.name === "User")!;
    const schema = (generator as any).generateResponseSchema(
      userModel,
      {},
      "findOne"
    );

    expect(schema.type).toBe("object");
    expect(schema.properties).toHaveProperty("id");
    expect(schema.properties).toHaveProperty("email");
    expect(schema.properties).toHaveProperty("name");
    expect(schema.properties).not.toHaveProperty("password");
  });

  it("should respect select options", () => {
    const userModel = mockSchema.models.find((m) => m.name === "User")!;
    const options = { select: { id: true, email: true } };
    const schema = (generator as any).generateResponseSchema(
      userModel,
      options,
      "findOne"
    );

    expect(schema.properties).toHaveProperty("id");
    expect(schema.properties).toHaveProperty("email");
    expect(schema.properties).not.toHaveProperty("name");
  });

  it("should include relations when specified in include", () => {
    const userModel = mockSchema.models.find((m) => m.name === "User")!;
    const options = { include: { profile: true } };
    const schema = (generator as any).generateResponseSchema(
      userModel,
      options,
      "findOne"
    );

    expect(schema.properties).toHaveProperty("profile");
    expect(schema.properties.profile.type).toBe("object");
  });

  it("should handle array relations", () => {
    const userModel = mockSchema.models.find((m) => m.name === "User")!;
    const options = { include: { posts: true } };
    const schema = (generator as any).generateResponseSchema(
      userModel,
      options,
      "findOne"
    );

    expect(schema.properties).toHaveProperty("posts");
    expect(schema.properties.posts.type).toBe("array");
    expect(schema.properties.posts.items).toBeDefined();
  });
});

describe("utility methods", () => {
  describe("convertFieldToJsonSchema", () => {
    it("should convert basic field types", () => {
      const stringField = {
        name: "email",
        type: "String",
        isOptional: false,
        isArray: false,
        foreignKeyField: "",
        defaultValue: undefined,
        isId: false,
        isUnique: true,
        attributes: [],
      };

      const property = (generator as any).convertFieldToJsonSchema(stringField);

      expect(property.type).toBe("string");
    });

    it("should handle array fields", () => {
      const arrayField = {
        name: "tags",
        type: "String",
        isOptional: false,
        isArray: true,
        foreignKeyField: "",
        defaultValue: undefined,
        isId: false,
        isUnique: false,
        attributes: [],
      };

      const property = (generator as any).convertFieldToJsonSchema(arrayField);

      expect(property.type).toBe("array");
      expect(property.items.type).toBe("string");
    });

    it("should handle enum fields", () => {
      const enumField = {
        name: "role",
        type: "UserRole",
        isOptional: false,
        isArray: false,
        foreignKeyField: "",
        defaultValue: "USER",
        isId: false,
        isUnique: false,
        attributes: [],
      };

      const property = (generator as any).convertFieldToJsonSchema(enumField);

      expect(property.type).toBe("string");
      expect(property.enum).toEqual(["ADMIN", "USER", "MODERATOR"]);
      expect(property.default).toBe("USER");
    });

    it("should handle DateTime fields", () => {
      const dateTimeField = {
        name: "createdAt",
        type: "DateTime",
        isOptional: false,
        isArray: false,
        foreignKeyField: "",
        defaultValue: undefined,
        isId: false,
        isUnique: false,
        attributes: [],
      };

      const property = (generator as any).convertFieldToJsonSchema(
        dateTimeField
      );

      expect(property.type).toBe("string");
      expect(property.format).toBe("date-time");
    });
  });

  describe("mapPrismaTypeToJsonSchema", () => {
    it("should map Prisma types to JSON schema types", () => {
      expect((generator as any).mapPrismaTypeToJsonSchema("String")).toBe(
        "string"
      );
      expect((generator as any).mapPrismaTypeToJsonSchema("Int")).toBe(
        "number"
      );
      expect((generator as any).mapPrismaTypeToJsonSchema("Float")).toBe(
        "number"
      );
      expect((generator as any).mapPrismaTypeToJsonSchema("Boolean")).toBe(
        "boolean"
      );
      expect((generator as any).mapPrismaTypeToJsonSchema("DateTime")).toBe(
        "string"
      );
      expect((generator as any).mapPrismaTypeToJsonSchema("Json")).toBe(
        "object"
      );
      expect((generator as any).mapPrismaTypeToJsonSchema("UserRole")).toBe(
        "string"
      );
      expect((generator as any).mapPrismaTypeToJsonSchema("User")).toBe(
        "object"
      );
      expect((generator as any).mapPrismaTypeToJsonSchema("Unknown")).toBe(
        "string"
      );
    });
  });

  describe("isModelRelation", () => {
    it("should identify model relations correctly", () => {
      expect((generator as any).isModelRelation("User")).toBe(true);
      expect((generator as any).isModelRelation("Profile")).toBe(true);
      expect((generator as any).isModelRelation("String")).toBe(false);
      expect((generator as any).isModelRelation("UserRole")).toBe(false);
    });
  });

  describe("isEnum", () => {
    it("should identify enums correctly", () => {
      expect((generator as any).isEnum("UserRole")).toBe(true);
      expect((generator as any).isEnum("String")).toBe(false);
      expect((generator as any).isEnum("User")).toBe(false);
    });
  });
  it("should handle empty schema gracefully", () => {
    mockPrismaSchemaParser.parse.mockReturnValue({ models: [], enums: [] });

    const userModel = mockSchema.models.find((m) => m.name === "User")!;
    const schema = generator.generateCreateSchema(userModel);

    expect(schema).toBeDefined();
  });
});

describe("composite type handling", () => {
  const mockCompositeTypes = [
    {
      name: "AgentInfo",
      fields: [
        {
          name: "ip",
          type: "String",
          isOptional: true,
          isArray: false,
          isCompositeType: false,
          isRelation: false,
          foreignKeyField: "",
          foreignReferenceField: "",
          defaultValue: undefined,
          isId: false,
          isUnique: false,
          attributes: [],
        },
        {
          name: "city",
          type: "String",
          isOptional: true,
          isArray: false,
          isCompositeType: false,
          isRelation: false,
          foreignKeyField: "",
          foreignReferenceField: "",
          defaultValue: undefined,
          isId: false,
          isUnique: false,
          attributes: [],
        },
      ],
    },
    {
      name: "GeoLocation",
      fields: [
        {
          name: "lat",
          type: "Float",
          isOptional: false,
          isArray: false,
          isCompositeType: false,
          isRelation: false,
          foreignKeyField: "",
          foreignReferenceField: "",
          defaultValue: undefined,
          isId: false,
          isUnique: false,
          attributes: [],
        },
        {
          name: "lng",
          type: "Float",
          isOptional: false,
          isArray: false,
          isCompositeType: false,
          isRelation: false,
          foreignKeyField: "",
          foreignReferenceField: "",
          defaultValue: undefined,
          isId: false,
          isUnique: false,
          attributes: [],
        },
      ],
    },
  ];

  const modelWithCompositeTypes = {
    name: "InteractionEvent",
    mapName: undefined,
    fields: [
      {
        name: "id",
        type: "String",
        isId: true,
        isOptional: false,
        isArray: false,
        isCompositeType: false,
        isRelation: false,
        foreignKeyField: "",
        foreignReferenceField: "",
        defaultValue: undefined,
        isUnique: false,
        attributes: ["@id"],
      },
      {
        name: "agentInfo",
        type: "AgentInfo",
        isId: false,
        isOptional: false,
        isArray: false,
        isCompositeType: true,
        isRelation: false,
        foreignKeyField: "",
        foreignReferenceField: "",
        defaultValue: undefined,
        isUnique: false,
        attributes: [],
      },
      {
        name: "location",
        type: "GeoLocation",
        isId: false,
        isOptional: true,
        isArray: false,
        isCompositeType: true,
        isRelation: false,
        foreignKeyField: "",
        foreignReferenceField: "",
        defaultValue: undefined,
        isUnique: false,
        attributes: [],
      },
      {
        name: "tags",
        type: "AgentInfo",
        isId: false,
        isOptional: false,
        isArray: true,
        isCompositeType: true,
        isRelation: false,
        foreignKeyField: "",
        foreignReferenceField: "",
        defaultValue: undefined,
        isUnique: false,
        attributes: [],
      },
    ],
  };

  beforeEach(() => {
    mockPrismaSchemaParser.compositeTypes = mockCompositeTypes;
    (generator as any).schema = {
      models: [modelWithCompositeTypes],
      enums: [],
    };
  });

  afterEach(() => {
    mockPrismaSchemaParser.compositeTypes = [];
  });

  describe("isCompositeType()", () => {
    it("should return true for known composite types", () => {
      expect((generator as any).isCompositeType("AgentInfo")).toBe(true);
      expect((generator as any).isCompositeType("GeoLocation")).toBe(true);
    });

    it("should return false for models, enums and primitives", () => {
      expect((generator as any).isCompositeType("User")).toBe(false);
      expect((generator as any).isCompositeType("UserRole")).toBe(false);
      expect((generator as any).isCompositeType("String")).toBe(false);
    });
  });

  describe("convertFieldToJsonSchema() with composite types", () => {
    it("should expand a composite type field into an object schema", () => {
      const field = modelWithCompositeTypes.fields.find(
        (f) => f.name === "agentInfo"
      )!;
      const property = (generator as any).convertFieldToJsonSchema(field);

      expect(property.type).toBe("object");
      expect(property.properties).toHaveProperty("ip");
      expect(property.properties).toHaveProperty("city");
      expect(property.properties.ip.type).toBe("string");
    });

    it("should expand an array composite type field into an array of objects", () => {
      const field = modelWithCompositeTypes.fields.find(
        (f) => f.name === "tags"
      )!;
      const property = (generator as any).convertFieldToJsonSchema(field);

      expect(property.type).toBe("array");
      expect(property.items.type).toBe("object");
      expect(property.items.properties).toHaveProperty("ip");
      expect(property.items.properties).toHaveProperty("city");
    });
  });

  describe("mapPrismaTypeToJsonSchema() with composite types", () => {
    it("should return object for composite type names", () => {
      expect((generator as any).mapPrismaTypeToJsonSchema("AgentInfo")).toBe(
        "object"
      );
      expect((generator as any).mapPrismaTypeToJsonSchema("GeoLocation")).toBe(
        "object"
      );
    });
  });

  describe("generateCreateSchema() with composite type fields", () => {
    it("should include composite type fields as nested objects", () => {
      const schema = generator.generateCreateSchema(modelWithCompositeTypes);

      expect(schema.properties).toHaveProperty("agentInfo");
      expect(schema.properties?.agentInfo.type).toBe("object");
      expect(schema.properties?.agentInfo.properties).toHaveProperty("ip");
      expect(schema.properties?.agentInfo.properties).toHaveProperty("city");
    });

    it("should include optional composite type fields without adding to required", () => {
      const schema = generator.generateCreateSchema(modelWithCompositeTypes);

      expect(schema.properties).toHaveProperty("location");
      expect(schema.required).not.toContain("location");
    });

    it("should include required composite type fields in required array", () => {
      const schema = generator.generateCreateSchema(modelWithCompositeTypes);

      expect(schema.required).toContain("agentInfo");
    });

    it("should expand array composite type fields correctly", () => {
      const schema = generator.generateCreateSchema(modelWithCompositeTypes);

      expect(schema.properties).toHaveProperty("tags");
      expect(schema.properties?.tags.type).toBe("array");
      expect(schema.properties?.tags?.items?.type).toBe("object");
    });
  });

  describe("generateUpdateSchema() with composite type fields", () => {
    it("should include composite type fields as nested objects", () => {
      const schema = (generator as any).generateUpdateSchema(
        modelWithCompositeTypes
      );

      expect(schema.properties).toHaveProperty("agentInfo");
      expect(schema.properties.agentInfo.type).toBe("object");
      expect(schema.properties).toHaveProperty("location");
    });

    it("should not add composite type fields to required", () => {
      const schema = (generator as any).generateUpdateSchema(
        modelWithCompositeTypes
      );

      expect(schema.required).toEqual([]);
    });
  });

  describe("generateResponseSchema() with composite type fields", () => {
    it("should include composite type fields in response", () => {
      const schema = (generator as any).generateResponseSchema(
        modelWithCompositeTypes,
        {},
        "findOne"
      );

      expect(schema.properties).toHaveProperty("agentInfo");
      expect(schema.properties.agentInfo.type).toBe("object");
      expect(schema.properties.agentInfo.properties).toHaveProperty("ip");
    });

    it("should respect select options for composite type fields", () => {
      const schema = (generator as any).generateResponseSchema(
        modelWithCompositeTypes,
        { select: { id: true, agentInfo: true } },
        "findOne"
      );

      expect(schema.properties).toHaveProperty("agentInfo");
      expect(schema.properties).not.toHaveProperty("location");
    });

    it("should add non-optional composite type fields to required", () => {
      const schema = (generator as any).generateResponseSchema(
        modelWithCompositeTypes,
        {},
        "findOne"
      );

      expect(schema.required).toContain("agentInfo");
      expect(schema.required).not.toContain("location");
    });
  });
});
