import prismaSchemaParser from "../../../../prisma/prisma-schema-parser";
import { PrismaField, PrismaModel } from "../../../../prisma/types";
import { getUserFileExtension } from "../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../template-generators";

export class ClassValidatorDtoGenerator {
  private ensureCorrectOptions(options: TemplateOptions) {
    const { modelName } = options;
    if (!modelName) throw new Error("Module name is required for DTO template");
    const model = prismaSchemaParser.models.find(
      (m) => m.name.toLowerCase() === modelName.pascal.toLowerCase()
    );
    if (!model)
      throw new Error(`Model ${modelName.pascal} not found in Prisma schema`);
    return model;
  }

  generateCreateDto(options: TemplateOptions): string {
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
          const isOptional =
            field.isOptional || field.defaultValue !== undefined;
          const optionalDecorator = isOptional ? "  @IsOptional()\n" : "";
          const typeModifier = isTypeScript ? (isOptional ? "?" : "!") : "";

          if (isOptional) validatorsUsed.add("IsOptional");
          validatorsUsed.add("ValidateNested");
          transformersUsed.add("Type");

          const relationDtoName = `${referencedModel.name}ForCreate${modelName!.pascal}Dto`;

          const nestedDtoClass = this.generateNestedDtoClass(
            field,
            referencedModel,
            relationDtoName,
            validatorsUsed,
            enumsUsed,
            isTypeScript
          );

          if (!dtoFields.find((dtoField) => dtoField.includes(relationDtoName)))
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

      const { decorators, type } = this.generateClassValidatorField(
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
export default class Create${modelName!.pascal}Dto {
${dtoFields.join("\n\n")}
}`;
  }

  generateUpdateDto(options: TemplateOptions): string {
    const { modelName } = options;
    const model = this.ensureCorrectOptions(options);

    const ext = getUserFileExtension();
    const isTypeScript = ext === "ts";
    const restrictedFields = ["id", "createdAt", "updatedAt", "deletedAt"];
    const isUserModule = modelName!.kebab === "user";
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
          validatorsUsed.add("IsOptional");
          validatorsUsed.add("ValidateNested");
          transformersUsed.add("Type");

          const relationDtoName = `${referencedModel.name}ForUpdate${modelName!.pascal}Dto`;

          const nestedDtoClass = this.generateNestedDtoClass(
            field,
            referencedModel,
            relationDtoName,
            validatorsUsed,
            enumsUsed,
            isTypeScript
          );

          if (!dtoFields.find((dtoField) => dtoField.includes(relationDtoName)))
            nestedDtoClasses.push(nestedDtoClass);

          const typeModifier = isTypeScript ? "?" : "";
          dtoFields.push(
            `  @IsOptional()\n  @ValidateNested()\n  @Type(() => ${relationDtoName})\n  ${field.name}${typeModifier}: ${relationDtoName};`
          );
        }
        continue;
      }

      if (prismaSchemaParser.isEnum(field.type)) {
        enumsUsed.add(field.type);
      }

      const { decorators, type } = this.generateClassValidatorFieldForUpdate(
        field,
        isUserModule,
        validatorsUsed
      );
      const typeModifier = isTypeScript ? "?" : "";
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
export default class Update${modelName!.pascal}Dto {
${dtoFields.join("\n\n")}
}`;
  }

  generateBaseDto(options: TemplateOptions): string {
    const { modelName } = options;
    const model = this.ensureCorrectOptions(options);

    const ext = getUserFileExtension();
    const isTypeScript = ext === "ts";
    const isUserModule = modelName!.kebab === "user";
    const enumsUsed = new Set<string>();
    const validatorsUsed = new Set<string>();
    const transformersUsed = new Set<string>();

    let dtoFields: string[] = [];

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

      const { decorators, type } = this.generateClassValidatorField(
        field,
        isUserModule,
        validatorsUsed
      );
      const isOptional = field.isOptional;
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

    return `${validatorImports}${transformerImports}${enumImports}
export default class ${modelName!.pascal}Dto {
${dtoFields.join("\n\n")}
}`;
  }

  generateQueryDto(options: TemplateOptions): string {
    const { modelName } = options;
    const model = this.ensureCorrectOptions(options);

    const ext = getUserFileExtension();
    const isTypeScript = ext === "ts";
    const isUserModule = modelName!.kebab === "user";
    const enumsUsed = new Set<string>();
    const validatorsUsed = new Set<string>();
    const transformersUsed = new Set<string>();
    const filterClassesNeeded = new Set<string>();
    const nestedDtoClasses: string[] = [];
    const restrictedFields = ["id"];
    const timestampFields = [
      "createdAt",
      "updatedAt",
      "deletedAt",
      "created_at",
      "updated_at",
      "deleted_at",
    ];

    validatorsUsed.add("IsOptional");
    validatorsUsed.add("IsString");
    validatorsUsed.add("IsNumber");
    validatorsUsed.add("ValidateNested");
    transformersUsed.add("Type");
    transformersUsed.add("Transform");

    let dtoFields: string[] = [];
    let timestampDtoFields: string[] = [];
    const typeModifier = isTypeScript ? "?" : "";

    dtoFields.push(
      `  @IsOptional()\n  @IsNumber()\n  @Transform(({ value }) => (value ? Number(value) : undefined))\n  page${typeModifier}: number;`
    );
    dtoFields.push(
      `  @IsOptional()\n  @IsNumber()\n  @Transform(({ value }) => (value ? Number(value) : undefined))\n  limit${typeModifier}: number;`
    );
    dtoFields.push(
      `  @IsOptional()\n  @IsString()\n  @Type(() => String)\n  sort${typeModifier}: string;`
    );
    dtoFields.push(
      `  @IsOptional()\n  @IsString()\n  @Type(() => String)\n  fields${typeModifier}: string;`
    );

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
          validatorsUsed.add("ValidateNested");
          transformersUsed.add("Type");

          const relationDtoName = `${referencedModel.name}ForQuery${modelName!.pascal}Dto`;

          const nestedDtoClass = this.generateNestedDtoClass(
            field,
            referencedModel,
            relationDtoName,
            validatorsUsed,
            enumsUsed,
            isTypeScript
          );

          if (
            !dtoFields.find((dtoField) => dtoField.includes(relationDtoName)) &&
            !timestampDtoFields.find((dtoField) =>
              dtoField.includes(relationDtoName)
            )
          ) {
            nestedDtoClasses.push(nestedDtoClass);
          }

          const fieldDef = `  @IsOptional()\n  @ValidateNested()\n  @Type(() => ${relationDtoName})\n  ${field.name}${typeModifier}: ${relationDtoName};`;

          if (timestampFields.includes(field.name)) {
            timestampDtoFields.push(fieldDef);
          } else {
            dtoFields.push(fieldDef);
          }
        }
        continue;
      }

