import prismaSchemaParser from "../../../../prisma/prisma-schema-parser";
import { PrismaField } from "../../../../prisma/types";
import { getUserFileExtension } from "../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../template-generators";
import { getArkosConfig } from "../../../../helpers/arkos-config.helpers";

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
    const restrictedFields = [
      "id",
      "createdAt",
      "updatedAt",
      "deletedAt",
      "created_at",
      "updated_at",
      "deleted_at",
    ];
    const isUserModule = modelName!.kebab === "user";
    const enumsUsed = new Set<string>();

    let schemaFields: string[] = [];

    for (const field of model.fields) {
      const isForeignKey = model.fields.some(
        (f) => f.foreignKeyField === field.name
      );
      if (field.isId || restrictedFields.includes(field.name) || isForeignKey)
        continue;

      if (field.isCompositeType) {
        const compositeType = prismaSchemaParser.compositeTypes.find(
          (t) => t.name === field.type
        )!;
        const fields = compositeType.fields
          .map(
            (f) =>
              `    ${f.name}: ${this.mapPrismaTypeToZod(f.type)}${f.isOptional ? ".optional()" : ""}`
          )
          .join(",\n");
        const zodObj = `z.object({\n${fields}\n  })`;
        const isOptional = field.isOptional || field.defaultValue !== undefined;
        schemaFields.push(
          `  ${field.name}: ${field.isArray ? `z.array(${zodObj})` : zodObj}${isOptional ? ".optional()" : ""}`
        );
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
          let zodType = this.mapPrismaTypeToZod(refFieldType?.type!);
          if (
            refFieldType?.type?.toLowerCase?.() === "string" ||
            !refFieldType?.type
          )
            zodType = zodType + ".min(1)";
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
      if (field.isId || restrictedFields.includes(field.name) || isForeignKey)
        continue;

      if (field.isCompositeType) {
        const compositeType = prismaSchemaParser.compositeTypes.find(
          (t) => t.name === field.type
        )!;
        const fields = compositeType.fields
          .map(
            (f) =>
              `    ${f.name}: ${this.mapPrismaTypeToZod(f.type)}${f.isOptional ? ".optional()" : ""}`
          )
          .join(",\n");
        const zodObj = `z.object({\n${fields}\n  })`;
        schemaFields.push(
          `  ${field.name}: ${field.isArray ? `z.array(${zodObj})` : zodObj}.optional()`
        );
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
          let zodType = this.mapPrismaTypeToZod(refFieldType?.type!);
          if (
            refFieldType?.type?.toLowerCase?.() === "string" ||
            !refFieldType?.type
          )
            zodType = zodType + ".min(1)";

          schemaFields.push(
            `  ${field.name}: z.object({ ${refField}: ${zodType} }).optional()`
          );
        }
        continue;
      }

      if (prismaSchemaParser.isEnum(field.type)) {
        enumsUsed.add(field.type);
      }

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
      if (isUserModule && field.name === "password") {
        continue;
      }

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
    const restrictedFields = ["id"];
    const timestampFields = [
      "createdAt",
      "updatedAt",
      "deletedAt",
      "created_at",
      "updated_at",
      "deleted_at",
    ];

    let schemaFields: string[] = [];
    let timestampSchemaFields: string[] = [];

    schemaFields.push(`  page: z.coerce.number().optional()`);
    schemaFields.push(`  limit: z.coerce.number().max(100).optional()`);
    schemaFields.push(`  sort: z.string().optional()`);
    schemaFields.push(`  fields: z.string().optional()`);

    for (const field of model.fields) {
      if (isUserModule && field.name === "password") continue;
      if (restrictedFields.includes(field.name)) continue;

      const isForeignKey = model.fields.some(
        (f) => f.foreignKeyField === field.name
      );
      if (isForeignKey) continue;

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

          const fieldDef = `  ${field.name}: z.object({ ${refField}: ${zodType}.optional() }).optional()`;

          if (timestampFields.includes(field.name)) {
            timestampSchemaFields.push(fieldDef);
          } else {
            schemaFields.push(fieldDef);
          }
        }
        continue;
      }

      if (prismaSchemaParser.isEnum(field.type)) {
        enumsUsed.add(field.type);
        const fieldDef = `  ${field.name}: z.nativeEnum(${field.type}).optional()`;

        if (timestampFields.includes(field.name)) {
          timestampSchemaFields.push(fieldDef);
        } else {
          schemaFields.push(fieldDef);
        }
        continue;
      }

      if (field.type === "Boolean") {
        const fieldDef = `  ${field.name}: z.boolean().optional()`;

        if (timestampFields.includes(field.name)) {
          timestampSchemaFields.push(fieldDef);
        } else {
          schemaFields.push(fieldDef);
        }
        continue;
      }

      const filterSchemaName = this.getFilterSchemaForField(field, enumsUsed);
      if (filterSchemaName) {
        filterSchemasNeeded.add(filterSchemaName);
        const fieldDef = `  ${field.name}: ${filterSchemaName}.optional()`;

        if (timestampFields.includes(field.name)) {
          timestampSchemaFields.push(fieldDef);
        } else {
          schemaFields.push(fieldDef);
        }
      }
    }

    const enumImports =
      enumsUsed.size > 0
        ? `import { ${Array.from(enumsUsed).join(", ")} } from "@prisma/client";\n`
        : "";

    const filterSchemas = this.generateFilterSchemas(
      filterSchemasNeeded,
      enumsUsed
    );

    const filterSchemasSection = filterSchemas ? `\n${filterSchemas}\n` : "";

    const typeExport = isTypeScript
      ? `\n\nexport type Query${modelName!.pascal}SchemaType = z.infer<typeof Query${modelName!.pascal}Schema>;`
      : "";

    const allFields = [...schemaFields, ...timestampSchemaFields];

    return `import { z } from "zod";
${enumImports}${filterSchemasSection}
const Query${modelName!.pascal}Schema = z.object({
${allFields.join(",\n")}
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
      case "DateTime":
        return "DateTimeFilterSchema";
      default:
        return null;
    }
  }

  private generateFilterSchemas(
    filterSchemasNeeded: Set<string>,
    _: Set<string>
  ): string {
    const schemas: string[] = [];

    if (filterSchemasNeeded.has("StringFilterSchema")) {
      schemas.push(`const StringFilterSchema = z.object({
  icontains: z.string().optional()
});`);
    }

    if (filterSchemasNeeded.has("NumberFilterSchema")) {
      schemas.push(`const NumberFilterSchema = z.object({
  equals: z.coerce.number().optional(),
  gte: z.coerce.number().optional(),
  lte: z.coerce.number().optional()
});`);
    }

    if (filterSchemasNeeded.has("DateTimeFilterSchema")) {
      schemas.push(`const DateTimeFilterSchema = z.object({
  equals: z.string().optional(),
  gte: z.string().optional(),
  lte: z.string().optional()
});`);
    }

    return schemas.join("\n\n");
  }

  private generateZodField(
    field: PrismaField,
    isUserModule: boolean,
    forceOptional: boolean
  ): string {
    let zodType = this.mapPrismaTypeToZod(field.type);

    if (field.isArray)
      zodType = `z.array(${zodType}${field.type === "String" ? ".min(1)" : ""})`;

    if (prismaSchemaParser.isEnum(field.type))
      zodType = field.isArray
        ? `z.array(z.nativeEnum(${field.type}))`
        : `z.nativeEnum(${field.type})`;

    if (isUserModule) {
      if (field.name === "email") {
        zodType = `z.string().email()`;
      } else if (field.name === "password") {
        zodType = `z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number")`;
      }
    }

    const isOptional =
      forceOptional || field.isOptional || field.defaultValue !== undefined;
    if (isOptional) zodType += ".optional()";

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
        if (
          prismaSchemaParser.compositeTypes.some((t) => t.name === prismaType)
        ) {
          const compositeType = prismaSchemaParser.compositeTypes.find(
            (t) => t.name === prismaType
          )!;
          const fields = compositeType.fields
            .map(
              (f) =>
                `${f.name}: ${this.mapPrismaTypeToZod(f.type)}${f.isOptional ? ".optional()" : ""}`
            )
            .join(", ");
          return `z.object({ ${fields} })`;
        }
        return "z.any()";
    }
  }

  generateLoginSchema(_: TemplateOptions): string {
    const ext = getUserFileExtension();
    const isTypeScript = ext === "ts";
    const allowedUsernames = getArkosConfig()?.authentication?.login
      ?.allowedUsernames || ["username"];

    const usernameFields = allowedUsernames.map((field: string) => {
      const displayName = field.includes(".") ? field.split(".").pop()! : field;
      const zodType =
        displayName === "email" ? "z.string().email()" : "z.string().min(1)";
      return `  ${displayName}: ${zodType}.optional()`;
    });

    const anyOfComment =
      allowedUsernames.length > 1
        ? `\n// At least one of: ${allowedUsernames.map((f: string) => (f.includes(".") ? f.split(".").pop() : f)).join(", ")} is required`
        : "";

    const typeExport = isTypeScript
      ? `\n\nexport type LoginSchemaType = z.infer<typeof LoginSchema>;`
      : "";

    return `import { z } from "zod";
${anyOfComment}
const LoginSchema = z.object({
${usernameFields.join(",\n")},
  password: z.string().min(8)
});

export default LoginSchema;${typeExport}
`;
  }

  generateSignupSchema(_: TemplateOptions): string {
    const ext = getUserFileExtension();
    const isTypeScript = ext === "ts";

    const userModel = prismaSchemaParser.models.find(
      (m) => m.name.toLowerCase() === "user"
    );
    if (!userModel) throw new Error("User model not found in Prisma schema");

    const restrictedFields = [
      "id",
      "createdAt",
      "updatedAt",
      "deletedAt",
      "roles",
      "role",
      "isActive",
      "isStaff",
      "isSuperUser",
      "passwordChangedAt",
      "deletedSelfAccountAt",
      "lastLoginAt",
    ];

    const enumsUsed = new Set<string>();
    const schemaFields: string[] = [];

    for (const field of userModel.fields) {
      const isForeignKey = userModel.fields.some(
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
          let zodType = this.mapPrismaTypeToZod(refFieldType?.type!);
          if (
            refFieldType?.type?.toLowerCase?.() === "string" ||
            !refFieldType?.type
          )
            zodType = zodType + ".min(1)";
          const isOptional =
            field.isOptional || field.defaultValue !== undefined;
          schemaFields.push(
            `  ${field.name}: z.object({ ${refField}: ${zodType} })${isOptional ? ".optional()" : ""}`
          );
        }
        continue;
      }
      if (prismaSchemaParser.isEnum(field.type)) enumsUsed.add(field.type);
      const zodSchema =
        field.name === "password"
          ? `z.string().min(8).regex(/[a-z]/, "Must contain lowercase").regex(/[A-Z]/, "Must contain uppercase").regex(/[0-9]/, "Must contain number")`
          : this.generateZodField(field, true, false);
      schemaFields.push(`  ${field.name}: ${zodSchema}`);
    }

    const enumImports =
      enumsUsed.size > 0
        ? `import { ${Array.from(enumsUsed).join(", ")} } from "@prisma/client";\n`
        : "";

    const typeExport = isTypeScript
      ? `\n\nexport type SignupSchemaType = z.infer<typeof SignupSchema>;`
      : "";

    return `import { z } from "zod";
${enumImports}
const SignupSchema = z.object({
${schemaFields.join(",\n")}
});

export default SignupSchema;${typeExport}
`;
  }

  generateUpdateMeSchema(_: TemplateOptions): string {
    const ext = getUserFileExtension();
    const isTypeScript = ext === "ts";

    const userModel = prismaSchemaParser.models.find(
      (m) => m.name.toLowerCase() === "user"
    );
    if (!userModel) throw new Error("User model not found in Prisma schema");

    const restrictedFields = [
      "id",
      "createdAt",
      "updatedAt",
      "deletedAt",
      "roles",
      "role",
      "isActive",
      "isStaff",
      "isSuperUser",
      "passwordChangedAt",
      "deletedSelfAccountAt",
      "lastLoginAt",
      "password",
    ];

    const enumsUsed = new Set<string>();
    const schemaFields: string[] = [];

    for (const field of userModel.fields) {
      const isForeignKey = userModel.fields.some(
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
          let zodType = this.mapPrismaTypeToZod(refFieldType?.type!);
          if (
            refFieldType?.type?.toLowerCase?.() === "string" ||
            !refFieldType?.type
          )
            zodType = zodType + ".min(1)";
          schemaFields.push(
            `  ${field.name}: z.object({ ${refField}: ${zodType} }).optional()`
          );
        }
        continue;
      }
      if (prismaSchemaParser.isEnum(field.type)) enumsUsed.add(field.type);
      const zodSchema = this.generateZodField(field, true, true);
      schemaFields.push(`  ${field.name}: ${zodSchema}`);
    }

    const enumImports =
      enumsUsed.size > 0
        ? `import { ${Array.from(enumsUsed).join(", ")} } from "@prisma/client";\n`
        : "";

    const typeExport = isTypeScript
      ? `\n\nexport type UpdateMeSchemaType = z.infer<typeof UpdateMeSchema>;`
      : "";

    return `import { z } from "zod";
${enumImports}
const UpdateMeSchema = z.object({
${schemaFields.join(",\n")}
});

export default UpdateMeSchema;${typeExport}
`;
  }

  generateUpdatePasswordSchema(_: TemplateOptions): string {
    const ext = getUserFileExtension();
    const isTypeScript = ext === "ts";

    const typeExport = isTypeScript
      ? `\n\nexport type UpdatePasswordSchemaType = z.infer<typeof UpdatePasswordSchema>;`
      : "";

    return `import { z } from "zod";

const UpdatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/[a-z]/, "Must contain lowercase").regex(/[A-Z]/, "Must contain uppercase").regex(/[0-9]/, "Must contain number")
});

export default UpdatePasswordSchema;${typeExport}
`;
  }
}

const zodSchemaGenerator = new ZodSchemaGenerator();

export default zodSchemaGenerator;
