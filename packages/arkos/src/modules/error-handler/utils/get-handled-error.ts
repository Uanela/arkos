import { MulterError } from "multer";
import multerErrorHandler from "../utils/multer-error-handler";
import * as errorControllerHelper from "../utils/error-handler.helpers";

export function getHandledError(err: any): any {
  let error = err;

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
    case "MulterError":
      error = multerErrorHandler.handle(err as unknown as MulterError);
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

  return error;
}
