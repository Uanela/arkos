import path from "path";
import fs from "fs";
import {
  camelCase,
  kebabCase,
  pascalCase,
} from "../../utils/helpers/change-case.helpers";
import arkosEnv from "../arkos-env";
import { userFileExtension } from "./fs.helpers";

export let prismaModelsModules: Record<
  string,
  Awaited<ReturnType<typeof importPrismaModelModules>>
> = {};

export function getModelModules(modelName: string) {
  return prismaModelsModules[kebabCase(modelName)];
}

// /**
//  * Dynamically imports model-specific modules like middlewares, auth configurations,
//  * prisma query options, and DTOs for a given model.
//  *
//  * @param {string} modelName - The name of the model (e.g., "User", "Post").
//  * @returns {Promise<Object>} An object containing the imported modules: `middlewares`, `authConfigs`, `prismaQueryOptions`, and `dtos`.
//  */
// export async function importPrismaModelModules(modelName: string) {
//   const kebabModelName = kebabCase(modelName);
//   const lowerModelName = modelName.toLowerCase();

//   const moduleDir = path.resolve(process.cwd(), "src", "modules", modelName);
//   const dtosDir = path.join(moduleDir, "dtos");
//   const schemasDir = path.join(moduleDir, "schemas");

//   const middlewaresFile = path.join(
//     moduleDir,
//     `${kebabModelName}.middlewares.${userFileExtension}`
//   );
//   const authConfigsFile = path.join(
//     moduleDir,
//     `${kebabModelName}.auth-configs.${userFileExtension}`
//   );
//   const prismaQueryOptionsFile = path.join(
//     moduleDir,
//     `${kebabModelName}.prisma-query-options.${userFileExtension}`
//   );

//   // Define DTO file paths
//   const modelDtoFile = path.join(
//     dtosDir,
//     `${lowerModelName}.dto.${userFileExtension}`
//   );
//   const createDtoFile = path.join(
//     dtosDir,
//     `create-${lowerModelName}.dto.${userFileExtension}`
//   );
//   const updateDtoFile = path.join(
//     dtosDir,
//     `update-${lowerModelName}.dto.${userFileExtension}`
//   );
//   const queryDtoFile = path.join(
//     dtosDir,
//     `query-${lowerModelName}.dto.${userFileExtension}`
//   );

//   const modelSchemaFile = path.join(
//     schemasDir,
//     `${lowerModelName}.schema.${userFileExtension}`
//   );
//   const createSchemaFile = path.join(
//     schemasDir,
//     `create-${lowerModelName}.schema.${userFileExtension}`
//   );
//   const updateSchemaFile = path.join(
//     schemasDir,
//     `update-${lowerModelName}.schema.${userFileExtension}`
//   );
//   const querySchemaFile = path.join(
//     schemasDir,
//     `query-${lowerModelName}.schema.${userFileExtension}`
//   );

//   const result: {
//     middlewares?: any;
//     authConfigs?: any;
//     prismaQueryOptions?: any;
//     dtos: {
//       create?: any;
//       update?: any;
//       query?: any;
//       model?: any;
//     };
//     schemas: {
//       create?: any;
//       update?: any;
//       query?: any;
//       model?: any;
//     };
//   } = {
//     dtos: {},
//     schemas: {},
//   };

//   try {
//     if (fs.existsSync(middlewaresFile)) {
//       const middlewareModule = await import(middlewaresFile);
//       result.middlewares = middlewareModule;
//     }
//   } catch (error) {
//     console.error(
//       `Error importing middlewares for model "${modelName}":`,
//       error
//     );
//   }

//   try {
//     if (fs.existsSync(authConfigsFile)) {
//       const authConfigsModule = await import(authConfigsFile);
//       result.authConfigs = authConfigsModule.default || authConfigsModule;
//     }
//   } catch (error) {
//     console.error(
//       `Error importing auth configs for model "${modelName}":`,
//       error
//     );
//   }

//   try {
//     if (fs.existsSync(prismaQueryOptionsFile)) {
//       const prismaQueryOptionsModule = await import(prismaQueryOptionsFile);
//       result.prismaQueryOptions =
//         prismaQueryOptionsModule.default || prismaQueryOptionsModule;
//     }
//   } catch (error) {
//     console.error(
//       `Error importing prisma query options for model "${modelName}":`,
//       error
//     );
//   }

//   // Import DTOs
//   const pascalModelName = pascalCase(modelName);
//   try {
//     if (fs.existsSync(modelDtoFile)) {
//       const modelDtoModule = await import(modelDtoFile);
//       result.dtos.model =
//         modelDtoModule.default || modelDtoModule[`${pascalModelName}Dto`];
//     }
//   } catch (error) {
//     console.error(
//       `Error importing model main DTO for model "${modelName} ${pascalModelName}":`,
//       error
//     );
//   }

//   try {
//     if (fs.existsSync(createDtoFile)) {
//       const createDtoModule = await import(createDtoFile);
//       result.dtos.create =
//         createDtoModule.default ||
//         createDtoModule[`Create${pascalModelName}Dto`];
//     }
//   } catch (error) {
//     console.error(
//       `Error importing create DTO for model "${modelName}":`,
//       error
//     );
//   }

