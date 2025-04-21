import fs from "fs/promises";
import path from "path";

async function generateZodSchemas(inputContent: string): Promise<any> {
  let output = `import { z } from "zod";\n\n`;

  // Extract enum names first to help identify enum types later
  const enumNames = new Set();
  const enumRegex = /export enum (\w+) {([^}]+)}/g;
  let enumMatch;
  while ((enumMatch = enumRegex.exec(inputContent)) !== null) {
    const enumName = enumMatch[1];
    const enumValues = enumMatch[2];
    enumNames.add(enumName);

    // Keep original enum definition
    output += `export enum ${enumName} {\n${enumValues}\n}\n\n`;
  }

  // Helper function to convert type to zod schema
  function typeToZodSchema(type: string, isOptional: boolean = false): string {
    type = type.trim();
    const baseSchema = (() => {
      if (type?.includes?.("Date")) {
        return `z.date().or(z.string()).refine((val) => val instanceof Date || !isNaN(Date.parse(val)), "Data inválida")`;
      }
      switch (type) {
        case "string":
          return "z.string()";
        case "number":
          return "z.number()";
        case "boolean":
          return "z.boolean()";
        case "any":
          return "z.any()";
        default:
          // Handle arrays
          if (type?.includes?.("[]")) {
            const arrayType = type.replace("[]", "");
            // Handle primitive types in arrays
            switch (arrayType) {
              case "string":
                return "z.array(z.string())";
              case "number":
                return "z.array(z.number())";
              case "boolean":
                return "z.array(z.boolean())";
              default:
                // Check if it's an enum type
                if (enumNames.has(arrayType)) {
                  return `z.array(z.nativeEnum(${arrayType}))`;
                }
                // Otherwise it's a relation/model type
                return `z.array(${arrayType}Schema)`;
            }
          }
          // Handle single types
          if (type.match(/^[A-Z]/)) {
            // Check if it's an enum type
            if (enumNames.has(type)) {
              return `z.nativeEnum(${type})`;
            }
            // Otherwise it's a relation/model type
            return `${type}Schema`;
          }
          return "z.any()";
      }
    })();

    return isOptional ? `${baseSchema}.optional()` : baseSchema;
  }

  // Extract and generate interface schemas
  const interfaceRegex = /export interface (\w+) {([^}]+)}/g;
  let interfaceMatch;
  while ((interfaceMatch = interfaceRegex.exec(inputContent)) !== null) {
    const interfaceName = interfaceMatch[1];
    const interfaceBody = interfaceMatch[2];

    // Parse interface properties
    const properties = interfaceBody
      .split(";")
      .map((line) => line.trim())
      .filter((line) => line)
      .map((line) => {
        const [propName, type] = line.split(":").map((part) => part.trim());
        // Skip createdAt, updatedAt, and deletedAt
        if (
          ["createdAt", "updatedAt", "deletedAt"]?.includes?.(
            propName.replace("?", "")
          )
        ) {
          return null;
        }
        const isOptional = propName.endsWith("?");
        const cleanPropName = propName.replace("?", "");
        return { name: cleanPropName, type, isOptional };
      })
      .filter((prop) => prop !== null);

    output += `export const ${interfaceName}Schema = z.object({\n`;
    properties.forEach((prop, index) => {
      if (prop) {
        output += `  ${prop.name}: ${typeToZodSchema(
          prop.type,
          prop.isOptional
        )}`;
        if (index < properties.length - 1) output += ",";
        output += "\n";
      }
    });
    output += "});\n\n";
  }

  return output;
}

// Main execution
async function main() {
  try {
    const inputContent = await fs.readFile(
      path.join(process.cwd(), ".cache/types", "prisma.ts"),
      "utf-8"
    );
    const generatedSchemas = await generateZodSchemas(inputContent);
    await fs.writeFile(
      path.join(process.cwd(), ".cache/generated-schemas.ts"),
      generatedSchemas
    );
    console.info("Zod schemas generated successfully!");
  } catch (error) {
    console.error("Error generating schemas:", error);
    process.exit(1);
  }
}

main();
