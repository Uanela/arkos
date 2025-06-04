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
    case "auth":
      return generateAuthConfigTemplate();
    case "query":
      return generateQueryConfigTemplate(options);
    case "middleware":
      return generateMiddlewareTemplate(options);
    default:
      throw new Error(`Unknown template type: ${type}`);
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

  if (!modelName)
    throw new Error("Model name is required for service template");

  return `import { BaseService } from "${
    imports?.baseService || "arkos/services"
  }";
  
  class ${modelName.pascal}Service extends BaseService {
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

  return `import { Router } from "express";
  import { createRoutes } from "${imports?.baseRouter || "arkos"}";
  import ${modelName.camel}Controller from "${
    imports?.controller || `./${modelName.kebab}.controller`
  }";
  
  const ${modelName.camel}Router = Router();
  
  // Generate CRUD routes automatically
  createRoutes(${modelName.camel}Router, ${modelName.camel}Controller);
  
  // Add custom routes here
  // ${modelName.camel}Router.get('/custom', ${
    modelName.camel
  }Controller.customMethod);
  
  export default ${modelName.camel}Router;
  `;
}

function generateAuthConfigTemplate(): string {
  return `export const authConfig = {
    jwt: {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },
    bcrypt: {
      saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'),
    },
    cookie: {
      name: process.env.COOKIE_NAME || 'arkos-token',
      maxAge: parseInt(process.env.COOKIE_MAX_AGE || '604800000'), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX || '5'), // 5 attempts
    },
    email: {
      verification: {
        required: process.env.EMAIL_VERIFICATION_REQUIRED === 'true',
        expiresIn: process.env.EMAIL_VERIFICATION_EXPIRES_IN || '24h',
      },
      passwordReset: {
        expiresIn: process.env.PASSWORD_RESET_EXPIRES_IN || '1h',
      },
    },
  };
  
  export default authConfig;
  `;
}

function generateQueryConfigTemplate(options: TemplateOptions): string {
  const { modelName } = options;

  if (!modelName)
    throw new Error("Model name is required for query config template");

  return `export const ${modelName.camel}QueryOptions = {
    // Define searchable fields
    searchFields: [
      // 'name',
      // 'email',
      // 'description',
    ],
    
    // Define filterable fields
    filterFields: [
      // 'status',
      // 'type',
      // 'createdAt',
    ],
    
    // Define sortable fields
    sortFields: [
      'id',
      'createdAt',
      'updatedAt',
      // Add other sortable fields
    ],
    
    // Define relations to include
    include: {
      // relationName: true,
      // relationName: {
      //   select: {
      //     id: true,
      //     name: true,
      //   }
      // }
    },
    
    // Define fields to select (if not all)
    select: {
      // id: true,
      // name: true,
      // email: true,
      // createdAt: true,
      // updatedAt: true,
    },
    
    // Default pagination
    pagination: {
      defaultLimit: 10,
      maxLimit: 100,
    },
    
    // Default sorting
    defaultSort: {
      field: 'createdAt',
      order: 'desc' as const,
    },
  };
  
  export default ${modelName.camel}QueryOptions;
  `;
}

function generateMiddlewareTemplate(options: TemplateOptions): string {
  const { middlewareName } = options;

  if (!middlewareName)
    throw new Error("Middleware name is required for middleware template");

  return `import { Request, Response, NextFunction } from 'express';
  
  export const ${middlewareName.camel}Middleware = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      // Add your middleware logic here
      console.log(\`${middlewareName.pascal} middleware executed for \${req.method} \${req.path}\`);
      
      // Continue to next middleware
      next();
    } catch (error) {
      next(error);
    }
  };
  
  export default ${middlewareName.camel}Middleware;
  `;
}
