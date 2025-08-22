import { ArkosConfig, RouterConfig } from "../../exports";
import { AuthPrismaQueryOptions, PrismaQueryOptions } from "../../types";
import deepmerge from "../helpers/deepmerge.helper";
import {
  importModuleComponents,
  localValidatorFileExists,
  ValidationFileMappingKey,
} from "../helpers/dynamic-loader";
import prismaSchemaParser from "./prisma-schema-parser";
import {
  PrismaModel,
  PrismaField,
  JsonSchema,
  JsonSchemaProperty,
} from "./types";

// Add these types to your existing types file
export interface SchemaGenerationConfig {
  modelName: string;
  arkosConfig: ArkosConfig;
  schemasToGenerate?: ValidationFileMappingKey[];
}

export interface GeneratedSchemas {
  [key: string]: JsonSchema;
}

/**
 * Enhanced JSON Schema generator that creates schemas based on Prisma models and query options
 */
export class EnhancedPrismaJsonSchemaGenerator {
  schema = prismaSchemaParser.parse();

  /**
   * Main method to generate all schemas for a model
   */
  async generateModelSchemas(
    config: SchemaGenerationConfig
  ): Promise<GeneratedSchemas> {
    const {
      modelName,
      arkosConfig,
      schemasToGenerate = [
        "model",
        "login",
        "signup",
        "getMe",
        "updateMe",
        "updatePassword",
        "create",
        "createOne",
        "createMany",
        "update",
        "updateOne",
        "updateMany",
        "query",
        "findOne",
        "findMany",
      ],
    } = config;

    const ModuleComponents = await importModuleComponents(modelName, arkosConfig);
    const routerConfig = ModuleComponents?.router?.config || {};
    const prismaQueryOptions = ModuleComponents?.prismaQueryOptions || {};
    const authModuleModel = ["auth", "me", "password", "signup", "login"];
    const isAuthModule = authModuleModel.includes(modelName.toLowerCase());

    // Check if generation should be skipped
    if (arkosConfig?.swagger?.strict && arkosConfig.swagger.mode !== "prisma")
      return {};

    // Check if router is disabled
    if (routerConfig?.disable === true) return {};

    const model = this.schema.models.find(
      (m) => m.name.toLowerCase() === modelName.toLowerCase()
    );
    if (!model && !isAuthModule) return {};
    // throw new Error(`Model ${modelName} not found in schema`);

    const schemas: { [key: string]: JsonSchema } = {};

    if (isAuthModule) {
      // Generate auth-specific schemas
      await this.generateAuthSchemas(
        this.schema.models.find((m) => m.name.toLowerCase() === "user")!,
        schemas,
        arkosConfig,
        schemasToGenerate,
        prismaQueryOptions as AuthPrismaQueryOptions<any>
      );
    } else {
      // Generate standard CRUD schemas
      if (model)
        await this.generateCrudSchemas(
          model,
          schemas,
          arkosConfig,
          schemasToGenerate,
          prismaQueryOptions as PrismaQueryOptions<any>,
          routerConfig
        );
    }

    return { ...schemas };
  }

  /**
   * Generate auth-specific schemas
   */
  private async generateAuthSchemas(
    model: PrismaModel,
    schemas: { [key: string]: JsonSchema },
    arkosConfig: ArkosConfig,
    schemasToGenerate: ValidationFileMappingKey[],
    queryOptions?: AuthPrismaQueryOptions<any>,
    routerConfig?: RouterConfig
  ) {
    const modelName = "Auth";

    // if no auth activated forget those json schemas
    if (!arkosConfig?.authentication) return schemas;

    // Login schema (input)
    if (
      schemasToGenerate.includes("login") &&
      !this.isEndpointDisabled("login", routerConfig) &&
      !(await localValidatorFileExists("login", modelName, arkosConfig))
    ) {
      schemas[`LoginSchema`] = this.generateLoginSchema(arkosConfig);
    }

    // Signup schema (input)
    if (
      schemasToGenerate.includes("signup") &&
      !this.isEndpointDisabled("signup", routerConfig) &&
      !(await localValidatorFileExists("signup", modelName, arkosConfig))
    ) {
      schemas[`SignupSchema`] = this.generateSignupSchema(
        model,
        queryOptions?.signup
      );
    }

    // UpdateMe schema (input)
    if (
      schemasToGenerate.includes("updateMe") &&
      !this.isEndpointDisabled("updateMe", routerConfig) &&
      !(await localValidatorFileExists("updateMe", modelName, arkosConfig))
    ) {
      schemas[`UpdateMeSchema`] = this.generateUpdateMeSchema(
        model,
        queryOptions?.updateMe
      );
    }

    // UpdatePassword schema (input)
    if (
      schemasToGenerate.includes("updatePassword") &&
      !this.isEndpointDisabled("updatePassword", routerConfig) &&
      !(await localValidatorFileExists(
        "updatePassword",
        modelName,
        arkosConfig
      ))
    ) {
      schemas[`UpdatePasswordSchema`] = this.generateUpdatePasswordSchema(
        model,
        queryOptions?.updatePassword
      );
    }

    // GetMe response schema
    if (
      schemasToGenerate.includes("getMe") &&
      !this.isEndpointDisabled("getMe", routerConfig) &&
      !(await localValidatorFileExists("getMe", modelName, arkosConfig))
    ) {
      schemas[`GetMeSchema`] = this.generateResponseSchema(
        model,
        queryOptions?.getMe || {},
        "findOne"
      );
    }
  }

