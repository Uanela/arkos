import { getArkosConfig } from "../../exports";
import prismaSchemaParser from "./prisma-schema-parser";
import {
  PrismaModel,
  PrismaField,
  JsonSchema,
  JsonSchemaProperty,
} from "./types";
import { localValidatorFileExists } from "../../modules/swagger/utils/helpers/swagger.router.helpers";
import { UserArkosConfig } from "../define-config";
import {
  OperationByModule,
  routeHookReader,
} from "../../components/arkos-route-hook/reader";
import { ArkosModuleType } from "../../components/arkos-route-hook/types";
import { isAuthenticationEnabled } from "../helpers/arkos-config.helpers";
import { kebabCase } from "../helpers/change-case.helpers";

export interface SchemaGenerationConfig<T extends ArkosModuleType> {
  modelName: T;
  schemasToGenerate?: OperationByModule<T>[];
}

export interface GeneratedSchemas {
  [key: string]: JsonSchema;
}

/**
 * Enhanced JSON Schema generator that creates schemas based on Prisma models and query options
 */
export class PrismaJsonSchemaGenerator {
  schema = prismaSchemaParser.parse();

  /**
   * Main method to generate all schemas for a model
   */
  generateModelSchemas<T extends ArkosModuleType>(
    config: SchemaGenerationConfig<T>
  ): GeneratedSchemas {
    const arkosConfig = getArkosConfig();
    const { modelName, schemasToGenerate } = config;

    const authModuleModel = ["auth", "me", "password", "signup", "login"];
    const isAuthModule = authModuleModel.includes(modelName.toLowerCase());

    if (arkosConfig?.swagger?.strict && arkosConfig.validation?.resolver)
      return {};

    const model = this.schema.models.find(
      (m) => m.name.toLowerCase() === modelName.toLowerCase()
    );
    if (!model && !isAuthModule) return {};

    const schemas: { [key: string]: JsonSchema } = {};

    if (isAuthModule) {
      this.generateAuthSchemas(
        this.schema.models.find((m) => m.name.toLowerCase() === "user")!,
        schemas,
        (schemasToGenerate as OperationByModule<"auth">[]) || [
          "login",
          "signup",
          "getMe",
          "updateMe",
          "updatePassword",
        ]
      );
    } else {
      if (model)
        this.generateCrudSchemas(
          model,
          schemas,
          (schemasToGenerate as OperationByModule<"">[]) || [
            "create",
            "createOne",
            "createMany",
            "update",
            "updateOne",
            "updateMany",
            "query",
            "findOne",
            "findMany",
          ]
        );
    }

    return { ...schemas };
  }

  /**
   * Generate auth-specific schemas
   */
  private generateAuthSchemas(
    model: PrismaModel,
    schemas: { [key: string]: JsonSchema },
    schemasToGenerate: OperationByModule<"auth">[]
  ) {
    const modelName = "Auth";
    const arkosConfig = getArkosConfig();

    if (!isAuthenticationEnabled()) return schemas;

    // Login schema (input)
    if (
      schemasToGenerate.includes("login") &&
      !this.isEndpointDisabled("auth", "login") &&
      !localValidatorFileExists("login", modelName, arkosConfig)
    ) {
      schemas[`LoginSchema`] = this.generateLoginSchema(arkosConfig);
    }

    // Signup schema (input)
    if (
      schemasToGenerate.includes("signup") &&
      !this.isEndpointDisabled("auth", "signup") &&
      !localValidatorFileExists("signup", modelName, arkosConfig)
    ) {
      schemas[`SignupSchema`] = this.generateSignupSchema(model);
    }

    // UpdateMe schema (input)
    if (
      schemasToGenerate.includes("updateMe") &&
      !this.isEndpointDisabled("auth", "updateMe") &&
      !localValidatorFileExists("updateMe", modelName, arkosConfig)
    ) {
      schemas[`UpdateMeSchema`] = this.generateUpdateMeSchema(model);
    }

    // UpdatePassword schema (input)
    if (
      schemasToGenerate.includes("updatePassword") &&
      !this.isEndpointDisabled("auth", "updatePassword") &&
      !localValidatorFileExists("updatePassword", modelName, arkosConfig)
    ) {
      schemas[`UpdatePasswordSchema`] = this.generateUpdatePasswordSchema(
        model,
        routeHookReader.getPrismaArgs("auth", "updatePassword")
      );
    }

    if (
      schemasToGenerate.includes("getMe") &&
      !this.isEndpointDisabled("auth", "getMe") &&
      !localValidatorFileExists("getMe", modelName, arkosConfig)
    ) {
      schemas[`GetMeSchema`] = this.generateResponseSchema(
        model,
        routeHookReader.getPrismaArgs("auth", "getMe") || {}
      );
    }
  }

