import prismaSchemaParser from "../../../../prisma/prisma-schema-parser";
import { PrismaField } from "../../../../prisma/types";
import { getUserFileExtension } from "../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../template-generators";

export class ZodSchemaGenerator {
  private ensureCorrectOptions(options: TemplateOptions) {
    const { modelName } = options;
    if (!modelName)
      throw new Error("Module name is required for schema template");
    const model = prismaSchemaParser.models.find(
      (m) => m.name.toLowerCase() === modelName.pascal.toLowerCase()
    );
    if (!model)
      throw new Error(`Model ${modelName.pascal} not found in Prisma schema`);
    return model;
  }

  generateCreateSchema(options: TemplateOptions): string {
    const { modelName } = options;
    const model = this.ensureCorrectOptions(options);

    const ext = getUserFileExtension();
    const isTypeScript = ext === "ts";
    const restrictedFields = ["id", "createdAt", "updatedAt", "deletedAt"];
    const isUserModule = modelName!.kebab === "user";
    const enumsUsed = new Set<string>();

    let schemaFields: string[] = [];

    for (const field of model.fields) {
      const isForeignKey = model.fields.some(
        (f) => f.foreignKeyField === field.name
      );
      if (field.isId || restrictedFields.includes(field.name) || isForeignKey)
        continue;

      if (field.isRelation) {
        if (field.isArray) continue;

        const referencedModel = prismaSchemaParser.models.find(
          (m) => m.name === field.type
        );

        if (referencedModel) {
          const refField = field.foreignReferenceField || "id";
          const refFieldType = referencedModel.fields.find(
            (f) => f.name === refField
          );
          const zodType = this.mapPrismaTypeToZod(refFieldType?.type!);
          const isOptional =
            field.isOptional || field.defaultValue !== undefined;
          schemaFields.push(
            `  ${field.name}: z.object({ ${refField}: ${zodType} })${isOptional ? ".optional()" : ""}`
          );
        }
        continue;
      }

      if (prismaSchemaParser.isEnum(field.type)) enumsUsed.add(field.type);

      const zodSchema = this.generateZodField(field, isUserModule, false);
      schemaFields.push(`  ${field.name}: ${zodSchema}`);
    }

    const enumImports =
      enumsUsed.size > 0
        ? `import { ${Array.from(enumsUsed).join(", ")} } from "@prisma/client";\n`
        : "";

    const typeExport = isTypeScript
      ? `\n\nexport type Create${modelName!.pascal}SchemaType = z.infer<typeof Create${modelName!.pascal}Schema>;`
      : "";

    return `import { z } from "zod";
${enumImports}
const Create${modelName!.pascal}Schema = z.object({
${schemaFields.join(",\n")}
});

export default Create${modelName!.pascal}Schema;${typeExport}
`;
  }

  generateUpdateSchema(options: TemplateOptions): string {
    const { modelName } = options;
    const model = this.ensureCorrectOptions(options);

    const ext = getUserFileExtension();
    const isTypeScript = ext === "ts";
    const restrictedFields = ["id", "createdAt", "updatedAt", "deletedAt"];
    const isUserModule = modelName!.kebab === "user";
    const enumsUsed = new Set<string>();

    let schemaFields: string[] = [];

    for (const field of model.fields) {
      const isForeignKey = model.fields.some(
        (f) => f.foreignKeyField === field.name
      );
      if (field.isId || restrictedFields.includes(field.name) || isForeignKey) {
        continue;
      }

      if (field.isRelation) {
        if (field.isArray) continue;

        const referencedModel = prismaSchemaParser.models.find(
          (m) => m.name === field.type
        );

        if (referencedModel) {
          const refField = field.foreignReferenceField || "id";
          const refFieldType = referencedModel.fields.find(
            (f) => f.name === refField
          );
          const zodType = this.mapPrismaTypeToZod(refFieldType?.type!);
          // ALL relations are optional in update
          schemaFields.push(
            `  ${field.name}: z.object({ ${refField}: ${zodType} }).optional()`
          );
        }
        continue;
      }

      if (prismaSchemaParser.isEnum(field.type)) {
        enumsUsed.add(field.type);
      }

      // ALL fields are optional in update
      const zodSchema = this.generateZodField(field, isUserModule, true);
      schemaFields.push(`  ${field.name}: ${zodSchema}`);
    }

    const enumImports =
      enumsUsed.size > 0
        ? `import { ${Array.from(enumsUsed).join(", ")} } from "@prisma/client";\n`
        : "";

    const typeExport = isTypeScript
      ? `\n\nexport type Update${modelName!.pascal}SchemaType = z.infer<typeof Update${modelName!.pascal}Schema>;`
      : "";

    return `import { z } from "zod";
${enumImports}
const Update${modelName!.pascal}Schema = z.object({
${schemaFields.join(",\n")}
});

export default Update${modelName!.pascal}Schema;${typeExport}
`;
  }

