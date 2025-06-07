import pluralize from "pluralize";
import {
  checkFileExists,
  getUserFileExtension,
} from "../../helpers/fs.helpers";

interface ModelName {
  pascal: string;
  camel: string;
  kebab: string;
}

interface MiddlewareName {
  pascal: string;
  camel: string;
  kebab: string;
}

interface TemplateOptions {
  modelName?: ModelName;
  middlewareName?: MiddlewareName;
  imports?: Record<string, string>;
}

export function generateTemplate(
  type: string,
  options: TemplateOptions = {}
): string {
  switch (type) {
    case "controller":
      return generateControllerTemplate(options);
    case "service":
      return generateServiceTemplate(options);
    case "router":
      return generateRouterTemplate(options);
    case "auth-configs":
      return generateAuthConfigsTemplate(options);
    case "query-options":
      return generateQueryOptionsTemplate(options);
    case "middlewares":
      return generateMiddlewaresTemplate(options);
    default:
      throw new Error(`\n Unknown template type: ${type}`);
  }
}

function generateControllerTemplate(options: TemplateOptions): string {
  const { modelName, imports } = options;

  if (!modelName)
    throw new Error("Model name is required for controller template");

  return `import { BaseController } from "${
    imports?.baseController || "arkos/controllers"
  }";
  
  class ${modelName.pascal}Controller extends BaseController {
    constructor() {
      super("${modelName.kebab}");
    }
  }
  
  const ${modelName.camel}Controller = new ${modelName.pascal}Controller();
  
  export default ${modelName.camel}Controller;
  `;
}

function generateServiceTemplate(options: TemplateOptions): string {
  const { modelName, imports } = options;
  const ext = getUserFileExtension();
  const isTypeScript = ext === "ts";

  if (!modelName)
    throw new Error("Model name is required for service template");

  // Generate imports
  const prismaImport = isTypeScript
    ? `import { prisma } from "../../utils/prisma";\n`
    : "";

  const baseServiceImport = isTypeScript
    ? `import { BaseService } from "${
        imports?.baseService || "arkos/services"
      }";`
    : `import { BaseService } from "${
        imports?.baseService || "arkos/services"
      }";`;

  // Generate type parameter for TypeScript
  const typeParameter = isTypeScript
    ? `<typeof prisma.${modelName.camel}>`
    : "";

  return `${prismaImport}${baseServiceImport}
  
class ${modelName.pascal}Service extends BaseService${typeParameter} {
  constructor() {
    super("${modelName.kebab}");
  }

  // Add your custom service methods here
}

const ${modelName.camel}Service = new ${modelName.pascal}Service();

export default ${modelName.camel}Service;
`;
}

function generateRouterTemplate(options: TemplateOptions): string {
  const { modelName, imports } = options;

  if (!modelName) throw new Error("Model name is required for router template");

  // Check if controller file exists
  const ext = getUserFileExtension();
  const controllerPath =
    imports?.controller || `./${modelName.kebab}.controller.${ext}`;

  const controllerExists = checkFileExists(controllerPath);

  const controllerImportLine = controllerExists
    ? `import ${modelName.camel}Controller from "${
        imports?.controller || `./${modelName.kebab}.controller`
      }"`
    : `// import ${modelName.camel}Controller from "${
        imports?.controller || `./${modelName.kebab}.controller`
      }"`;

  const controllerHandlerLine = controllerExists
    ? `  ${modelName.camel}Controller.someHandler`
    : `  // ${modelName.camel}Controller.someHandler`;

  return `import { Router } from 'express'
import { authService } from 'arkos/services'
${controllerImportLine}

const ${modelName.camel}Router = Router()

${modelName.camel}Router.post(
  '/custom-endpoint', // resolves to /api/${pluralize(
    modelName.kebab
  )}/custom-endpoint
  authService.authenticate,
  authService.handleAccessControl('CustomAction', '${modelName.kebab}'),
${controllerHandlerLine}
)

export default ${modelName.camel}Router
`;
}