  /**
   * Generate standard CRUD schemas
   */
  private async generateCrudSchemas(
    model: PrismaModel,
    schemas: { [key: string]: JsonSchema },
    arkosConfig: ArkosConfig,
    schemasToGenerate: ValidationFileMappingKey[],
    queryOptions?: PrismaQueryOptions<any>,
    routerConfig?: RouterConfig
  ) {
    const modelName = model.name;

    // // Create schemas
    // if (
    //   schemasToGenerate.includes("createOne") &&
    //   !this.isEndpointDisabled("createOne", routerConfig) &&
    //   !(await localValidatorFileExists("createOne", modelName, arkosConfig))
    // ) {
    //   schemas[`Create${modelName}ModelSchema`] = this.generateCreateSchema(
    //     model,
    //     this.resolvePrismaQueryOptions(queryOptions, "createOne")
    //   );
    // }

    // if (
    //   schemasToGenerate.includes("createMany") &&
    //   !this.isEndpointDisabled("createMany", routerConfig) &&
    //   !(await localValidatorFileExists("createMany", modelName, arkosConfig))
    // ) {
    //   schemas[`CreateMany${modelName}ModelSchema`] = {
    //     type: "array",
    //     items: { $ref: `#/components/schemas/Create${modelName}ModelSchema` },
    //   };
    // }

    // // Update schemas
    // if (
    //   schemasToGenerate.includes("updateOne") &&
    //   !this.isEndpointDisabled("updateOne", routerConfig) &&
    //   !(await localValidatorFileExists("updateOne", modelName, arkosConfig))
    // ) {
    //   schemas[`Update${modelName}ModelSchema`] = this.generateUpdateSchema(
    //     model,
    //     this.resolvePrismaQueryOptions(queryOptions, "updateOne")
    //   );
    // }

    // if (
    //   schemasToGenerate.includes("updateMany") &&
    //   !this.isEndpointDisabled("updateMany", routerConfig) &&
    //   !(await localValidatorFileExists("updateMany", modelName, arkosConfig))
    // ) {
    //   schemas[`UpdateMany${modelName}ModelSchema`] = {
    //     type: "object",
    //     properties: {
    //       data: {
    //         type: "object",
    //         $ref: `#/components/schemas/Update${modelName}ModelSchema`,
    //       },
    //       where: { type: "object" },
    //     },
    //     required: ["data"],
    //   };
    // }
    // Helper function to ensure base schema exists

    const ensureBaseSchemaReference = async (
      operation: string,
      modelName: string
    ) => {
      const suffix =
        arkosConfig.validation?.resolver === "zod" ? "Schema" : "Dto";

      // Check if local validator file exists for single operation
      const singleOpName = operation === "Create" ? "createOne" : "updateOne";
      const hasLocalValidator = await localValidatorFileExists(
        singleOpName,
        modelName,
        arkosConfig
      );

      if (hasLocalValidator) {
        // Point to local validator schema (Schema or Dto)
        return `${operation}${modelName}${suffix}`;
      } else {
        // Point to ModelSchema, generate if doesn't exist
        const modelSchemaKey = `${operation}${modelName}ModelSchema`;

        if (!schemas[modelSchemaKey]) {
          // Generate ModelSchema as fallback
          if (operation === "Create") {
            schemas[modelSchemaKey] = this.generateCreateSchema(
              model,
              this.resolvePrismaQueryOptions(queryOptions, "createOne")
            );
          } else if (operation === "Update") {
            schemas[modelSchemaKey] = this.generateUpdateSchema(
              model,
              this.resolvePrismaQueryOptions(queryOptions, "updateOne")
            );
          }
        }

        return modelSchemaKey;
      }
    };

    // Create schemas (unchanged)
    if (
      schemasToGenerate.includes("createOne") &&
      !this.isEndpointDisabled("createOne", routerConfig) &&
      !(await localValidatorFileExists("createOne", modelName, arkosConfig))
    ) {
      schemas[`Create${modelName}ModelSchema`] = this.generateCreateSchema(
        model,
        this.resolvePrismaQueryOptions(queryOptions, "createOne")
      );
    }

    if (
      schemasToGenerate.includes("createMany") &&
      !this.isEndpointDisabled("createMany", routerConfig) &&
      !(await localValidatorFileExists("createMany", modelName, arkosConfig))
    ) {
      // Only fix the reference
      const baseSchemaKey = await ensureBaseSchemaReference(
        "Create",
        modelName
      );
      schemas[`CreateMany${modelName}ModelSchema`] = {
        type: "array",
        items: { $ref: `#/components/schemas/${baseSchemaKey}` },
      };
    }

    // Update schemas (unchanged)
    if (
      schemasToGenerate.includes("updateOne") &&
      !this.isEndpointDisabled("updateOne", routerConfig) &&
      !(await localValidatorFileExists("updateOne", modelName, arkosConfig))
    ) {
      schemas[`Update${modelName}ModelSchema`] = this.generateUpdateSchema(
        model,
        this.resolvePrismaQueryOptions(queryOptions, "updateOne")
      );
    }

    if (
      schemasToGenerate.includes("updateMany") &&
      !this.isEndpointDisabled("updateMany", routerConfig) &&
      !(await localValidatorFileExists("updateMany", modelName, arkosConfig))
    ) {
      // Only fix the reference

      const baseSchemaKey = await ensureBaseSchemaReference(
        "Update",
        modelName
      );
      schemas[`UpdateMany${modelName}ModelSchema`] = {
        type: "object",
        properties: {
          data: {
            type: "object",
            $ref: `#/components/schemas/${baseSchemaKey}`,
          },
          where: { type: "object" },
        },
        required: ["data"],
      };
    }
    // Response schemas
    if (
      schemasToGenerate.includes("findOne") &&
      !this.isEndpointDisabled("findOne", routerConfig) &&
      !(await localValidatorFileExists("findOne", modelName, arkosConfig))
    ) {
      schemas[`FindOne${modelName}ModelSchema`] = this.generateResponseSchema(
        model,
        this.resolvePrismaQueryOptions(queryOptions, "findOne"),
        "findOne"
      );
    }

    if (
      schemasToGenerate.includes("findMany") &&
      !this.isEndpointDisabled("findMany", routerConfig) &&
      !(await localValidatorFileExists("findMany", modelName, arkosConfig))
    ) {
      schemas[`FindMany${modelName}ModelSchema`] = {
        type: "array",
        items: this.generateResponseSchema(
          model,
          this.resolvePrismaQueryOptions(queryOptions, "findMany"),
          "findMany"
        ),
      };
    }
  }