  generateBaseSchema(options: TemplateOptions): string {
    const { modelName } = options;
    const model = this.ensureCorrectOptions(options);

    const ext = getUserFileExtension();
    const isTypeScript = ext === "ts";
    const isUserModule = modelName!.kebab === "user";
    const enumsUsed = new Set<string>();

    let schemaFields: string[] = [];

    for (const field of model.fields) {
      // Skip password field for user module (sensitive data)
      if (isUserModule && field.name === "password") {
        continue;
      }

      // Skip all relations - user can add them manually if needed
      if (field.isRelation) {
        continue;
      }

      if (prismaSchemaParser.isEnum(field.type)) {
        enumsUsed.add(field.type);
      }

      const zodSchema = this.generateZodField(field, isUserModule, false);
      schemaFields.push(`  ${field.name}: ${zodSchema}`);
    }

    const enumImports =
      enumsUsed.size > 0
        ? `import { ${Array.from(enumsUsed).join(", ")} } from "@prisma/client";\n`
        : "";

    const typeExport = isTypeScript
      ? `\n\nexport type ${modelName!.pascal}SchemaType = z.infer<typeof ${modelName!.pascal}Schema>;`
      : "";

    return `import { z } from "zod";
${enumImports}
const ${modelName!.pascal}Schema = z.object({
${schemaFields.join(",\n")}
});

export default ${modelName!.pascal}Schema;${typeExport}
`;
  }

  generateQuerySchema(options: TemplateOptions): string {
    const { modelName } = options;
    const model = this.ensureCorrectOptions(options);

    const ext = getUserFileExtension();
    const isTypeScript = ext === "ts";
    const isUserModule = modelName!.kebab === "user";
    const enumsUsed = new Set<string>();
    const filterSchemasNeeded = new Set<string>();

    let schemaFields: string[] = [];

    for (const field of model.fields) {
      // Skip password field in query schema for user module
      if (isUserModule && field.name === "password") {
        continue;
      }

      if (field.isRelation) {
        if (field.isArray) continue; // Skip array relations

        // Single relation - create inline relation filter
        const referencedModel = prismaSchemaParser.models.find(
          (m) => m.name === field.type
        );

        if (referencedModel) {
          const relationFilterFields: string[] = [];
          const isUserModel = referencedModel.name.toLowerCase() === "user";

          for (const refField of referencedModel.fields) {
            // Skip password for user model in relation filters
            if (isUserModel && refField.name === "password") {
              continue;
            }

            // Skip relations in relation filters (single level only)
            if (refField.isRelation) continue;

            const filterSchemaName = this.getFilterSchemaForField(
              refField,
              enumsUsed
            );
            if (filterSchemaName) {
              filterSchemasNeeded.add(filterSchemaName);
              relationFilterFields.push(
                `    ${refField.name}: ${filterSchemaName}.optional()`
              );
            }
          }

          if (relationFilterFields.length > 0) {
            schemaFields.push(
              `  ${field.name}: z.object({\n${relationFilterFields.join(",\n")}\n  }).optional()`
            );
          }
        }
        continue;
      }

      // Regular fields get filter schemas
      const filterSchemaName = this.getFilterSchemaForField(field, enumsUsed);
      if (filterSchemaName) {
        filterSchemasNeeded.add(filterSchemaName);
        schemaFields.push(`  ${field.name}: ${filterSchemaName}.optional()`);
      }
    }

    const enumImports =
      enumsUsed.size > 0
        ? `import { ${Array.from(enumsUsed).join(", ")} } from "@prisma/client";\n`
        : "";

    // Generate filter schemas
    const filterSchemas = this.generateFilterSchemas(
      filterSchemasNeeded,
      enumsUsed
    );

    const filterSchemasSection = filterSchemas ? `\n${filterSchemas}\n` : "";

    const typeExport = isTypeScript
      ? `\n\nexport type Query${modelName!.pascal}SchemaType = z.infer<typeof Query${modelName!.pascal}Schema>;`
      : "";

    return `import { z } from "zod";
${enumImports}${filterSchemasSection}
const Query${modelName!.pascal}Schema = z.object({
${schemaFields.join(",\n")}
});

export default Query${modelName!.pascal}Schema;${typeExport}
`;
  }

