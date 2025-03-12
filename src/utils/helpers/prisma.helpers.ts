import { Request, Response, NextFunction } from "express";
import catchAsync from "../../modules/error-handler/utils/catch-async";
import AppError from "../../modules/error-handler/utils/app-error";

let prismaInstance: any = null;

export const loadPrismaModule = async () => {
  if (!prismaInstance) {
    try {
      const prismaModule = await import(`${process.cwd()}/src/utils/prisma`);
      prismaInstance = prismaModule.default || prismaModule.prisma;
    } catch (error) {
      console.error("Failed to load prisma.ts:", error);
      throw new Error("Could not initialize Prisma module.");
    }
  }
  return prismaInstance;
};

export const checkDatabaseConnection = (prisma: any) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    prisma = await loadPrismaModule();
    try {
      await prisma.$connect();
      next();
    } catch (error: any) {
      console.error("Database connection error", error.message);
      next(new AppError(error.message, 503));
    }
  });
