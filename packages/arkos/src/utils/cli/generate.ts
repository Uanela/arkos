import fs from "fs";
import path from "path";
import { generateTemplate } from "./utils/template-generators";
import { ensureDirectoryExists } from "./utils/cli.helpers";
import {
  camelCase,
  kebabCase,
  pascalCase,
} from "../helpers/change-case.helpers";
import { fullCleanCwd, getUserFileExtension } from "../helpers/fs.helpers";
import sheu from "../sheu";
import { capitalize } from "../helpers/text.helpers";
import prismaSchemaParser from "../prisma/prisma-schema-parser";
import generateMultipleComponents, {
  MultipleComponentsGenerateOptions,
} from "./utils/template-generator/templates/generate-multiple-components";
import ExitError from "../helpers/exit-error";

export const kebabPrismaModels = prismaSchemaParser
  .getModelsAsArrayOfStrings()
  .map((val) => kebabCase(val));

export const knownModules = [...kebabPrismaModels, "file-upload", "auth"];

export type GenerateOptions = {
  path?: string;
  model?: string;
  module?: string;
  modules?: string;
  overwrite?: boolean;
  shouldExit?: boolean;
  shouldPrintError?: boolean;
  isBulk?: boolean;
};

interface GenerateConfig {
  templateName: string;
  fileSuffix?: string;
  customValidation?: (modelName: string) => void;
  customImports?: (names: any) => any;
  customPath?: string;
  prefix?: string;
  allowedModules: string[] | "*";
  ext?: string;
  attachModuleName?: boolean; // defaults to true
}

const generateFile = async (
  options: GenerateOptions,
  config: GenerateConfig
) => {
  if (options.modules) {
    const moduleNames = options.modules
      .split(",")
      .map((m: string) => m.trim())
      .filter(Boolean);

    let totalFail = 0;
    for (const moduleName of moduleNames) {
      try {
        await generateFile(
          { ...options, modules: undefined, module: moduleName },
          config
        );
      } catch (err: any) {
        totalFail++;
      }
    }
    if (totalFail > 0) process.exit(1);
    return;
  }

  const modelName = options.module || options.model;
  if (modelName?.includes(","))
    throw ExitError(
      "Multiple modules are not supported with -m/--module. Use -ms/--modules instead.\n" +
        "Example: arkos g router -ms post,user,auth"
    );

  if (options.module && options.model)
    throw ExitError(
      "You must either pass --module or --model, prefer --module to align with future updates."
    );

  if (!modelName?.trim()) throw new Error("Module name is required!");

  const isAllowedModule =
    config.allowedModules === "*" ||
    config.allowedModules.includes(kebabCase(modelName));
  const isKnowModule =
    config.allowedModules === "*" ||
    config.allowedModules.includes(kebabCase(modelName));

  if (!isKnowModule)
    throw new Error(
      `Generate command are only available for know modules such as all prisma models, file-upload and auth. And you passed ${modelName}.`
    );
  else if (!isAllowedModule)
    throw Error(
      `${kebabCase(config.templateName).replaceAll("-", " ")} are not available for module ${modelName}`
    );

  if (config.customValidation) config.customValidation(modelName);

  const targetPath =
    options.path || config.customPath || "src/modules/{{module-name}}";

  const names = {
    pascal: pascalCase(modelName),
    camel: camelCase(modelName),
    kebab: kebabCase(modelName),
  };

  const ext = config.ext || getUserFileExtension();

  const resolvedPath = targetPath.replaceAll("{{module-name}}", names.kebab);

  const isExplicitFile = path.extname(resolvedPath) !== "";

  let filePath: string;
  let modulePath: string;

  if (isExplicitFile) {
    filePath = path.resolve(process.cwd(), resolvedPath);
    modulePath = path.dirname(filePath);
  } else {
    modulePath = path.resolve(process.cwd(), resolvedPath);

    function getSuffix() {
      return config.fileSuffix ? `.${config.fileSuffix}` : "";
    }

    const fileName = config.prefix
      ? config.attachModuleName === false
        ? `${config.prefix}${getSuffix()}.${ext}`
        : `${config.prefix}${names.kebab}${getSuffix()}.${ext}`
      : config.attachModuleName === false
        ? `${names.kebab}${getSuffix()}.${ext}`
        : `${names.kebab}${getSuffix()}.${ext}`;

    filePath = path.join(modulePath, fileName);
  }

  const humamReadableTemplateName =
    config.templateName.charAt(0).toUpperCase() +
    config.templateName.slice(1).replaceAll("-", " ");

  try {
    ensureDirectoryExists(modulePath);
    const { model, ...restOfOptions } = options;

    const templateData = {
      modelName: names,
      ...restOfOptions,
      ...(config.customImports && { imports: config.customImports(names) }),
    };

    const content = generateTemplate(config.templateName, templateData);
    if (options.overwrite !== true && fs.existsSync(filePath))
      throw new Error(
        `${capitalize(humamReadableTemplateName.toLowerCase())} for ${names.kebab.replaceAll("-", " ")} already exists.`
      );
    else if (options.overwrite) {
      if (!options.isBulk) console.info("");
      sheu.warn(
        `Overwriting ${humamReadableTemplateName.toLowerCase()} of ${names.kebab.replaceAll("-", " ")} because it already exists.`
      );
    }

    fs.writeFileSync(filePath, content);

    if (!options.isBulk && !options.overwrite) console.info("");
    sheu.done(
      `${humamReadableTemplateName} ${options.isBulk ? "" : `for ${names.kebab.replaceAll("-", " ")} `}generated under ${fullCleanCwd(filePath)}`
    );
  } catch (err: any) {
    if (options.shouldPrintError !== false) {
      console.info("");
      sheu.error(
        `Failed because of ${err?.message?.toLowerCase() || "unknown reason"}`
      );
    } else throw err;

    if (options.shouldExit !== false) process.exit(1);
  }
};

