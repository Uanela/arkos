import prismaSchemaParser from "../../../../../prisma/prisma-schema-parser";
import { PrismaField } from "../../../../../prisma/types";
import { getUserFileExtension } from "../../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../../template-generators";

export function generateUpdateSchemaTemplate(options: TemplateOptions): string {
  const { modelName } = options;

  if (!modelName)
    throw new Error("Module name is required for update-schema template");

  const model = prismaSchemaParser.models.find(
    (m) => m.name.toLowerCase() === modelName.pascal.toLowerCase()
  );

  if (!model)
    throw new Error(`Model ${modelName.pascal} not found in Prisma schema`);

  const ext = getUserFileExtension();
  const isTypeScript = ext === "ts";
  const restrictedFields = ["id", "createdAt", "updatedAt", "deletedAt"];
  const isUserModule = modelName.kebab === "user";
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

        const zodType = mapPrismaTypeToZod(refFieldType?.type!);

        schemaFields.push(
          `  ${field.name}: z.object({ ${refField}: ${zodType} }).optional()`
        );
      }
      continue;
    }

    if (prismaSchemaParser.isEnum(field.type)) {
      enumsUsed.add(field.type);
    }

    const zodSchema = generateZodField(field, isUserModule);
    schemaFields.push(`  ${field.name}: ${zodSchema}`);
  }

  const enumImports =
    enumsUsed.size > 0
      ? `import { ${Array.from(enumsUsed).join(", ")} } from "@prisma/client";\n`
      : "";

  const typeExport = isTypeScript
    ? `\nexport type Update${modelName.pascal}SchemaType = z.infer<typeof Update${modelName.pascal}Schema>;`
    : "";

  return `import { z } from "zod";
${enumImports}
const Update${modelName.pascal}Schema = z.object({
${schemaFields.join(",\n")}
});

${typeExport}
export default Update${modelName.pascal}Schema;
`;
}

function generateZodField(field: PrismaField, isUserModule: boolean): string {
  let zodType = mapPrismaTypeToZod(field.type);

  if (field.isArray) {
    zodType = `z.array(${zodType})`;
  }

  if (prismaSchemaParser.isEnum(field.type)) {
    zodType = field.isArray
      ? `z.array(z.nativeEnum(${field.type}))`
      : `z.nativeEnum(${field.type})`;
  }

  if (isUserModule) {
    if (field.name === "email") {
      zodType = `z.string().email()`;
    } else if (field.name === "password") {
      zodType = `z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number")`;
    }
  }

  zodType += ".optional()";

  return zodType;
}

function mapPrismaTypeToZod(prismaType: string): string {
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
