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

interface GenerateOptions {
  path?: string;
  model: string;
}

interface GenerateConfig {
  templateName: string;
  fileSuffix: string;
  customValidation?: (modelName: string) => void;
  customImports?: (names: any) => any;
  customPath?: string;
  prefix?: string;
}

const generateFile = async (
  options: GenerateOptions,
  config: GenerateConfig
) => {
  const modelName = options.model;

  if (!modelName) {
    sheu.error("Module name is required!");
    process.exit(1);
  }

  if (config.customValidation) config.customValidation(modelName);

  const { path: customPath = "src/modules/{{module-name}}" } = options;

  const names = {
    pascal: pascalCase(modelName),
    camel: camelCase(modelName),
    kebab: kebabCase(modelName),
  };

  const ext = getUserFileExtension();

  const resolvedPath = (config.customPath || customPath).replaceAll(
    "{{module-name}}",
    names.kebab
  );

  const modulePath = path.join(process.cwd(), resolvedPath);

  const fileName = config.prefix
    ? `${config.prefix}${names.kebab}.${config.fileSuffix}.${ext}`
    : `${names.kebab}.${config.fileSuffix}.${ext}`;

  const filePath = path.join(modulePath, fileName);

  const humamReadableTemplateName =
    config.templateName.charAt(0).toUpperCase() +
    config.templateName.slice(1).replaceAll("-", " ");

  try {
    ensureDirectoryExists(modulePath);

    const templateData = {
      modelName: names,
      ...(config.customImports && { imports: config.customImports(names) }),
    };

    const content = generateTemplate(config.templateName, templateData);
    if (fs.existsSync(filePath))
      throw new Error(
        `${capitalize(humamReadableTemplateName.toLowerCase())} for ${options.model} already exists.`
      );
    fs.writeFileSync(filePath, content);

    console.info("");
    sheu.done(
      `${humamReadableTemplateName} for ${options.model} generated under ${fullCleanCwd(filePath)}`
    );
  } catch (err: any) {
    console.info("");
    sheu.error(
      `Failed because of ${err?.message?.toLowerCase() || "unknown reason"}`
    );
    process.exit(1);
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
    });
  },

  service: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "service",
      fileSuffix: "service",
      customImports: () => ({
        baseService: "arkos/services",
      }),
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
    });
  },

  interceptors: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "interceptors",
      fileSuffix: "interceptors",
    });
  },

  authConfigs: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "auth-configs",
      fileSuffix: "auth",
    });
  },

  hooks: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "hooks",
      fileSuffix: "hooks",
    });
  },

  createSchema: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "create-schema",
      fileSuffix: "schema",
      customPath: "src/modules/{{module-name}}/schemas",
      prefix: "create-",
    });
  },

  updateSchema: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "update-schema",
      fileSuffix: "schema",
      customPath: "src/modules/{{module-name}}/schemas",
      prefix: "update-",
    });
  },

  createDto: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "create-dto",
      fileSuffix: "dto",
      customPath: "src/modules/{{module-name}}/dtos",
      prefix: "create-",
    });
  },

  updateDto: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "update-dto",
      fileSuffix: "dto",
      customPath: "src/modules/{{module-name}}/dtos",
      prefix: "update-",
    });
  },

  queryOptions: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "query-options",
      fileSuffix: "query",
      customValidation: (modelName) => {
        if (modelName === "file-upload") {
          sheu.error(
            "Prisma query options are not available to file-upload resource"
          );
          process.exit(1);
        }
      },
    });
  },
};
