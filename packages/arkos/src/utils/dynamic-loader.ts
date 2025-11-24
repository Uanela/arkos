import { z, ZodTypeAny } from "zod";
import path from "path";
import { AuthConfigs } from "../types/auth";
import { killServerChildProcess } from "./cli/utils/cli.helpers";
import { ArkosConfig, RouterConfig } from "../exports";
import sheu from "./sheu";
import {
  applyStrictRoutingRules,
  pathExists,
  validateRouterConfigConsistency,
} from "./helpers/dynamic-loader.helpers";
import { kebabCase, pascalCase } from "./helpers/change-case.helpers";
import { crd, getUserFileExtension } from "./helpers/fs.helpers";
import { importModule } from "./helpers/global.helpers";
import prismaSchemaParser from "./prisma/prisma-schema-parser";
import debuggerService from "../modules/debugger/debugger.service";
import { PrismaQueryOptions } from "../types";
import { ServiceHook } from "../modules/base/utils/service-hooks-manager";

type AppModuleComponent = Awaited<ReturnType<typeof importModuleComponents>>;

let prismaModelsModules: Record<string, AppModuleComponent> = {};

/** This was a workaround when testing and also when cjs was generated while `prismaModelsModules` was exported there where some problems */
export function setModuleComponents(
  modelName: string,
  modules: AppModuleComponent
) {
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
      interceptors: `${kebabModelName}.interceptors.${ext}`,
      interceptorsOld: `${kebabModelName}.middlewares.${ext}`,
      authConfigs: `${kebabModelName}.auth.${ext}`,
      prismaQueryOptions: `${kebabModelName}.query.${ext}`,
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

export function isClass(value: any): boolean {
  return (
    typeof value === "function" &&
    /^class\s/.test(Function.prototype.toString.call(value))
  );
}

export function isZodSchema(value: any): value is ZodTypeAny {
  return value instanceof z.ZodType;
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

          const cleanFilePath = `src/modules/${kebabCase(modelName)}/${fileName}`;
          if (type === "dtos" && !isClass(module?.default))
            throw Error(
              `ValidationError: Please export as default a valid class under ${cleanFilePath}, in order to use as Dto.`
            );
          else if (type === "schemas" && !isZodSchema(module?.default))
            throw Error(
              `ValidationError: Please export as default a valid zod schema under ${cleanFilePath}, in order to use as Schema`
            );

          if (module && module?.default) result[key] = module.default;
        } catch (err: any) {
          if (err?.message?.includes("ValidationError")) throw err;
          console.error(err);
        }
      })
    );
  } catch (err: any) {
    if (err?.message?.includes("ValidationError")) throw err;
    console.error(err);
  }

  return result;
}

export type ModuleComponents = Omit<
  ImportModuleComponentsReturnType,
  "authConfigsNew" | "prismaQueryOptionsNew"
>;

type ImportModuleComponentsReturnType = {
  hooks?: Record<string, ServiceHook | ServiceHook[]>;
  interceptors?: Record<string, Function | Function[]>;
  authConfigs?: AuthConfigs;
  interceptorsOld?: any;
  authConfigsNew?: AuthConfigs;
  prismaQueryOptions?: PrismaQueryOptions<any>;
  prismaQueryOptionsNew?: PrismaQueryOptions<any>;
  router?: { config?: RouterConfig<any>; default: RouterConfig };
  dtos?: {
    create?: any;
    update?: any;
    signup?: any;
    login?: any;
    updatePassword?: any;
    updateMe?: any;
  };
  schemas?: {
    create?: any;
    update?: any;
    signup?: any;
    login?: any;
    updatePassword?: any;
    updateMe?: any;
  };
};

