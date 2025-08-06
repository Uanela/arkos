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

    it("should wrap truthy non-function values", () => {
      const truthyValue = "some-string";

      const result = safeCatchAsync(truthyValue);

      expect(mockedCatchAsync).toHaveBeenCalledWith(truthyValue);
      expect(result).toBe(`wrapped_${truthyValue}`);
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

      it("should process single truthy middleware", () => {
        const middleware = "middleware-string";

        const result = processMiddleware(middleware);

        expect(mockedCatchAsync).toHaveBeenCalledWith(middleware);
        expect(result).toEqual([`wrapped_${middleware}`]);
      });

      it("should return array with undefined when single middleware is falsy", () => {
        const result = processMiddleware("");

        expect(mockedCatchAsync).not.toHaveBeenCalled();
        expect(result).toEqual([undefined]);
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
        const mw1 = "middleware1";
        const mw2 = 42;
        const mw3 = { handler: "test" };
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
    });

    describe("edge cases", () => {
      it("should handle array-like objects", () => {
        const arrayLike = { 0: jest.fn(), 1: jest.fn(), length: 2 };

        const result = processMiddleware(arrayLike);

        // Should treat as single middleware since it's not a real array
        expect(mockedCatchAsync).toHaveBeenCalledWith(arrayLike);
        expect(result).toEqual([`wrapped_${arrayLike}`]);
      });

      it("should handle objects as single middleware", () => {
        const objMiddleware = { handler: jest.fn() };

        const result = processMiddleware(objMiddleware);

        expect(mockedCatchAsync).toHaveBeenCalledWith(objMiddleware);
        expect(result).toEqual([`wrapped_${objMiddleware}`]);
      });

      it("should maintain order in arrays", () => {
        const middlewares: string[] = [];
        for (let i = 0; i < 10; i++) {
          middlewares.push(`middleware_${i}`);
        }

        const result = processMiddleware(middlewares);

        expect(mockedCatchAsync).toHaveBeenCalledTimes(10);
        middlewares.forEach((mw, index) => {
          expect(mockedCatchAsync).toHaveBeenNthCalledWith(index + 1, mw);
        });
        expect(result).toHaveLength(10);
      });
    });

    describe("type safety", () => {
      it("should handle various data types as middleware", () => {
        const testCases = [
          123,
          "string",
          true,
          new Date(),
          /regex/,
          () => {},
          async () => {},
          function* () {},
          new Map(),
          new Set(),
        ];

        testCases.forEach((testCase) => {
          jest.clearAllMocks();
          const result = processMiddleware(testCase);
          expect(mockedCatchAsync).toHaveBeenCalledWith(testCase);
          expect(result).toEqual([`wrapped_${testCase.toString()}`]);
        });
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

        const middlewares = [jest.fn(), jest.fn(), jest.fn()];

        expect(() => processMiddleware(middlewares)).toThrow(
          "Second middleware failed"
        );
      });
    });
  });
});
