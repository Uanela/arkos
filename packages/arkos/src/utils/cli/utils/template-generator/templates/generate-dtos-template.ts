import { TemplateOptions } from "../../template-generators";
import { PrismaField } from "../../../../prisma/types";
import { kebabCase } from "../../../../helpers/change-case.helpers";
import { PrismaSchemaParser } from "../../../../prisma/prisma-schema-parser";

const TYPE_MAP: Record<string, { tsType: string; decorator: string }> = {
    String: { tsType: 'string', decorator: 'IsString' },
    Int: { tsType: 'number', decorator: 'IsInt' },
    Float: { tsType: 'number', decorator: 'IsNumber' },
    Boolean: { tsType: 'boolean', decorator: 'IsBoolean' },
    DateTime: { tsType: 'string', decorator: 'IsDateString' },
};

const CREATE_EXCLUDE = new Set(['id', 'createdAt', 'updatedAt', 'deletedAt']);

interface DtoTemplateOptions extends TemplateOptions {
    specificModel?: string;
}

export function generateDtoTemplate(options: DtoTemplateOptions): {
    createDto: string;
    updateDto: string;
    baseDto: string;
} {
    const { modelName, specificModel } = options;

    if (!modelName) {
        throw new Error("Model name is required for DTO template");
    }

    const prismaParser = new PrismaSchemaParser();
    const { models, enums } = prismaParser.parse()

    const enumMap = new Map<string, string[]>();
    enums.forEach(enumDef => {
        enumMap.set(enumDef.name, enumDef.values);
    });

    const targetModelName = specificModel || modelName.pascal;
    const targetModel = models.find(model => model.name === targetModelName);

    if (!targetModel) {
        const availableModels = models.map(m => m.name).join(', ');
        throw new Error(`Model '${targetModelName}' not found. Available models: ${availableModels}`);
    }

    console.log(`Processing model: ${targetModel.name}`);

    const relationFieldNames = new Set<string>();
    targetModel.fields.forEach(field => {
        if (field.isRelation) {
            relationFieldNames.add(field.name);
        }
    })

    console.log(`Relation fields found: ${Array.from(relationFieldNames)}`);

    const filteredFields = targetModel.fields.filter(field => {
        if (field.name.endsWith('Id') && !field.isRelation) {
            const relationName = field.name.slice(0, -2);
            const hasCorrespondingRelation = relationFieldNames.has(relationName);
            if (hasCorrespondingRelation) {
                console.log(`Filtering out redundant ID field: ${field.name} (has corresponding relation: ${relationName})`);
                return false;
            }
        }
        return true;
    });

    return {
        createDto: buildDto(targetModel.name, filteredFields, 'Create', enumMap, prismaParser),
        updateDto: buildDto(targetModel.name, filteredFields, 'Update', enumMap, prismaParser),
        baseDto: buildDto(targetModel.name, filteredFields, 'Base', enumMap, prismaParser),
    }

}

function buildDto(
    modelName: string,
    fields: PrismaField[],
    mode: 'Create' | 'Update' | 'Base',
    enumMap: Map<string, string[]>,
    prismaParser: PrismaSchemaParser
): string {
    const importValidator = new Set<string>(['IsOptional']);
    const importTypes: Set<string> = new Set();
    const lines: string[] = [];
    const className = mode === 'Base' ? `${modelName}Dto` : `${mode}${modelName}Dto`;

    const enumsUsed = new Set<string>();

    fields.forEach(field => {
        if (mode === 'Create' && CREATE_EXCLUDE.has(field.name)) return;

        if (prismaParser.isEnum(field.type)) {
            enumsUsed.add(field.type);
            importValidator.add('IsEnum');
        } else if (field.isRelation) {
            importValidator.add('ValidateNested');
            importValidator.add('IsNotEmpty');
            importTypes.add('Type');
        } else {
            const info = TYPE_MAP[field.type] || { tsType: 'any', decorator: 'IsOptional' };
            importValidator.add(info.decorator);
        }
    });

    // Generate imports
    const validatorImports = [...importValidator].filter(d => d !== 'Type');
    if (validatorImports.length > 0) {
        lines.push(`import { ${validatorImports.join(', ')}} from 'class-validator';`);
    }

    if (importTypes.has('Type')) {
        lines.push(`import { Type } from 'class-transformer';`);
    }

    const hasRelations = fields.some(f => f.isRelation && (mode !== 'Create' || !CREATE_EXCLUDE.has(f.name)));
    if (hasRelations) {
        lines.push(`import { Generic}`)
    }

    const relationTypes = new Set<string>();
    fields.forEach(field => {
        if (field.isRelation && (mode !== 'Create' || !CREATE_EXCLUDE.has(field.name))) {
            relationTypes.add(field.type);
        }
    });

    relationTypes.forEach(relationType => {
        const relationDtoName = mode == 'Base' ? `${relationType}Dto` : `${mode}${relationType}Dto`;
        const relationKebabName = kebabCase(relationType);
        const fileName = mode === 'Base' ? `${relationKebabName}.dto` : `${mode.toLowerCase()}-${relationKebabName}.dto`;

        lines.push(
            `// import ${relationDtoName} from '../../${relationKebabName}/dtos/${fileName}'; // Available for manual editing`
        );
    });

    lines.push('');


    // Generate enums defin
    enumsUsed.forEach(enumName => {
        const enumValues = enumMap.get(enumName) || [];
        lines.push(`enum ${enumName} {`);
        enumValues.forEach(value => {
            lines.push(`  ${value} = "${value}",`);
        });
        lines.push(`}`);
        lines.push('');
    });

    lines.push(`export defaul class ${className} {`);

    // Generate fields
    fields.forEach(field => {
        if (mode === 'Create' && CREATE_EXCLUDE.has(field.name)) return;

        const optional = mode === 'Update' || field.isOptional || field.isArray;

        if (field.isRelation) {
            if (!optional) lines.push('  @IsNotEmpty()');
            if (optional) lines.push('  @IsOptional()');

            const validationArg = field.isArray ? '{ each: true }' : '';
            lines.push(`  @ValidateNested(${validationArg})`);
            lines.push(`  @Type(() => GenericIdOnlyDto)`);

            const typeDecl = field.isArray ? 'GenericIdOnlyDto[]' : 'GenericIdOnlyDto';
            lines.push(`  ${field.name}${optional ? '?' : ''}: ${typeDecl};`);
        } else if (prismaParser.isEnum(field.type)) {
            if (optional) lines.push('  @IsOptional()');
            lines.push(`  @IsEnum(${field.type})`);
            const typeDecl = field.isArray ? `${field.type}[]` : field.type;
            lines.push(`  ${field.name}${optional ? '?' : ''}: ${typeDecl};`);
        } else {
            const info = TYPE_MAP[field.type] || { tsType: 'any', decorator: 'IsOptional' };
            if (optional) lines.push('  @IsOptional()');
            lines.push(`  @${info.decorator}()`);
            const typeDecl = field.isArray ? `${info.tsType}[]` : info.tsType;
            lines.push(`  ${field.name}${optional ? '?' : ''}: ${typeDecl};`);
        }

        lines.push('');
    });

    lines.push(`}`);
    return lines.join('\n');

}