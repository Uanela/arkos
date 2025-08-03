import { getPrismaSchemasContent } from "../helpers/models.helpers";
import { PrismaSchema, PrismaModel, PrismaEnum, PrismaField } from "./types";

/**
 * A parser for Prisma schema files that extracts models, enums, and their properties.
 *
 * @example
 * ```typescript
 * const schemaContent = `
 *   model User {
 *     id    Int    @id @default(autoincrement())
 *     email String @unique
 *   }
 * `;
 * const parser = new PrismaSchemaParser();
 * const schema = parser.parse();
 * ```
 */
export class PrismaSchemaParser {
  /** Collection of parsed enum definitions */
  private enums: PrismaEnum[] = [];
  /** Collection of parsed model definitions */
  private models: PrismaModel[] = [];

  /**
   * Parses the Prisma schema and extracts all models and enums.
   *
   * @returns The parsed schema containing arrays of models and enums
   */
  parse(): PrismaSchema {
    this.enums = this.extractEnums();
    this.models = this.extractModels();

    return {
      models: this.models,
      enums: this.enums,
    };
  }

  /**
   * Extracts all enum definitions from the schema.
   *
   * @private
   * @returns Array of parsed enum objects
   */
  private extractEnums(): PrismaEnum[] {
    const enums: PrismaEnum[] = [];
    const schema = getPrismaSchemasContent();
    const enumBlocks = schema.match(/enum\s+\w+\s*\{[^}]*\}/g) || [];

    for (const block of enumBlocks) {
      const enumObj = this.parseEnumBlock(block);
      if (enumObj) {
        enums.push(enumObj);
      }
    }

