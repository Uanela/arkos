import path from "path";
import fs from "fs";
import {
  camelCase,
  kebabCase,
  pascalCase,
} from "../../utils/helpers/change-case.helpers";
import { crd, getUserFileExtension } from "./fs.helpers";
import { importModule } from "./global.helpers";
import { AuthConfigs } from "../../types/auth";
import { killServerChildProcess } from "../cli/utils/cli.helpers";
import { ArkosConfig } from "../../exports";
import sheu from "../sheu";

type ModeModules = Awaited<ReturnType<typeof importPrismaModelModules>>;

// Must be exported to not cause problems on cjs
let prismaModelsModules: Record<string, ModeModules> = {};

export function setModelModules(modelName: string, modules: ModeModules) {
  prismaModelsModules[kebabCase(modelName)] = modules;
}

export function getModelModules(modelName: string) {
  return prismaModelsModules[kebabCase(modelName)];
}

/**
 * To be reused on other part of code for correct typing
 *
 * @param key
 * @param fileName
 * @param result
 */
export type ValidationFileMappingKey = keyof ReturnType<
  typeof getFileModelModulesFileStructure
>["dtos"];

export function getFileModelModulesFileStructure(modelName: string) {
  const kebabModelName = kebabCase(modelName).toLowerCase();
  const isAuthModule = modelName.toLowerCase() === "auth";
  const ext = getUserFileExtension();

  return {
    core: {
      service: `${kebabModelName}.service.${ext}`,
      controller: `${kebabModelName}.controller.${ext}`,
      middlewares: `${kebabModelName}.middlewares.${ext}`,
      authConfigs: `${kebabModelName}.auth-configs.${ext}`,
      authConfigsNew: `${kebabModelName}.auth.${ext}`,
      prismaQueryOptions: `${kebabModelName}.prisma-query-options.${ext}`,
      prismaQueryOptionsNew: `${kebabModelName}.query.${ext}`,
      router: `${kebabModelName}.router.${ext}`,
    },
    dtos: isAuthModule
      ? {
          login: `login.dto.${ext}`,
          signup: `signup.dto.${ext}`,
          getMe: `get-me.dto.${ext}`,
          updateMe: `update-me.dto.${ext}`,
          updatePassword: `update-password.dto.${ext}`,
        }
      : {
          model: `${kebabModelName}.dto.${ext}`,
          create: `create-${kebabModelName}.dto.${ext}`,
          createOne: `create-${kebabModelName}.dto.${ext}`, // just for sake of completion and reusability around other parts of code
          createMany: `create-many-${kebabModelName}.dto.${ext}`,
          update: `update-${kebabModelName}.dto.${ext}`,
          updateOne: `update-${kebabModelName}.dto.${ext}`, // same as createOne
          updateMany: `update-many-${kebabModelName}.dto.${ext}`,
          query: `query-${kebabModelName}.dto.${ext}`,
          // looking for some better naming convetion
          findOne: `find-one-${kebabModelName}.dto.${ext}`,
          findMany: `find-many-${kebabModelName}.dto.${ext}`,
        },
    schemas: isAuthModule
      ? {
          login: `login.schema.${ext}`,
          signup: `signup.schema.${ext}`,
          getMe: `get-me.schema.${ext}`,
          updateMe: `update-me.schema.${ext}`,
          updatePassword: `update-password.schema.${ext}`,
        }
      : {
          model: `${kebabModelName}.schema.${ext}`,
          create: `create-${kebabModelName}.schema.${ext}`,
          createOne: `create-${kebabModelName}.schema.${ext}`,
          createMany: `create-many-${kebabModelName}.schema.${ext}`, // just for sake of completion and reusability around other parts of code
          update: `update-${kebabModelName}.schema.${ext}`,
          updateOne: `update-${kebabModelName}.schema.${ext}`, // same as createOne
          updateMany: `update-many-${kebabModelName}.schema.${ext}`,
          query: `query-${kebabModelName}.schema.${ext}`,
          // looking for some better naming convetion
          findOne: `find-one-${kebabModelName}.schema.${ext}`,
          findMany: `find-many-${kebabModelName}.schema.${ext}`,
        },
  };
}

