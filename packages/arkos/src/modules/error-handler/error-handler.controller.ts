import { NextFunction, Request, Response } from "express";
import AppError from "./utils/app-error";
import * as errorControllerHelper from "./utils/error-handler.helpers";
import { server } from "../../server";

/**
 * Error handling middleware for Express.
 *
 * This middleware function handles all errors in the Express application.
 * It checks for the environment (development or production) and sends appropriate error responses
 * based on whether the environment is production or not. It also maps specific errors such as
 * JWT errors, Prisma client errors, and database-related errors to specific helper functions for handling.
 *
 * @param {AppError} err - The error object thrown by the application.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} _ - The next middleware function in the chain.
 *
 * @returns {void} - Sends the response with the error details to the client.
 */
export default function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _: NextFunction
): void {
  console.error("[\x1b[31mError\x1b[0m]:", err);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  let error: any = {
    ...err,
    message: err.message,
    stack: err?.stack || undefined,
  };

  if (process.env.ARKOS_BUILD === "true") delete error?.stack;

  switch (err.name) {
    case "JsonWebTokenError":
      error = errorControllerHelper.handleJWTError();
      break;
    case "TokenExpiredError":
      error = errorControllerHelper.handleJWTExpired();
      break;
    case "PrismaClientValidationError":
      error = errorControllerHelper.handlePrismaClientValidationError(err);
      break;
    case "PrismaClientInitializationError":
      error = errorControllerHelper.handlePrismaClientInitializationError(err);
      break;
    case "NetworkError":
      error = errorControllerHelper.handleNetworkError(err);
      break;
  }

  switch (err.code) {
    case "P1000":
      error = errorControllerHelper.handleAuthenticationError(err);
      break;
    case "P1001":
      error = errorControllerHelper.handleServerNotReachableError(err);
      break;
    case "P1002":
      error = errorControllerHelper.handleConnectionTimeoutError(err);
      break;
    case "P1003":
      error = errorControllerHelper.handleDatabaseNotFoundError(err);
      break;
    case "P2000":
      error = errorControllerHelper.handleFieldValueTooLargeError(err);
      break;
    case "P2001":
      error = errorControllerHelper.handleRecordNotFoundError(err);
      break;
    case "P2002":
      error = errorControllerHelper.handleUniqueConstraintError(err);
      break;
    case "P2003":
      error = errorControllerHelper.handleForeignKeyConstraintError(err);
      break;
    case "P2004":
      error = errorControllerHelper.handleConstraintFailedError(err);
      break;
    case "P2011":
      error = errorControllerHelper.handleNullConstraintViolationError(err);
      break;
    case "P2014":
      error = errorControllerHelper.handleRequiredRelationViolationError(err);
      break;
    case "P2025":
      error = errorControllerHelper.handleNonExistingRecord(err);
      break;
    case "P3000":
      error = errorControllerHelper.handleSchemaCreationFailedError(err);
      break;
    case "P3001":
      error = errorControllerHelper.handleMigrationAlreadyAppliedError(err);
      break;
    case "P3002":
      error = errorControllerHelper.handleMigrationScriptFailedError(err);
      break;
    case "P3003":
      error = errorControllerHelper.handleVersionMismatchError(err);
      break;
  }

  const { message, ...rest } = error;
  if (process.env.ARKOS_BUILD !== "true")
    return sendDevelopmentError(
      {
        message: error.message,
        ...rest,
        stack: err.stack,
        originalError: err,
      },
      req,
      res
    );

  sendProductionError({ message, ...rest }, req, res);
}

/**
 * Sends a detailed error response in development mode.
 *
 * In development, the error response includes full error details, including
 * the stack trace and the complete error message.
 *
 * @param {AppError} err - The error object.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 *
 * @returns {void} - Sends the response with the error details to the client.
 */
function sendDevelopmentError(err: any, req: Request, res: Response): void {
  if (req.originalUrl.startsWith("/api")) {
    const { message, code, ...rest } = err;

    res.status(err.statusCode).json({
      message:
        err.message?.split?.("\n")[err.message?.split?.("\n").length - 1],
      code: code || "Unknown",
      ...rest,
      stack: err?.originalError?.stack?.split?.("\n"),
    });
  } else
    res.status(err.statusCode).json({
      title: "Internal server error",
      message: err.message,
    });
}

/**
 * Sends a generic error response in production mode.
 *
 * In production, sensitive error details (such as stack traces) are not exposed
 * to the client. Only operational errors are shown with a generic message.
 *
 * @param {AppError} err - The error object.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 *
 * @returns {void} - Sends the response with the error details to the client.
 */
function sendProductionError(err: AppError, req: Request, res: Response): void {
  if (req.originalUrl.startsWith("/api")) {
    if (err.isOperational)
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        meta: err.meta || {},
        code: err.code || "Unknown",
      });
    else
      res.status(500).json({
        status: "error",
        message: "Internal server error, please try again later.",
        code: "Unknown",
        meta: {},
      });

    return;
  }

  if (err.isOperational) {
    res.status(err.statusCode).json({
      title: "Internal server error",
      message: err.message,
      code: "Unknown",
    });
    return;
  }

  res.status(err.statusCode).json({
    title: "Internal server error",
    message: "Internal server error, please try again later.",
  });
}

/**
 * Gracefully handles process termination by listening for SIGTERM signal.
 *
 * - In production and staging environments, it will log a shutdown message
 *   and attempt to close the server gracefully.
 * - In development or non-production environments, it will immediately exit the process.
 *
 * @returns {void}
 */
process.on("SIGTERM", () => {
  if (process.env.ARKOS_BUILD !== "true") {
    process.exit();
  } else {
    console.error("SIGTERM RECEIVED in Production. Shutting down gracefully!");

    server.close(() => {
      console.error("Process terminated!!!");
      process.exit();
    });
  }
});
