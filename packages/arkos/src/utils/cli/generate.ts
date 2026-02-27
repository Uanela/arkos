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
import { kebabToHuman } from "../../modules/swagger/utils/helpers/swagger.router.helpers";
import generateMultipleComponents, {
  MultipleComponentsGenerateOptions,
} from "./utils/template-generator/templates/generate-multiple-components";

const models = prismaSchemaParser
  .getModelsAsArrayOfStrings()
  .map((val) => kebabCase(val));

const knownModules = [...models, "file-upload", "auth"];

export type GenerateOptions = {
  path?: string;
  model?: string;
  module?: string;
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
}

const generateFile = async (
  options: GenerateOptions,
  config: GenerateConfig
) => {
  const modelName = options.module || options.model;

  if (options.module && options.model)
    throw Error(
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
      `${kebabToHuman(kebabCase(config.templateName))} are not available for module ${modelName}`
    );

  if (config.customValidation) config.customValidation(modelName);

  const { path: customPath = "src/modules/{{module-name}}" } = options;
  const targetPath = options.path || config.customPath || "src/modules/{{module-name}}";

  const names = {
    pascal: pascalCase(modelName),
    camel: camelCase(modelName),
    kebab: kebabCase(modelName),
  };

   const ext = config.ext || getUserFileExtension();

  // 2. Replace placeholder
  const resolvedPath = targetPath.replaceAll("{{module-name}}", names.kebab);

  // 3. Check if the user is passing in a file path (with the extension .ts/.js) or just a directory.
  const isExplicitFile = path.extname(resolvedPath) !== "";
  
  let filePath: string;
  let modulePath: string;

  if (isExplicitFile) {
    // If pass full path file: -p src/modules/order/create.dto.ts
    filePath = path.resolve(process.cwd(), resolvedPath);
    modulePath = path.dirname(filePath);
  } else {
    // If only pass folder or use default
    modulePath = path.resolve(process.cwd(), resolvedPath);
    
    function getSuffix() {
      return config.fileSuffix ? `.${config.fileSuffix}` : "";
    }

    const fileName = config.prefix
      ? `${config.prefix}${names.kebab}${getSuffix()}.${ext}`
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
      allowedModules: knownModules,
    });
  },

  service: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "service",
      fileSuffix: "service",
      customImports: () => ({
        baseService: "arkos/services",
      }),
      allowedModules: [...knownModules, "email"],
    });
  },

  router: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "router",
      fileSuffix: "router",
      customImports: (names) => ({
        baseRouter: "arkos",
        controller: `./${names.kebab}.controller`,
      }),
      allowedModules: knownModules,
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
      allowedModules: knownModules,
    });
  },

  hooks: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "hooks",
      fileSuffix: "hooks",
      allowedModules: knownModules,
    });
  },

  createSchema: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "create-schema",
      fileSuffix: "schema",
      customPath: "src/modules/{{module-name}}/schemas",
      prefix: "create-",
      allowedModules: models,
    });
  },

  updateSchema: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "update-schema",
      fileSuffix: "schema",
      customPath: "src/modules/{{module-name}}/schemas",
      prefix: "update-",
      allowedModules: models,
    });
  },

  baseSchema: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "schema",
      fileSuffix: "schema",
      customPath: "src/modules/{{module-name}}/schemas",
      prefix: "",
      allowedModules: models,
    });
  },

  querySchema: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "query-schema",
      fileSuffix: "schema",
      customPath: "src/modules/{{module-name}}/schemas",
      prefix: "query-",
      allowedModules: models,
    });
  },

  createDto: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "create-dto",
      fileSuffix: "dto",
      customPath: "src/modules/{{module-name}}/dtos",
      prefix: "create-",
      allowedModules: models,
    });
  },

  updateDto: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "update-dto",
      fileSuffix: "dto",
      customPath: "src/modules/{{module-name}}/dtos",
      prefix: "update-",
      allowedModules: models,
    });
  },

  baseDto: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "dto",
      fileSuffix: "dto",
      customPath: "src/modules/{{module-name}}/dtos",
      prefix: "",
      allowedModules: models,
    });
  },

  queryDto: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "query-dto",
      fileSuffix: "dto",
      customPath: "src/modules/{{module-name}}/dtos",
      prefix: "query-",
      allowedModules: models,
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
    });
  },

  multipleComponents: async (options: MultipleComponentsGenerateOptions) => {
    await generateMultipleComponents(options);
  },
};