//   try {
//     if (fs.existsSync(updateDtoFile)) {
//       const updateDtoModule = await import(updateDtoFile);
//       result.dtos.update =
//         updateDtoModule.default ||
//         updateDtoModule[`Update${pascalModelName}Dto`];
//     }
//   } catch (error) {
//     console.error(
//       `Error importing update DTO for model "${modelName}":`,
//       error
//     );
//   }

//   try {
//     if (fs.existsSync(queryDtoFile)) {
//       const queryDtoModule = await import(queryDtoFile);
//       result.dtos.query =
//         queryDtoModule.default || queryDtoModule[`Query${pascalModelName}Dto`];
//     }
//   } catch (error) {
//     console.error(`Error importing query DTO for model "${modelName}":`, error);
//   }

//   try {
//     if (fs.existsSync(modelSchemaFile)) {
//       const modelSchemaModule = await import(modelSchemaFile);
//       result.dtos.model =
//         modelSchemaModule.default ||
//         modelSchemaModule[`${pascalModelName}Schema`];
//     }
//   } catch (error) {
//     console.error(
//       `Error importing create Schema for model "${modelName}":`,
//       error
//     );
//   }

//   try {
//     if (fs.existsSync(createSchemaFile)) {
//       const createSchemaModule = await import(createSchemaFile);
//       result.dtos.create =
//         createSchemaModule.default ||
//         createSchemaModule[`Create${pascalModelName}Schema`];
//     }
//   } catch (error) {
//     console.error(
//       `Error importing create Schema for model "${modelName}":`,
//       error
//     );
//   }

//   try {
//     if (fs.existsSync(updateSchemaFile)) {
//       const updateSchemaModule = await import(updateSchemaFile);
//       result.dtos.update =
//         updateSchemaModule.default ||
//         updateSchemaModule[`Update${pascalModelName}Schema`];
//     }
//   } catch (error) {
//     console.error(
//       `Error importing update Schema for model "${modelName}":`,
//       error
//     );
//   }

//   try {
//     if (fs.existsSync(querySchemaFile)) {
//       const querySchemaModule = await import(querySchemaFile);
//       result.dtos.query =
//         querySchemaModule.default ||
//         querySchemaModule[`Query${pascalModelName}Schema`];
//     }
//   } catch (error) {
//     console.error(
//       `Error importing query Schema for model "${modelName}":`,
//       error
//     );
//   }

//   prismaModelsModules[modelName] = result;

//   return result;
// }

/**
 * Dynamically imports model-specific modules for a given model with optimized file handling.
 * Includes special handling for the Auth module.
 *
 * @param {string} modelName - The name of the model (e.g., "User", "Post", "Auth").
 * @returns {Promise<Object>} An object containing the imported modules
 */
export async function importPrismaModelModules(modelName: string) {
  const kebabModelName = kebabCase(modelName).toLowerCase();
  const lowerModelName = kebabModelName.toLowerCase();
  const pascalModelName = pascalCase(modelName);

  const moduleDir = path.resolve(process.cwd(), "src", "modules", modelName);

  // Define special auth module structure if needed
  const isAuthModule = modelName.toLowerCase() === "auth";

  // Define the structure of files to import
  const fileStructure = {
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

  // Initialize result object
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

  // Batch process core files
  await Promise.all(
    Object.entries(fileStructure.core).map(async ([key, fileName]) => {
      const filePath = path.join(moduleDir, fileName);
      try {
        const module = await import(filePath).catch(() => null);
        if (module) {
          // For middlewares, keep the entire module
          if (key === "middlewares") result[key] = module;
          // For all other core files, prefer default export
          else result[key as keyof typeof result] = module.default || module;
        }
      } catch (error) {
        // Silent fail - file might not exist
      }
    })
  );

  // Process DTOs and schemas in parallel
  const processSubdir = async (type: "dtos" | "schemas") => {
    const subdir = path.join(moduleDir, type);

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
  };

  // Process both subdirectories in parallel
  await Promise.all([processSubdir("dtos"), processSubdir("schemas")]);

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

const schemaFolderPath =
  process.env.PRISMA_SCHEMA_PATH || arkosEnv.PRISMA_SCHEMA_PATH;

/**
 * Reads the Prisma schema files and extracts all model definitions,
 * identifying their relations (one-to-one and one-to-many).
 */
const prismaModelRelationFields: Record<string, RelationFields> = {};

const prismaContent: string[] = [];

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

// const prismaRootDir = ""; // Adjust this path if needed
const files = getAllPrismaFiles("./prisma");

for (const file of files) {
  const content = fs.readFileSync(file, "utf-8");

  prismaContent.push(content);
}

const modelRegex = /model\s+(\w+)\s*{/g;
const models: string[] = [];
export const prismaModelsUniqueFields: Record<string, ModelFieldDefition[]> =
  [] as any;

prismaContent.join("\n").replace(modelRegex, (_, modelName) => {
  if (!models.includes(modelName)) models.push(camelCase(modelName.trim()));
  return modelName;
});

for (const model of models) {
  const modelName = pascalCase(model);

  let modelFile;
  for (const file of files) {
    const filePath = path.join(file);
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

  const content = fs.readFileSync(path.join(modelFile), "utf-8");

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

    if (isUnique)
      prismaModelsUniqueFields[model] = [
        ...(prismaModelsUniqueFields[model] || []),
        { name: fieldName, type, isUnique },
      ];

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

export { models, getModels, getModelUniqueFields, prismaModelRelationFields };