export const generateCommand = {
  controller: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "controller",
      fileSuffix: "controller",
      customImports: () => ({
        baseController: "arkos/controllers",
      }),
      allowedModules: "*",
    });
  },

  service: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "service",
      fileSuffix: "service",
      customImports: () => ({
        baseService: "arkos/services",
      }),
      allowedModules: "*",
    });
  },

  router: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "router",
      fileSuffix: "router",
      allowedModules: "*",
    });
  },

  interceptors: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "interceptors",
      fileSuffix: "interceptors",
      allowedModules: knownModules,
    });
  },

  authConfigs: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "auth-configs",
      fileSuffix: "auth",
      allowedModules: "*",
    });
  },

  hooks: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "hooks",
      fileSuffix: "hooks",
      allowedModules: knownModules,
    });
  },

  policy: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "policy",
      fileSuffix: "policy",
      allowedModules: "*",
    });
  },

  createSchema: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "create-schema",
      fileSuffix: "schema",
      customPath: "src/modules/{{module-name}}/schemas",
      prefix: "create-",
      allowedModules: kebabPrismaModels,
    });
  },

  updateSchema: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "update-schema",
      fileSuffix: "schema",
      customPath: "src/modules/{{module-name}}/schemas",
      prefix: "update-",
      allowedModules: kebabPrismaModels,
    });
  },

  baseSchema: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "schema",
      fileSuffix: "schema",
      customPath: "src/modules/{{module-name}}/schemas",
      prefix: "",
      allowedModules: kebabPrismaModels,
    });
  },

  querySchema: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "query-schema",
      fileSuffix: "schema",
      customPath: "src/modules/{{module-name}}/schemas",
      prefix: "query-",
      allowedModules: kebabPrismaModels,
    });
  },

  createDto: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "create-dto",
      fileSuffix: "dto",
      customPath: "src/modules/{{module-name}}/dtos",
      prefix: "create-",
      allowedModules: kebabPrismaModels,
    });
  },

  updateDto: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "update-dto",
      fileSuffix: "dto",
      customPath: "src/modules/{{module-name}}/dtos",
      prefix: "update-",
      allowedModules: kebabPrismaModels,
    });
  },

  baseDto: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "dto",
      fileSuffix: "dto",
      customPath: "src/modules/{{module-name}}/dtos",
      prefix: "",
      allowedModules: kebabPrismaModels,
    });
  },

  queryDto: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "query-dto",
      fileSuffix: "dto",
      customPath: "src/modules/{{module-name}}/dtos",
      prefix: "query-",
      allowedModules: kebabPrismaModels,
    });
  },

  queryOptions: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "query-options",
      fileSuffix: "query",
      allowedModules: knownModules,
    });
  },

  prismaModel: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "prisma-model",
      allowedModules: "*",
      ext: "prisma",
      customPath: "prisma/schema",
    });
  },

  loginSchema: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "login-schema",
      fileSuffix: "schema",
      customPath: "src/modules/auth/schemas",
      prefix: "login",
      allowedModules: ["auth"],
      attachModuleName: false,
    });
  },

  signupSchema: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "signup-schema",
      fileSuffix: "schema",
      customPath: "src/modules/auth/schemas",
      prefix: "signup",
      allowedModules: ["auth"],
      attachModuleName: false,
    });
  },

  updateMeSchema: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "update-me-schema",
      fileSuffix: "schema",
      customPath: "src/modules/auth/schemas",
      prefix: "update-me",
      allowedModules: ["auth"],
      attachModuleName: false,
    });
  },

  updatePasswordSchema: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "update-password-schema",
      fileSuffix: "schema",
      customPath: "src/modules/auth/schemas",
      prefix: "update-password",
      allowedModules: ["auth"],
      attachModuleName: false,
    });
  },

  loginDto: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "login-dto",
      fileSuffix: "dto",
      customPath: "src/modules/auth/dtos",
      prefix: "login",
      allowedModules: ["auth"],
      attachModuleName: false,
    });
  },

  signupDto: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "signup-dto",
      fileSuffix: "dto",
      customPath: "src/modules/auth/dtos",
      prefix: "signup",
      allowedModules: ["auth"],
      attachModuleName: false,
    });
  },

  updateMeDto: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "update-me-dto",
      fileSuffix: "dto",
      customPath: "src/modules/auth/dtos",
      prefix: "update-me",
      allowedModules: ["auth"],
      attachModuleName: false,
    });
  },

  updatePasswordDto: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "update-password-dto",
      fileSuffix: "dto",
      customPath: "src/modules/auth/dtos",
      prefix: "update-password",
      allowedModules: ["auth"],
      attachModuleName: false,
    });
  },

  multipleComponents: async (options: MultipleComponentsGenerateOptions) => {
    await generateMultipleComponents(options);
  },
};
