import { getUserFileExtension } from "../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../template-generators";

export function generateQueryOptionsTemplate(options: TemplateOptions): string {
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
    ? `import prisma from "../../utils/prisma";\n`
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
    global: {},
    find: {},
    findOne: {},
    findMany: {},
    update: {},
    updateMany: {},
    updateOne: {},
    create: {},
    createMany: {},
    createOne: {},
    save: {},
    saveMany: {},
    saveOne: {},
    delete: {},
    deleteMany: {},
    deleteOne: {},
}

export default ${modelName.camel}QueryOptions;
`;
  }
}
