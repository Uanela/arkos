/**
 * Custom error class for handling application errors.
 *
 * @extends {Error}
 *
 * @property {number} statusCode - HTTP status code of the error.
 * @property {string} status - Status message derived from the status code (`fail` for 4xx, `error` for 5xx).
 * @property {boolean} [missing=false] - Flag to indicate if a resource is missing.
 * @property {boolean} isOperational - Indicates if the error is operational (intended for client visibility).
 * @property {string} [code] - Optional error code for categorization.
 * @property {Record<string, any>} [meta] - Additional metadata related to the error.
 *
 * @example
 * ```typescript
 *
 * function getUser(id: string) {
 *   if (!id) {
 *     throw new AppError('User ID is required', 400, { field: 'id' }, 'USER_ID_MISSING');
 *   }
 *   // Simulate a user not found scenario
 *   throw new AppError('User not found', 404, { userId: id }, 'USER_NOT_FOUND');
 * }
 *
 * try {
 *   getUser('');
 * } catch (error) {
 *   if (error instanceof AppError) {
 *     console.error(`Error: ${error.message}, Code: ${error.code}, Status: ${error.status}`);
 *   }
 * }
 * ```
 */
class AppError extends Error {
  statusCode: number;
  status: string;
  public missing?: boolean;
  public isOperational: boolean;
  code?: string;
  meta?: Record<string, any>;

  /**
   * Creates an instance of AppError.
   *
   * @param {string} message - The error message.
   * @param {number} statusCode - The HTTP status code.
   * @param {Record<string, any>} [meta] - Additional metadata for debugging or client feedback.
   * @param {string} [code] - A custom error code for categorization.
   */
  constructor(
    message: string,
    statusCode: number,
    meta?: Record<string, any>,
    code?: string
  ) {
    super(message);

    this.message = message || "An error occurred, try again!";
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    this.code = code || "Unknown";
    this.meta = meta;
    this.missing = false;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
