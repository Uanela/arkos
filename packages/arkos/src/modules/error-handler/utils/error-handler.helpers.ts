import { pascalCase } from "../../../utils/features/change-case.features";
import AppError from "./app-error";

export interface PrismaError {
  code?: string;
  message: string;
  meta?: Record<string, any>;
  name?: string;
}

export function handleJWTError() {
  return new AppError("Invalid token. Please log in again!", 401);
}

export function handleJWTExpired() {
  return new AppError("Your token has expired, Please log again!", 401);
}

export function handlePrismaClientValidationError(err: AppError) {
  const message =
    err?.message?.split("\n")[err?.message?.split("\n").length - 1];
  return new AppError(message, 400);
}

export function handleAuthenticationError(_: AppError) {
  const message =
    "Authentication failed against the database server. Please check your credentials.";
  return new AppError(message, 401);
}

export function handleServerNotReachableError(_: AppError) {
  const message =
    "The database server is not reachable. Verify your connection string or ensure the server is online.";
  return new AppError(message, 503);
}

export function handleConnectionTimeoutError(_: AppError) {
  const message =
    "Connection to the database timed out. Please check server performance or network connectivity.";
  return new AppError(message, 504);
}

export function handleDatabaseNotFoundError(_: AppError) {
  const message = "The specified database does not exist on the server.";
  return new AppError(message, 404);
}

export function handleEnvironmentVariableError(err: AppError) {
  const missingVars = err?.missing || "unknown environment variables";
  const message = `Missing or invalid environment variables: ${missingVars}. Please check your configuration.`;
  return new AppError(message, 500);
}

export function handleFieldValueTooLargeError(err: AppError) {
  const message = `The value for the field "${err?.meta?.field_name}" is too large. Please provide a smaller value.`;
  return new AppError(message, 400);
}

export function handleRecordNotFoundError(_: AppError) {
  const message =
    "No record found for the given query. Ensure the query parameters are correct.";
  return new AppError(message, 404);
}

export function handleUniqueConstraintError(err: AppError) {
  const field = err?.meta?.target || "unknown field";
  const message = `Duplicate value detected for the unique field(s): ${field}. Please use a different value.`;
  return new AppError(
    message,
    409,
    (err.meta?.modelName &&
      `${pascalCase(err.meta?.modelName)}${pascalCase(err.meta?.target?.[0])}UniqueConstraint`) ||
      "Unknown"
  );
}

export function handleForeignKeyConstraintError(_: AppError) {
  const message =
    "Foreign key constraint violation. Ensure that the referenced record exists.";
  return new AppError(message, 400);
}

export function handleConstraintFailedError(err: AppError) {
  const constraint = err?.meta?.constraint || "unknown constraint";
  const message = `A database constraint "${constraint}" failed. Please review your input data.`;
  return new AppError(message, 400);
}

export function handleInvalidFieldValueError(err: AppError) {
  const fieldName = err?.meta?.field_name || "unknown field";
  const message = `Invalid value provided for the field "${fieldName}". Please provide a valid value.`;
  return new AppError(message, 400);
}

export function handleInvalidFieldProvidedError(err: AppError) {
  const fieldName = err?.meta?.field_name || "unknown field";
  const message = `The field "${fieldName}" has been provided with an invalid value. Check the data and try again.`;
  return new AppError(message, 400);
}

export function handleDataValidationError(_: AppError) {
  const message =
    "Data validation error occurred. Please ensure all fields meet the required criteria.";
  return new AppError(message, 400);
}

export function handleQueryParsingError(err: AppError) {
  const query = err?.meta?.query || "unknown query";
  const message = `Failed to parse the query: "${query}". Check the syntax and structure.`;
  return new AppError(message, 400);
}

export function handleInvalidQueryFormatError(err: AppError) {
  const query = err?.meta?.query || "unknown query";
  const message = `The query format is invalid: "${query}". Ensure the query adheres to the expected format.`;
  return new AppError(message, 400);
}

export function handleRawQueryExecutionError(_: AppError) {
  const message =
    "An error occurred during the execution of a raw query. Verify the query and try again.";
  return new AppError(message, 500);
}

