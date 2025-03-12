import fs from "fs";
import { NextFunction, Request, Response } from "express";
import AppError from "./utils/app-error";
import * as errorControllerHelper from "./utils/error-handler.helpers";
import { server } from "../../server";

// const handleCastErrorDB = (err:) => {
//   const message = `Invalid ${err.path}: ${err.value}`
//   return new AppError(message, 400)
// }

// const handleDuplicateFieldDB = (err) => {
//   const value = err.keyValue.name
//   const message = `Duplicate fiedl value: ${value}. Please use another value!`

//   return new AppError(message, 400)
// }

// const handleValidationErrorDB = (err) => {
//   const errors = Object.values(err.errors).map((el) => el.message)
//   const message = `Ivalid input data. ${errors.join('. ')}`
//   return new AppError(message, 400)
// }

// const handleJWTError() =>
//   new AppError('Invalid token. Please log in again!', 401)

// const handleJWTExpired = () =>
//   new AppError('Your token has expired, Please log again!', 401)

function sendDevelopmentError(err: AppError, req: Request, res: Response) {
  console.error("[\x1b[31mERROR\x1b[0m]:", err);
  if (req.originalUrl.startsWith("/api"))
    return res.status(err.statusCode).json({
      message: err.message.split("\n")[err.message.split("\n").length - 1],
      error: err,
      stack: err.stack?.split("\n"),
    });

  res.status(err.statusCode).json({
    title: "Something went wrong!",
    message: err.message,
  });
}

function sendProductionError(err: AppError, req: Request, res: Response) {
  if (req.originalUrl.startsWith("/api")) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    console.error("[\x1b[31mERROR\x1b[0m]:", err);

    return res.status(500).json({
      status: "error",
      message: "Something went wrong!",
    });
  }

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      title: "Something Went Wrong!",
      message: err.message,
    });
  }

  console.error("[\x1b[31mERROR\x1b[0m]:", err);

  return res.status(err.statusCode).json({
    title: "Something went wrong!",
    message: "Please try again later.",
  });
}

export default function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV !== "production")
    return sendDevelopmentError(err, req, res) as void;

  let error = { ...err, message: err.message };

  if (err.name === "JsonWebTokenError")
    error = errorControllerHelper.handleJWTError();
  if (err.name === "TokenExpiredError")
    error = errorControllerHelper.handleJWTExpired();

  if (err.name === "PrismaClientValidationError")
    error = errorControllerHelper.handlePrismaClientValidationError(err);
  if (err.code === "P1000")
    error = errorControllerHelper.handleAuthenticationError(err);
  if (err.code === "P1001")
    error = errorControllerHelper.handleServerNotReachableError(err);
  if (err.code === "P1002")
    error = errorControllerHelper.handleConnectionTimeoutError(err);
  if (err.code === "P1003")
    error = errorControllerHelper.handleDatabaseNotFoundError(err);
  if (err.name === "EnvironmentVariableError")
    error = errorControllerHelper.handleEnvironmentVariableError(err);

  if (err.code === "P2000")
    error = errorControllerHelper.handleFieldValueTooLargeError(err);
  if (err.code === "P2001")
    error = errorControllerHelper.handleRecordNotFoundError(err);
  if (err.code === "P2002")
    error = errorControllerHelper.handleUniqueConstraintError(err);
  if (err.code === "P2003")
    error = errorControllerHelper.handleForeignKeyConstraintError(err);
  if (err.code === "P2004")
    error = errorControllerHelper.handleConstraintFailedError(err);
  if (err.code === "P2005")
    error = errorControllerHelper.handleInvalidFieldValueError(err);
  if (err.code === "P2006")
    error = errorControllerHelper.handleInvalidFieldProvidedError(err);
  if (err.code === "P2007")
    error = errorControllerHelper.handleDataValidationError(err);
  if (err.code === "P2008")
    error = errorControllerHelper.handleQueryParsingError(err);
  if (err.code === "P2009")
    error = errorControllerHelper.handleInvalidQueryFormatError(err);
  if (err.code === "P2010")
    error = errorControllerHelper.handleRawQueryExecutionError(err);
  if (err.code === "P2011")
    error = errorControllerHelper.handleNullConstraintViolationError(err);

  if (err.code === "P3000")
    error = errorControllerHelper.handleSchemaCreationFailedError(err);
  if (err.code === "P3001")
    error = errorControllerHelper.handleMigrationAlreadyAppliedError(err);
  if (err.code === "P3002")
    error = errorControllerHelper.handleMigrationScriptFailedError(err);
  if (err.code === "P3003")
    error = errorControllerHelper.handleVersionMismatchError(err);
  if (err.code === "P3004")
    error = errorControllerHelper.handleMigrationFileReadError(err);
  if (err.code === "P3005")
    error = errorControllerHelper.handleSchemaDriftError(err);

  if (err.name === "SyntaxError")
    error = errorControllerHelper.handleSchemaSyntaxError(err);
  if (err.name === "TypeError")
    error = errorControllerHelper.handleClientTypeError(err);
  if (err.name === "DynamicQueryError")
    error = errorControllerHelper.handleDynamicQueryError(err);
  if (err.name === "RelationError")
    error = errorControllerHelper.handleRelationLoadingError(err);

  if (err.name === "BinaryError")
    error = errorControllerHelper.handleBinaryError(err);
  if (err.name === "NetworkError")
    error = errorControllerHelper.handleNetworkError(err);
  if (err.name === "VersionMismatch")
    error = errorControllerHelper.handleVersionMismatchError(err);

  if (err.name === "UnhandledPromiseRejection")
    error = errorControllerHelper.handleUnhandledPromiseError(err);
  if (err.name === "DataTypeError")
    error = errorControllerHelper.handleDataTypeError(err);
  if (err.name === "EmptyResultError")
    error = errorControllerHelper.handleEmptyResultError(err);

  sendProductionError(error, req, res);
}

import spawn from "cross-spawn";
import path from "path";

process.on("SIGTERM", () => {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.NODE_ENV !== "staging"
  ) {
    process.exit();
  } else {
    console.error(
      "👋🏽 SIGTERM RECEIVED in Production. Shutting down gracefully!"
    );

    server.close(() => {
      console.error("🔥 Process terminated");
    });
  }
});
