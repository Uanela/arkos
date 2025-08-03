import prismaSchemaParser from "./prisma-schema-parser";
import {
  PrismaModel,
  PrismaField,
  JsonSchema,
  JsonSchemaProperty,
} from "./types";

/**
 * Generates JSON Schema definitions from Prisma models for validation and documentation purposes.
 *
 * This generator converts Prisma model definitions into JSON Schema format, which can be used
 * for client-side validation, API documentation, or form generation. It handles type mapping,
 * required fields, default values, arrays, enums, and relationships.
 *
 * @example
 * ```typescript
 * const generator = new JsonSchemaGenerator();
 *
 * const userModel = prismaSchema.models.find(m => m.name === 'User');
 * const jsonSchema = generator.generateSchema(userModel);
 *
 * // Result:
 * // {
 * //   type: "object",
 * //   properties: {
 * //     email: { type: "string" },
 * //     age: { type: "number", default: 18 }
 * //   },
 * //   required: ["email"]
 * // }
 * ```
 */
export class PrismaJsonSchemaGenerator {
  /**
   * Generates a JSON Schema definition for a specific Prisma model.
   *
   * This method converts a Prisma model into a JSON Schema object that can be used
   * for validation. It automatically excludes ID fields (for MongoDB compatibility),
   * maps Prisma types to JSON Schema types, and determines required fields based on
   * optionality, default values, and array types.
   *
   * @param model - The Prisma model to convert to JSON Schema
   * @returns A JSON Schema object representing the model structure
   *
   * @example
   * ```typescript
   * const userModel = {
   *   name: "User",
   *   fields: [
   *     { name: "id", type: "String", isId: true, isOptional: false },
   *     { name: "email", type: "String", isOptional: false },
   *     { name: "age", type: "Int", isOptional: true, defaultValue: 18 },
   *     { name: "tags", type: "String", isArray: true }
   *   ]
   * };
   *
   * const schema = generator.generateSchema(userModel);
   * // Returns:
   * // {
   * //   type: "object",
   *PrismaPrismaPrismaPrismaPrismaPrismaPrismaPrismaPrismaPrismaPrismaPrismaPrismaPrismaPrismaPrisma //   properties: {
   * //     email: { type: "string" },
   * //     age: { type: "number", default: 18 },
   * //     tags: { type: "array", items: { type: "string" } }
   * //   },
   * //   required: ["email"]
   * // }
   * ```
   */
  generateSchema(model: PrismaModel): JsonSchema {
    const properties: { [key: string]: JsonSchemaProperty } = {};
    const required: string[] = [];

    for (const field of model.fields) {
      if (field.isId) continue; // Skip ID fields for MongoDB

      const property = this.convertFieldToJsonSchema(field);
      properties[field.name] = property;

      // A field is required if:
      // 1. It's not optional (no ?)
      // 2. It has no default value
      // 3. It's not an array (arrays can be empty)
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
   * Converts a single Prisma field to a JSON Schema property.
   *
   * This method handles the conversion of individual fields, including:
   * - Type mapping from Prisma to JSON Schema types
   * - Array type conversion to JSON Schema array format
   * - Default value assignment
   * - DateTime format specification
   * - Enum value constraints
   *
   * @private
   * @param field - The Prisma field to convert
   * @returns A JSON Schema property object
   *
   * @example
   * ```typescript
   * // For a field: { name: "status", type: "UserStatus", isArray: false, defaultValue: "ACTIVE" }
   * // where UserStatus is an enum with values ["ACTIVE", "INACTIVE"]
   * // Returns: { type: "string", enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" }
   *
   * // For a field: { name: "tags", type: "String", isArray: true }
   * // Returns: { type: "array", items: { type: "string" } }
   * ```
   */
  private convertFieldToJsonSchema(field: PrismaField): JsonSchemaProperty {
    const baseType = this.mapPrismaTypeToJsonSchema(field.type);
    const property: JsonSchemaProperty = {
      type: baseType,
    };

    if (field.isArray) {
      property.type = "array";
      property.items = {
        type: this.mapPrismaTypeToJsonSchema(field.type),
      };
    }

    if (field.defaultValue !== undefined) {
      property.default = field.defaultValue;
    }

    // Add format for specific types
    if (field.type === "DateTime") {
      property.format = "date-time";
    }

    const schema = prismaSchemaParser.parse();
    // Add enum values
    if (this.isEnum(field.type)) {
      const enumDef = schema.enums.find((e) => e.name === field.type);
      if (enumDef) {
        property.enum = enumDef.values;
      }
    }

    return property;
  }

  /**
   * Maps Prisma data types to their corresponding JSON Schema types.
   *
   * This method provides the core type conversion logic between Prisma's type system
   * and JSON Schema's type system. It handles primitive types, enums, model relations,
   * and provides fallback behavior for unknown types.
   *
   * @private
   * @param prismaType - The Prisma type name to convert
   * @returns The corresponding JSON Schema type string
   *
   * @example
   * ```typescript
   * mapPrismaTypeToJsonSchema("String")   // returns "string"
   * mapPrismaTypeToJsonSchema("Int")      // returns "number"
   * mapPrismaTypeToJsonSchema("Boolean")  // returns "boolean"
   * mapPrismaTypeToJsonSchema("DateTime") // returns "string"
   * mapPrismaTypeToJsonSchema("Json")     // returns "object"
   * mapPrismaTypeToJsonSchema("UserStatus") // returns "string" (if UserStatus is enum)
   * mapPrismaTypeToJsonSchema("User")     // returns "object" (if User is model)
   * mapPrismaTypeToJsonSchema("Unknown")  // returns "string" (fallback)
   * ```
   */
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

    // If it's a known primitive type, use the mapping
    if (typeMap[prismaType]) {
      return typeMap[prismaType];
    }

    // If it's an enum, it's a string with enum values
    if (this.isEnum(prismaType)) {
      return "string";
    }

    // If it's a model (relation), it's an object
    if (this.isModel(prismaType)) {
      return "object";
    }

    // Default to string for unknown types
    return "string";
  }

  /**
   * Checks if a given type name corresponds to a defined enum in the schema.
   *
   * @private
   * @param typeName - The type name to check
   * @returns True if the type is an enum, false otherwise
   */
  private isEnum(typeName: string): boolean {
    const schema = prismaSchemaParser.parse();
    return schema.enums.some((e) => e.name === typeName);
  }

  /**
   * Checks if a given type name corresponds to a defined model in the schema.
   *
   * @private
   * @param typeName - The type name to check
   * @returns True if the type is a model, false otherwise
   */
  private isModel(typeName: string): boolean {
    const schema = prismaSchemaParser.parse();
    return schema.models.some((m) => m.name === typeName);
  }
}

const prismaJsonSchemaGenerator = new PrismaJsonSchemaGenerator();

export default prismaJsonSchemaGenerator;
