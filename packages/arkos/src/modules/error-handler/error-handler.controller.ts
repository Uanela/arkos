import { NextFunction, Request, Response } from "express";
import AppError from "./utils/app-error";
import { getAppServer } from "../../app";
import { getHandledError } from "./utils/get-handled-error";

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

  err.statusCode = err.isOperational ? err.statusCode : 500;
  err.status = err.isOperational ? err.status : "error";

  let error: any = {
    ...err,
    message: err.message,
    stack: err?.stack || undefined,
  };

  if (process.env.ARKOS_BUILD === "true") delete error?.stack;

  error = getHandledError(error);

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
 * @param {Request} _ - The Express request object.
 * @param {Response} res - The Express response object.
 *
 * @returns {void} - Sends the response with the error details to the client.
 */
function sendDevelopmentError(err: any, _: Request, res: Response): void {
  res.status(err.statusCode).json({
    ...err,
    message: err.message?.split?.("\n")[err.message?.split?.("\n").length - 1],
    stack: err?.originalError?.stack?.split?.("\n"),
  });
}

/**
 * Sends a generic error response in production mode.
 *
 * In production, sensitive error details (such as stack traces) are not exposed
 * to the client. Only operational errors are shown with a generic message.
 *
 * @param {AppError} err - The error object.
 * @param {Request} _ - The Express request object.
 * @param {Response} res - The Express response object.
 *
 * @returns {void} - Sends the response with the error details to the client.
 */
function sendProductionError(err: AppError, _: Request, res: Response): void {
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
      code: "InternalServerError",
      meta: {},
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
  if (
    process.env.ARKOS_BUILD !== "true" ||
    process.env.__SKIP_LISTEN === "true"
  ) {
    process.exit();
  } else {
    console.error("SIGTERM RECEIVED in Production. Shutting down gracefully!");
    const server = getAppServer();

    if (server?.close)
      server.close(() => {
        console.error("Process terminated!!!");
        process.exit();
      });
    else
      setTimeout(() => {
        process.exit(1);
      }, 0);
  }
});
