import fs from "fs";
import { Request, Response, NextFunction } from "express";
import catchAsync from "../../modules/error-handler/utils/catch-async";
import AppError from "../../modules/error-handler/utils/app-error";
import { getUserFileExtension } from "./fs.helpers";
import { importModule } from "./global.helpers";

export let prismaInstance: any = null;

export async function loadPrismaModule(a?: string) {
  if (!prismaInstance) {
    try {
      let prismaPath = `${
        process.env.NODE_ENV === "production"
          ? process.cwd() + "/.build/"
          : process.cwd()
      }/src/utils/prisma.${getUserFileExtension()}`;

      if (!fs.existsSync(prismaPath)) {
        prismaPath = `${
          process.env.NODE_ENV === "production"
            ? process.cwd() + "/.build/"
            : process.cwd()
        }/src/utils/prisma/index.${getUserFileExtension()}`;
      }

      const prismaModule = await importModule(prismaPath);
      prismaInstance = prismaModule.default || prismaModule.prisma;

      if (!prismaInstance) throw new Error("not found");
    } catch (error) {
      throw new AppError("Could not initialize Prisma module.", 500, {
        tip: `Make sure your prisma instance is exported under src/utils/prisma.${getUserFileExtension()}, read more about Arkos' Project Structure under https://www.arkosjs.com/docs/project-structure#root-structure`,
      });
    }
  }
  return prismaInstance;
}

export function getPrismaInstance() {
  return prismaInstance;
}

export const checkDatabaseConnection = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const prisma = await loadPrismaModule();
    try {
      await prisma.$connect();
      next();
    } catch (error: any) {
      console.error("Database connection error", error.message);
      next(new AppError(error.message, 503));
    }
  }
);