      if (prismaSchemaParser.isEnum(field.type)) {
        enumsUsed.add(field.type);
        validatorsUsed.add("IsEnum");

        const enumType = field.type;
        const fieldDef = `  @IsOptional()\n  @IsEnum(${enumType})\n  ${field.name}${typeModifier}: ${enumType};`;

        if (timestampFields.includes(field.name)) {
          timestampDtoFields.push(fieldDef);
        } else {
          dtoFields.push(fieldDef);
        }
        continue;
      }

      if (field.type === "Boolean") {
        validatorsUsed.add("IsBoolean");

        const fieldDef = `  @IsOptional()\n  @IsBoolean()\n  ${field.name}${typeModifier}: boolean;`;

        if (timestampFields.includes(field.name)) {
          timestampDtoFields.push(fieldDef);
        } else {
          dtoFields.push(fieldDef);
        }
        continue;
      }

      const filterType = this.getFilterTypeForField(field, enumsUsed);
      if (filterType) {
        filterClassesNeeded.add(filterType);
        const fieldDef = `  @IsOptional()\n  @ValidateNested()\n  @Type(() => ${filterType})\n  ${field.name}${typeModifier}: ${filterType};`;

        if (timestampFields.includes(field.name)) {
          timestampDtoFields.push(fieldDef);
        } else {
          dtoFields.push(fieldDef);
        }
      }
    }

    if (filterClassesNeeded.has("StringFilter")) {
      validatorsUsed.add("IsString");
    }
    if (filterClassesNeeded.has("NumberFilter")) {
      validatorsUsed.add("IsNumber");
    }
    if (filterClassesNeeded.has("DateTimeFilter")) {
      validatorsUsed.add("IsString");
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

    const filterClasses = this.generateFilterClasses(
      filterClassesNeeded,
      enumsUsed,
      validatorsUsed,
      isTypeScript
    );

    const filterClassesSection = filterClasses ? `\n${filterClasses}\n` : "";

    const nestedDtoSection =
      nestedDtoClasses.length > 0 ? `\n${nestedDtoClasses.join("\n\n")}\n` : "";

    const allFields = [...dtoFields, ...timestampDtoFields];

    return `${validatorImports}${transformerImports}${enumImports}${filterClassesSection}${nestedDtoSection}
export default class ${modelName!.pascal}QueryDto {
${allFields.join("\n\n")}
}`;
  }

  private getFilterTypeForField(
    field: PrismaField,
    enumsUsed: Set<string>
  ): string | null {
    if (prismaSchemaParser.isEnum(field.type)) {
      enumsUsed.add(field.type);
      return `${field.type}Filter`;
    }

    switch (field.type) {
      case "String":
        return "StringFilter";
      case "Int":
      case "Float":
      case "Decimal":
      case "BigInt":
        return "NumberFilter";
      case "DateTime":
        return "DateTimeFilter";
      default:
        return null;
    }
  }

  private generateFilterClasses(
    filterClassesNeeded: Set<string>,
    _: Set<string>,
    _1: Set<string>,
    isTypeScript: boolean
  ): string {
    const classes: string[] = [];
    const typeModifier = isTypeScript ? "?" : "";

    if (filterClassesNeeded.has("StringFilter")) {
      classes.push(`class StringFilter {
  @IsOptional()
  @IsString()
  @Type(() => String)
  icontains${typeModifier}: string;
}`);
    }

    if (filterClassesNeeded.has("NumberFilter")) {
      classes.push(`class NumberFilter {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  equals${typeModifier}: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  gte${typeModifier}: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  lte${typeModifier}: number;
}`);
    }

    if (filterClassesNeeded.has("DateTimeFilter")) {
      classes.push(`class DateTimeFilter {
  @IsOptional()
  @IsString()
  @Type(() => String)
  equals${typeModifier}: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  gte${typeModifier}: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  lte${typeModifier}: string;
}`);
    }

    return classes.join("\n\n");
  }

  private generateNestedDtoClass(
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

      const { decorators, type } = this.generateClassValidatorField(
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

  private generateClassValidatorField(
    field: PrismaField,
    isUserModule: boolean,
    validatorsUsed: Set<string>
  ): { decorators: string; type: string } {
    let decorators: string[] = [];
    let type = this.mapPrismaTypeToTS(field.type);

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
      const fieldValidators = this.getValidatorsForType(field, isUserModule);
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

  private generateClassValidatorFieldForUpdate(
    field: PrismaField,
    isUserModule: boolean,
    validatorsUsed: Set<string>
  ): { decorators: string; type: string } {
    let decorators: string[] = [];
    let type = this.mapPrismaTypeToTS(field.type);

    decorators.push("@IsOptional()");
    validatorsUsed.add("IsOptional");

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
      const fieldValidators = this.getValidatorsForType(field, isUserModule);
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

  private getValidatorsForType(
    field: PrismaField,
    isUserModule: boolean
  ): string[] {
    const validators: string[] = [];
    const arrayEach = field.isArray ? "{ each: true }" : "";

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
        validators.push(`@IsNumber(${arrayEach})`);
        break;
      case "Boolean":
        validators.push(`@IsBoolean(${arrayEach})`);
        break;
      case "DateTime":
        validators.push(`@IsDate(${arrayEach})`);
        break;
      case "BigInt":
        validators.push(`@IsNumber(${arrayEach})`);
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

  private mapPrismaTypeToTS(prismaType: string): string {
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
        return prismaSchemaParser.isEnum(prismaType) ? prismaType : "any";
    }
  }
}

const classValidatorDtoGenerator = new ClassValidatorDtoGenerator();

export default classValidatorDtoGenerator;
