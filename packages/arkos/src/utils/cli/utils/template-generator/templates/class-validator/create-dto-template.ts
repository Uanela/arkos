import prismaSchemaParser from "../../../../../prisma/prisma-schema-parser";
import { PrismaField } from "../../../../../prisma/types";
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
  const nestedDtosUsed = new Set<string>();

  let dtoFields: string[] = [];

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
        const isOptional = field.isOptional || field.defaultValue !== undefined;
        const optionalDecorator = isOptional ? "  @IsOptional()\n" : "";
        const typeModifier = isTypeScript ? (isOptional ? "?" : "!") : "";

        validatorsUsed.add("IsOptional");
        validatorsUsed.add("ValidateNested");
        transformersUsed.add("Type");
        nestedDtosUsed.add("OnlyIdDto");

        dtoFields.push(
          `${optionalDecorator}  @ValidateNested()\n  @Type(() => OnlyIdDto)\n  ${field.name}${typeModifier}: OnlyIdDto;`
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

  const nestedDtoImports =
    nestedDtosUsed.size > 0
      ? `import { ${Array.from(nestedDtosUsed).join(", ")} } from "../../utils/dtos/only-id-dto";\n`
      : "";

  const validatorImports = `import { ${Array.from(validatorsUsed).join(", ")} } from "class-validator";\nimport { ${Array.from(transformersUsed).join(", ")} } from "class-transformer";\n`;

  return `${validatorImports}${nestedDtoImports}${enumImports}
export default class Create${modelName.pascal}Dto {
${dtoFields.join("\n\n")}
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

  if (isUserModule) {
    if (field.name === "email") {
      return ["@IsEmail()"];
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
      validators.push(`@IsNumber({}, ${arrayEach})`);
      break;
    case "Boolean":
      validators.push(`@IsBoolean(${arrayEach})`);
      break;
    case "DateTime":
      validators.push(`@IsDate(${arrayEach})`);
      break;
    case "BigInt":
      validators.push(`@IsNumber({}, ${arrayEach})`);
      break;
    case "Json":
      validators.push(`@IsObject(${arrayEach})`);
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
      return "any";
  }
}
