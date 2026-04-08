import AppError from "./app-error";

/**
 * 400 - Bad Request
 * @example throw new BadRequestError("Invalid input", "InvalidInput", { field: "email" })
 */
export class BadRequestError extends AppError {
  constructor(
    message = "Bad Request",
    code = "BadRequest",
    meta?: Record<string, any>
  ) {
    super(message, 400, code, meta);
  }
}

/**
 * 401 - Unauthorized
 * @example throw new UnauthorizedError("Invalid token", "InvalidToken")
 */
export class UnauthorizedError extends AppError {
  constructor(
    message = "Unauthorized",
    code = "Unauthorized",
    meta?: Record<string, any>
  ) {
    super(message, 401, code, meta);
  }
}

/**
 * 402 - Payment Required
 * @example throw new PaymentRequiredError("Subscription expired", "PaymentRequired")
 */
export class PaymentRequiredError extends AppError {
  constructor(
    message = "Payment Required",
    code = "PaymentRequired",
    meta?: Record<string, any>
  ) {
    super(message, 402, code, meta);
  }
}

/**
 * 403 - Forbidden
 * @example throw new ForbiddenError("Access denied", "Forbidden", { resource: "admin" })
 */
export class ForbiddenError extends AppError {
  constructor(
    message = "Forbidden",
    code = "Forbidden",
    meta?: Record<string, any>
  ) {
    super(message, 403, code, meta);
  }
}

/**
 * 404 - Not Found
 * @example throw new NotFoundError("User not found", "NotFound", { id: 123 })
 */
export class NotFoundError extends AppError {
  constructor(
    message = "Not Found",
    code = "NotFound",
    meta?: Record<string, any>
  ) {
    super(message, 404, code, meta);
    this.missing = true;
  }
}

/**
 * 405 - Method Not Allowed
 * @example throw new MethodNotAllowedError("POST not allowed", "MethodNotAllowed")
 */
export class MethodNotAllowedError extends AppError {
  constructor(
    message = "Method Not Allowed",
    code = "MethodNotAllowed",
    meta?: Record<string, any>
  ) {
    super(message, 405, code, meta);
  }
}

/**
 * 406 - Not Acceptable
 * @example throw new NotAcceptableError("Unsupported format", "NotAcceptable")
 */
export class NotAcceptableError extends AppError {
  constructor(
    message = "Not Acceptable",
    code = "NotAcceptable",
    meta?: Record<string, any>
  ) {
    super(message, 406, code, meta);
  }
}

/**
 * 408 - Request Timeout
 * @example throw new RequestTimeoutError("Upload took too long", "RequestTimeout")
 */
export class RequestTimeoutError extends AppError {
  constructor(
    message = "Request Timeout",
    code = "RequestTimeout",
    meta?: Record<string, any>
  ) {
    super(message, 408, code, meta);
  }
}

/**
 * 409 - Conflict
 * @example throw new ConflictError("Duplicate entry", "Conflict", { field: "email" })
 */
export class ConflictError extends AppError {
  constructor(
    message = "Conflict",
    code = "Conflict",
    meta?: Record<string, any>
  ) {
    super(message, 409, code, meta);
  }
}

/**
 * 410 - Gone
 * @example throw new GoneError("Resource deleted", "Gone")
 */
export class GoneError extends AppError {
  constructor(message = "Gone", code = "Gone", meta?: Record<string, any>) {
    super(message, 410, code, meta);
  }
}

/**
 * 411 - Length Required
 * @example throw new LengthRequiredError("Content-Length missing", "LengthRequired")
 */
export class LengthRequiredError extends AppError {
  constructor(
    message = "Length Required",
    code = "LengthRequired",
    meta?: Record<string, any>
  ) {
    super(message, 411, code, meta);
  }
}

/**
 * 412 - Precondition Failed
 * @example throw new PreconditionFailedError("ETag mismatch", "PreconditionFailed")
 */
export class PreconditionFailedError extends AppError {
  constructor(
    message = "Precondition Failed",
    code = "PreconditionFailed",
    meta?: Record<string, any>
  ) {
    super(message, 412, code, meta);
  }
}

/**
 * 413 - Payload Too Large
 * @example throw new PayloadTooLargeError("File exceeds 10MB", "PayloadTooLarge", { max: "10MB" })
 */
export class PayloadTooLargeError extends AppError {
  constructor(
    message = "Payload Too Large",
    code = "PayloadTooLarge",
    meta?: Record<string, any>
  ) {
    super(message, 413, code, meta);
  }
}