function generateAuthConfigsTemplate(options: TemplateOptions): string {
  const { modelName } = options;
  const ext = getUserFileExtension();
  const isTypeScript = ext === "ts";

  if (!modelName)
    throw new Error("Model name is required for auth config template");

  // Generate imports for TypeScript
  const imports = isTypeScript
    ? `import { AuthConfigs } from 'arkos/prisma';\n`
    : "";

  // Generate type annotation for TypeScript
  const typeAnnotation = isTypeScript ? `: AuthConfigs` : "";

  return `${imports}
const ${modelName.camel}AuthConfigs${typeAnnotation} = {
  authenticationControl: {
    // Create: true,
    // Update: true,
    // Delete: true,
    // View: false,
  },
  
  // Only when using Static RBAC
  accessControl: {
    // Create: ["Admin"],
    // Update: ["Admin", "Manager"],
    // Delete: ["Admin"],
    // View: ["User", "Admin", "Guest"],
  },
};

export default ${modelName.camel}AuthConfigs;
`;
}

function generateQueryOptionsTemplate(options: TemplateOptions): string {
  const { modelName } = options;
  const isAuth = modelName?.camel === "auth";
  const ext = getUserFileExtension();
  const isTypeScript = ext === "ts";

  if (!modelName)
    throw new Error("Model name is required for query config template");

  // Generate imports
  const imports = isAuth
    ? `import { AuthPrismaQueryOptions } from 'arkos/prisma'`
    : `import { PrismaQueryOptions } from 'arkos/prisma'`;

  // Generate type annotation for TypeScript
  const typeAnnotation = isTypeScript
    ? isAuth
      ? `: AuthPrismaQueryOptions<typeof prisma.${modelName.camel}>`
      : `: PrismaQueryOptions<typeof prisma.${modelName.camel}>`
    : "";

  // Generate prisma import if TypeScript
  const prismaImport = isTypeScript
    ? `import { prisma } from "../../utils/prisma";\n`
    : "";

  if (isAuth) {
    // Auth template
    return `${prismaImport}${imports};

const ${modelName.camel}QueryOptions${typeAnnotation} = {
  getMe: {},
  updateMe: {},
  deleteMe: {},
  login: {},
  signup: {},
  updatePassword: {},
}

export default ${modelName.camel}QueryOptions;
`;
  } else {
    // Regular template
    return `${prismaImport}${imports};

const ${modelName.camel}QueryOptions${typeAnnotation} = {
  // for all queries
  queryOptions: {},
  findOne: {},
  findMany: {},
  deleteMany: {},
  updateMany: {},
  createMany: {},
  createOne: {},
  updateOne: {},
  deleteOne: {},
}

export default ${modelName.camel}QueryOptions;
`;
  }
}

function generateMiddlewaresTemplate(options: TemplateOptions): string {
  const { modelName } = options;
  const ext = getUserFileExtension();
  const isTypeScript = ext === "ts";

  if (!modelName)
    throw new Error("Model name is required for middleware template");

  const isAuth = modelName.camel === "auth";
  const isFileUpload =
    modelName.camel === "fileUpload" || modelName.camel === "file-upload";

  // Generate imports based on TypeScript/JavaScript
  const requestType = isTypeScript ? "ArkosRequest" : "req";
  const responseType = isTypeScript ? "ArkosResponse" : "res";
  const nextType = isTypeScript ? "ArkosNextFunction" : "next";

  const baseImports = isTypeScript
    ? `import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { catchAsync } from "arkos/error-handler";`
    : `import { catchAsync } from "arkos/error-handler";`;

  const functionParams = isTypeScript
    ? `req: ${requestType}, res: ${responseType}, next: ${nextType}`
    : `req, res, next`;

  if (isAuth) {
    return `${baseImports}

// export const beforeGetMe = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterGetMe = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeLogin = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterLogin = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeLogout = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterLogout = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeSignup = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterSignup = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeUpdatePassword = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterUpdatePassword = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );
`;
  }

  if (isFileUpload) {
    return `${baseImports}


// export const beforeFindFile = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// There is not afterFindFile: because the main handler is handleded by express.static()

// export const beforeUploadFile = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterUploadFile = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeUpdateFile = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterUpdateFile = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeDeleteFile = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterDeleteFile = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );
`;
  }

  // Regular model middlewares
  return `${baseImports}

// export const beforeCreateOne = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterCreateOne = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeFindOne = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterFindOne = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeFindMany = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterFindMany = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeUpdateOne = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterUpdateOne = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeDeleteOne = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterDeleteOne = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeCreateMany = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterCreateMany = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeUpdateMany = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterUpdateMany = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeDeleteMany = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterDeleteMany = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );
`;
}
