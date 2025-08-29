import path from "path";
import { AuthConfigs } from "../types/auth";
import { killServerChildProcess } from "./cli/utils/cli.helpers";
import { ArkosConfig } from "../exports";
import sheu from "./sheu";
import {
  applyStrictRoutingRules,
  pathExists,
} from "./helpers/dynamic-loader.helpers";
import { kebabCase, pascalCase } from "./helpers/change-case.helpers";
import { crd, getUserFileExtension } from "./helpers/fs.helpers";
import { importModule } from "./helpers/global.helpers";
import prismaSchemaParser from "./prisma/prisma-schema-parser";

type AppModuleComponent = Awaited<ReturnType<typeof importModuleComponents>>;

let prismaModelsModules: Record<string, AppModuleComponent> = {};

/** This was a workaround when testing and also when cjs was generated while `prismaModelsModules` was exported there where some problems */
export function setModuleComponents(
  modelName: string,
  modules: AppModuleComponent
): any {
  prismaModelsModules[pascalCase(modelName)] = modules;
}

export function getModuleComponents(modelName: string) {
  return prismaModelsModules[pascalCase(modelName)];
}

/**
 * To be reused on other part of code for correct typing
 *
 * @param key
 * @param fileName
 * @param result
 */
export type ValidationFileMappingKey = keyof ReturnType<
  typeof getFileModuleComponentsFileStructure
>["dtos"];

export function getFileModuleComponentsFileStructure(modelName: string) {
  const kebabModelName = kebabCase(modelName).toLowerCase();
  const isAuthModule = modelName.toLowerCase() === "auth";
  const ext = getUserFileExtension();

  return {
    core: {
      hooks: `${kebabModelName}.hooks.${ext}`,
      interceptors: `${kebabModelName}.middlewares.${ext}`,
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
          createMany: ``,
          update: `update-${kebabModelName}.dto.${ext}`,
          updateOne: `update-${kebabModelName}.dto.${ext}`, // same as createOne
          updateMany: ``,
          query: `query-${kebabModelName}.dto.${ext}`,
          // looking for some better naming convetion
          findOne: ``,
          findMany: ``,
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
          createMany: ``, // just for sake of completion and reusability around other parts of code
          update: `update-${kebabModelName}.schema.${ext}`,
          updateOne: `update-${kebabModelName}.schema.${ext}`, // same as createOne
          updateMany: ``,
          query: `query-${kebabModelName}.schema.${ext}`,
          // looking for some better naming convetion
          findOne: ``,
          findMany: ``,
        },
  };
}

export async function processSubdir(
  modelName: string,
  type: "dtos" | "schemas"
) {
  const moduleDir = path.resolve(crd(), "src", "modules", kebabCase(modelName));

  const subdir = path.join(moduleDir, type);
  const fileStructure = getFileModuleComponentsFileStructure(modelName);
  const result: Record<string, any> = {};

  if (!(await pathExists(subdir))) return result;
  // Skip if directory doesn't exist
  try {
    await Promise.all(
      Object.entries(fileStructure[type]).map(async ([key, fileName]) => {
        const filePath = path.join(subdir, fileName);
        if (!fileName || !(await pathExists(filePath))) return;

        try {
          const module = await importModule(filePath).catch(
            async (err: any) => {
              if (await pathExists(filePath)) {
                sheu.error(`Failed to import ${fileName}: `);
                console.error(err);
                killServerChildProcess();
                process.exit(1);
              }
            }
          );

          if (module) result[key] = module.default;
        } catch (error) {
          console.error(error);
        }
      })
    );
  } catch (error) {
    console.error(error);
  }

  return result;
}

