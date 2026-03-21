import prismaSchemaParser from "./prisma-schema-parser";
import {
  PrismaModel,
  PrismaField,
  JsonSchema,
  JsonSchemaProperty,
} from "./types";

/**
 * Enhanced JSON Schema generator that creates schemas based on Prisma models and query options
 */
export class PrismaJsonSchemaGenerator {
  schema = prismaSchemaParser.parse();

  private isCompositeType(typeName: string): boolean {
    return prismaSchemaParser.compositeTypes.some((t) => t.name === typeName);
  }

  /**
   * Generate create schema (excludes ID, includes relation IDs only)
   */
  generateCreateSchema(model: PrismaModel): JsonSchema {
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
  generateUpdateSchema(model: PrismaModel): JsonSchema {
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
  generateResponseSchema(
    model: PrismaModel,
    options: Record<string, any>
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

  private isModelRelation(typeName: string): boolean {
    return this.schema.models.some((m) => m.name === typeName);
  }

  private convertFieldToJsonSchema(field: PrismaField): JsonSchemaProperty {
    // Reuse the existing method from the original generator
    const baseType = this.mapPrismaTypeToJsonSchema(field.type);
    const property: JsonSchemaProperty = { type: baseType };

    if (this.isCompositeType(field.type)) {
      const compositeType = prismaSchemaParser.compositeTypes.find(
        (t) => t.name === field.type
      )!;
      const nestedProperties: { [key: string]: JsonSchemaProperty } = {};
      for (const nestedField of compositeType.fields) {
        nestedProperties[nestedField.name] =
          this.convertFieldToJsonSchema(nestedField);
      }
      if (field.isArray) {
        return {
          type: "array",
          items: { type: "object", properties: nestedProperties },
        };
      }
      return { type: "object", properties: nestedProperties };
    }

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

    if (this.isCompositeType(prismaType)) return "object";

    return "string";
  }

  private isEnum(typeName: string): boolean {
    return this.schema.enums.some((e) => e.name === typeName);
  }
}

const prismaJsonSchemaGenerator = new PrismaJsonSchemaGenerator();

export default prismaJsonSchemaGenerator;
