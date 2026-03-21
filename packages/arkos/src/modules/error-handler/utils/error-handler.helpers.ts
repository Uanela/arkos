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
  return new AppError(message, 409);
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

export function handleNonExistingRecord(err: {
  meta?: Record<string, any>;
  [x: string]: any;
}) {
  const message =
    err?.meta?.cause ||
    `Operation could not be completed as the required record was not found`;
  return new AppError(message, 404, err.meta || {}, "RecordNotFound");
}

export function handlePrismaClientInitializationError(_: any) {
  return new AppError(
    "Service temporarily unavailable",
    503,
    {},
    "DatabaseNotAvailable"
  );
}