type importModuleComponentsReturnType = {
  hooks?: any;
  interceptors?: any;
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
 * @param {importModuleComponentsReturnType} result - The current result object
 * @throws {Error} When conflicting naming conventions are detected
 */
export function validateNamingConventions(
  key: string,
  fileName: string,
  result: importModuleComponentsReturnType
): void {
  if (key === "prismaQueryOptions") {
    sheu.warn(
      `Found ${fileName} which will be deprecated from 1.4.0-beta, consider switching to ${fileName.replace("prisma-query-options", "query")}.`
    );
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
    sheu.warn(
      `Found ${fileName} which will be deprecated from 1.4.0-beta, consider switching to ${fileName.replace("auth-configs", "auth")}.`
    );
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
 * @param {importModuleComponentsReturnType} result - The result object to modify
 */
export function assignModuleToResult(
  appModule: string,
  key: string,
  module: any,
  result: importModuleComponentsReturnType,
  arkosConfig: ArkosConfig
): void {
  if (key === "prismaQueryOptions" || key === "prismaQueryOptionsNew") {
    result.prismaQueryOptions = module.default || module;
  } else if (key === "authConfigs" || key === "authConfigsNew") {
    result.authConfigs = module.default || module;
  } else if (key === "interceptors") {
    result[key] = module;
  } else if (key === "router") {
    result[key] = {
      ...module,
      config: applyStrictRoutingRules(
        appModule,
        arkosConfig,
        module?.config || {}
      ),
    };
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
export async function importModuleComponents(
  modelName: string,
  arkosConfig: ArkosConfig,
  moduleDirExists?: boolean
): Promise<importModuleComponentsReturnType> {
  const result: importModuleComponentsReturnType = {
    dtos: {},
    schemas: {},
  };
  const usingStrictRouting = arkosConfig.routers?.strict;

  if (!moduleDirExists && !usingStrictRouting) return result;

  if (getModuleComponents(modelName)) return getModuleComponents(modelName);

  const moduleDir = path.resolve(crd(), "src", "modules", kebabCase(modelName));
  const fileStructure = getFileModuleComponentsFileStructure(modelName);

  const validationSubdir = arkosConfig.validation?.resolver
    ? arkosConfig.validation.resolver === "zod"
      ? "schemas"
      : "dtos"
    : null;

  // Batch process core files
  const [_, validators] = await Promise.all([
    Object.entries(fileStructure.core).map(async ([key, fileName]) => {
      if (
        ["createMany", "findMany", "findOne", "updateMany"].includes(key) ||
        !fileName
      )
        return;

      const filePath = path.join(moduleDir, fileName);

      if (
        key === "router" &&
        !usingStrictRouting &&
        !(await pathExists(filePath))
      )
        return;
      else if (
        key !== "router" &&
        usingStrictRouting &&
        !(await pathExists(filePath))
      )
        return;

      try {
        let module = await importModule(filePath).catch(async (err) => {
          try {
            if (await pathExists(filePath)) {
              sheu.error(`Failed to import ${fileName}`);
              console.error(err);
              killServerChildProcess();
              process.exit(1);
            }
          } catch (err) {}
        });

        if (!module && key === "router" && usingStrictRouting) module = {};

        if (module) {
          // Validate naming conventions before assignment
          validateNamingConventions(key, fileName, result);

          // Assign module to result
          assignModuleToResult(modelName, key, module, result, arkosConfig);
          console.log("wegotsome", modelName, module);
        }
      } catch (err: any) {
        if (err.message?.includes("Cannot use both")) throw err;
        console.error(err);
        killServerChildProcess();
      }
    }),
    validationSubdir && processSubdir(modelName, validationSubdir),
  ]);

  prismaModelsModules[pascalCase(modelName)] = {
    ...result,
    ...(validationSubdir && { [validationSubdir]: validators }),
  };

  return {
    ...result,
    ...(validationSubdir && { [validationSubdir]: validators }),
  };
}

export const appModules = Array.from(
  new Set([
    ...prismaSchemaParser.getModelsAsArrayOfStrings(),
    "auth",
    "file-upload",
  ])
);

/**
 * Allows to asynchronously load all app modules components at once to speed up app start time.
 */
export async function loadAllModuleComponents(arkosConfig: ArkosConfig) {
  const moduleDirExists: string[] = [];
  await Promise.all(
    appModules.map(async (appModule) => {
      const moduleDir = path.resolve(
        crd(),
        "src",
        "modules",
        kebabCase(appModule)
      );
      if (await pathExists(moduleDir)) moduleDirExists.push(appModule);
    })
  );

  const modulesComponentsImportPromises = appModules.map(
    async (appModule) =>
      await importModuleComponents(
        appModule,
        arkosConfig,
        moduleDirExists.includes(appModule)
      )
  );

  await Promise.all(modulesComponentsImportPromises);
}
