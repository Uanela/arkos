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
          // ALL relations are optional in update DTO
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
      // ALL fields are optional in update DTO
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
      // Skip password field in base DTO for user module (sensitive data)
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
    const relationFilterClasses: string[] = [];

    validatorsUsed.add("IsOptional");
    validatorsUsed.add("ValidateNested");
    transformersUsed.add("Type");

    let dtoFields: string[] = [];

    for (const field of model.fields) {
      // Skip password field in query DTO for user module
      if (isUserModule && field.name === "password") {
        continue;
      }

      // Skip relation array fields and restricted fields
      if (field.isRelation) {
        if (field.isArray) continue; // Skip array relations for now

        // Single relation - create a relation filter
        const referencedModel = prismaSchemaParser.models.find(
          (m) => m.name === field.type
        );

        if (referencedModel) {
          const relationFilterName = `${referencedModel.name}RelationFilter`;

          // Generate relation filter class
          const relationFilterClass = this.generateRelationFilterClass(
            referencedModel,
            relationFilterName,
            validatorsUsed,
            transformersUsed,
            enumsUsed,
            filterClassesNeeded,
            isTypeScript
          );
          relationFilterClasses.push(relationFilterClass);

          const typeModifier = isTypeScript ? "?" : "";
          dtoFields.push(
            `  @IsOptional()\n  @ValidateNested()\n  @Type(() => ${relationFilterName})\n  ${field.name}${typeModifier}: ${relationFilterName};`
          );
        }
        continue;
      }

      // Regular fields get filter types
      const filterType = this.getFilterTypeForField(field, enumsUsed);
      if (filterType) {
        filterClassesNeeded.add(filterType);
        const typeModifier = isTypeScript ? "?" : "";
        dtoFields.push(
          `  @IsOptional()\n  @ValidateNested()\n  @Type(() => ${filterType})\n  ${field.name}${typeModifier}: ${filterType};`
        );
      }
    }

    // Add all validators used by filter classes
    if (filterClassesNeeded.has("StringFilter")) {
      validatorsUsed.add("IsString");
      validatorsUsed.add("IsArray");
    }
    if (filterClassesNeeded.has("NumberFilter")) {
      validatorsUsed.add("IsNumber");
      validatorsUsed.add("IsArray");
    }
    if (filterClassesNeeded.has("BooleanFilter")) {
      validatorsUsed.add("IsBoolean");
    }
    if (filterClassesNeeded.has("DateTimeFilter")) {
      validatorsUsed.add("IsString");
    }
    // Add IsEnum and IsArray for enum filters
    for (const enumName of enumsUsed) {
      if (filterClassesNeeded.has(`${enumName}Filter`)) {
        validatorsUsed.add("IsEnum");
        validatorsUsed.add("IsArray");
      }
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

    // Generate filter classes
    const filterClasses = this.generateFilterClasses(
      filterClassesNeeded,
      enumsUsed,
      validatorsUsed,
      isTypeScript
    );

    const filterClassesSection = filterClasses ? `\n${filterClasses}\n` : "";

    const relationFilterSection =
      relationFilterClasses.length > 0
        ? `\n${relationFilterClasses.join("\n\n")}\n`
        : "";

    return `${validatorImports}${transformerImports}${enumImports}${filterClassesSection}${relationFilterSection}
export default class ${modelName!.pascal}QueryDto {
${dtoFields.join("\n\n")}
}`;
  }

  private generateRelationFilterClass(
    model: PrismaModel,
    className: string,
    validatorsUsed: Set<string>,
    transformersUsed: Set<string>,
    enumsUsed: Set<string>,
    filterClassesNeeded: Set<string>,
    isTypeScript: boolean
  ): string {
    const fields: string[] = [];
    const isUserModel = model.name.toLowerCase() === "user";

    for (const field of model.fields) {
      // Skip password field for user model
      if (isUserModel && field.name === "password") {
        continue;
      }

      // Skip relations in relation filters (only single level)
      if (field.isRelation) continue;

      const filterType = this.getFilterTypeForField(field, enumsUsed);
      if (filterType) {
        filterClassesNeeded.add(filterType);
        const typeModifier = isTypeScript ? "?" : "";
        fields.push(
          `  @IsOptional()\n  @ValidateNested()\n  @Type(() => ${filterType})\n  ${field.name}${typeModifier}: ${filterType};`
        );
      }
    }

    return `class ${className} {
${fields.join("\n\n")}
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
      case "Boolean":
        return "BooleanFilter";
      case "DateTime":
        return "DateTimeFilter";
      default:
        return null;
    }
  }

  private generateFilterClasses(
    filterClassesNeeded: Set<string>,
    enumsUsed: Set<string>,
    validatorsUsed: Set<string>,
    isTypeScript: boolean
  ): string {
    const classes: string[] = [];
    const typeModifier = isTypeScript ? "?" : "";

    if (filterClassesNeeded.has("StringFilter")) {
      classes.push(`class StringFilter {
  @IsOptional()
  @IsString()
  contains${typeModifier}: string;

  @IsOptional()
  @IsString()
  icontains${typeModifier}: string;

  @IsOptional()
  @IsString()
  equals${typeModifier}: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  in${typeModifier}: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notIn${typeModifier}: string[];
}`);
    }

    if (filterClassesNeeded.has("NumberFilter")) {
      classes.push(`class NumberFilter {
  @IsOptional()
  @IsNumber()
  equals${typeModifier}: number;

  @IsOptional()
  @IsNumber()
  gte${typeModifier}: number;

  @IsOptional()
  @IsNumber()
  lte${typeModifier}: number;

  @IsOptional()
  @IsNumber()
  gt${typeModifier}: number;

  @IsOptional()
  @IsNumber()
  lt${typeModifier}: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  in${typeModifier}: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  notIn${typeModifier}: number[];
}`);
    }

    if (filterClassesNeeded.has("BooleanFilter")) {
      classes.push(`class BooleanFilter {
  @IsOptional()
  @IsBoolean()
  equals${typeModifier}: boolean;
}`);
    }

    if (filterClassesNeeded.has("DateTimeFilter")) {
      classes.push(`class DateTimeFilter {
  @IsOptional()
  @IsString()
  equals${typeModifier}: string;

  @IsOptional()
  @IsString()
  gte${typeModifier}: string;

  @IsOptional()
  @IsString()
  lte${typeModifier}: string;

  @IsOptional()
  @IsString()
  gt${typeModifier}: string;

  @IsOptional()
  @IsString()
  lt${typeModifier}: string;
}`);
    }

    // Generate enum filters
    for (const enumName of enumsUsed) {
      if (filterClassesNeeded.has(`${enumName}Filter`)) {
        classes.push(`class ${enumName}Filter {
  @IsOptional()
  @IsEnum(${enumName})
  equals${typeModifier}: ${enumName};

  @IsOptional()
  @IsArray()
  @IsEnum(${enumName}, { each: true })
  in${typeModifier}: ${enumName}[];

  @IsOptional()
  @IsArray()
  @IsEnum(${enumName}, { each: true })
  notIn${typeModifier}: ${enumName}[];
}`);
      }
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

    // ALL fields in update DTO are optional
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

    // User module special cases
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
