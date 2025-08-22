import catchAsync from "../../../modules/error-handler/utils/catch-async";
import { safeCatchAsync, processMiddleware } from "../routers.helpers";

// Mock the catchAsync function
jest.mock("../../../modules/error-handler/utils/catch-async", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockedCatchAsync = catchAsync as jest.MockedFunction<typeof catchAsync>;

describe("Middleware Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock behavior
    mockedCatchAsync.mockImplementation((fn) => `wrapped_${fn}` as any);
  });

  describe("safeCatchAsync", () => {
    it("should wrap middleware with catchAsync when middleware is provided", () => {
      const mockMiddleware = jest.fn();

      const result = safeCatchAsync(mockMiddleware);

      expect(mockedCatchAsync).toHaveBeenCalledWith(mockMiddleware);
      expect(mockedCatchAsync).toHaveBeenCalledTimes(1);
      expect(result).toBe(`wrapped_${mockMiddleware}`);
    });

    it("should return undefined when middleware is null", () => {
      const result = safeCatchAsync(null);

      expect(mockedCatchAsync).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it("should return undefined when middleware is undefined", () => {
      const result = safeCatchAsync(undefined);

      expect(mockedCatchAsync).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it("should return undefined when middleware is empty string", () => {
      const result = safeCatchAsync("");

      expect(mockedCatchAsync).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it("should return undefined when middleware is 0", () => {
      const result = safeCatchAsync(0);

      expect(mockedCatchAsync).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it("should return undefined when middleware is false", () => {
      const result = safeCatchAsync(false);

      expect(mockedCatchAsync).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it("should throw error for non-function truthy values", () => {
      const truthyValue = "some-string";

      expect(() => safeCatchAsync(truthyValue)).toThrow(
        "Validation Error: Invalid interceptor of type string, they must be a function or an array of function. checkout https://arkosjs.com/docs/core-concepts/interceptor-middlewares"
      );

      expect(mockedCatchAsync).not.toHaveBeenCalled();
    });

    it("should handle when catchAsync throws an error", () => {
      const mockMiddleware = jest.fn();
      mockedCatchAsync.mockImplementation(() => {
        throw new Error("catchAsync failed");
      });

      expect(() => safeCatchAsync(mockMiddleware)).toThrow("catchAsync failed");
    });

    it("should handle middleware function that throws", () => {
      const throwingMiddleware = jest.fn().mockImplementation(() => {
        throw new Error("Middleware execution failed");
      });

      const result = safeCatchAsync(throwingMiddleware);

      expect(mockedCatchAsync).toHaveBeenCalledWith(throwingMiddleware);
      expect(result).toBe(`wrapped_${throwingMiddleware}`);
    });
  });

  describe("processMiddleware", () => {
    describe("null/undefined input", () => {
      it("should return empty array when middleware is null", () => {
        const result = processMiddleware(null);

        expect(result).toEqual([]);
        expect(mockedCatchAsync).not.toHaveBeenCalled();
      });

      it("should return empty array when middleware is undefined", () => {
        const result = processMiddleware(undefined);

        expect(result).toEqual([]);
        expect(mockedCatchAsync).not.toHaveBeenCalled();
      });
    });

    describe("single middleware", () => {
      it("should process single function middleware", () => {
        const mockMiddleware = jest.fn();

        const result = processMiddleware(mockMiddleware);

        expect(mockedCatchAsync).toHaveBeenCalledWith(mockMiddleware);
        expect(mockedCatchAsync).toHaveBeenCalledTimes(1);
        expect(result).toEqual([`wrapped_${mockMiddleware}`]);
      });

      it("should throw error for non-function truthy middleware", () => {
        const middleware = "middleware-string";

        expect(() => processMiddleware(middleware)).toThrow(
          "Validation Error: Invalid interceptor of type string, they must be a function or an array of function. checkout https://arkosjs.com/docs/core-concepts/interceptor-middlewares"
        );

        expect(mockedCatchAsync).not.toHaveBeenCalled();
      });

      it("should return array with undefined when single middleware is falsy", () => {
        const result = processMiddleware("");

        expect(mockedCatchAsync).not.toHaveBeenCalled();
        expect(result).toEqual([undefined]);
      });

      it("should handle single middleware that throws", () => {
        const throwingMiddleware = jest.fn().mockImplementation(() => {
          throw new Error("Middleware execution failed");
        });

        const result = processMiddleware(throwingMiddleware);

        expect(mockedCatchAsync).toHaveBeenCalledWith(throwingMiddleware);
        expect(result).toEqual([`wrapped_${throwingMiddleware}`]);
      });
    });

    describe("middleware arrays", () => {
      it("should process array of valid middleware functions", () => {
        const mw1 = jest.fn();
        const mw2 = jest.fn();
        const mw3 = jest.fn();
        const middlewareArray = [mw1, mw2, mw3];

        const result = processMiddleware(middlewareArray);

        expect(mockedCatchAsync).toHaveBeenCalledTimes(3);
        expect(mockedCatchAsync).toHaveBeenNthCalledWith(1, mw1);
        expect(mockedCatchAsync).toHaveBeenNthCalledWith(2, mw2);
        expect(mockedCatchAsync).toHaveBeenNthCalledWith(3, mw3);
        expect(result).toEqual([
          `wrapped_${mw1}`,
          `wrapped_${mw2}`,
          `wrapped_${mw3}`,
        ]);
      });

      it("should filter out falsy middleware from arrays", () => {
        const mw1 = jest.fn();
        const mw2 = jest.fn();
        const middlewareArray = [mw1, null, undefined, "", 0, false, mw2];

        const result = processMiddleware(middlewareArray);

        expect(mockedCatchAsync).toHaveBeenCalledTimes(2);
        expect(mockedCatchAsync).toHaveBeenNthCalledWith(1, mw1);
        expect(mockedCatchAsync).toHaveBeenNthCalledWith(2, mw2);
        expect(result).toEqual([`wrapped_${mw1}`, `wrapped_${mw2}`]);
      });

      it("should return empty array when all middleware are falsy", () => {
        const middlewareArray = [null, undefined, "", 0, false];

        const result = processMiddleware(middlewareArray);

        expect(mockedCatchAsync).not.toHaveBeenCalled();
        expect(result).toEqual([]);
      });

      it("should handle empty array", () => {
        const result = processMiddleware([]);

        expect(mockedCatchAsync).not.toHaveBeenCalled();
        expect(result).toEqual([]);
      });

      it("should handle mixed truthy and falsy values", () => {
        const mw1 = jest.fn().mockName("middleware1");
        const mw2 = jest.fn().mockName("middleware2");
        const mw3 = jest.fn().mockName("middleware3");
        const middlewareArray = [mw1, null, mw2, undefined, mw3, ""];

        const result = processMiddleware(middlewareArray);

        expect(mockedCatchAsync).toHaveBeenCalledTimes(3);
        expect(mockedCatchAsync).toHaveBeenNthCalledWith(1, mw1);
        expect(mockedCatchAsync).toHaveBeenNthCalledWith(2, mw2);
        expect(mockedCatchAsync).toHaveBeenNthCalledWith(3, mw3);
        expect(result).toEqual([
          `wrapped_${mw1}`,
          `wrapped_${mw2}`,
          `wrapped_${mw3}`,
        ]);
      });

      it("should handle array with throwing middleware functions", () => {
        const mw1 = jest.fn();
        const throwingMw = jest.fn().mockImplementation(() => {
          throw new Error("Middleware throws error");
        });
        const mw3 = jest.fn();
        const middlewareArray = [mw1, throwingMw, mw3];

        const result = processMiddleware(middlewareArray);

        expect(mockedCatchAsync).toHaveBeenCalledTimes(3);
        expect(mockedCatchAsync).toHaveBeenNthCalledWith(1, mw1);
        expect(mockedCatchAsync).toHaveBeenNthCalledWith(2, throwingMw);
        expect(mockedCatchAsync).toHaveBeenNthCalledWith(3, mw3);
        expect(result).toEqual([
          `wrapped_${mw1}`,
          `wrapped_${throwingMw}`,
          `wrapped_${mw3}`,
        ]);
      });

      it("should handle async middleware functions", () => {
        const asyncMw1 = jest.fn().mockImplementation(async () => {
          return "async result 1";
        });
        const asyncMw2 = jest.fn().mockImplementation(async () => {
          throw new Error("Async middleware error");
        });
        const middlewareArray = [asyncMw1, asyncMw2];

        const result = processMiddleware(middlewareArray);

        expect(mockedCatchAsync).toHaveBeenCalledTimes(2);
        expect(mockedCatchAsync).toHaveBeenNthCalledWith(1, asyncMw1);
        expect(mockedCatchAsync).toHaveBeenNthCalledWith(2, asyncMw2);
        expect(result).toEqual([`wrapped_${asyncMw1}`, `wrapped_${asyncMw2}`]);
      });
    });

    describe("edge cases", () => {
      it("should throw error for array-like objects", () => {
        const arrayLike = { 0: jest.fn(), 1: jest.fn(), length: 2 };

        expect(() => processMiddleware(arrayLike)).toThrow(
          "Validation Error: Invalid interceptor of type object, they must be a function or an array of function. checkout https://arkosjs.com/docs/core-concepts/interceptor-middlewares"
        );

        expect(mockedCatchAsync).not.toHaveBeenCalled();
      });

      it("should throw error for objects as single middleware", () => {
        const objMiddleware = { handler: jest.fn() };

        expect(() => processMiddleware(objMiddleware)).toThrow(
          "Validation Error: Invalid interceptor of type object, they must be a function or an array of function. checkout https://arkosjs.com/docs/core-concepts/interceptor-middlewares"
        );

        expect(mockedCatchAsync).not.toHaveBeenCalled();
      });

      it("should maintain order in arrays", () => {
        const interceptors: jest.MockedFunction<any>[] = [];
        for (let i = 0; i < 10; i++) {
          interceptors.push(jest.fn().mockName(`middleware_${i}`));
        }

        const result = processMiddleware(interceptors);

        expect(mockedCatchAsync).toHaveBeenCalledTimes(10);
        interceptors.forEach((mw, index) => {
          expect(mockedCatchAsync).toHaveBeenNthCalledWith(index + 1, mw);
        });
        expect(result).toHaveLength(10);
      });
    });

    describe("error handling scenarios", () => {
      it("should handle when catchAsync throws an error", () => {
        mockedCatchAsync.mockImplementation(() => {
          throw new Error("catchAsync failed");
        });

        const middleware = jest.fn();

        expect(() => processMiddleware(middleware)).toThrow(
          "catchAsync failed"
        );
      });

      it("should handle partial failures in array processing", () => {
        let callCount = 0;
        mockedCatchAsync.mockImplementation((mw) => {
          callCount++;
          if (callCount === 2) {
            throw new Error("Second middleware failed");
          }
          return `wrapped_${mw}` as any;
        });

        const interceptors = [jest.fn(), jest.fn(), jest.fn()];

        expect(() => processMiddleware(interceptors)).toThrow(
          "Second middleware failed"
        );
      });

      it("should handle middleware that throws during execution", () => {
        const mw1 = jest.fn();
        const throwingMw = jest.fn().mockImplementation(() => {
          throw new Error("Runtime middleware error");
        });
        const mw3 = jest.fn();

        // This tests that the middleware functions themselves can throw
        // but the wrapping process still works
        expect(() => {
          throwingMw(); // This would throw if called
        }).toThrow("Runtime middleware error");

        // But processMiddleware should still wrap them successfully
        const result = processMiddleware([mw1, throwingMw, mw3]);

        expect(mockedCatchAsync).toHaveBeenCalledTimes(3);
        expect(result).toEqual([
          `wrapped_${mw1}`,
          `wrapped_${throwingMw}`,
          `wrapped_${mw3}`,
        ]);
      });

      it("should handle async middleware that rejects", () => {
        const rejectingMw = jest
          .fn()
          .mockRejectedValue(new Error("Async rejection"));
        const normalMw = jest.fn();

        const result = processMiddleware([normalMw, rejectingMw]);

        expect(mockedCatchAsync).toHaveBeenCalledTimes(2);
        expect(result).toEqual([
          `wrapped_${normalMw}`,
          `wrapped_${rejectingMw}`,
        ]);
      });

      it("should handle complex error scenarios in arrays", () => {
        const normalMw = jest.fn();
        const throwingMw = jest.fn().mockImplementation(() => {
          throw new Error("Sync error");
        });
        const rejectingMw = jest
          .fn()
          .mockRejectedValue(new Error("Async error"));
        const timeoutMw = jest.fn().mockImplementation(() => {
          setTimeout(() => {
            throw new Error("Timeout error");
          }, 100);
        });

        const interceptors = [
          normalMw,
          throwingMw,
          null,
          rejectingMw,
          "",
          timeoutMw,
        ];

        const result = processMiddleware(interceptors);

        // Should only process truthy middleware
        expect(mockedCatchAsync).toHaveBeenCalledTimes(4);
        expect(result).toEqual([
          `wrapped_${normalMw}`,
          `wrapped_${throwingMw}`,
          `wrapped_${rejectingMw}`,
          `wrapped_${timeoutMw}`,
        ]);
      });
    });
  });
});
