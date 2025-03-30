import fs from "fs";
import { Request, Response, NextFunction } from "express";
import catchAsync from "../../modules/error-handler/utils/catch-async";
import AppError from "../../modules/error-handler/utils/app-error";
import { userFileExtension } from "./fs.helpers";

let prismaInstance: any = null;

export const loadPrismaModule = async () => {
  if (!prismaInstance) {
    try {
      let prismaPath = `${process.cwd()}/src/utils/prisma/index.${userFileExtension}`;

      if (!fs.existsSync(prismaPath)) {
        prismaPath = `${process.cwd()}/src/utils/prisma.${userFileExtension}`;
      }

      const prismaModule = await import(prismaPath);
      prismaInstance = prismaModule.default || prismaModule.prisma;
    } catch (error) {
      console.error("Failed to load prisma.ts:", error);
      throw new Error("Could not initialize Prisma module.");
    }
  }
  return prismaInstance;
};

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
