import { pascalCase } from "../../../utils/helpers/change-case.helpers";
import AppError from "./app-error";

export function handleJWTError() {
  return new AppError("Invalid token. Please log in again!", 401);
}

export function handleJWTExpired() {
  return new AppError("Your token has expired, Please log again!", 401);
}

export function handlePrismaClientValidationError(err: AppError) {
  const message =
    err?.message?.split("\n")[err?.message?.split("\n").length - 1] ||
    "Invalid query arguments";
  return new AppError(
    message.split(". Did you")[0],
    400,
    "InvalidQueryArgument"
  );
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

export function handleUniqueConstraintError(err: any) {
  const field = err?.meta?.target || "unknown";
  const message = `Duplicate unique field(s) ${Array.isArray(field) ? field.map((f) => `'${f}'`).join(", ") : `'${field}'`}`;
  return new AppError(message, 409, "DuplicateRecords");
}

export function handleForeignKeyConstraintError(_: AppError) {
  const message =
    "Foreign key constraint violation. Ensure that the referenced record exists.";
  return new AppError(message, 400, "ForeignKeyViolation");
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
    `Operation could not be completed as some required record was not found`;

  const model = err?.meta?.cause
    ? err?.meta?.cause?.split("No '")?.[1]?.split?.("'")?.[0]
    : "";

  return new AppError(
    message,
    model ? 400 : 404,
    `${model ? "Inline" : ""}${pascalCase(model || "")}RecordNotFound`
  );
}

export function handlePrismaClientInitializationError(_: any) {
  return new AppError(
    "Service temporarily unavailable",
    503,
    "ServiceUnavailable",
    {}
  );
}
