import AppError from "../app-error";
import * as errorHandlers from "../error-handler.helpers";

describe("Error Handlers", () => {
  // Test for JWT error handler
  describe("handleJWTError", () => {
    it("should return an AppError with status 401 and appropriate message", () => {
      const result = errorHandlers.handleJWTError();
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(401);
      expect(result.message).toBe("Invalid token. Please log in again!");
      expect(result.isOperational).toBe(true);
    });
  });

  // Test for JWT expired error handler
  describe("handleJWTExpired", () => {
    it("should return an AppError with status 401 and appropriate message", () => {
      const result = errorHandlers.handleJWTExpired();
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(401);
      expect(result.message).toBe("Your token has expired, Please log again!");
      expect(result.isOperational).toBe(true);
    });
  });

  // Test for Prisma client validation error handler
  describe("handlePrismaClientValidationError", () => {
    it("should return an AppError with status 400 and extract the last line of the error message", () => {
      const err = {
        message: "Error line 1\nError line 2\nFinal error message",
      } as any;

      const result = errorHandlers.handlePrismaClientValidationError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toBe("Final error message");
      expect(result.isOperational).toBe(true);
    });
  });

  // Test for authentication error handler
  describe("handleAuthenticationError", () => {
    it("should return an AppError with status 401 and appropriate message", () => {
      const err = {} as any;
      const result = errorHandlers.handleAuthenticationError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(401);
      expect(result.message).toBe(
        "Authentication failed against the database server. Please check your credentials."
      );
      expect(result.isOperational).toBe(true);
    });
  });

  // Test for server not reachable error handler
  describe("handleServerNotReachableError", () => {
    it("should return an AppError with status 503 and appropriate message", () => {
      const err = {} as any;
      const result = errorHandlers.handleServerNotReachableError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(503);
      expect(result.message).toBe(
        "The database server is not reachable. Verify your connection string or ensure the server is online."
      );
      expect(result.isOperational).toBe(true);
    });
  });

  // Test for connection timeout error handler
  describe("handleConnectionTimeoutError", () => {
    it("should return an AppError with status 504 and appropriate message", () => {
      const err = {} as any;
      const result = errorHandlers.handleConnectionTimeoutError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(504);
      expect(result.message).toBe(
        "Connection to the database timed out. Please check server performance or network connectivity."
      );
      expect(result.isOperational).toBe(true);
    });
  });

  // Test for database not found error handler
  describe("handleDatabaseNotFoundError", () => {
    it("should return an AppError with status 404 and appropriate message", () => {
      const err = {} as any;
      const result = errorHandlers.handleDatabaseNotFoundError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(404);
      expect(result.message).toBe(
        "The specified database does not exist on the server."
      );
      expect(result.isOperational).toBe(true);
    });
  });

  // Test for environment variable error handler
  describe("handleEnvironmentVariableError", () => {
    it("should return an AppError with status 500 and include missing variables", () => {
      const err = {
        missing: "DATABASE_URL, API_KEY",
      } as any;

      const result = errorHandlers.handleEnvironmentVariableError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
      expect(result.message).toBe(
        "Missing or invalid environment variables: DATABASE_URL, API_KEY. Please check your configuration."
      );
      expect(result.isOperational).toBe(true);
    });

    it("should handle case when missing variables are not specified", () => {
      const err = {} as any;
      const result = errorHandlers.handleEnvironmentVariableError(err);
      expect(result.message).toBe(
        "Missing or invalid environment variables: unknown environment variables. Please check your configuration."
      );
    });
  });

  // Test for field value too large error handler
  describe("handleFieldValueTooLargeError", () => {
    it("should return an AppError with status 400 and include field name", () => {
      const err = {
        meta: { field_name: "email" },
      } as any;

      const result = errorHandlers.handleFieldValueTooLargeError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toBe(
        'The value for the field "email" is too large. Please provide a smaller value.'
      );
      expect(result.isOperational).toBe(true);
    });
  });

  // Test for record not found error handler
  describe("handleRecordNotFoundError", () => {
    it("should return an AppError with status 404 and appropriate message", () => {
      const err = {} as any;
      const result = errorHandlers.handleRecordNotFoundError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(404);
      expect(result.message).toBe(
        "No record found for the given query. Ensure the query parameters are correct."
      );
      expect(result.isOperational).toBe(true);
    });
  });

  // Test for unique constraint error handler
  describe("handleUniqueConstraintError", () => {
    it("should return an AppError with status 409 and include field name", () => {
      const err = {
        meta: { target: "email" },
      } as any;

      const result = errorHandlers.handleUniqueConstraintError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(409);
      expect(result.message).toBe(
        "Duplicate value detected for the unique field(s): email. Please use a different value."
      );
      expect(result.isOperational).toBe(true);
    });

    it("should handle case when field name is not specified", () => {
      const err = {} as any;
      const result = errorHandlers.handleUniqueConstraintError(err);
      expect(result.message).toBe(
        "Duplicate value detected for the unique field(s): unknown field. Please use a different value."
      );
    });
  });

  // Test for foreign key constraint error handler
  describe("handleForeignKeyConstraintError", () => {
    it("should return an AppError with status 400 and appropriate message", () => {
      const err = {} as any;
      const result = errorHandlers.handleForeignKeyConstraintError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toBe(
        "Foreign key constraint violation. Ensure that the referenced record exists."
      );
      expect(result.isOperational).toBe(true);
    });
  });

  // Test for constraint failed error handler
  describe("handleConstraintFailedError", () => {
    it("should return an AppError with status 400 and include constraint name", () => {
      const err = {
        meta: { constraint: "email_unique" },
      } as any;

      const result = errorHandlers.handleConstraintFailedError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toBe(
        'A database constraint "email_unique" failed. Please review your input data.'
      );
      expect(result.isOperational).toBe(true);
    });

    it("should handle case when constraint name is not specified", () => {
      const err = {} as any;
      const result = errorHandlers.handleConstraintFailedError(err);
      expect(result.message).toBe(
        'A database constraint "unknown constraint" failed. Please review your input data.'
      );
    });
  });

  // Test for invalid field value error handler
  describe("handleInvalidFieldValueError", () => {
    it("should return an AppError with status 400 and include field name", () => {
      const err = {
        meta: { field_name: "age" },
      } as any;

      const result = errorHandlers.handleInvalidFieldValueError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toBe(
        'Invalid value provided for the field "age". Please provide a valid value.'
      );
      expect(result.isOperational).toBe(true);
    });

    it("should handle case when field name is not specified", () => {
      const err = {} as any;
      const result = errorHandlers.handleInvalidFieldValueError(err);
      expect(result.message).toBe(
        'Invalid value provided for the field "unknown field". Please provide a valid value.'
      );
    });
  });

  // Adding tests for remaining handlers to cover all functions
  describe("Other error handlers", () => {
    it("should handle invalid field provided error", () => {
      const err = {
        meta: { field_name: "title" },
      } as any;

      const result = errorHandlers.handleInvalidFieldProvidedError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toContain("title");
    });

    it("should handle data validation error", () => {
      const err = {} as any;
      const result = errorHandlers.handleDataValidationError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
    });

    it("should handle query parsing error", () => {
      const err = {
        meta: { query: "SELECT * FROM invalid" },
      } as any;

      const result = errorHandlers.handleQueryParsingError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toContain("SELECT * FROM invalid");
    });

    it("should handle invalid query format error", () => {
      const err = {
        meta: { query: "WRONG FORMAT" },
      } as any;

      const result = errorHandlers.handleInvalidQueryFormatError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toContain("WRONG FORMAT");
    });

    it("should handle raw query execution error", () => {
      const err = {} as any;
      const result = errorHandlers.handleRawQueryExecutionError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
    });

    it("should handle null constraint violation error", () => {
      const err = {
        meta: { field_name: "username" },
      } as any;

      const result = errorHandlers.handleNullConstraintViolationError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toContain("username");
    });
  });

  // Test for migration and schema error handlers
  describe("Migration and schema error handlers", () => {
    it("should handle schema creation failed error", () => {
      const err = {} as any;
      const result = errorHandlers.handleSchemaCreationFailedError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
    });

    it("should handle migration already applied error", () => {
      const err = {
        meta: { migration: "20220101_init" },
      } as any;

      const result = errorHandlers.handleMigrationAlreadyAppliedError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(409);
      expect(result.message).toContain("20220101_init");
    });

    it("should handle migration script failed error", () => {
      const err = {
        meta: { migration: "20220202_update" },
      } as any;

      const result = errorHandlers.handleMigrationScriptFailedError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
      expect(result.message).toContain("20220202_update");
    });

    it("should handle version mismatch error", () => {
      const err = {} as any;
      const result = errorHandlers.handleVersionMismatchError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
    });

    it("should handle migration file read error", () => {
      const err = {
        meta: { migration_file: "schema.prisma" },
      } as any;

      const result = errorHandlers.handleMigrationFileReadError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
      expect(result.message).toContain("schema.prisma");
    });

    it("should handle schema drift error", () => {
      const err = {} as any;
      const result = errorHandlers.handleSchemaDriftError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
    });

    it("should handle schema syntax error", () => {
      const err = {} as any;
      const result = errorHandlers.handleSchemaSyntaxError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
    });
  });

  // Test for client and query error handlers
  describe("Client and query error handlers", () => {
    it("should handle client type error", () => {
      const err = {} as any;
      const result = errorHandlers.handleClientTypeError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
    });

    it("should handle dynamic query error", () => {
      const err = {} as any;
      const result = errorHandlers.handleDynamicQueryError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
    });

    it("should handle relation loading error", () => {
      const err = {
        meta: { relation: "posts" },
      } as any;

      const result = errorHandlers.handleRelationLoadingError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toContain("posts");
    });
  });

  // Test for system and network error handlers
  describe("System and network error handlers", () => {
    it("should handle binary error", () => {
      const err = {
        meta: { binary: "prisma-client" },
      } as any;

      const result = errorHandlers.handleBinaryError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
      expect(result.message).toContain("prisma-client");
    });

    it("should handle network error", () => {
      const err = {} as any;
      const result = errorHandlers.handleNetworkError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
    });

    it("should handle unhandled promise error", () => {
      const err = {} as any;
      const result = errorHandlers.handleUnhandledPromiseError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
    });
  });

  // Test for data-related error handlers
  describe("Data-related error handlers", () => {
    it("should handle data type error", () => {
      const err = {
        meta: { field: "age", expected_type: "number" },
      } as any;

      const result = errorHandlers.handleDataTypeError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toContain("age");
      expect(result.message).toContain("number");
    });

    it("should handle empty result error", () => {
      const err = {} as any;
      const result = errorHandlers.handleEmptyResultError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(404);
    });
  });
});
