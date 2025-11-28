import prismaSchemaParser from "../../../../../prisma/prisma-schema-parser";
import { PrismaField, PrismaModel } from "../../../../../prisma/types";
import { getUserFileExtension } from "../../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../../template-generators";

export function generateCreateDtoTemplate(options: TemplateOptions): string {
  const { modelName } = options;

  if (!modelName)
    throw new Error("Module name is required for create-dto template");

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
  const validatorsUsed = new Set<string>();
  const transformersUsed = new Set<string>();
  const nestedDtoClasses: string[] = [];

  let dtoFields: string[] = [];

  for (const field of model.fields) {
    if (field.isId || restrictedFields.includes(field.name)) {
      continue;
    }

    const isForeignKey = model.fields.some(
      (f) => f.foreignKeyField === field.name
    );
    if (isForeignKey) {
      continue;
    }

    if (field.isRelation) {
      if (field.isArray) continue;

      const referencedModel = prismaSchemaParser.models.find(
        (m) => m.name === field.type
      );

      if (referencedModel) {
        const isOptional = field.isOptional || field.defaultValue !== undefined;
        const optionalDecorator = isOptional ? "  @IsOptional()\n" : "";
        const typeModifier = isTypeScript ? (isOptional ? "?" : "!") : "";

        validatorsUsed.add("IsOptional");
        validatorsUsed.add("ValidateNested");
        transformersUsed.add("Type");

        const relationDtoName = `${referencedModel.name}ForCreate${modelName.pascal}Dto`;

        // Generate the nested DTO class inline
        const nestedDtoClass = generateNestedDtoClass(
          field,
          referencedModel,
          relationDtoName,
          validatorsUsed,
          enumsUsed,
          isTypeScript
        );
        nestedDtoClasses.push(nestedDtoClass);

        dtoFields.push(
          `${optionalDecorator}  @ValidateNested()\n  @Type(() => ${relationDtoName})\n  ${field.name}${typeModifier}: ${relationDtoName};`
        );
      }
      continue;
    }

    if (prismaSchemaParser.isEnum(field.type)) {
      enumsUsed.add(field.type);
    }

    const { decorators, type } = generateClassValidatorField(
      field,
      isUserModule,
      validatorsUsed
    );
    const isOptional = field.isOptional || field.defaultValue !== undefined;
    const typeModifier = isTypeScript ? (isOptional ? "?" : "!") : "";
    dtoFields.push(`${decorators}  ${field.name}${typeModifier}: ${type};`);
  }

  const enumImports =
    enumsUsed.size > 0
      ? `import { ${Array.from(enumsUsed).join(", ")} } from "@prisma/client";\n`
      : "";

  const validatorImports =
    validatorsUsed.size > 0
      ? `import { ${Array.from(validatorsUsed).join(", ")} } from "class-validator";\n`
      : "";

  const transformerImports =
    transformersUsed.size > 0
      ? `import { ${Array.from(transformersUsed).join(", ")} } from "class-transformer";\n`
      : "";

  const nestedDtoSection =
    nestedDtoClasses.length > 0 ? `\n${nestedDtoClasses.join("\n\n")}\n` : "";

  return `${validatorImports}${transformerImports}${enumImports}${nestedDtoSection}
export default class Create${modelName.pascal}Dto {
${dtoFields.join("\n\n")}
}`;
}

function generateNestedDtoClass(
  field: PrismaField,
  referencedModel: PrismaModel,
  dtoName: string,
  validatorsUsed: Set<string>,
  enumsUsed: Set<string>,
  isTypeScript: boolean
): string {
  const fields: string[] = [];

  const refFieldName = field.foreignReferenceField || "id";
  const refFieldAsPrismaField = referencedModel.fields.find(
    (f) => f.name === refFieldName
  );

  if (refFieldAsPrismaField) {
    if (prismaSchemaParser.isEnum(refFieldAsPrismaField.type))
      enumsUsed.add(refFieldAsPrismaField.type);

    const { decorators, type } = generateClassValidatorField(
      refFieldAsPrismaField,
      false,
      validatorsUsed
    );
    const typeModifier = isTypeScript ? "!" : "";
    fields.push(
      `${decorators}  ${refFieldAsPrismaField.name}${typeModifier}: ${type};`
    );
  }

  return `class ${dtoName} {
${fields.join("\n\n")}
}`;
}

function generateClassValidatorField(
  field: PrismaField,
  isUserModule: boolean,
  validatorsUsed: Set<string>
): { decorators: string; type: string } {
  let decorators: string[] = [];
  let type = mapPrismaTypeToTS(field.type);

  const isOptional = field.isOptional || field.defaultValue !== undefined;
  if (isOptional) {
    decorators.push("@IsOptional()");
    validatorsUsed.add("IsOptional");
  }

  if (field.isArray) {
    decorators.push("@IsArray()");
    validatorsUsed.add("IsArray");
    type = `${type}[]`;
  }

  if (prismaSchemaParser.isEnum(field.type)) {
    decorators.push(
      `@IsEnum(${field.type}${field.isArray ? ", { each: true }" : ""})`
    );
    validatorsUsed.add("IsEnum");
    type = field.isArray ? `${field.type}[]` : field.type;
  } else {
    const fieldValidators = getValidatorsForType(field, isUserModule);
    decorators.push(...fieldValidators);
    fieldValidators.forEach((decorator) => {
      const validatorName = decorator.match(/@(\w+)/)?.[1];
      if (validatorName) validatorsUsed.add(validatorName);
    });
  }

  return {
    decorators:
      decorators.map((d) => `  ${d}`).join("\n") +
      (decorators.length > 0 ? "\n" : ""),
    type,
  };
}

function getValidatorsForType(
  field: PrismaField,
  isUserModule: boolean
): string[] {
  const validators: string[] = [];
  const arrayEach = field.isArray ? ", { each: true }" : "";

  // User module special cases - return early to override default validators
  if (isUserModule) {
    if (field.name === "email") {
      return ["@IsEmail()"]; // Only IsEmail, no IsString
    } else if (field.name === "password") {
      return [
        "@IsString()",
        "@MinLength(8)",
        '@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/, { message: "Password must contain at least one uppercase letter, one lowercase letter, and one number" })',
      ];
    }
  }

  switch (field.type) {
    case "String":
      validators.push(`@IsString(${arrayEach})`);
      break;
    case "Int":
    case "Float":
    case "Decimal":
      validators.push(`@IsNumber({}${arrayEach})`);
      break;
    case "Boolean":
      validators.push(`@IsBoolean(${arrayEach})`);
      break;
    case "DateTime":
      validators.push(`@IsDate(${arrayEach})`);
      break;
    case "BigInt":
      validators.push(`@IsNumber({}${arrayEach})`);
      break;
    case "Json":
      validators.push(`@IsObject(${arrayEach})`);
      break;
    case "Bytes":
      break;
    default:
      break;
  }

  return validators;
}

function mapPrismaTypeToTS(prismaType: string): string {
  switch (prismaType) {
    case "String":
      return "string";
    case "Int":
    case "Float":
    case "Decimal":
      return "number";
    case "Boolean":
      return "boolean";
    case "DateTime":
      return "Date";
    case "Json":
      return "any";
    case "Bytes":
      return "Buffer";
    case "BigInt":
      return "bigint";
    default:
      // For enums and unknown types, return as any
      return prismaSchemaParser.isEnum(prismaType) ? prismaType : "any";
  }
}