/**
 * 414 - URI Too Long
 * @example throw new UriTooLongError("Query string too long", "UriTooLong")
 */
export class UriTooLongError extends AppError {
  constructor(
    message = "URI Too Long",
    code = "UriTooLong",
    meta?: Record<string, any>
  ) {
    super(message, 414, code, meta);
  }
}

/**
 * 415 - Unsupported Media Type
 * @example throw new UnsupportedMediaTypeError("Expected JSON", "UnsupportedMediaType")
 */
export class UnsupportedMediaTypeError extends AppError {
  constructor(
    message = "Unsupported Media Type",
    code = "UnsupportedMediaType",
    meta?: Record<string, any>
  ) {
    super(message, 415, code, meta);
  }
}

/**
 * 416 - Range Not Satisfiable
 * @example throw new RangeNotSatisfiableError("Invalid byte range", "RangeNotSatisfiable")
 */
export class RangeNotSatisfiableError extends AppError {
  constructor(
    message = "Range Not Satisfiable",
    code = "RangeNotSatisfiable",
    meta?: Record<string, any>
  ) {
    super(message, 416, code, meta);
  }
}

/**
 * 417 - Expectation Failed
 * @example throw new ExpectationFailedError("Expect header failed", "ExpectationFailed")
 */
export class ExpectationFailedError extends AppError {
  constructor(
    message = "Expectation Failed",
    code = "ExpectationFailed",
    meta?: Record<string, any>
  ) {
    super(message, 417, code, meta);
  }
}

/**
 * 418 - I'm a teapot
 * @example throw new ImATeapotError("Cannot brew coffee", "ImATeapot")
 */
export class ImATeapotError extends AppError {
  constructor(
    message = "I'm a teapot",
    code = "ImATeapot",
    meta?: Record<string, any>
  ) {
    super(message, 418, code, meta);
  }
}

/**
 * 422 - Unprocessable Content
 * @example throw new UnprocessableContentError("Validation failed", "ValidationFailed", { errors: [...] })
 */
export class UnprocessableContentError extends AppError {
  constructor(
    message = "Unprocessable Content",
    code = "UnprocessableContent",
    meta?: Record<string, any>
  ) {
    super(message, 422, code, meta);
  }
}

/**
 * 429 - Too Many Requests
 * @example throw new TooManyRequestsError("Rate limit exceeded", "RateLimitExceeded", { retryAfter: 60 })
 */
export class TooManyRequestsError extends AppError {
  constructor(
    message = "Too Many Requests",
    code = "TooManyRequests",
    meta?: Record<string, any>
  ) {
    super(message, 429, code, meta);
  }
}

/**
 * 500 - Internal Server Error
 * @example throw new InternalServerError("Database connection failed", "DatabaseError")
 */
export class InternalServerError extends AppError {
  constructor(
    message = "Internal Server Error",
    code = "InternalServer",
    meta?: Record<string, any>
  ) {
    super(message, 500, code, meta);
  }
}

/**
 * 501 - Not Implemented
 * @example throw new NotImplementedError("Feature coming soon", "NotImplemented")
 */
export class NotImplementedError extends AppError {
  constructor(
    message = "Not Implemented",
    code = "NotImplemented",
    meta?: Record<string, any>
  ) {
    super(message, 501, code, meta);
  }
}

/**
 * 502 - Bad Gateway
 * @example throw new BadGatewayError("Upstream timeout", "BadGateway")
 */
export class BadGatewayError extends AppError {
  constructor(
    message = "Bad Gateway",
    code = "BadGateway",
    meta?: Record<string, any>
  ) {
    super(message, 502, code, meta);
  }
}

/**
 * 503 - Service Unavailable
 * @example throw new ServiceUnavailableError("Maintenance mode", "ServiceUnavailable", { retryAfter: 300 })
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    message = "Service Unavailable",
    code = "ServiceUnavailable",
    meta?: Record<string, any>
  ) {
    super(message, 503, code, meta);
  }
}

/**
 * 504 - Gateway Timeout
 * @example throw new GatewayTimeoutError("Upstream timeout", "GatewayTimeout")
 */
export class GatewayTimeoutError extends AppError {
  constructor(
    message = "Gateway Timeout",
    code = "GatewayTimeout",
    meta?: Record<string, any>
  ) {
    super(message, 504, code, meta);
  }
}