    return enums;
  }

  /**
   * Parses a single enum block and extracts its name and values.
   *
   * @private
   * @param block - The enum block string (e.g., "enum Status { ACTIVE INACTIVE }")
   * @returns The parsed enum object or null if parsing fails
   */
  private parseEnumBlock(block: string): PrismaEnum | null {
    const nameMatch = block.match(/enum\s+(\w+)/);
    if (!nameMatch) return null;

    const name = nameMatch[1];
    const values = block
      .split("\n")
      .map((line) => line.trim())
      .filter(
        (line) =>
          line &&
          !line.startsWith("enum") &&
          !line.startsWith("{") &&
          !line.startsWith("}")
      )
      .map((line) => line.replace(/,$/, ""));

    return { name, values };
  }

  /**
   * Extracts all model definitions from the schema.
   *
   * @private
   * @returns Array of parsed model objects
   */
  private extractModels(): PrismaModel[] {
    const models: PrismaModel[] = [];
    const modelBlocks = this.extractModelBlocks();

    for (const block of modelBlocks) {
      const model = this.parseModelBlock(block);
      if (model) {
        models.push(model);
      }
    }

    return models;
  }

  /**
   * Extracts raw model block strings from the schema using regex.
   *
   * @private
   * @returns Array of model block strings
   */
  private extractModelBlocks(): string[] {
    const modelRegex = /model\s+\w+\s*\{[^}]*\}/g;
    const schema = getPrismaSchemasContent();
    return schema.match(modelRegex) || [];
  }

  /**
   * Parses a single model block and extracts its name, fields, and metadata.
   *
   * @private
   * @param block - The model block string
   * @returns The parsed model object or null if parsing fails
   */
  private parseModelBlock(block: string): PrismaModel | null {
    const nameMatch = block.match(/model\s+(\w+)/);
    if (!nameMatch) return null;

    const name = nameMatch[1];
    const fields = this.parseFields(block);

    // Check for @@map directive
    const mapMatch = block.match(/@@map\s*\(\s*"([^"]+)"\s*\)/);
    const mapName = mapMatch ? mapMatch[1] : undefined;

    return { name, fields, mapName };
  }

  /**
   * Parses all field definitions within a model block.
   *
   * @private
   * @param block - The model block string containing field definitions
   * @returns Array of parsed field objects
   */
  private parseFields(block: string): PrismaField[] {
    const fields: PrismaField[] = [];
    const fieldLines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(
        (line) =>
          line &&
          !line.startsWith("model") &&
          !line.startsWith("{") &&
          !line.startsWith("}")
      );

    for (const line of fieldLines) {
      if (line.startsWith("//") || line.startsWith("@@")) continue;

      const field = this.parseFieldLine(line);
      if (field) {
        fields.push(field);
      }
    }

    return fields;
  }

  /**
   * Parses a single field line and extracts all field properties.
   *
   * @private
   * @param line - A single field definition line (e.g., "id Int @id @default(autoincrement())")
   * @returns The parsed field object or null if parsing fails
   *
   * @example
   * ```typescript
   * // Input: "email String? @unique @default("user@example.com")"
   * // Output: {
   * //   name: "email",
   * //   type: "String",
   * //   isOptional: true,
   * //   isArray: false,
   * //   defaultValue: "user@example.com",
   * //   isId: false,
   * //   isUnique: true,
   * //   attributes: ["@unique", "@default(\"user@example.com\")"]
   * // }
   * ```
   */
  private parseFieldLine(line: string): PrismaField | null {
    const fieldMatch = line.match(/^(\w+)\s+(\w+(?:\[\])?)\??\s*(.*)/);
    if (!fieldMatch) return null;

    const [, name, typeWithArray, attributesStr] = fieldMatch;
    const isArray = typeWithArray.endsWith("[]");
    const type = isArray ? typeWithArray.slice(0, -2) : typeWithArray;
    const isOptional = line.includes("?");
    const attributes = attributesStr
      .split(/\s+/)
      .filter((attr) => attr.startsWith("@"));

    // Extract default value
    let defaultValue: any = undefined;
    const defaultMatch = attributesStr.match(/@default\(([^)]+)\)/);
    if (defaultMatch) {
      defaultValue = this.parseDefaultValue(defaultMatch[1]);
    }

    const isId = attributes.some((attr) => attr.startsWith("@id"));
    const isUnique = attributes.some((attr) => attr.startsWith("@unique"));

    return {
      name,
      type,
      isOptional,
      isArray,
      defaultValue,
      isId,
      isUnique,
      attributes,
    };
  }

  /**
   * Parses a default value string and converts it to the appropriate JavaScript type.
   *
   * @private
   * @param defaultStr - The default value string from @default() attribute
   * @returns The parsed default value in appropriate JavaScript type, or undefined for functions
   *
   * @example
   * ```typescript
   * parseDefaultValue('"hello"') // returns "hello"
   * parseDefaultValue('true') // returns true
   * parseDefaultValue('42') // returns 42
   * parseDefaultValue('3.14') // returns 3.14
   * parseDefaultValue('ACTIVE') // returns "ACTIVE" (enum value)
   * parseDefaultValue('now()') // returns undefined (function)
   * ```
   */
  private parseDefaultValue(defaultStr: string): any {
    defaultStr = defaultStr.trim();

    // Handle string values
    if (defaultStr.startsWith('"') && defaultStr.endsWith('"')) {
      return defaultStr.slice(1, -1);
    }

    // Handle boolean values
    if (defaultStr === "true") return true;
    if (defaultStr === "false") return false;

    // Handle numeric values
    if (/^\d+$/.test(defaultStr)) {
      return parseInt(defaultStr, 10);
    }
    if (/^\d+\.\d+$/.test(defaultStr)) {
      return parseFloat(defaultStr);
    }

    // Handle enum values (no quotes, not a function)
    if (!defaultStr.includes("(")) {
      return defaultStr;
    }

    // Handle functions (like now(), auto(), etc.)
    if (defaultStr.includes("(")) {
      // For MongoDB, we'll skip function defaults as they're handled by the DB
      return undefined;
    }

    return defaultStr;
  }

  /**
   * Checks if a given type name corresponds to a defined enum.
   *
   * @param typeName - The type name to check
   * @returns True if the type is an enum, false otherwise
   *
   * @example
   * ```typescript
   * const parser = new PrismaSchemaParser(schemaWithStatusEnum);
   * parser.parse();
   * parser.isEnum('Status'); // true
   * parser.isEnum('String'); // false
   * ```
   */
  isEnum(typeName: string): boolean {
    return this.enums.some((e) => e.name === typeName);
  }

  /**
   * Checks if a given type name corresponds to a defined model.
   *
   * @param typeName - The type name to check
   * @returns True if the type is a model, false otherwise
   *
   * @example
   * ```typescript
   * const parser = new PrismaSchemaParser(schemaWithUserModel);
   * parser.parse();
   * parser.isModel('User'); // true
   * parser.isModel('String'); // false
   * ```
   */
  isModel(typeName: string): boolean {
    return this.models.some((m) => m.name === typeName);
  }
}

const prismaSchemaParser = new PrismaSchemaParser();

export default prismaSchemaParser;