  private getFilterSchemaForField(
    field: PrismaField,
    enumsUsed: Set<string>
  ): string | null {
    if (prismaSchemaParser.isEnum(field.type)) {
      enumsUsed.add(field.type);
      return `${field.type}FilterSchema`;
    }

    switch (field.type) {
      case "String":
        return "StringFilterSchema";
      case "Int":
      case "Float":
      case "Decimal":
      case "BigInt":
        return "NumberFilterSchema";
      case "Boolean":
        return "BooleanFilterSchema";
      case "DateTime":
        return "DateTimeFilterSchema";
      default:
        return null;
    }
  }

  private generateFilterSchemas(
    filterSchemasNeeded: Set<string>,
    enumsUsed: Set<string>
  ): string {
    const schemas: string[] = [];

    if (filterSchemasNeeded.has("StringFilterSchema")) {
      schemas.push(`const StringFilterSchema = z.object({
  contains: z.string().optional(),
  icontains: z.string().optional(),
  equals: z.string().optional(),
  in: z.array(z.string()).optional(),
  notIn: z.array(z.string()).optional(),
});`);
    }

    if (filterSchemasNeeded.has("NumberFilterSchema")) {
      schemas.push(`const NumberFilterSchema = z.object({
  equals: z.number().optional(),
  gte: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  lt: z.number().optional(),
  in: z.array(z.number()).optional(),
  notIn: z.array(z.number()).optional(),
});`);
    }

    if (filterSchemasNeeded.has("BooleanFilterSchema")) {
      schemas.push(`const BooleanFilterSchema = z.object({
  equals: z.boolean().optional(),
});`);
    }

    if (filterSchemasNeeded.has("DateTimeFilterSchema")) {
      schemas.push(`const DateTimeFilterSchema = z.object({
  equals: z.string().optional(),
  gte: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  lt: z.string().optional(),
});`);
    }

    // Generate enum filter schemas
    for (const enumName of enumsUsed) {
      if (filterSchemasNeeded.has(`${enumName}FilterSchema`)) {
        schemas.push(`const ${enumName}FilterSchema = z.object({
  equals: z.nativeEnum(${enumName}).optional(),
  in: z.array(z.nativeEnum(${enumName})).optional(),
  notIn: z.array(z.nativeEnum(${enumName})).optional(),
});`);
      }
    }

    return schemas.join("\n\n");
  }

  private generateZodField(
    field: PrismaField,
    isUserModule: boolean,
    forceOptional: boolean
  ): string {
    let zodType = this.mapPrismaTypeToZod(field.type);

    if (field.isArray) {
      zodType = `z.array(${zodType})`;
    }

    if (prismaSchemaParser.isEnum(field.type)) {
      zodType = field.isArray
        ? `z.array(z.nativeEnum(${field.type}))`
        : `z.nativeEnum(${field.type})`;
    }

    // User module special cases
    if (isUserModule) {
      if (field.name === "email") {
        zodType = `z.string().email()`;
      } else if (field.name === "password") {
        zodType = `z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number")`;
      }
    }

    const isOptional =
      forceOptional || field.isOptional || field.defaultValue !== undefined;
    if (isOptional) {
      zodType += ".optional()";
    }

    return zodType;
  }

  private mapPrismaTypeToZod(prismaType: string): string {
    switch (prismaType) {
      case "String":
        return "z.string()";
      case "Int":
      case "Float":
      case "Decimal":
        return "z.number()";
      case "Boolean":
        return "z.boolean()";
      case "DateTime":
        return "z.date().or(z.string()).refine((val) => val instanceof Date || !isNaN(Date.parse(val)), 'Invalid date')";
      case "Json":
        return "z.any()";
      case "Bytes":
        return "z.instanceof(Buffer)";
      case "BigInt":
        return "z.bigint()";
      default:
        return "z.any()";
    }
  }
}

const zodSchemaGenerator = new ZodSchemaGenerator();

export default zodSchemaGenerator;
