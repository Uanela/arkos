import { getUserFileExtension } from "../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../template-generators";

export function generateQueryOptionsTemplate(options: TemplateOptions): string {
  const { modelName } = options;
  const isAuth = modelName?.camel === "auth";
  const ext = getUserFileExtension();
  const isTypeScript = ext === "ts";

  if (!modelName)
    throw new Error("Module name is required for query config template");

  const imports = isAuth
    ? `import { AuthPrismaQueryOptions } from 'arkos/prisma'`
    : `import { PrismaQueryOptions } from 'arkos/prisma'`;

  const typeAnnotation = isTypeScript
    ? isAuth
      ? `: AuthPrismaQueryOptions<typeof prisma.${modelName.camel}>`
      : `: PrismaQueryOptions<typeof prisma.${modelName.camel}>`
    : "";

  const prismaImport = isTypeScript
    ? `import prisma from "../../utils/prisma";\n`
    : "";

  if (isAuth) {
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
