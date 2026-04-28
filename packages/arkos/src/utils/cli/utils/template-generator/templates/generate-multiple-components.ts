import path from "path";
import {
  camelCase,
  kebabCase,
  pascalCase,
} from "../../../../helpers/change-case.helpers";
import ExitError from "../../../../helpers/exit-error";
import sheu from "../../../../sheu";
import { generateCommand, GenerateOptions } from "../../../generate";

export type MultipleComponentsGenerateOptions = GenerateOptions & {
  all?: boolean;
  names?: string;
};

const authOnlyComponents = new Set([
  "login-schema",
  "signup-schema",
  "update-me-schema",
  "update-password-schema",
  "login-dto",
  "signup-dto",
  "update-me-dto",
  "update-password-dto",
]);

const prismaOnlyComponents = new Set([
  "model",
  "schema",
  "create-schema",
  "update-schema",
  "query-schema",
  "dto",
  "create-dto",
  "update-dto",
  "query-dto",
]);

export default async function generateMultipleComponents(
  options: MultipleComponentsGenerateOptions
) {
  const moduleInput = options.module || options.model;

  if (!moduleInput)
    throw ExitError("Module name is required. Use -m or --module flag.");

  if (options.path && path.extname(options.path) !== "")
    throw ExitError(
      "--path or -p must be a directory when generating multiple components or modules."
    );

  const moduleNames = moduleInput
    .split(",")
    .map((m: string) => m.trim())
    .filter(Boolean);

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
    p: generateCommand.policy,
    policy: generateCommand.policy,
    ls: generateCommand.loginSchema,
    "login-schema": generateCommand.loginSchema,
    ss: generateCommand.signupSchema,
    "signup-schema": generateCommand.signupSchema,
    ums: generateCommand.updateMeSchema,
    "update-me-schema": generateCommand.updateMeSchema,
    ups: generateCommand.updatePasswordSchema,
    "update-password-schema": generateCommand.updatePasswordSchema,
    ld: generateCommand.loginDto,
    "login-dto": generateCommand.loginDto,
    sd: generateCommand.signupDto,
    "signup-dto": generateCommand.signupDto,
    umd: generateCommand.updateMeDto,
    "update-me-dto": generateCommand.updateMeDto,
    upd: generateCommand.updatePasswordDto,
    "update-password-dto": generateCommand.updatePasswordDto,
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
    "policy",
  ];

  const allAuthComponents = [
    "login-schema",
    "signup-schema",
    "update-me-schema",
    "update-password-schema",
    "login-dto",
    "signup-dto",
    "update-me-dto",
    "update-password-dto",
    "query-options",
    "interceptors",
    "hooks",
    "router",
    "policy",
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
    "login-schema": "src/modules/auth/schemas",
    "signup-schema": "src/modules/auth/schemas",
    "update-me-schema": "src/modules/auth/schemas",
    "update-password-schema": "src/modules/auth/schemas",
    "login-dto": "src/modules/auth/dtos",
    "signup-dto": "src/modules/auth/dtos",
    "update-me-dto": "src/modules/auth/dtos",
    "update-password-dto": "src/modules/auth/dtos",
  };

  // Resolve which components to generate from --names or --all
  // (done once, applied per module with filtering)
  let requestedComponents: string[] = [];

  if (options.all) {
    // will be resolved per module below
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
        if (!requestedComponents.includes(fullName)) {
          requestedComponents.push(fullName);
        }
      } else {
        sheu.warn(`Unknown component: "${comp}" - skipping`);
      }
    }

    if (requestedComponents.length === 0)
      throw new Error("No valid components specified.");
  } else {
    throw new Error(
      "Please specify either --all or --names flag.\n" +
        "Examples:\n" +
        "  arkos g components -m user --all\n" +
        "  arkos g components -m user,post,auth --names s,sc,m"
    );
  }

  const isMultipleModules = moduleNames.length > 1;
  let totalSuccess = 0;
  let totalFail = 0;

  if (isMultipleModules) {
    console.log("");
    sheu.info(`Generating components for modules: ${moduleNames.join(", ")}\n`);
  }

  for (const moduleName of moduleNames) {
    const isAuth = kebabCase(moduleName) === "auth";
    const names = {
      pascal: pascalCase(moduleName),
      camel: camelCase(moduleName),
      kebab: kebabCase(moduleName),
    };
    const readableName = names.kebab.replaceAll("-", " ");

    // Resolve components for this specific module
    let componentsToGenerate: string[];

    if (options.all) {
      componentsToGenerate = isAuth ? allAuthComponents : allComponents;
    } else {
      // Filter requested components — skip auth-only for non-auth, skip prisma-only for auth
      componentsToGenerate = requestedComponents.filter((comp) => {
        if (authOnlyComponents.has(comp) && !isAuth) {
          sheu.warn(
            `Skipping "${comp}" for module "${moduleName}" — only valid for auth`
          );
          return false;
        }
        if (prismaOnlyComponents.has(comp) && isAuth) {
          sheu.warn(
            `Skipping "${comp}" for module "${moduleName}" — not valid for auth`
          );
          return false;
        }
        return true;
      });
    }

    if (isMultipleModules) {
      console.log("");
      sheu.info(`Module ${readableName}`);
    } else {
      console.log("");
      sheu.info(`Generating components for ${readableName}`);
      if (!options.all)
        sheu.info(`Components: ${componentsToGenerate.join(", ")}\n`);
    }

    let successCount = 0;
    let failCount = 0;

    for (const componentName of componentsToGenerate) {
      try {
        await componentMap[componentName]({
          ...options,
          module: moduleName,
          model: undefined,
          path: options.path || defaultPaths[componentName],
          shouldExit: false,
          shouldPrintError: false,
          isBulk: true,
        });
        successCount++;
      } catch (error: any) {
        sheu.error(
          `Failed to generate ${componentName} for ${readableName}: ${error?.message}`
        );
        failCount++;
      }
    }

    totalSuccess += successCount;
    totalFail += failCount;
  }

  console.info("");
  sheu.done(
    `Components generation complete for: ${moduleNames.map((m) => m.replaceAll("-", " ")).join(", ")}`
  );

  if (totalFail > 0) process.exit(1);
}
