import fs from "fs";
import path from "path";
import { generateTemplate } from "./utils/template-generators";
import { ensureDirectoryExists } from "./utils/cli.helpers";
import {
  camelCase,
  kebabCase,
  pascalCase,
} from "../helpers/change-case.helpers";
import { getUserFileExtension } from "../helpers/fs.helpers";

interface GenerateOptions {
  path?: string;
  model: string;
}

export const generateCommand = {
  controller: async (options: GenerateOptions) => {
    const modelName = options.model;
    if (!modelName) {
      console.error("\n❌ Model name is required");
      process.exit(1);
    }

    const { path: customPath = "src/modules" } = options;

    const names = {
      pascal: pascalCase(modelName),
      camel: camelCase(modelName),
      kebab: kebabCase(modelName),
    };

    const ext = getUserFileExtension();
    const modulePath = path.join(process.cwd(), customPath, names.kebab);
    const filePath = path.join(modulePath, `${names.kebab}.controller.${ext}`);

    try {
      ensureDirectoryExists(modulePath);

      const content = generateTemplate("controller", {
        modelName: names,
        imports: {
          baseController: "arkos/controllers",
        },
      });

      fs.writeFileSync(filePath, content);
      console.info(
        `\nntroller generated: ${filePath.replace(process.cwd(), "")}`
      );
    } catch (error) {
      console.error(`❌ Failed to generate controller:`, error);
      process.exit(1);
    }
  },

  service: async (options: GenerateOptions) => {
    const modelName = options.model;
    if (!modelName) {
      console.error("\n❌ Model name is required");
      process.exit(1);
    }

    const { path: customPath = "src/modules" } = options;

    const names = {
      pascal: pascalCase(modelName),
      camel: camelCase(modelName),
      kebab: kebabCase(modelName),
    };

    const ext = getUserFileExtension();
    const modulePath = path.join(process.cwd(), customPath, names.kebab);
    const filePath = path.join(modulePath, `${names.kebab}.service.${ext}`);

    try {
      ensureDirectoryExists(modulePath);

      const content = generateTemplate("service", {
        modelName: names,
        imports: {
          baseService: "arkos/services",
        },
      });

      fs.writeFileSync(filePath, content);
      console.info(`\n✅ Service generated: ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to generate service:`, error);
      process.exit(1);
    }
  },

  router: async (options: GenerateOptions) => {
    const modelName = options.model;
    if (!modelName) {
      console.error("\n❌ Model name is required");
      process.exit(1);
    }

    const { path: customPath = "src/modules" } = options;

    const names = {
      pascal: pascalCase(modelName),
      camel: camelCase(modelName),
      kebab: kebabCase(modelName),
    };

    const ext = getUserFileExtension();
    const modulePath = path.join(process.cwd(), customPath, names.kebab);
    const filePath = path.join(modulePath, `${names.kebab}.router.${ext}`);

    try {
      ensureDirectoryExists(modulePath);

      const content = generateTemplate("router", {
        modelName: names,
        imports: {
          baseRouter: "arkos",
          controller: `./${names.kebab}.controller`,
        },
      });

      fs.writeFileSync(filePath, content);
      console.info(
        `\nRouter generated: ${filePath.replace(process.cwd(), "")}`
      );
    } catch (error) {
      console.error(`❌ Failed to generate router:`, error);
      process.exit(1);
    }
  },

  middlewares: async (options: GenerateOptions) => {
    const modelName = options.model;

    if (!modelName) {
      console.error("❌ Middleware name is required");
      process.exit(1);
    }

    const { path: customPath = "src/modules" } = options;

    const names = {
      pascal: pascalCase(modelName),
      camel: camelCase(modelName),
      kebab: kebabCase(modelName),
    };

    const ext = getUserFileExtension();
    const middlewarePath = path.join(process.cwd(), customPath, names.kebab);
    const filePath = path.join(
      middlewarePath,
      `${names.kebab}.middlewares.${ext}`
    );

    try {
      ensureDirectoryExists(middlewarePath);

      const content = generateTemplate("middlewares", {
        modelName: names,
      });

      fs.writeFileSync(filePath, content);
      console.info(`\nMiddlewares generated: ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to generate middleware:`, error);
      process.exit(1);
    }
  },

  authConfigs: async (options: GenerateOptions) => {
    const modelName = options.model;
    const { path: customPath = "src/modules" } = options;

    const names = {
      pascal: pascalCase(modelName),
      camel: camelCase(modelName),
      kebab: kebabCase(modelName),
    };

    const ext = getUserFileExtension();
    const configPath = path.join(process.cwd(), customPath, names.kebab);
    const filePath = path.join(configPath, `${names.kebab}.auth.${ext}`);

    try {
      ensureDirectoryExists(configPath);

      const content = generateTemplate("auth-configs", { modelName: names });

      fs.writeFileSync(filePath, content);
      console.info(
        `\nAuth config generated: ${filePath.replace(process.cwd(), "")}`
      );
    } catch (error) {
      console.error(`❌ Failed to generate auth config:`, error);
      process.exit(1);
    }
  },

  queryOptions: async (options: GenerateOptions) => {
    const modelName = options.model;
    if (!modelName) {
      console.error("\n❌ Model name is required");
      process.exit(1);
    }

    if (modelName === "file-upload") {
      console.error(
        "\n❌ Prisma query options are not available to file-upload resource"
      );
      process.exit(1);
    }

    const { path: customPath = "src/modules" } = options;

    const names = {
      pascal: pascalCase(modelName),
      camel: camelCase(modelName),
      kebab: kebabCase(modelName),
    };

    const ext = getUserFileExtension();
    const configPath = path.join(process.cwd(), customPath, names.kebab);
    const filePath = path.join(configPath, `${names.kebab}.query.${ext}`);

    try {
      ensureDirectoryExists(configPath);

      const content = generateTemplate("query-options", { modelName: names });

      fs.writeFileSync(filePath, content);
      console.info(
        `\nQuery config generated: ${filePath.replace(process.cwd(), "")}`
      );
    } catch (error) {
      console.error(`❌ Failed to generate query config:`, error);
      process.exit(1);
    }
  },
};
