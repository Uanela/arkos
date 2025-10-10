import AppError from "../app-error";

describe("AppError", () => {
  describe("Constructor", () => {
    it("should create an instance with required parameters", () => {
      const error = new AppError("Test error", 400);

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(400);
      expect(error.status).toBe("fail");
      expect(error.isOperational).toBe(true);
      expect(error.missing).toBe(false);
      expect(error.code).toBe("Unknown");
      expect(error.meta).toBeUndefined();
      expect(error.stack).toBeDefined();
    });

    it("should throw an error when meta and code both are string", () => {
      try {
        new AppError("Test error", 400, "code", "meta");
      } catch (err: any) {
        expect(err.message).toBe(
          `meta and code must not both be string, one must be of type object and other string. but received ${JSON.stringify({ meta: "meta", code: "code" })}`
        );
      }
    });

    it("should create an instance with all parameters", () => {
      const meta = { field: "username" };
      const error = new AppError("Test error", 400, meta, "VALIDATION_ERROR");

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(400);
      expect(error.status).toBe("fail");
      expect(error.isOperational).toBe(true);
      expect(error.missing).toBe(false);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.meta).toEqual(meta);
    });

    it("should set status to 'fail' for 4xx status codes", () => {
      const error400 = new AppError("Bad request", 400);
      const error404 = new AppError("Not found", 404);
      const error422 = new AppError("Unprocessable entity", 422);

      expect(error400.status).toBe("fail");
      expect(error404.status).toBe("fail");
      expect(error422.status).toBe("fail");
    });

    it("should set status to 'error' for 5xx status codes", () => {
      const error500 = new AppError("Server error", 500);
      const error503 = new AppError("Service unavailable", 503);

      expect(error500.status).toBe("error");
      expect(error503.status).toBe("error");
    });
  });

  describe("Inheritance", () => {
    it("should be catchable as an Error", () => {
      const appError = new AppError("Test error", 400);
      let caughtError: Error | null = null;

      try {
        throw appError;
      } catch (error) {
        caughtError = error as Error;
      }

      expect(caughtError).toBe(appError);
    });

    it("should be identifiable with instanceof", () => {
      const appError = new AppError("Test error", 400);

      expect(appError instanceof AppError).toBe(true);
      expect(appError instanceof Error).toBe(true);
    });
  });

  describe("Example usage", () => {
    function getUser(id: string) {
      if (!id) {
        throw new AppError(
          "User ID is required",
          400,
          { field: "id" },
          "USER_ID_MISSING"
        );
      }
      // Simulate a user not found scenario
      throw new AppError(
        "User not found",
        404,
        { userId: id },
        "USER_NOT_FOUND"
      );
    }

    it("should throw appropriate error when ID is missing", () => {
      try {
        getUser("");
        fail("Expected an error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        if (error instanceof AppError) {
          expect(error.message).toBe("User ID is required");
          expect(error.code).toBe("USER_ID_MISSING");
          expect(error.statusCode).toBe(400);
          expect(error.meta).toEqual({ field: "id" });
        }
      }
    });

    it("should throw appropriate error when user is not found", () => {
      try {
        getUser("123");
        fail("Expected an error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        if (error instanceof AppError) {
          expect(error.message).toBe("User not found");
          expect(error.code).toBe("USER_NOT_FOUND");
          expect(error.statusCode).toBe(404);
          expect(error.meta).toEqual({ userId: "123" });
        }
      }
    });
  });

  describe("Stack trace", () => {
    it("should capture stack trace", () => {
      const error = new AppError("Test error", 400);
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe("string");
      expect(error.stack).toContain("Error");
    });
  });
});
