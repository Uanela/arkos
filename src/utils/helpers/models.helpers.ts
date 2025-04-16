import path from "path";
import fs from "fs";
import {
  camelCase,
  kebabCase,
  pascalCase,
} from "../../utils/helpers/change-case.helpers";
import { userFileExtension } from "./fs.helpers";
import { importModule } from "./global.helpers";

export let prismaModelsModules: Record<
  string,
  Awaited<ReturnType<typeof importPrismaModelModules>>
> = {};

export function getModelModules(modelName: string) {
  return prismaModelsModules[kebabCase(modelName)];
}

export function getFileModelModulesFileStructure(modelName: string) {
  const kebabModelName = kebabCase(modelName).toLowerCase();
  const lowerModelName = kebabModelName.toLowerCase();
  const isAuthModule = modelName.toLowerCase() === "auth";

  return {
    core: {
      service: `${kebabModelName}.service.${userFileExtension}`,
      controller: `${kebabModelName}.controller.${userFileExtension}`,
      middlewares: `${kebabModelName}.middlewares.${userFileExtension}`,
      authConfigs: `${kebabModelName}.auth-configs.${userFileExtension}`,
      prismaQueryOptions: `${kebabModelName}.prisma-query-options.${userFileExtension}`,
      router: `${kebabModelName}.router.${userFileExtension}`,
    },
    dtos: isAuthModule
      ? {
          login: `login.dto.${userFileExtension}`,
          signup: `signup.dto.${userFileExtension}`,
          updateMe: `update-me.dto.${userFileExtension}`,
          updatePassword: `update-password.dto.${userFileExtension}`,
        }
      : {
          model: `${lowerModelName}.dto.${userFileExtension}`,
          create: `create-${lowerModelName}.dto.${userFileExtension}`,
          update: `update-${lowerModelName}.dto.${userFileExtension}`,
          query: `query-${lowerModelName}.dto.${userFileExtension}`,
        },
    schemas: isAuthModule
      ? {
          login: `login.schema.${userFileExtension}`,
          signup: `signup.schema.${userFileExtension}`,
          updateMe: `update-me.schema.${userFileExtension}`,
          updatePassword: `update-password.schema.${userFileExtension}`,
        }
      : {
          model: `${lowerModelName}.schema.${userFileExtension}`,
          create: `create-${lowerModelName}.schema.${userFileExtension}`,
          update: `update-${lowerModelName}.schema.${userFileExtension}`,
          query: `query-${lowerModelName}.schema.${userFileExtension}`,
        },
  };
}

export async function processSubdir(
  modelName: string,
  type: "dtos" | "schemas",
  result: Record<string, any>
) {
  const moduleDir = path.resolve(
    process.cwd(),
    "src",
    "modules",
    kebabCase(modelName)
  );

  const subdir = path.join(moduleDir, type);
  const pascalModelName = pascalCase(modelName);
  const fileStructure = getFileModelModulesFileStructure(modelName);
  const isAuthModule = modelName.toLowerCase() === "auth";

  // Skip if directory doesn't exist
  try {
    await fs.promises.access(subdir).catch(() => {
      return; // Directory doesn't exist
    });

    await Promise.all(
      Object.entries(fileStructure[type]).map(async ([key, fileName]) => {
        const filePath = path.join(subdir, fileName);
        try {
          const module = await import(filePath).catch(() => null);
          if (module) {
            if (isAuthModule) {
              // Auth module uses different naming conventions
              const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
              const expectedName = `${pascalKey}${
                type === "dtos" ? "Dto" : "Schema"
              }`;
              result[type][key] = module.default;
            } else {
              // Standard modules
              const expectedName =
                key === "model"
                  ? `${pascalModelName}${type === "dtos" ? "Dto" : "Schema"}`
                  : `${
                      key.charAt(0).toUpperCase() + key.slice(1)
                    }${pascalModelName}${type === "dtos" ? "Dto" : "Schema"}`;

              result[type][key] = module.default;
            }
          }
        } catch (error) {
          // Silent fail - file might not exist
        }
      })
    );
  } catch (error) {
    // Directory doesn't exist, continue silently
  }
}

/**
 * Dynamically imports model-specific modules for a given model with optimized file handling.
 * Includes special handling for the Auth module.
 *
 * @param {string} modelName - The name of the model (e.g., "User", "Post", "Auth").
 * @returns {Promise<Object>} An object containing the imported modules
 */
export async function importPrismaModelModules(
  modelName: string
): Promise<Record<string, any>> {
  const moduleDir = path.resolve(process.cwd(), "src", "modules", modelName);

  const result: {
    service?: any;
    controller?: any;
    middlewares?: any;
    authConfigs?: any;
    prismaQueryOptions?: any;
    router?: any;
    dtos: Record<string, any>;
    schemas: Record<string, any>;
  } = {
    dtos: {},
    schemas: {},
  };

  const fileStructure = getFileModelModulesFileStructure(modelName);
  // Batch process core files
  await Promise.all(
    Object.entries(fileStructure.core).map(async ([key, fileName]) => {
      const filePath = path.join(moduleDir, fileName);
      try {
        const module = await importModule(filePath).catch(() => null);
        if (module) {
          if (key === "middlewares") result[key] = module;
          else result[key as keyof typeof result] = module.default || module;
        }
      } catch {}
    })
  );

  await Promise.all([
    processSubdir(modelName, "dtos", result),
    processSubdir(modelName, "schemas", result),
  ]);

  // Cache the result
  prismaModelsModules[modelName] = result;

  return result;
}

