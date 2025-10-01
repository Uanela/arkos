import { getUserFileExtension } from "../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../template-generators";

export function generateQueryOptionsTemplate(options: TemplateOptions): string {
  const { modelName } = options;
  const isAuth = modelName?.camel === "auth";
  const ext = getUserFileExtension();
  const isTypeScript = ext === "ts";

  if (!modelName)
    throw new Error("Module name is required for query config template");

  const imports = `import { PrismaQueryOptions } from 'arkos/prisma'`;

  const typeAnnotation = isTypeScript
    ? isAuth
      ? `: PrismaQueryOptions<Prisma.UserDelegate, "auth">`
      : `: PrismaQueryOptions<Prisma.${modelName.pascal}Delegate>`
    : "";

  const prismaImport = isTypeScript
    ? `import { Prisma } from "@prisma/client";\n`
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