  /**
   * Generate standard CRUD schemas
   */
  private generateCrudSchemas(
    model: PrismaModel,
    schemas: { [key: string]: JsonSchema },
    schemasToGenerate: OperationByModule<"">[]
  ) {
    const modelName = model.name;
    const arkosConfig = getArkosConfig();

    const ensureBaseSchemaReference = (
      operation: string,
      modelName: string
    ) => {
      const suffix =
        arkosConfig.validation?.resolver === "zod" ? "Schema" : "Dto";

      const singleOpName = operation === "Create" ? "createOne" : "updateOne";
      const hasLocalValidator = localValidatorFileExists(
        singleOpName,
        modelName,
        arkosConfig
      );

      if (hasLocalValidator) return `${operation}${modelName}${suffix}`;
      else {
        const modelSchemaKey = `${operation}${modelName}ModelSchema`;

        if (!schemas[modelSchemaKey]) {
          if (operation === "Create") {
            schemas[modelSchemaKey] = this.generateCreateSchema(model);
          } else if (operation === "Update") {
            schemas[modelSchemaKey] = this.generateUpdateSchema(model);
          }
        }

        return modelSchemaKey;
      }
    };

    if (
      schemasToGenerate.includes("createOne") &&
      !this.isEndpointDisabled(modelName, "createOne") &&
      !localValidatorFileExists("createOne", modelName, arkosConfig)
    ) {
      schemas[`Create${modelName}ModelSchema`] =
        this.generateCreateSchema(model);
    }

    if (
      schemasToGenerate.includes("createMany") &&
      !this.isEndpointDisabled(modelName, "createMany") &&
      !localValidatorFileExists("createMany", modelName, arkosConfig)
    ) {
      const baseSchemaKey = ensureBaseSchemaReference("Create", modelName);
      schemas[`CreateMany${modelName}ModelSchema`] = {
        type: "array",
        items: { $ref: `#/components/schemas/${baseSchemaKey}` },
      };
    }

    if (
      schemasToGenerate.includes("updateOne") &&
      !this.isEndpointDisabled(modelName, "updateOne") &&
      !localValidatorFileExists("updateOne", modelName, arkosConfig)
    ) {
      schemas[`Update${modelName}ModelSchema`] =
        this.generateUpdateSchema(model);
    }

    if (
      schemasToGenerate.includes("updateMany") &&
      !this.isEndpointDisabled(modelName, "updateMany") &&
      !localValidatorFileExists("updateMany", modelName, arkosConfig)
    ) {
      schemas[`UpdateMany${modelName}ModelSchema`] =
        this.generateUpdateSchema(model);
    }
    if (
      schemasToGenerate.includes("findOne") &&
      !this.isEndpointDisabled(modelName, "findOne") &&
      !localValidatorFileExists("findOne", modelName, arkosConfig)
    ) {
      schemas[`FindOne${modelName}ModelSchema`] = this.generateResponseSchema(
        model,
        routeHookReader.getPrismaArgs(modelName, "findOne")
      );
    }

    if (
      schemasToGenerate.includes("findMany") &&
      !this.isEndpointDisabled(modelName, "findMany") &&
      !localValidatorFileExists("findMany", modelName, arkosConfig)
    ) {
      schemas[`FindMany${modelName}ModelSchema`] = {
        type: "array",
        items: this.generateResponseSchema(
          model,
          routeHookReader.getPrismaArgs(modelName, "findMany")
        ),
      };
    }
  }

