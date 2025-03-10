import { Request, Response, NextFunction } from "express";
import catchAsync from "../../modules/error-handler/utils/catch-async";
import AppError from "../../modules/error-handler/utils/app-error";

export const checkDatabaseConnection = (prisma: any) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.$connect();
      next();
    } catch (error: any) {
      console.error("Database connection error", error.message);
      next(new AppError(error.message, 503));
    }
  });