export type ModelFieldDefition = {
  name: string;
  type: string;
  isUnique: boolean;
};

/**
 * Represents the structure of relation fields for Prisma models.
 * It includes both singular (one-to-one) and list (one-to-many) relationships.
 *
 * @typedef {Object} RelationFields
 * @property {Array<{name: string, type: string}>} singular - List of singular relationships.
 * @property {Array<{name: string, type: string}>} list - List of list relationships.
 */
export type RelationFields = {
  singular: Omit<ModelFieldDefition, "isUnique">[];
  list: Omit<ModelFieldDefition, "isUnique">[];
};

/**
 * Reads the Prisma schema files and extracts all model definitions,
 * identifying their relations (one-to-one and one-to-many).
 */
export const prismaModelRelationFields: Record<string, RelationFields> = {};

export function getAllPrismaFiles(dirPath: string, fileList: string[] = []) {
  const files = fs.readdirSync(dirPath);

  files?.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    // Skip migrations folder
    if (stat.isDirectory() && file !== "migrations") {
      fileList = getAllPrismaFiles(filePath, fileList);
    } else if (stat.isFile() && file.endsWith(".prisma")) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

const modelRegex = /model\s+(\w+)\s*{/g;
export const models: string[] = [];
export const prismaModelsUniqueFields: Record<string, ModelFieldDefition[]> =
  [] as any;

export function initializePrismaModels(testName?: string) {
  const prismaContent: string[] = [];

  const files = getAllPrismaFiles("./prisma");

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");

    if (!prismaContent.includes(content)) prismaContent.push(content);
  }

  const content = prismaContent
    .join("\n")
    .replace(modelRegex, (_, modelName) => {
      if (!models.includes(modelName)) models.push(camelCase(modelName.trim()));
      return `model ${modelName} {`;
    });

  for (const model of models) {
    const modelName = pascalCase(model);

    //   let modelFile;
    //   for (const file of files) {
    //     const filePath = path.join(file);
    //     const stats = fs.statSync(filePath);

    //     if (stats.isFile()) {
    //       const content = fs.readFileSync(filePath, "utf-8");
    //       prismaContent.push(content);
    //       if (content.includes(`model ${modelName} {`)) {
    //         modelFile = file;
    //         break;
    //       }
    //     }
    //   }

    //   if (!modelFile) {
    //     return;
    //   }

    //   const content = fs.readFileSync(path.join(modelFile), "utf-8");
    const modelStart = content.indexOf(`model ${modelName} {`);
    const modelEnd = content.indexOf("}", modelStart);
    const modelDefinition = content.slice(modelStart, modelEnd);

    const relations: RelationFields = {
      singular: [],
      list: [],
    };
    const lines = modelDefinition.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (
        !trimmedLine ||
        trimmedLine.startsWith("model") ||
        trimmedLine.startsWith("//")
      )
        continue;

      const [fieldName, type] = trimmedLine.split(/\s+/);
      const isUnique = trimmedLine.includes("@unique");

      if (isUnique) {
        const existingFields = prismaModelsUniqueFields[model] || [];

        const alreadyExists = existingFields.some(
          (field) =>
            field.name === fieldName &&
            field.type === type &&
            field.isUnique === isUnique
        );

        if (!alreadyExists) {
          prismaModelsUniqueFields[model] = [
            ...existingFields,
            { name: fieldName, type, isUnique },
          ];
        }
      }

      const cleanType = type?.replace("[]", "").replace("?", "");

      if (
        trimmedLine.includes("@relation") ||
        trimmedLine.match(/\s+\w+(\[\])?(\s+@|$)/) ||
        models.includes(camelCase(cleanType || ""))
      ) {
        const modelStart = content.indexOf(`enum ${cleanType} {`);

        if (
          !cleanType ||
          modelStart >= 0 ||
          cleanType === "String" ||
          cleanType === "Int" ||
          cleanType === "Float" ||
          cleanType === "Boolean" ||
          cleanType === "DateTime" ||
          cleanType === "Bytes" ||
          cleanType === "Decimal" ||
          cleanType === "BigInt" ||
          cleanType === "Json"
        ) {
          continue;
        }

        if (!type?.includes("[]")) {
          relations.singular.push({
            name: fieldName,
            type: cleanType,
          });
        } else {
          relations.list.push({
            name: fieldName,
            type: cleanType,
          });
        }
      }

      prismaModelRelationFields[modelName] = relations;
    }
  }
}

initializePrismaModels();

/**
 * Retrieves the relations for a given Prisma model.
 *
 * @param {string} modelName - The name of the model (e.g., "User").
 * @returns {RelationFields|undefined} The relation fields for the model, or `undefined` if no relations are found.
 */
export function getPrismaModelRelations(modelName: string) {
  modelName = pascalCase(modelName);

  if (!(modelName in prismaModelRelationFields)) return;
  return prismaModelRelationFields[modelName];
}

/**
 * Retrieves all the model names from the Prisma schema.
 *
 * @returns {string[]} An array of model names (e.g., ["User", "Post"]).
 */
function getModels() {
  return models;
}

/** Retuns a given model unique fields
 * @param {string} modelName - The name of model in PascalCase
 * @returns {string[]} An array of all unique fields,
 */
function getModelUniqueFields(modelName: string) {
  return prismaModelsUniqueFields[modelName];
}

export { getModels, getModelUniqueFields };
