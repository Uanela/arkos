import fs from "fs";
import AppError from "../../modules/error-handler/utils/app-error";
import { crd, getUserFileExtension as ext } from "./fs.helpers";
import { importModule } from "./global.helpers";
import prismaSchemaParser from "../prisma/prisma-schema-parser";
import { pascalCase } from "./change-case.helpers";

export let prismaInstance: any = null;

export async function loadPrismaModule() {
  if (!prismaInstance) {
    try {
      let prismaPath = `${crd()}/src/utils/prisma.${ext()}`;

      if (!fs.existsSync(prismaPath))
        prismaPath = `${crd()}/src/utils/prisma/index.${ext()}`;

      if (!fs.existsSync(prismaPath)) throw new Error(`Prisma not found`);

      const prismaModule = await importModule(prismaPath, {
        fixExtension: false,
      });
      prismaInstance = prismaModule.default;

      if (
        !prismaInstance ||
        typeof prismaInstance[pascalCase(prismaSchemaParser.models?.[0].name)]
          ?.findFirst !== "function"
      )
        throw new Error("Prisma not found");
    } catch (error: any) {
      if (error.message === "Prisma not found")
        throw new AppError(
          `Could not initialize Prisma module. Make sure your prisma instance is exported as default under src/utils/prisma/index.${ext()}, read more about Arkos.js Project Structure under https://www.arkosjs.com/docs/getting-started/project-structure#utilities-directory`,
          500,
          {},
          "PrismaInstanceNotFound"
        );
      throw error;
    }
  }
  return prismaInstance;
}

export function getPrismaInstance() {
  return prismaInstance;
}
