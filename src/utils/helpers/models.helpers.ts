import { ROOT_DIR } from "../../paths";
import path from "path";
import fs from "fs";
import { camelCase, kebabCase, pascalCase } from "change-case-all";
import { initConfigs } from "../../app";

export async function importPrismaModelModules(modelName: string) {
  const kebabModelName = kebabCase(modelName);

  const moduleDir = path.resolve(ROOT_DIR, "src", "modules", modelName);

  const extension = process.env.NODE_ENV === "production" ? "js" : "ts";

  // Define the expected file paths
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

  // Initialize result object
  const result: {
    middlewares?: any;
    authConfigs?: any;
    prismaQueryOptions?: any;
  } = {};

  // Try to import middlewares
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

  // Try to import auth configs
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

  // Try to import prisma query options
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

  return result;
}

export async function getAppWidthEjectedMiddlewares(app: any) {
  const extension = process.env.NODE_ENV === "production" ? "js" : "ts";
  const appWithEjectedMiddlewaresPath = path.resolve(
    ROOT_DIR,
    "src",
    `app.${extension}`
  );

  if (!appWithEjectedMiddlewaresPath) {
    return null;
  }

  // const middlewarePath = path.join(middlewaresDir, matchingFile)

  try {
    const appEjected = await import(appWithEjectedMiddlewaresPath);
    return appEjected;
  } catch (error) {
    return null;
  }
}

const models: string[] = [];

(() => {
  const prisma = initConfigs.prisma;

  Object.keys(prisma || {}).forEach((key) => {
    const value = (prisma as any)[key];
    if (
      value &&
      typeof value === "object" &&
      typeof value.findUnique === "function"
    ) {
      models.push(key);
    }
  });
})();
// return models

export type RelationFields = {
  singular: { name: string; type: string }[];
  list: { name: string; type: string }[];
};

const schemaFolderPath = `./prisma/schema`;

// Read and process the schema files once
const prismaModelRelationFields: Record<string, RelationFields> = {};

const files = fs
  .readdirSync(schemaFolderPath)
  .filter((file) => file.endsWith(".prisma"));

for (const model of models) {
  const modelName = pascalCase(model);

  let modelFile;
  for (const file of files) {
    const filePath = path.join(schemaFolderPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile()) {
      const content = fs.readFileSync(filePath, "utf-8");
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

    // Check for relations
    const [fieldName, type] = trimmedLine.split(/\s+/);
    const cleanType = type?.replace("[]", "").replace("?", "");
    if (
      trimmedLine.includes("@relation") ||
      trimmedLine.match(/\s+\w+(\[\])?(\s+@|$)/) ||
      models.includes(camelCase(cleanType || ""))
      // content.includes(`model ${cleanType} {`)
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

// Function to get relations from the cache
export function getPrismaModelRelations(modelName: string) {
  modelName = pascalCase(modelName);
  if (!(modelName in prismaModelRelationFields)) return;
  return prismaModelRelationFields[modelName];
}

export { models, prismaModelRelationFields };
