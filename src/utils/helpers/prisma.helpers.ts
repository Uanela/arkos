import fs from "fs";
import { Request, Response, NextFunction } from "express";
import catchAsync from "../../modules/error-handler/utils/catch-async";
import AppError from "../../modules/error-handler/utils/app-error";
import { userFileExtension } from "./fs.helpers";
import { importModule } from "./global.helpers";

export let prismaInstance: any = null;

export async function loadPrismaModule(a?: string) {
  if (!prismaInstance) {
    try {
      let prismaPath = `${process.cwd()}/src/utils/prisma.${userFileExtension}`;

      if (!fs.existsSync(prismaPath)) {
        prismaPath = `${process.cwd()}/src/utils/prisma/index.${userFileExtension}`;
      }

      const prismaModule = await importModule(prismaPath);
      prismaInstance = prismaModule.default || prismaModule.prisma;
      // console.log(prismaInstance, prismaModule, a, "prismaInstance");

      if (!prismaInstance) throw new Error("not found");
    } catch (error) {
      // console.error(`Failed to load prisma.${userFileExtension}:`, error);
      throw new AppError("Could not initialize Prisma module.", 500, { error });
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