  /**
   * Generate create schema (excludes ID, includes relation IDs only)
   */
  private generateCreateSchema(model: PrismaModel): JsonSchema {
    const properties: { [key: string]: JsonSchemaProperty } = {};
    const required: string[] = [];
    const restrictedFields = ["createdAt", "updatedAt", "deletedAt", "id"];

    if (model.name.toLowerCase() === "auth")
      restrictedFields.push(
        "roles",
        "role",
        "isActive",
        "isStaff",
        "isSuperUser",
        "passwordChangedAt",
        "deletedSelfAccountAt",
        "lastLoginAt"
      );

    for (const field of model.fields) {
      const isForeignKey = model.fields.some(
        (_field) => _field.foreignKeyField === field.name
      );
      if (field.isId || restrictedFields.includes(field.name) || isForeignKey)
        continue;

      if (this.isModelRelation(field.type)) {
        if (!field.isArray) {
          const referencedModel = prismaSchemaParser.models.find(
            (_model) => _model.name === field.type
          )!;

          properties[field.name] = {
            type: "object",
            properties: {
              [field.foreignReferenceField || "id"]: {
                type: this.mapPrismaTypeToJsonSchema(
                  referencedModel?.fields.find(
                    (_field) => _field.name === field.foreignReferenceField
                  )?.type || "String"
                ),
              },
            },
          };

          if (!field.isOptional && field.defaultValue === undefined)
            required.push(field.name);
        }
        continue;
      }

      const property = this.convertFieldToJsonSchema(field);
      properties[field.name] = property;

      // Field is required if not optional, no default, and not array
      if (
        !field.isOptional &&
        field.defaultValue === undefined &&
        !field.isArray
      ) {
        required.push(field.name);
      }
    }

    return {
      type: "object",
      properties,
      required,
    };
  }

  /**
   * Generate update schema (all fields optional, includes relation IDs only)
   */
  private generateUpdateSchema(model: PrismaModel): JsonSchema {
    const properties: { [key: string]: JsonSchemaProperty } = {};
    const autoFillFields = ["createdAt", "updatedAt", "deletedAt", "id"];

    for (const field of model.fields) {
      const isForeignKey = model.fields.some(
        (_field) => _field.foreignKeyField === field.name
      );
      if (field.isId || autoFillFields.includes(field.name) || isForeignKey)
        continue;

      if (this.isModelRelation(field.type)) {
        if (!field.isArray) {
          const referencedModel = prismaSchemaParser.models.find(
            (_model) => _model.name === field.type
          )!;

          properties[field.name] = {
            type: "object",
            properties: {
              [field.foreignReferenceField || "id"]: {
                type: this.mapPrismaTypeToJsonSchema(
                  referencedModel?.fields.find(
                    (_field) => _field.name === field.foreignReferenceField
                  )?.type || "String"
                ),
              },
            },
          };
        }

        continue;
      }

      const property = this.convertFieldToJsonSchema(field);
      properties[field.name] = property;
    }

    return {
      type: "object",
      properties,
      required: [], // All fields are optional in update
    };
  }