export async function processSubdir(
  modelName: string,
  type: "dtos" | "schemas"
) {
  const moduleDir = path.resolve(crd(), "src", "modules", kebabCase(modelName));

  const subdir = path.join(moduleDir, type);
  const fileStructure = getFileModelModulesFileStructure(modelName);
  const result: Record<string, any> = {};

  // Skip if directory doesn't exist
  try {
    await fs.promises.access(subdir).catch(() => {
      return; // Directory doesn't exist
    });

    await Promise.all(
      Object.entries(fileStructure[type]).map(async ([key, fileName]) => {
        const filePath = path.join(subdir, fileName);
        try {
          const module = await importModule(filePath).catch((err) => {
            if (!err.message.includes("Cannot find module")) {
              sheu.error(`Failed to import ${fileName}:`);
              console.error(err);
              killServerChildProcess();
              process.exit(1);
            }
          });

          if (module) result[key] = module.default;
        } catch (error) {
          // Silent fail - file might not exist
          console.error(error);
        }
      })
    );
  } catch (error) {
    // Directory doesn't exist, continue silently
    console.error(error);
  }

  return result;
}

type importPrismaModelModulesReturnType = {
  service?: any;
  controller?: any;
  middlewares?: any;
  authConfigs?: AuthConfigs;
  authConfigsNew?: AuthConfigs;
  prismaQueryOptions?: any;
  prismaQueryOptionsNew?: any;
  router?: any;
  dtos?: Record<string, any>;
  schemas?: Record<string, any>;
};

/**
 * Validates naming convention conflicts for prismaQueryOptions and authConfigs
 * @param {string} key - The current file key being processed
 * @param {string} fileName - The filename being imported
 * @param {importPrismaModelModulesReturnType} result - The current result object
 * @throws {Error} When conflicting naming conventions are detected
 */
export function validateNamingConventions(
  key: string,
  fileName: string,
  result: importPrismaModelModulesReturnType
): void {
  if (key === "prismaQueryOptions") {
    if (result.prismaQueryOptions) {
      killServerChildProcess();
      throw new Error(
        `\n Cannot use both ${fileName} and ${fileName.replace(
          "prisma-query-options",
          "query"
        )} at once, please choose only one name convention. \n`
      );
    }
  } else if (key === "prismaQueryOptionsNew") {
    if (result.prismaQueryOptions) {
      killServerChildProcess();
      throw new Error(
        `\n Cannot use both ${fileName} and ${fileName.replace(
          "query",
          "prisma-query-options"
        )} at once, please choose only one name convention. \n`
      );
    }
  } else if (key === "authConfigs") {
    if (result.authConfigs) {
      killServerChildProcess();
      throw new Error(
        `\n Cannot use both ${fileName} and ${fileName.replace(
          "auth-configs",
          "auth"
        )} at once, please choose only one name convention. \n`
      );
    }
  } else if (key === "authConfigsNew") {
    if (result.authConfigs) {
      killServerChildProcess();
      throw new Error(
        `\n Cannot use both ${fileName} and ${fileName.replace(
          "auth",
          "auth-configs"
        )} at once, please choose only one name convention. \n`
      );
    }
  }
}

/**
 * Processes and assigns module to the result object based on the key
 * @param {string} key - The file key being processed
 * @param {any} module - The imported module
 * @param {importPrismaModelModulesReturnType} result - The result object to modify
 */
