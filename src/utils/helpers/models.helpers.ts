import { ROOT_DIR } from "../../paths";
import path from "path";
import fs from "fs";
import { camelCase, kebabCase, pascalCase } from "change-case-all";
import arkosEnv from "../arkos-env";
import { extension } from "./fs.helpers";

const globalPrismaModelsModules: Record<string, any> = {};

export function getModelModules(modelName: string, caller: string) {
  console.log(globalPrismaModelsModules, "getModelModules", caller);
  return globalPrismaModelsModules[kebabCase(modelName)];
}

/**
 * Dynamically imports model-specific modules like middlewares, auth configurations,
 * prisma query options, and DTOs for a given model.
 *
 * @param {string} modelName - The name of the model (e.g., "User", "Post").
 * @returns {Promise<Object>} An object containing the imported modules: `middlewares`, `authConfigs`, `prismaQueryOptions`, and `dtos`.
 */
export async function importPrismaModelModules(modelName: string) {
  const kebabModelName = kebabCase(modelName);
  const lowerModelName = modelName.toLowerCase();

  const moduleDir = path.resolve(process.cwd(), "src", "modules", modelName);
  const dtosDir = path.join(moduleDir, "dtos");

  const middlewaresFile = path.join(
    moduleDir,
    `${kebabModelName}.middlewares.${extension}`
  );
  const authConfigsFile = path.join(
    moduleDir,
    `${kebabModelName}.auth-configs.${extension}`
  );
  const prismaQueryOptionsFile = path.join(
    moduleDir,
    `${kebabModelName}.prisma-query-options.${extension}`
  );

  // Define DTO file paths
  const modelDtoFile = path.join(dtosDir, `${lowerModelName}.dto.${extension}`);
  const createDtoFile = path.join(
    dtosDir,
    `create-${lowerModelName}.dto.${extension}`
  );
  const updateDtoFile = path.join(
    dtosDir,
    `update-${lowerModelName}.dto.${extension}`
  );
  const queryDtoFile = path.join(
    dtosDir,
    `query-${lowerModelName}.dto.${extension}`
  );

  const result: {
    middlewares?: any;
    authConfigs?: any;
    prismaQueryOptions?: any;
    dtos: {
      create?: any;
      update?: any;
      query?: any;
      model?: any;
    };
  } = {
    dtos: {},
  };

  try {
    if (fs.existsSync(middlewaresFile)) {
      const middlewareModule = await import(middlewaresFile);
      result.middlewares = middlewareModule;
    }
  } catch (error) {
    console.error(
      `Error importing middlewares for model "${modelName}":`,
      error
    );
  }

  try {
    if (fs.existsSync(authConfigsFile)) {
      const authConfigsModule = await import(authConfigsFile);
      result.authConfigs = authConfigsModule.default || authConfigsModule;
    }
  } catch (error) {
    console.error(
      `Error importing auth configs for model "${modelName}":`,
      error
    );
  }

  try {
    if (fs.existsSync(prismaQueryOptionsFile)) {
      const prismaQueryOptionsModule = await import(prismaQueryOptionsFile);
      result.prismaQueryOptions =
        prismaQueryOptionsModule.default || prismaQueryOptionsModule;
    }
  } catch (error) {
    console.error(
      `Error importing prisma query options for model "${modelName}":`,
      error
    );
  }

  // Import DTOs
  const pascalModelName = pascalCase(modelName);
  try {
    if (fs.existsSync(modelDtoFile)) {
      const modelDtoModule = await import(modelDtoFile);
      result.dtos.model =
        modelDtoModule.default || modelDtoModule[`${pascalModelName}Dto`];
    }
  } catch (error) {
    console.error(
      `Error importing model main DTO for model "${modelName}":`,
      error
    );
  }

  try {
    if (fs.existsSync(createDtoFile)) {
      const createDtoModule = await import(createDtoFile);
      result.dtos.create =
        createDtoModule.default ||
        createDtoModule[`Create${pascalModelName}Dto`];
    }
  } catch (error) {
    console.error(
      `Error importing create DTO for model "${modelName}":`,
      error
    );
  }

  try {
    if (fs.existsSync(updateDtoFile)) {
      const updateDtoModule = await import(updateDtoFile);
      result.dtos.update =
        updateDtoModule.default ||
        updateDtoModule[`Update${pascalModelName}Dto`];
    }
  } catch (error) {
    console.error(
      `Error importing update DTO for model "${modelName}":`,
      error
    );
  }

  try {
    if (fs.existsSync(queryDtoFile)) {
      const queryDtoModule = await import(queryDtoFile);
      result.dtos.query =
        queryDtoModule.default || queryDtoModule[`Query${pascalModelName}Dto`];
    }
  } catch (error) {
    console.error(`Error importing query DTO for model "${modelName}":`, error);
  }

  globalPrismaModelsModules[modelName] = result;
  console.log("importPrismaModules", result);
  return result;
}

/**
 * Represents the structure of relation fields for Prisma models.
 * It includes both singular (one-to-one) and list (one-to-many) relationships.
 *
 * @typedef {Object} RelationFields
 * @property {Array<{name: string, type: string}>} singular - List of singular relationships.
 * @property {Array<{name: string, type: string}>} list - List of list relationships.
 */
export type RelationFields = {
  singular: { name: string; type: string }[];
  list: { name: string; type: string }[];
};

const schemaFolderPath =
  process.env.PRISMA_SCHEMA_PATH || arkosEnv.PRISMA_SCHEMA_PATH;

/**
 * Reads the Prisma schema files and extracts all model definitions,
 * identifying their relations (one-to-one and one-to-many).
 */
const prismaModelRelationFields: Record<string, RelationFields> = {};

const prismaContent = [];

const files = fs
  .readdirSync(schemaFolderPath)
  .filter((file) => file.endsWith(".prisma"));

for (const file of files) {
  const filePath = path.join(schemaFolderPath, file);
  const stats = fs.statSync(filePath);

  if (stats.isFile()) {
    const content = fs.readFileSync(filePath, "utf-8");
    prismaContent.push(content);
  }
}

const modelRegex = /model\s+(\w+)\s*{/g;
const models: string[] = [];

prismaContent.join("\n").replace(modelRegex, (_, modelName) => {
  if (!models.includes(modelName)) models.push(camelCase(modelName.trim()));
  return modelName;
});

for (const model of models) {
  const modelName = pascalCase(model);

  let modelFile;
  for (const file of files) {
    const filePath = path.join(schemaFolderPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile()) {
      const content = fs.readFileSync(filePath, "utf-8");
      prismaContent.push(content);
      if (content.includes(`model ${modelName} {`)) {
        modelFile = file;
        break;
      }
    }
  }

  if (!modelFile) {
    throw new Error(`Model ${modelName} not found`);
  }

  const content = fs.readFileSync(
    path.join(schemaFolderPath, modelFile),
    "utf-8"
  );

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

    if (!trimmedLine || trimmedLine.startsWith("model")) continue;

    const [fieldName, type] = trimmedLine.split(/\s+/);
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
        relations.singular.push({ name: fieldName, type: cleanType });
      } else {
        relations.list.push({ name: fieldName, type: cleanType });
      }
    }

    prismaModelRelationFields[modelName] = relations;
  }
}

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

export { models, getModels, prismaModelRelationFields };