  /**
   * Generate response schema (includes nested relations based on query options)
   */
  private generateResponseSchema(
    model: PrismaModel,
    options: Record<string, any> = {}
  ): JsonSchema {
    const properties: { [key: string]: JsonSchemaProperty } = {};
    const required: string[] = [];

    // Get select and include options
    const selectFields = options?.select;
    const omittedFields = options?.omit;
    const includeRelations = options?.include;

    if (selectFields && includeRelations) {
      throw new Error(
        `Found both 'select' and 'include' in ${model.name} query options. Please use one of them.`
      );
    }

    for (const field of model.fields) {
      // Skip password fields
      if (field.name === "password") continue;

      // Skip ommited fields
      if (omittedFields && omittedFields[field.name]) continue;

      // If select is specified, only include selected fields
      if (selectFields && !selectFields[field.name]) continue;

      // Handle relations
      if (this.isModelRelation(field.type)) {
        // Include relation if specified in include option
        if (
          includeRelations?.[field.name] ||
          selectFields?.[field.name] ||
          omittedFields?.[field.name] === false
        ) {
          const relationModel = this.schema.models.find(
            (m) => m.name === field.type
          );

          if (relationModel) {
            const relationSchema = this.generateNestedRelationSchema(
              relationModel,
              includeRelations?.[field.name] ||
                selectFields?.[field.name] ||
                omittedFields?.[field.name]
            );
            properties[field.name] = field.isArray
              ? { type: "array", items: relationSchema }
              : relationSchema;
          }
        }
        continue;
      }

      const property = this.convertFieldToJsonSchema(field);
      properties[field.name] = property;

      // Field is required if not optional (for response schemas, we include all by default)
      if (!field.isOptional) required.push(field.name);
    }

    return {
      type: "object",
      properties,
      required,
    };
  }

  /**
   * Generate nested relation schema
   */
  private generateNestedRelationSchema(
    model: PrismaModel,
    includeOptions: any
  ): JsonSchemaProperty {
    const properties: { [key: string]: JsonSchemaProperty } = {};
    const required: string[] = [];

    // Handle nested select
    const selectFields = includeOptions?.select;
    const nestedIncludes = includeOptions?.include;
    const ommittedFields = includeOptions?.omit;

    if (selectFields && nestedIncludes) {
      throw new Error(
        `Found both 'select' and 'include' in nested ${model.name} query options. Please use one of them.`
      );
    }

    for (const field of model.fields) {
      // Skip password fields
      if (field.name.toLowerCase().includes("password")) {
        continue;
      }

      if (selectFields && !selectFields[field.name]) {
        continue;
      }

      if (this.isModelRelation(field.type)) {
        if (
          nestedIncludes?.[field.name] ||
          selectFields?.[field.name] ||
          ommittedFields?.[field.name] === false
        ) {
          const relationModel = this.schema.models.find(
            (m) => m.name === field.type
          );
          if (relationModel) {
            const nestedSchema = this.generateNestedRelationSchema(
              relationModel,
              nestedIncludes?.[field.name] ||
                selectFields?.[field.name] ||
                ommittedFields?.[field.name]
            );
            properties[field.name] = field.isArray
              ? { type: "array", items: nestedSchema }
              : nestedSchema;
          }
        }
        continue;
      }

      const property = this.convertFieldToJsonSchema(field);
      properties[field.name] = property;

      if (!field.isOptional) {
        required.push(field.name);
      }
    }

    return {
      type: "object",
      properties,
      required,
    };
  }

