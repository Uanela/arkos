import {
  camelCase,
  kebabCase,
  pascalCase,
} from "../../../../helpers/change-case.helpers";
import sheu from "../../../../sheu";
import { generateCommand, GenerateOptions } from "../../../generate";

export type MultipleComponentsGenerateOptions = GenerateOptions & {
  all?: boolean;
  names?: string;
};

export default async function generateMultipleComponents(
  options: MultipleComponentsGenerateOptions
) {
  const moduleName = options.module || options.model;

  if (!moduleName)
    throw new Error("Module name is required. Use -m or --module flag.");

  const componentMap: Record<string, Function> = {
    s: generateCommand.service,
    service: generateCommand.service,
    c: generateCommand.controller,
    controller: generateCommand.controller,
    r: generateCommand.router,
    router: generateCommand.router,
    sc: generateCommand.baseSchema,
    schema: generateCommand.baseSchema,
    cs: generateCommand.createSchema,
    "create-schema": generateCommand.createSchema,
    us: generateCommand.updateSchema,
    "update-schema": generateCommand.updateSchema,
    qs: generateCommand.querySchema,
    "query-schema": generateCommand.querySchema,
    d: generateCommand.baseDto,
    dto: generateCommand.baseDto,
    cd: generateCommand.createDto,
    "create-dto": generateCommand.createDto,
    ud: generateCommand.updateDto,
    "update-dto": generateCommand.updateDto,
    qd: generateCommand.queryDto,
    "query-dto": generateCommand.queryDto,
    m: generateCommand.prismaModel,
    model: generateCommand.prismaModel,
    a: generateCommand.authConfigs,
    "auth-configs": generateCommand.authConfigs,
    q: generateCommand.queryOptions,
    "query-options": generateCommand.queryOptions,
    i: generateCommand.interceptors,
    interceptors: generateCommand.interceptors,
    h: generateCommand.hooks,
    hooks: generateCommand.hooks,
  };

  const allComponents = [
    "model",
    "schema",
    "create-schema",
    "update-schema",
    "query-schema",
    "dto",
    "create-dto",
    "update-dto",
    "query-dto",
    "query-options",
    "service",
    "controller",
    "router",
    "interceptors",
    "hooks",
    "auth-configs",
  ];

  const defaultPaths: Record<string, string> = {
    "create-schema": "src/modules/{{module-name}}/schemas",
    "update-schema": "src/modules/{{module-name}}/schemas",
    "query-schema": "src/modules/{{module-name}}/schemas",
    schema: "src/modules/{{module-name}}/schemas",
    "create-dto": "src/modules/{{module-name}}/dtos",
    "update-dto": "src/modules/{{module-name}}/dtos",
    "query-dto": "src/modules/{{module-name}}/dtos",
    dto: "src/modules/{{module-name}}/dtos",
    model: "prisma/schema",
  };

  const names = {
    pascal: pascalCase(moduleName),
    camel: camelCase(moduleName),
    kebab: kebabCase(moduleName),
  };
  const readableName = names.kebab.replaceAll("-", " ");

  let componentsToGenerate: string[] = [];

  if (options.all) {
    componentsToGenerate = allComponents;
    console.log("");
    sheu.info(`Generating all components for ${readableName}\n`);
  } else if (options.names) {
    const requested = options.names
      .split(",")
      .map((c: string) => c.trim())
      .filter(Boolean);

    for (const comp of requested) {
      if (componentMap[comp]) {
        const fullName =
          Object.keys(componentMap).find(
            (k) => componentMap[k] === componentMap[comp] && k.length > 2
          ) || comp;
        if (!componentsToGenerate.includes(fullName)) {
          componentsToGenerate.push(fullName);
        }
      } else {
        sheu.warn(`Unknown component: "${comp}" - skipping`);
      }
    }

    if (componentsToGenerate.length === 0)
      throw new Error("No valid components specified.");

    sheu.info(`Generating components for ${readableName}`);
    sheu.info(`Components: ${componentsToGenerate.join(", ")}\n`);
  } else {
    throw new Error(
      "Please specify either --all or --components flag.\n" +
        "Examples:\n" +
        "  arkos g module -m user --all\n" +
        "  arkos g module -m user -c s,sc,m"
    );
  }

  let successCount = 0;
  let failCount = 0;

  for (const componentName of componentsToGenerate) {
    try {
      await componentMap[componentName]({
        ...options,
        module: moduleName,
        path: defaultPaths[componentName],
        shouldExit: false,
        shouldPrintError: false,
        isBulk: true,
      });
      successCount++;
    } catch (error: any) {
      sheu.error(
        `Failed to generate ${componentName} because ${error?.message}`
      );
      failCount++;
    }
  }

  console.info("");
  sheu.done(
    `Components generation complete ${moduleName.replaceAll("-", " ")}`
  );

  if (failCount > 0) {
    process.exit(1);
  }
}