  /**
   * Generate create schema (excludes ID, includes relation IDs only)
   */
  private generateCreateSchema(
    model: PrismaModel,
    _: Record<string, any>
  ): JsonSchema {
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
      // Skip ID fields
      if (field.isId || restrictedFields.includes(field.name)) continue;

      // Handle relations
      if (this.isModelRelation(field.type)) {
        // For single relations, include only the ID field
        if (!field.isArray) {
          properties[field.connectionField] = {
            type: this.mapPrismaTypeToJsonSchema(
              model.fields.find(
                (_field) => _field.name === field.connectionField
              )?.type || "String"
            ),
          };

          // Check if relation ID is required
          if (!field.isOptional && field.defaultValue === undefined)
            required.push(field.name);
        }
        // Skip array relations in create schema
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
  private generateUpdateSchema(
    model: PrismaModel,
    _: Record<string, any>
  ): JsonSchema {
    const properties: { [key: string]: JsonSchemaProperty } = {};
    const autoFillFields = ["createdAt", "updatedAt", "deletedAt", "id"];

    for (const field of model.fields) {
      // Skip ID fields
      if (field.isId || autoFillFields.includes(field.name)) continue;

      // Handle relations
      if (this.isModelRelation(field.type)) {
        // For single relations, include only the ID field
        if (!field.isArray)
          properties[field.connectionField] = {
            type: this.mapPrismaTypeToJsonSchema(
              model.fields.find(
                (_field) => _field.name === field.connectionField
              )?.type || "String"
            ),
          };

        // Skip array relations in update schema
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
    options: Record<string, any>,
    _: "findOne" | "findMany"
  ): JsonSchema {
    const properties: { [key: string]: JsonSchemaProperty } = {};
    const required: string[] = [];

    // Get select and include options
    const selectFields = options?.select;
    const omittedFields = options?.omit;
    const includeRelations = options?.include;

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
        if (includeRelations?.[field.name]) {
          const relationModel = this.schema.models.find(
            (m) => m.name === field.type
          );

          if (relationModel) {
            const relationSchema = this.generateNestedRelationSchema(
              relationModel,
              includeRelations[field.name]
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

    for (const field of model.fields) {
      // Skip password fields
      if (field.name.toLowerCase().includes("password")) {
        continue;
      }

      if (selectFields && !selectFields[field.name]) {
        continue;
      }

      if (this.isModelRelation(field.type)) {
        if (nestedIncludes?.[field.name]) {
          const relationModel = this.schema.models.find(
            (m) => m.name === field.type
          );
          if (relationModel) {
            const nestedSchema = this.generateNestedRelationSchema(
              relationModel,
              nestedIncludes[field.name]
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
  private generateLoginSchema(arkosConfig?: ArkosConfig): JsonSchema {
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
  private generateSignupSchema(
    model: PrismaModel,
    options?: Record<string, any>
  ): JsonSchema {
    // Similar to create but might have specific required fields
    const singupSchema = this.generateCreateSchema(model, options || {});

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

  private generateUpdateMeSchema(
    model: PrismaModel,
    options?: Record<string, any>
  ): JsonSchema {
    // Similar to update but might exclude certain fields like role, etc.
    const updateSchema = this.generateUpdateSchema(model, options || {});

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

  /**
   * Utility methods
   */
  private resolvePrismaQueryOptions(
    prismaQueryOptions?: PrismaQueryOptions<any> | AuthPrismaQueryOptions<any>,
    action?: ValidationFileMappingKey
  ): Record<string, any> {
    if (!prismaQueryOptions || !action) {
      return {};
    }

    const options = prismaQueryOptions as any;
    const actionOptions = options[action] || {};

    // Start with deprecated queryOptions (for backward compatibility)
    let mergedOptions = options.queryOptions || {};

    // Apply global options (replaces queryOptions)
    if (options.global)
      mergedOptions = deepmerge(mergedOptions, options.global);

    // Apply general operation options based on action type
    const generalOptions = this.getGeneralOptionsForAction(options, action);
    if (generalOptions)
      mergedOptions = deepmerge(mergedOptions, generalOptions);

    // Finally apply specific action options (highest priority)
    if (actionOptions) mergedOptions = deepmerge(mergedOptions, actionOptions);

    return mergedOptions;
  }

  /**
   * Helps in remmaping those prisma query options that combines many operations for example find, save...
   */
  private getGeneralOptionsForAction(
    options: any,
    action: ValidationFileMappingKey
  ): Record<string, any> | null {
    const actionMap: { [key: string]: string[] } = {
      find: ["findOne", "findMany"],
      create: ["createOne", "createMany"],
      update: ["updateOne", "updateMany"],
      delete: ["deleteOne", "deleteMany"],
      save: ["createOne", "createMany", "updateOne", "updateMany"],
      saveOne: ["createOne", "updateOne"],
      saveMany: ["createMany", "updateMany"],
    };

    for (const [optionKey, actions] of Object.entries(actionMap)) {
      if (actions.includes(action) && options[optionKey]) {
        return options[optionKey];
      }
    }

    return null;
  }

  private isEndpointDisabled(
    endpoint: string,
    routerConfig?: RouterConfig
  ): boolean {
    if (!routerConfig?.disable) return false;

    if (typeof routerConfig.disable === "boolean") {
      return routerConfig.disable;
    }

    return (
      routerConfig.disable[endpoint as keyof typeof routerConfig.disable] ||
      false
    );
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

const enhancedPrismaJsonSchemaGenerator =
  new EnhancedPrismaJsonSchemaGenerator();

export default enhancedPrismaJsonSchemaGenerator;