  /**
   * Auth-specific schema generators
   */
  private generateLoginSchema(arkosConfig?: UserArkosConfig): JsonSchema {
    const userNameFields =
      arkosConfig?.authentication?.login?.allowedUsernames || [];

    // Helper function to get display name for nested fields
    const getDisplayName = (field: string) => {
      if (field.includes(".")) return field.split(".").pop() || field; // Get the part after the last dot
      return field;
    };

    // Base schema with password (always required)
    const baseSchema: JsonSchemaProperty = {
      type: "object",
      properties: {
        password: {
          type: "string",
          minLength: 8,
        },
      },
      required: ["password"],
    };

    // Add all username fields to properties
    userNameFields.forEach((field) => {
      const displayName = getDisplayName(field);
      baseSchema.properties![displayName] = {
        type: "string",
        format: "string",
        description: `Username field: ${field}`, // Optional: show original field path
      };
    });

    // At least one username field must be provided along with password
    if (userNameFields.length > 0) {
      const usernameDisplayNames = userNameFields.map(getDisplayName);

      return {
        ...baseSchema,
        anyOf: usernameDisplayNames.map(() => ({
          required: [...baseSchema.required!],
        })),
      };
    }

    return baseSchema;
  }
  private generateSignupSchema(model: PrismaModel): JsonSchema {
    // Similar to create but might have specific required fields
    const singupSchema = this.generateCreateSchema(model);

    const restrictedFields = [
      "roles",
      "role",
      "isActive",
      "isStaff",
      "isSuperUser",
      "passwordChangedAt",
      "deletedSelfAccountAt",
      "lastLoginAt",
    ];
    restrictedFields.forEach((field) => {
      delete singupSchema?.properties?.[field];
    });

    return singupSchema;
  }

  private generateUpdateMeSchema(model: PrismaModel): JsonSchema {
    // Similar to update but might exclude certain fields like role, etc.
    const updateSchema = this.generateUpdateSchema(model);

    // Remove sensitive fields that users shouldn't update themselves
    const restrictedFields = [
      "roles",
      "role",
      "isActive",
      "isStaff",
      "isSuperUser",
      "passwordChangedAt",
      "deletedSelfAccountAt",
      "password",
      "lastLoginAt",
    ];
    restrictedFields.forEach((field) => {
      delete updateSchema?.properties?.[field];
    });

    return updateSchema;
  }

  private generateUpdatePasswordSchema(
    _: PrismaModel,
    _1?: Record<string, any>
  ): JsonSchema {
    return {
      type: "object",
      properties: {
        currentPassword: { type: "string" },
        newPassword: { type: "string", minLength: 8 },
      },
      required: ["currentPassword", "newPassword"],
    };
  }

  private isEndpointDisabled<T extends ArkosModuleType>(
    moduleName: T,
    endpoint: OperationByModule<T>
  ): boolean {
    return !!routeHookReader.getRouteConfig(
      kebabCase(moduleName) as T,
      endpoint
    )?.disabled;
  }

  private isModelRelation(typeName: string): boolean {
    return this.schema.models.some((m) => m.name === typeName);
  }

  private convertFieldToJsonSchema(field: PrismaField): JsonSchemaProperty {
    // Reuse the existing method from the original generator
    const baseType = this.mapPrismaTypeToJsonSchema(field.type);
    const property: JsonSchemaProperty = { type: baseType };

    if (field.isArray) {
      property.type = "array";
      property.items = { type: this.mapPrismaTypeToJsonSchema(field.type) };
    }

    if (field.defaultValue !== undefined) {
      property.default = field.defaultValue;
    }

    if (field.type === "DateTime") {
      property.format = "date-time";
    }

    if (this.isEnum(field.type)) {
      const enumDef = this.schema.enums.find((e) => e.name === field.type);
      if (enumDef) {
        property.enum = enumDef.values;
      }
    }

    return property;
  }

  private mapPrismaTypeToJsonSchema(prismaType: string): string {
    const typeMap: { [key: string]: string } = {
      String: "string",
      Int: "number",
      Float: "number",
      Boolean: "boolean",
      DateTime: "string",
      Json: "object",
      Bytes: "string",
    };

    if (typeMap[prismaType]) return typeMap[prismaType];

    if (this.isEnum(prismaType)) return "string";

    if (this.isModelRelation(prismaType)) return "object";

    return "string";
  }

  private isEnum(typeName: string): boolean {
    return this.schema.enums.some((e) => e.name === typeName);
  }
}

const prismaJsonSchemaGenerator = new PrismaJsonSchemaGenerator();

export default prismaJsonSchemaGenerator;
