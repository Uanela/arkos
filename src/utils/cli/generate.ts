// src/utils/cli/generate.ts
import fs from "fs";
import path from "path";
import { generateTemplate } from "./utils/generators";
import { ensureDirectoryExists } from "./utils/helpers";
import {
  camelCase,
  kebabCase,
  pascalCase,
} from "../helpers/change-case.helpers";

interface GenerateOptions {
  path?: string;
  model: string;
}

export const generateCommand = {
  controller: async (options: GenerateOptions) => {
    const modelName = options.model;
    if (!modelName) {
      console.error("❌ Model name is required");
      process.exit(1);
    }

    const { path: customPath = "src/modules" } = options;

    const names = {
      pascal: pascalCase(modelName),
      camel: camelCase(modelName),
      kebab: kebabCase(modelName),
    };

    const modulePath = path.join(process.cwd(), customPath, names.kebab);
    const filePath = path.join(modulePath, `${names.kebab}.controller.ts`);

    try {
      ensureDirectoryExists(modulePath);

      const content = generateTemplate("controller", {
        modelName: names,
        imports: {
          baseController: "arkos/controllers",
        },
      });

      fs.writeFileSync(filePath, content);
      console.log(
        `\nController generated: ${filePath.replace(process.cwd(), "")}`
      );
    } catch (error) {
      console.error(`❌ Failed to generate controller:`, error);
      process.exit(1);
    }
  },

  service: async (options: GenerateOptions) => {
    const modelName = options.model;
    if (!modelName) {
      console.error("❌ Model name is required");
      process.exit(1);
    }

    const { path: customPath = "src/modules" } = options;

    const names = {
      pascal: pascalCase(modelName),
      camel: camelCase(modelName),
      kebab: kebabCase(modelName),
    };

    const modulePath = path.join(process.cwd(), customPath, names.kebab);
    const filePath = path.join(modulePath, `${names.kebab}.service.ts`);

    try {
      ensureDirectoryExists(modulePath);

      const content = generateTemplate("service", {
        modelName: names,
        imports: {
          baseService: "arkos/services",
        },
      });

      fs.writeFileSync(filePath, content);
      console.log(`✅ Service generated: ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to generate service:`, error);
      process.exit(1);
    }
  },

  router: async (options: GenerateOptions) => {
    const modelName = options.model;
    if (!modelName) {
      console.error("❌ Model name is required");
      process.exit(1);
    }

    const { path: customPath = "src/modules" } = options;

    const names = {
      pascal: pascalCase(modelName),
      camel: camelCase(modelName),
      kebab: kebabCase(modelName),
    };

    const modulePath = path.join(process.cwd(), customPath, names.kebab);
    const filePath = path.join(modulePath, `${names.kebab}.router.ts`);

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
      console.log(`✅ Router generated: ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to generate router:`, error);
      process.exit(1);
    }
  },

  middleware: async (middlewareName: string, options: GenerateOptions) => {
    if (!middlewareName) {
      console.error("❌ Middleware name is required");
      process.exit(1);
    }

    const { path: customPath = "src/modules" } = options;

    const names = {
      pascal: pascalCase(middlewareName),
      camel: camelCase(middlewareName),
      kebab: kebabCase(middlewareName),
    };

    const middlewarePath = path.join(process.cwd(), customPath);
    const filePath = path.join(middlewarePath, `${names.kebab}.middlewares.ts`);

    try {
      ensureDirectoryExists(middlewarePath);

      const content = generateTemplate("middleware", { middlewareName: names });

      fs.writeFileSync(filePath, content);
      console.log(`✅ Middleware generated: ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to generate middleware:`, error);
      process.exit(1);
    }
  },

  authConfig: async (options: GenerateOptions) => {
    const modelName = options.model;
    const { path: customPath = "src/modules" } = options;

    const names = {
      pascal: pascalCase(modelName),
      camel: camelCase(modelName),
      kebab: kebabCase(modelName),
    };

    const configPath = path.join(process.cwd(), customPath);
    const filePath = path.join(configPath, `${names.kebab}.auth.ts`);

    try {
      ensureDirectoryExists(configPath);

      const content = generateTemplate("auth-config");

      fs.writeFileSync(filePath, content);
      console.log(`✅ Auth config generated: ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to generate auth config:`, error);
      process.exit(1);
    }
  },

  queryOptions: async (options: GenerateOptions) => {
    const modelName = options.model;
    if (!modelName) {
      console.error("❌ Model name is required");
      process.exit(1);
    }

    const { path: customPath = "src/modules" } = options;

    const names = {
      pascal: pascalCase(modelName),
      camel: camelCase(modelName),
      kebab: kebabCase(modelName),
    };

    const configPath = path.join(process.cwd(), customPath);
    const filePath = path.join(configPath, `${names.kebab}.query.ts`);

    try {
      ensureDirectoryExists(configPath);

      const content = generateTemplate("query-options", { modelName: names });

      fs.writeFileSync(filePath, content);
      console.log(`✅ Query config generated: ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to generate query config:`, error);
      process.exit(1);
    }
  },
};
