import { ZodTypeAny } from "zod";
import path from "path";
import { AuthConfigs } from "../types/auth";
import { killServerChildProcess } from "./cli/utils/cli.helpers";
import { getArkosConfig, RouterConfig } from "../exports";
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
import { UserArkosConfig } from "./define-config";

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
          query: ``,
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
          query: ``,
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
  return value?._def?.typeName?.startsWith("Zod");
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

export type ModuleComponents = ImportModuleComponentsReturnType;

type ImportModuleComponentsReturnType = {
  hooks?: Record<string, ServiceHook | ServiceHook[]>;
  interceptors?: Record<string, Function | Function[]>;
  authConfigs?: AuthConfigs;
  prismaQueryOptions?: PrismaQueryOptions<any>;
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

/**
 * Processes and assigns module to the result object based on the key
 * @param {string} key - The file key being processed
 * @param {any} module - The imported module
 * @param {ImportModuleComponentsReturnType} result - The result object to modify
 */
export function assignModuleToResult(
  appModule: string,
  key: keyof ModuleComponents,
  module: any,
  result: ImportModuleComponentsReturnType,
  arkosConfig: UserArkosConfig
): void {
  const ext = getUserFileExtension();

  if (key === "authConfigs") {
    sheu.warn(
      `${kebabCase(appModule)}.auth.${ext} is deprecated and will be removed in v2.0, please migrate to ArkosPolicy see https://www.arkosjs.com/blog/how-migrate-from-auth-files-to-arkos-policy`
    );
  }

  if (key === "interceptors") result.interceptors = module;
  else if (key === "router") {
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
  arkosConfig: UserArkosConfig,
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

  const [validators] = await Promise.all([
    validationSubdir && processSubdir(modelName, validationSubdir),
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
          assignModuleToResult(
            modelName,
            key as any,
            module,
            result,
            arkosConfig
          );
        }
      } catch (err: any) {
        if (err.message?.includes("Cannot use both")) throw err;
        console.error(err);
        killServerChildProcess();
      }
    }),
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
    ...(prismaSchemaParser.getModelsAsArrayOfStrings() || []),
  ])
);

/**
 * Allows to asynchronously load all app modules components at once to speed up app start time.
 */
export async function loadAllModuleComponents() {
  const arkosConfig = getArkosConfig();

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
  warnDeprecatedModuleComponents(
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

const DEPRECATION_GROUPS = [
  {
    key: "authConfigs",
    fileKey: (moduleName: string, ext: string) => `${moduleName}.auth.${ext}`,
    label: "Auth Config Files (.auth.ts)",
    migration: "https://www.arkosjs.com/docs/migration/auth-to-policy",
  },
  {
    key: "interceptors",
    fileKey: (moduleName: string, ext: string) =>
      `${moduleName}.interceptors.${ext}`,
    label: "Interceptors (.interceptors.ts)",
    migration:
      "https://www.arkosjs.com/docs/migration/interceptors-to-route-hook",
  },
  {
    key: "hooks",
    fileKey: (moduleName: string, ext: string) => `${moduleName}.hooks.${ext}`,
    label: "Service Hooks (.hooks.ts)",
    migration: "https://www.arkosjs.com/docs/migration/hooks-to-service-hook",
  },
  {
    key: "prismaQueryOptions",
    fileKey: (moduleName: string, ext: string) => `${moduleName}.query.${ext}`,
    label: "Query Options (.query.ts)",
    migration: "https://www.arkosjs.com/docs/migration/query-to-route-hook",
  },
  {
    key: "dtos",
    fileKey: (moduleName: string, ext: string) => `${moduleName}/dtos/`,
    label: "DTOs (dtos/ folder)",
    migration: "https://www.arkosjs.com/docs/migration/dtos-to-route-hook",
  },
  {
    key: "schemas",
    fileKey: (moduleName: string, ext: string) => `${moduleName}/schemas/`,
    label: "Zod Schemas (schemas/ folder)",
    migration: "https://www.arkosjs.com/docs/migration/schemas-to-route-hook",
  },
  {
    key: "routerConfig",
    fileKey: (moduleName: string, ext: string) =>
      `${moduleName}.router.${ext} (config export)`,
    label: "Router Config (router.config)",
    migration:
      "https://www.arkosjs.com/docs/migration/router-config-to-route-hook",
  },
  {
    key: "autoLoadedRouter",
    fileKey: (moduleName: string, ext: string) => `${moduleName}.router.${ext}`,
    label: "Auto-loaded Routers (auth, file-upload, prisma models)",
    migration: "https://www.arkosjs.com/docs/migration/auto-routers-to-app-use",
  },
];

export function warnDeprecatedModuleComponents(
  modulesComponents: {
    moduleName: string;
    components: ImportModuleComponentsReturnType;
  }[]
) {
  const ext = getUserFileExtension();

  const groups = DEPRECATION_GROUPS.map((g) => ({
    ...g,
    files: [] as string[],
  }));

  for (const { moduleName, components } of modulesComponents) {
    for (const group of groups) {
      let found = false;

      if (group.key === "dtos") {
        found = Object.keys(components.dtos || {}).length > 0;
      } else if (group.key === "schemas") {
        found = Object.keys(components.schemas || {}).length > 0;
      } else if (group.key === "routerConfig") {
        found =
          !!(components.router as any)?.config &&
          Object.keys((components.router as any).config).length > 0;
      } else if (group.key === "autoLoadedRouter") {
        // auth, file-upload always auto-loaded; prisma models with a router file
        found =
          ["auth", "file-upload"].includes(moduleName) || !!components.router;
      } else {
        found = !!(components as any)[group.key];
      }

      if (found) {
        group.files.push(`src/modules/${group.fileKey(moduleName, ext)}`);
      }
    }
  }

  const hasAny = groups.some((g) => g.files.length > 0);
  if (!hasAny) return;

  sheu.warn(
    `\nDeprecation warnings — the following patterns will be removed in v2.0:\n`
  );

  for (const group of groups) {
    if (group.files.length === 0) continue;
    sheu.warn(`  ${group.label}`);
    for (const file of group.files) {
      sheu.warn(`    - ${file}`);
    }
    sheu.warn(`  → Migrate: ${group.migration}\n`);
  }
}
