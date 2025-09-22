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

  const { path: customPath = "src/modules" } = options;

  const names = {
    pascal: pascalCase(modelName),
    camel: camelCase(modelName),
    kebab: kebabCase(modelName),
  };

  const ext = getUserFileExtension();
  const modulePath = path.join(process.cwd(), customPath, names.kebab);
  const filePath = path.join(
    modulePath,
    `${names.kebab}.${config.fileSuffix}.${ext}`
  );
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
      `${`Failed to generate ${humamReadableTemplateName.toLowerCase()}`} for ${options.model} ${filePath ? "under " + fullCleanCwd(filePath) + "." : "."}`
    );
    console.info(`${sheu.bold("Reason: ")}${err?.message || "unknown"}`);
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
      fileSuffix: "middlewares",
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

  createDto: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "create-dto",
      fileSuffix: "dto",
    });
  },

  updateDto: async (options: GenerateOptions) => {
    await generateFile(options, {
      templateName: "update-dto",
      fileSuffix: "dto",
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