const availableInterceptors = {
  auth: [
    "beforeGetMe",
    "afterGetMe",
    "onGetMeError",
    "beforeUpdateMe",
    "afterUpdateMe",
    "onUpdateMeError",
    "beforeLogin",
    "afterLogin",
    "onLoginError",
    "beforeLogout",
    "afterLogout",
    "onLogoutError",
    "beforeSignup",
    "afterSignup",
    "onSignupError",
    "beforeUpdatePassword",
    "afterUpdatePassword",
    "onUpdatePasswordError",
  ],
  "file-upload": [
    "beforeFindFile",
    "onFindFileError",
    "beforeUploadFile",
    "afterUploadFile",
    "onUploadFileError",
    "beforeUpdateFile",
    "afterUpdateFile",
    "onUpdateFileError",
    "beforeDeleteFile",
    "afterDeleteFile",
    "onDeleteFileError",
  ],
  prisma: [
    "beforeCreateOne",
    "afterCreateOne",
    "onCreateOneError",
    "beforeFindOne",
    "afterFindOne",
    "onFindOneError",
    "beforeFindMany",
    "afterFindMany",
    "onFindManyError",
    "beforeUpdateOne",
    "afterUpdateOne",
    "onUpdateOneError",
    "beforeDeleteOne",
    "afterDeleteOne",
    "onDeleteOneError",
    "beforeCreateMany",
    "afterCreateMany",
    "onCreateManyError",
    "beforeUpdateMany",
    "afterUpdateMany",
    "onUpdateManyError",
    "beforeDeleteMany",
    "afterDeleteMany",
    "onDeleteManyError",
  ],
};

/**
 * Validates naming convention conflicts for prismaQueryOptions and authConfigs
 * @param {string} key - The current file key being processed
 * @param {string} fileName - The filename being imported
 * @param {ImportModuleComponentsReturnType} result - The current result object
 * @throws {Error} When conflicting naming conventions are detected
 */
export function validateNamingConventions(
  key: string,
  fileName: string,
  result: ImportModuleComponentsReturnType
): void {
  if (key === "interceptorsOld") {
    if (!result.interceptors)
      sheu.warn(
        `Found deprecated ${fileName} that will removed from v1.5.0-beta, consider switching to ${fileName.replace("middlewares", "interceptors")}`
      );
  }
}

/**
 * Processes and assigns module to the result object based on the key
 * @param {string} key - The file key being processed
 * @param {any} module - The imported module
 * @param {ImportModuleComponentsReturnType} result - The result object to modify
 */
export function assignModuleToResult(
  appModule: string,
  key: string,
  module: any,
  result: ImportModuleComponentsReturnType,
  arkosConfig: ArkosConfig
): void {
  if (key === "interceptors") result.interceptors = module;
  else if (key === "interceptorsOld") {
    const kebabCaseAppModule = kebabCase(appModule);
    const moduleName =
      kebabCaseAppModule === "auth"
        ? "auth"
        : kebabCaseAppModule === "file-upload"
          ? "file-upload"
          : "prisma";

    if (
      result.interceptors &&
      Object.keys(module).some((interceptorName) =>
        availableInterceptors[moduleName].includes(interceptorName)
      )
    ) {
      const exportedInterceptors = Object.keys(module).filter(
        (interceptorName) =>
          availableInterceptors[moduleName].includes(interceptorName)
      );
      const ext = getUserFileExtension();
      sheu.warn(
        `Found ${kebabCaseAppModule}.middlewares.${ext} exporting ${exportedInterceptors.join(", ")}. Which by convention should go at ${kebabCaseAppModule}.interceptors.${ext} This is simply a warning that will stop from v1.5.0-beta`
      );
    } else if (!result.interceptors) result.interceptors = module;
  } else if (key === "router") {
    result[key] = {
      ...module,
      config: applyStrictRoutingRules(
        appModule,
        arkosConfig,
        module?.config || {}
      ),
    };
    validateRouterConfigConsistency(
      kebabCase(appModule),
      result[key]?.config || {}
    );
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
): Promise<ImportModuleComponentsReturnType> {
  const result: ImportModuleComponentsReturnType = {
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

  const [_, validators] = await Promise.all([
    ...Object.entries(fileStructure.core).map(async ([key, fileName]) => {
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
          (result as any)[key] = module;
          validateNamingConventions(key, fileName, result);
          assignModuleToResult(modelName, key, module, result, arkosConfig);
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
    "auth",
    "file-upload",
    ...prismaSchemaParser.getModelsAsArrayOfStrings(),
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

  const modulesComponents = await Promise.all(modulesComponentsImportPromises);
  debuggerService.logDynamicLoadedModulesComponents(
    modulesComponents.map((components, i) => {
      const moduleDir = path.resolve(
        crd(),
        "src",
        "modules",
        kebabCase(appModules[i])
      );

      return {
        moduleName: kebabCase(appModules[i]),
        moduleDir,
        components,
      };
    })
  );
}