export function assignModuleToResult(
  key: string,
  module: any,
  result: importPrismaModelModulesReturnType
): void {
  if (key === "prismaQueryOptions" || key === "prismaQueryOptionsNew") {
    result.prismaQueryOptions = module.default || module;
  } else if (key === "authConfigs" || key === "authConfigsNew") {
    result.authConfigs = module.default || module;
  } else if (key === "middlewares" || key === "router") {
    result[key] = module;
  } else {
    result[key as keyof typeof result] = module.default || module;
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
  modelName: string,
  arkosConfig: ArkosConfig
): Promise<importPrismaModelModulesReturnType> {
  const moduleDir = path.resolve(crd(), "src", "modules", kebabCase(modelName));

  const result: importPrismaModelModulesReturnType = {
    dtos: {},
    schemas: {},
  };

  if (getModelModules(modelName)) return getModelModules(modelName);

  const fileStructure = getFileModelModulesFileStructure(modelName);

  // Batch process core files
  await Promise.all(
    Object.entries(fileStructure.core).map(async ([key, fileName]) => {
      const filePath = path.join(moduleDir, fileName);
      try {
        const module = await importModule(filePath).catch((err) => {
          if (!err.message.includes("Cannot find module")) {
            sheu.error(`Failed to import ${fileName}:`);
            console.error(err);
            killServerChildProcess();
            process.exit(1);
          }
        });

        if (module) {
          // Validate naming conventions before assignment
          validateNamingConventions(key, fileName, result);

          // Assign module to result
          assignModuleToResult(key, module, result);
        }
      } catch (err: any) {
        if (err.message.includes("Cannot use both")) throw err;
        console.error(err);
        killServerChildProcess();
      }
    })
  );

  const validationSubdir = arkosConfig.validation?.resolver
    ? arkosConfig.validation.resolver === "zod"
      ? "schemas"
      : "dtos"
    : null;

  let validators = {};
  if (validationSubdir)
    validators = await processSubdir(modelName, validationSubdir);

  prismaModelsModules[modelName] = {
    ...result,
    ...(validationSubdir && { [validationSubdir]: validators }),
  };

  return {
    ...result,
    ...(validationSubdir && { [validationSubdir]: validators }),
  };
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
export let prismaSchemasContent: string;
export const prismaModelsUniqueFields: Record<string, ModelFieldDefition[]> =
  [] as any;

export function initializePrismaModels() {
  const copiedContent = getPrismaSchemasContent();

  for (const model of models) {
    const modelName = pascalCase(model);

    const modelStart = copiedContent.indexOf(`model ${modelName} {`);
    const modelEnd = copiedContent.indexOf("}", modelStart);
    const modelDefinition = copiedContent.slice(modelStart, modelEnd);

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
        trimmedLine.startsWith("//") ||
        trimmedLine.startsWith("/*")
      )
        continue;

      const [fieldName, type] = trimmedLine.split(/\s+/);
      const isUnique = trimmedLine?.includes?.("@unique");

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
        trimmedLine?.includes?.("@relation") ||
        trimmedLine.match(/\s+\w+(\[\])?(\s+@|$)/) ||
        models?.includes?.(camelCase(cleanType || ""))
      ) {
        const enumStart = copiedContent.indexOf(`enum ${cleanType} {`);
        const typeStart = copiedContent.indexOf(`type ${cleanType} {`);

        if (
          !cleanType ||
          enumStart >= 0 ||
          typeStart >= 0 ||
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

        if (!type?.includes?.("[]")) {
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

/**
 * Retrieves the relations for a given Prisma model.
 *
 * @param {string} modelName - The name of the model (e.g., "User").
 * @returns {RelationFields|undefined} The relation fields for the model, or `undefined` if no relations are found.
 */
export function getPrismaModelRelations(
  modelName: string
): RelationFields | undefined {
  modelName = pascalCase(modelName);

  if (!(modelName in prismaModelRelationFields)) return;
  return prismaModelRelationFields[modelName];
}

/**
 * Retrieves all the model names from the Prisma schema.
 *
 * @returns {string[]} An array of model names (e.g., ["User", "Post"]).
 */
function getModels(): string[] {
  return models;
}

/**
 * Returns all content of all .prisma files gathered together
 *
 * @returns {string}
 */
export function getPrismaSchemasContent(): string {
  if (prismaSchemasContent) return prismaSchemasContent;

  const prismaContent: string[] = [];

  const files = getAllPrismaFiles("./prisma");

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    if (!prismaContent?.includes?.(content)) prismaContent.push(content);
  }

  // Gather the content of all *.prisma files into single one
  const content = prismaContent
    .join("\n")
    .replace(modelRegex, (_, modelName) => {
      if (!models?.includes?.(modelName))
        models.push(camelCase(modelName.trim()));
      return `model ${modelName} {`;
    });

  return content;
}

/** Retuns a given model unique fields
 * @param {string} modelName - The name of model in PascalCase
 * @returns {string[]} An array of all unique fields,
 */
function getModelUniqueFields(modelName: string): ModelFieldDefition[] {
  return prismaModelsUniqueFields[modelName];
}

/**
 * Helps in finding out whether a given dto/schema file exits under the user project according to the validation arkos configuration.
 *
 * @param action {ValidationFileMappingKey} - the action of the dto, e.g: create, findMany.
 * @param modelName {string} - the model to be checked
 * @param arkosConfig {ArkosConfig} - the arkos.js configuration
 * @returns boolean
 */
export async function localValidatorFileExists(
  action: ValidationFileMappingKey,
  modelName: string,
  arkosConfig: ArkosConfig
) {
  const modelModules = await importPrismaModelModules(modelName, arkosConfig);

  return !!modelModules?.[
    arkosConfig.validation?.resolver === "zod" ? "schemas" : "dtos"
  ]?.[camelCase(action)];
}

export { getModels, getModelUniqueFields };