export function handleNullConstraintViolationError(err: AppError) {
  const fieldName = err?.meta?.field_name || "unknown field";
  const message = `The field "${fieldName}" cannot be null. Please provide a value.`;
  return new AppError(message, 400);
}

export function handleSchemaCreationFailedError(_: AppError) {
  const message =
    "Failed to create the database schema. Verify the schema definition and try again.";
  return new AppError(message, 500);
}

export function handleMigrationAlreadyAppliedError(err: AppError) {
  const migrationName = err?.meta?.migration || "unknown migration";
  const message = `The migration "${migrationName}" has already been applied to the database.`;
  return new AppError(message, 409);
}

export function handleMigrationScriptFailedError(err: AppError) {
  const migrationName = err?.meta?.migration || "unknown migration";
  const message = `The migration script "${migrationName}" failed. Review the script and resolve any issues.`;
  return new AppError(message, 500);
}

export function handleVersionMismatchError(_: AppError) {
  const message = `Version mismatch: The database schema and migration versions are inconsistent. Please check and resolve this issue.`;
  return new AppError(message, 400);
}

export function handleMigrationFileReadError(err: AppError) {
  const migrationFile = err?.meta?.migration_file || "unknown file";
  const message = `Failed to read the migration file "${migrationFile}". Ensure the file exists and is accessible.`;
  return new AppError(message, 500);
}

export function handleSchemaDriftError(_: AppError) {
  const message = `Schema drift detected: The database schema differs from the expected state. Run migrations or sync schema to resolve.`;
  return new AppError(message, 400);
}

export function handleSchemaSyntaxError(_: AppError) {
  const message = `Syntax error in the schema file. Please check for typos or invalid syntax in your schema definition.`;
  return new AppError(message, 500);
}

export function handleClientTypeError(_: AppError) {
  const message = `Type error, Ensure proper usage of methods and correct data types.`;
  return new AppError(message, 400);
}

export function handleDynamicQueryError(_: AppError) {
  const message = `Error constructing or executing a dynamic query. Verify query structure and parameters.`;
  return new AppError(message, 400);
}

export function handleRelationLoadingError(err: AppError) {
  const relation = err?.meta?.relation || "unknown relation";
  const message = `Error loading relation "${relation}". Ensure it is correctly defined and included in the query.`;
  return new AppError(message, 400);
}

export function handleBinaryError(err: AppError) {
  const binaryName = err?.meta?.binary || "unknown binary";
  const message = `Error with Prisma binary "${binaryName}". Ensure the binary is properly installed and compatible.`;
  return new AppError(message, 500);
}

export function handleNetworkError(_: AppError) {
  const message = `Network error: Unable to connect to the database or internet. Please check your network connection.`;
  return new AppError(message, 500);
}

export function handleUnhandledPromiseError(_: AppError) {
  const message = `Unhandled promise rejection detected. Please check asynchronous code for proper error handling.`;
  return new AppError(message, 500);
}

export function handleDataTypeError(err: AppError) {
  const field = err?.meta?.field || "unknown field";
  const expectedType = err?.meta?.expected_type || "unknown type";
  const message = `Invalid data type for field "${field}". Expected type: ${expectedType}.`;
  return new AppError(message, 400);
}

export function handleEmptyResultError(_: AppError) {
  const message = `Empty result: No data was found for the given query. Ensure the query criteria are correct.`;
  return new AppError(message, 404);
}

export function handleNonExistingRecord(err: {
  meta?: Record<string, any>;
  [x: string]: any;
}) {
  const message =
    err?.meta?.cause ||
    `Operation could not be completed as the required record was not found`;

  const model = err?.meta?.cause
    ? err?.meta?.cause?.split("No '")?.[1]?.split?.("'")?.[0]
    : "";

  return new AppError(
    message,
    404,
    `Inline${pascalCase(model || "")}RecordNotFound`
  );
}

export function handlePrismaClientInitializationError(_: any) {
  return new AppError(
    "Service temporarily unavailable",
    503,
    "DatabaseNotAvailable"
  );
}
