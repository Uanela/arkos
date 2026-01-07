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

    it("should handle single line error message", () => {
      const err = {
        message: "Single line error",
      } as any;

      const result = errorHandlers.handlePrismaClientValidationError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toBe("Single line error");
      expect(result.isOperational).toBe(true);
    });

    it("should handle empty message", () => {
      const err = {
        message: "",
      } as any;

      const result = errorHandlers.handlePrismaClientValidationError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toBe("An error occurred, try again!");
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

    it("should handle case when field name is not specified", () => {
      const err = {} as any;
      const result = errorHandlers.handleFieldValueTooLargeError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toBe(
        'The value for the field "undefined" is too large. Please provide a smaller value.'
      );
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

    it("should handle array of target fields", () => {
      const err = {
        meta: { target: ["email", "username"] },
      } as any;

      const result = errorHandlers.handleUniqueConstraintError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(409);
      expect(result.message).toBe(
        "Duplicate value detected for the unique field(s): email,username. Please use a different value."
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

  // Test for invalid field provided error handler
  describe("handleInvalidFieldProvidedError", () => {
    it("should return an AppError with status 400 and include field name", () => {
      const err = {
        meta: { field_name: "title" },
      } as any;

      const result = errorHandlers.handleInvalidFieldProvidedError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toBe(
        'The field "title" has been provided with an invalid value. Check the data and try again.'
      );
      expect(result.isOperational).toBe(true);
    });

    it("should handle case when field name is not specified", () => {
      const err = {} as any;
      const result = errorHandlers.handleInvalidFieldProvidedError(err);
      expect(result.message).toBe(
        'The field "unknown field" has been provided with an invalid value. Check the data and try again.'
      );
    });
  });

  // Test for data validation error handler
  describe("handleDataValidationError", () => {
    it("should return an AppError with status 400 and appropriate message", () => {
      const err = {} as any;
      const result = errorHandlers.handleDataValidationError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toBe(
        "Data validation error occurred. Please ensure all fields meet the required criteria."
      );
      expect(result.isOperational).toBe(true);
    });
  });

  // Test for query parsing error handler
  describe("handleQueryParsingError", () => {
    it("should return an AppError with status 400 and include query", () => {
      const err = {
        meta: { query: "SELECT * FROM invalid" },
      } as any;

      const result = errorHandlers.handleQueryParsingError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toBe(
        'Failed to parse the query: "SELECT * FROM invalid". Check the syntax and structure.'
      );
      expect(result.isOperational).toBe(true);
    });

    it("should handle case when query is not specified", () => {
      const err = {} as any;
      const result = errorHandlers.handleQueryParsingError(err);
      expect(result.message).toBe(
        'Failed to parse the query: "unknown query". Check the syntax and structure.'
      );
    });
  });

  // Test for invalid query format error handler
  describe("handleInvalidQueryFormatError", () => {
    it("should return an AppError with status 400 and include query", () => {
      const err = {
        meta: { query: "WRONG FORMAT" },
      } as any;

      const result = errorHandlers.handleInvalidQueryFormatError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toBe(
        'The query format is invalid: "WRONG FORMAT". Ensure the query adheres to the expected format.'
      );
      expect(result.isOperational).toBe(true);
    });

    it("should handle case when query is not specified", () => {
      const err = {} as any;
      const result = errorHandlers.handleInvalidQueryFormatError(err);
      expect(result.message).toBe(
        'The query format is invalid: "unknown query". Ensure the query adheres to the expected format.'
      );
    });
  });

  // Test for raw query execution error handler
  describe("handleRawQueryExecutionError", () => {
    it("should return an AppError with status 500 and appropriate message", () => {
      const err = {} as any;
      const result = errorHandlers.handleRawQueryExecutionError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
      expect(result.message).toBe(
        "An error occurred during the execution of a raw query. Verify the query and try again."
      );
      expect(result.isOperational).toBe(true);
    });
  });

  // Test for null constraint violation error handler
  describe("handleNullConstraintViolationError", () => {
    it("should return an AppError with status 400 and include field name", () => {
      const err = {
        meta: { field_name: "username" },
      } as any;

      const result = errorHandlers.handleNullConstraintViolationError(err);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toBe(
        'The field "username" cannot be null. Please provide a value.'
      );
      expect(result.isOperational).toBe(true);
    });

    it("should handle case when field name is not specified", () => {
      const err = {} as any;
      const result = errorHandlers.handleNullConstraintViolationError(err);
      expect(result.message).toBe(
        'The field "unknown field" cannot be null. Please provide a value.'
      );
    });
  });

  // Test for migration and schema error handlers
  describe("Migration and schema error handlers", () => {
    describe("handleSchemaCreationFailedError", () => {
      it("should return an AppError with status 500 and appropriate message", () => {
        const err = {} as any;
        const result = errorHandlers.handleSchemaCreationFailedError(err);
        expect(result).toBeInstanceOf(AppError);
        expect(result.statusCode).toBe(500);
        expect(result.message).toBe(
          "Failed to create the database schema. Verify the schema definition and try again."
        );
        expect(result.isOperational).toBe(true);
      });
    });

    describe("handleMigrationAlreadyAppliedError", () => {
      it("should return an AppError with status 409 and include migration name", () => {
        const err = {
          meta: { migration: "20220101_init" },
        } as any;

        const result = errorHandlers.handleMigrationAlreadyAppliedError(err);
        expect(result).toBeInstanceOf(AppError);
        expect(result.statusCode).toBe(409);
        expect(result.message).toBe(
          'The migration "20220101_init" has already been applied to the database.'
        );
        expect(result.isOperational).toBe(true);
      });

      it("should handle case when migration name is not specified", () => {
        const err = {} as any;
        const result = errorHandlers.handleMigrationAlreadyAppliedError(err);
        expect(result.message).toBe(
          'The migration "unknown migration" has already been applied to the database.'
        );
      });
    });

    describe("handleMigrationScriptFailedError", () => {
      it("should return an AppError with status 500 and include migration name", () => {
        const err = {
          meta: { migration: "20220202_update" },
        } as any;

        const result = errorHandlers.handleMigrationScriptFailedError(err);
        expect(result).toBeInstanceOf(AppError);
        expect(result.statusCode).toBe(500);
        expect(result.message).toBe(
          'The migration script "20220202_update" failed. Review the script and resolve any issues.'
        );
        expect(result.isOperational).toBe(true);
      });

      it("should handle case when migration name is not specified", () => {
        const err = {} as any;
        const result = errorHandlers.handleMigrationScriptFailedError(err);
        expect(result.message).toBe(
          'The migration script "unknown migration" failed. Review the script and resolve any issues.'
        );
      });
    });

    describe("handleVersionMismatchError", () => {
      it("should return an AppError with status 400 and appropriate message", () => {
        const err = {} as any;
        const result = errorHandlers.handleVersionMismatchError(err);
        expect(result).toBeInstanceOf(AppError);
        expect(result.statusCode).toBe(400);
        expect(result.message).toBe(
          "Version mismatch: The database schema and migration versions are inconsistent. Please check and resolve this issue."
        );
        expect(result.isOperational).toBe(true);
      });
    });

    describe("handleMigrationFileReadError", () => {
      it("should return an AppError with status 500 and include migration file", () => {
        const err = {
          meta: { migration_file: "schema.prisma" },
        } as any;

        const result = errorHandlers.handleMigrationFileReadError(err);
        expect(result).toBeInstanceOf(AppError);
        expect(result.statusCode).toBe(500);
        expect(result.message).toBe(
          'Failed to read the migration file "schema.prisma". Ensure the file exists and is accessible.'
        );
        expect(result.isOperational).toBe(true);
      });

      it("should handle case when migration file is not specified", () => {
        const err = {} as any;
        const result = errorHandlers.handleMigrationFileReadError(err);
        expect(result.message).toBe(
          'Failed to read the migration file "unknown file". Ensure the file exists and is accessible.'
        );
      });
    });

    describe("handleSchemaDriftError", () => {
      it("should return an AppError with status 400 and appropriate message", () => {
        const err = {} as any;
        const result = errorHandlers.handleSchemaDriftError(err);
        expect(result).toBeInstanceOf(AppError);
        expect(result.statusCode).toBe(400);
        expect(result.message).toBe(
          "Schema drift detected: The database schema differs from the expected state. Run migrations or sync schema to resolve."
        );
        expect(result.isOperational).toBe(true);
      });
    });

    describe("handleSchemaSyntaxError", () => {
      it("should return an AppError with status 500 and appropriate message", () => {
        const err = {} as any;
        const result = errorHandlers.handleSchemaSyntaxError(err);
        expect(result).toBeInstanceOf(AppError);
        expect(result.statusCode).toBe(500);
        expect(result.message).toBe(
          "Syntax error in the schema file. Please check for typos or invalid syntax in your schema definition."
        );
        expect(result.isOperational).toBe(true);
      });
    });
  });

  // Test for client and query error handlers
  describe("Client and query error handlers", () => {
    describe("handleClientTypeError", () => {
      it("should return an AppError with status 400 and appropriate message", () => {
        const err = {} as any;
        const result = errorHandlers.handleClientTypeError(err);
        expect(result).toBeInstanceOf(AppError);
        expect(result.statusCode).toBe(400);
        expect(result.message).toBe(
          "Type error, Ensure proper usage of methods and correct data types."
        );
        expect(result.isOperational).toBe(true);
      });
    });

    describe("handleDynamicQueryError", () => {
      it("should return an AppError with status 400 and appropriate message", () => {
        const err = {} as any;
        const result = errorHandlers.handleDynamicQueryError(err);
        expect(result).toBeInstanceOf(AppError);
        expect(result.statusCode).toBe(400);
        expect(result.message).toBe(
          "Error constructing or executing a dynamic query. Verify query structure and parameters."
        );
        expect(result.isOperational).toBe(true);
      });
    });

    describe("handleRelationLoadingError", () => {
      it("should return an AppError with status 400 and include relation name", () => {
        const err = {
          meta: { relation: "posts" },
        } as any;

        const result = errorHandlers.handleRelationLoadingError(err);
        expect(result).toBeInstanceOf(AppError);
        expect(result.statusCode).toBe(400);
        expect(result.message).toBe(
          'Error loading relation "posts". Ensure it is correctly defined and included in the query.'
        );
        expect(result.isOperational).toBe(true);
      });

      it("should handle case when relation name is not specified", () => {
        const err = {} as any;
        const result = errorHandlers.handleRelationLoadingError(err);
        expect(result.message).toBe(
          'Error loading relation "unknown relation". Ensure it is correctly defined and included in the query.'
        );
      });
    });
  });

  // Test for system and network error handlers
  describe("System and network error handlers", () => {
    describe("handleBinaryError", () => {
      it("should return an AppError with status 500 and include binary name", () => {
        const err = {
          meta: { binary: "prisma-client" },
        } as any;

        const result = errorHandlers.handleBinaryError(err);
        expect(result).toBeInstanceOf(AppError);
        expect(result.statusCode).toBe(500);
        expect(result.message).toBe(
          'Error with Prisma binary "prisma-client". Ensure the binary is properly installed and compatible.'
        );
        expect(result.isOperational).toBe(true);
      });

      it("should handle case when binary name is not specified", () => {
        const err = {} as any;
        const result = errorHandlers.handleBinaryError(err);
        expect(result.message).toBe(
          'Error with Prisma binary "unknown binary". Ensure the binary is properly installed and compatible.'
        );
      });
    });

    describe("handleNetworkError", () => {
      it("should return an AppError with status 500 and appropriate message", () => {
        const err = {} as any;
        const result = errorHandlers.handleNetworkError(err);
        expect(result).toBeInstanceOf(AppError);
        expect(result.statusCode).toBe(500);
        expect(result.message).toBe(
          "Network error: Unable to connect to the database or internet. Please check your network connection."
        );
        expect(result.isOperational).toBe(true);
      });
    });

    describe("handleUnhandledPromiseError", () => {
      it("should return an AppError with status 500 and appropriate message", () => {
        const err = {} as any;
        const result = errorHandlers.handleUnhandledPromiseError(err);
        expect(result).toBeInstanceOf(AppError);
        expect(result.statusCode).toBe(500);
        expect(result.message).toBe(
          "Unhandled promise rejection detected. Please check asynchronous code for proper error handling."
        );
        expect(result.isOperational).toBe(true);
      });
    });
  });

  // Test for data-related error handlers
  describe("Data-related error handlers", () => {
    describe("handleDataTypeError", () => {
      it("should return an AppError with status 400 and include field and expected type", () => {
        const err = {
          meta: { field: "age", expected_type: "number" },
        } as any;

        const result = errorHandlers.handleDataTypeError(err);
        expect(result).toBeInstanceOf(AppError);
        expect(result.statusCode).toBe(400);
        expect(result.message).toBe(
          'Invalid data type for field "age". Expected type: number.'
        );
        expect(result.isOperational).toBe(true);
      });

      it("should handle case when field and expected type are not specified", () => {
        const err = {} as any;
        const result = errorHandlers.handleDataTypeError(err);
        expect(result.message).toBe(
          'Invalid data type for field "unknown field". Expected type: unknown type.'
        );
      });

      it("should handle case when only field is specified", () => {
        const err = {
          meta: { field: "email" },
        } as any;
        const result = errorHandlers.handleDataTypeError(err);
        expect(result.message).toBe(
          'Invalid data type for field "email". Expected type: unknown type.'
        );
      });

      it("should handle case when only expected type is specified", () => {
        const err = {
          meta: { expected_type: "string" },
        } as any;
        const result = errorHandlers.handleDataTypeError(err);
        expect(result.message).toBe(
          'Invalid data type for field "unknown field". Expected type: string.'
        );
      });
    });

    describe("handleEmptyResultError", () => {
      it("should return an AppError with status 404 and appropriate message", () => {
        const err = {} as any;
        const result = errorHandlers.handleEmptyResultError(err);
        expect(result).toBeInstanceOf(AppError);
        expect(result.statusCode).toBe(404);
        expect(result.message).toBe(
          "Empty result: No data was found for the given query. Ensure the query criteria are correct."
        );
        expect(result.isOperational).toBe(true);
      });
    });
  });

  describe("handleNonExistingRecord", () => {
    it("should show correct generic message of record not found", () => {
      const err = {};
      const result = errorHandlers.handleNonExistingRecord(err);

      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(404);
      expect(result.message).toBe(
        "Operation could not be completed as the required record was not found"
      );
      expect(result.code).toBe("InlineRecordNotFound");
      expect(result.isOperational).toBe(true);
    });

    it("should show correct error message from meta.cause", () => {
      const err = {
        meta: {
          cause: "No 'User' record does not exists",
          additional_info: "Some extra info",
        },
      };
      const result = errorHandlers.handleNonExistingRecord(err);

      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(404);
      expect(result.message).toBe("No 'User' record does not exists");
      expect(result.code).toBe("InlineUserRecordNotFound");
      expect(result.meta).toEqual(undefined);
      expect(result.isOperational).toBe(true);
    });

    it("should handle error with meta but no cause", () => {
      const err = {
        meta: {
          some_field: "some_value",
        },
      };
      const result = errorHandlers.handleNonExistingRecord(err);

      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(404);
      expect(result.message).toBe(
        "Operation could not be completed as the required record was not found"
      );
      expect(result.code).toBe("InlineRecordNotFound");
      expect(result.meta).toEqual(undefined);
    });

    it("should handle null meta", () => {
      const err = { meta: null };
      const result = errorHandlers.handleNonExistingRecord(err as any);

      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(404);
      expect(result.message).toBe(
        "Operation could not be completed as the required record was not found"
      );
      expect(result.code).toBe("InlineRecordNotFound");
      expect(result.meta).toEqual(undefined);
    });

    it("should handle undefined meta", () => {
      const err = { meta: undefined };
      const result = errorHandlers.handleNonExistingRecord(err);

      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(404);
      expect(result.message).toBe(
        "Operation could not be completed as the required record was not found"
      );
      expect(result.code).toBe("InlineRecordNotFound");
      expect(result.meta).toEqual(undefined);
    });

    it("should handle error with additional properties", () => {
      const err = {
        meta: { cause: "User with ID 123 not found" },
        someOtherProperty: "value",
        code: "P2025",
      };
      const result = errorHandlers.handleNonExistingRecord(err);

      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(404);
      expect(result.message).toBe("User with ID 123 not found");
      expect(result.code).toBe("InlineRecordNotFound");
      expect(result.meta).toEqual(undefined);
      expect(result.isOperational).toBe(true);
    });
  });

  describe("handlePrismaClientInitializationError", () => {
    it("should return an AppError with status 503 and appropriate message", () => {
      const err = {};
      const result = errorHandlers.handlePrismaClientInitializationError(err);

      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(503);
      expect(result.message).toBe("Service temporarily unavailable");
      expect(result.code).toBe("DatabaseNotAvailable");
      expect(result.isOperational).toBe(true);
    });

    it("should handle error with properties", () => {
      const err = {
        message: "Connection failed",
        code: "P1001",
        meta: { some_info: "database connection error" },
      };
      const result = errorHandlers.handlePrismaClientInitializationError(err);

      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(503);
      expect(result.message).toBe("Service temporarily unavailable");
      expect(result.code).toBe("DatabaseNotAvailable");
      expect(result.isOperational).toBe(true);
    });

    it("should handle null error", () => {
      const err = null;
      const result = errorHandlers.handlePrismaClientInitializationError(err);

      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(503);
      expect(result.message).toBe("Service temporarily unavailable");
      expect(result.code).toBe("DatabaseNotAvailable");
      expect(result.isOperational).toBe(true);
    });

    it("should handle undefined error", () => {
      const err = undefined;
      const result = errorHandlers.handlePrismaClientInitializationError(err);

      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(503);
      expect(result.message).toBe("Service temporarily unavailable");
      expect(result.code).toBe("DatabaseNotAvailable");
      expect(result.isOperational).toBe(true);
    });
  });

  // Edge cases and additional coverage tests
  describe("Edge cases and additional coverage", () => {
    describe("handlePrismaClientValidationError edge cases", () => {
      it("should handle undefined message", () => {
        const err = {
          message: undefined,
        } as any;

        const result = errorHandlers.handlePrismaClientValidationError(err);
        expect(result).toBeInstanceOf(AppError);
        expect(result.statusCode).toBe(400);
        // When message is undefined, split will fail, so we expect undefined
        expect(result.message).toBe("An error occurred, try again!");
      });

      it("should handle null message", () => {
        const err = {
          message: null,
        } as any;

        const result = errorHandlers.handlePrismaClientValidationError(err);
        expect(result).toBeInstanceOf(AppError);
        expect(result.statusCode).toBe(400);
        expect(result.message).toBe("An error occurred, try again!");
      });
    });

    describe("Meta object variations", () => {
      it("should handle empty meta objects", () => {
        const err = { meta: {} } as any;

        const result1 = errorHandlers.handleFieldValueTooLargeError(err);
        expect(result1.message).toContain("undefined");

        const result2 = errorHandlers.handleUniqueConstraintError(err);
        expect(result2.message).toContain("unknown field");

        const result3 = errorHandlers.handleConstraintFailedError(err);
        expect(result3.message).toContain("unknown constraint");
      });

      it("should handle meta with null values", () => {
        const err = {
          meta: {
            field_name: null,
            target: null,
            constraint: null,
          },
        } as any;

        const result1 = errorHandlers.handleFieldValueTooLargeError(err);
        expect(result1.message).toContain("null");

        const result2 = errorHandlers.handleUniqueConstraintError(err);
        expect(result2.message).toContain("unknown field");

        const result3 = errorHandlers.handleConstraintFailedError(err);
        expect(result3.message).toContain("unknown constraint");
      });

      it("should handle meta with empty string values", () => {
        const err = {
          meta: {
            field_name: "",
            target: "",
            constraint: "",
            query: "",
            migration: "",
            relation: "",
          },
        } as any;

        const result1 = errorHandlers.handleFieldValueTooLargeError(err);
        expect(result1.message).toContain('""');

        const result2 = errorHandlers.handleQueryParsingError(err);
        expect(result2.message).toContain('"unknown query"');

        const result3 = errorHandlers.handleMigrationAlreadyAppliedError(err);
        expect(result3.message).toContain('"unknown migration"');

        const result4 = errorHandlers.handleRelationLoadingError(err);
        expect(result4.message).toContain('"unknown relation"');
      });
    });

    describe("Error object variations", () => {
      it("should handle errors without meta property", () => {
        const err = { someOtherProperty: "value" } as any;

        const result = errorHandlers.handleEnvironmentVariableError(err);
        expect(result.message).toContain("unknown environment variables");
      });

      it("should handle completely empty error objects", () => {
        const err = {} as any;

        // Test a few representative handlers
        const result1 = errorHandlers.handleAuthenticationError(err);
        expect(result1.statusCode).toBe(401);

        const result2 = errorHandlers.handleDataValidationError(err);
        expect(result2.statusCode).toBe(400);

        const result3 = errorHandlers.handleNetworkError(err);
        expect(result3.statusCode).toBe(500);
      });
    });

    describe("Type coercion and fallbacks", () => {
      it("should handle non-string field names", () => {
        const err = {
          meta: {
            field_name: 123,
            target: 456,
            constraint: true,
          },
        } as any;

        const result1 = errorHandlers.handleFieldValueTooLargeError(err);
        expect(result1.message).toContain("123");

        const result2 = errorHandlers.handleUniqueConstraintError(err);
        expect(result2.message).toContain("456");

        const result3 = errorHandlers.handleConstraintFailedError(err);
        expect(result3.message).toContain("true");
      });

      it("should handle array values in meta", () => {
        const err = {
          meta: {
            target: ["field1", "field2", "field3"],
          },
        } as any;

        const result = errorHandlers.handleUniqueConstraintError(err);
        expect(result.message).toContain("field1,field2,field3");
      });

      it("should handle object values in meta", () => {
        const err = {
          meta: {
            field_name: { nested: "value" },
          },
        } as any;

        const result = errorHandlers.handleInvalidFieldValueError(err);
        expect(result.message).toContain("[object Object]");
      });
    });

    describe("Missing property handling", () => {
      it("should handle missing properties with appropriate defaults", () => {
        const err = { missing: undefined } as any;
        const result = errorHandlers.handleEnvironmentVariableError(err);
        expect(result.message).toContain("unknown environment variables");
      });

      it("should handle missing properties as empty string", () => {
        const err = { missing: "" } as any;
        const result = errorHandlers.handleEnvironmentVariableError(err);
        expect(result.message).toContain(". Please check your configuration.");
      });

      it("should handle missing properties as null", () => {
        const err = { missing: null } as any;
        const result = errorHandlers.handleEnvironmentVariableError(err);
        expect(result.message).toContain("unknown environment variables");
      });
    });
  });
});
