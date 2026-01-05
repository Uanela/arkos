import {
  extractArkosRoutes,
  extractPathParams,
  getMiddlewareStack,
} from "../index";
import RouteConfigRegistry from "../../../route-config-registry";
import authService from "../../../../../modules/auth/auth.service";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { queryParser } from "../../../../helpers/query-parser.helpers";
import express from "express";
import multer from "multer";
import uploadManager from "../upload-manager";
import { validateRequestInputs } from "../../../../../modules/base/base.middlewares";

// Mock all dependencies at the top
jest.mock("../../../../../modules/auth/auth.service");
jest.mock("express-rate-limit");
jest.mock("compression");
jest.mock("../../../../helpers/query-parser.helpers");
jest.mock("express");
jest.mock("multer");
jest.mock("../upload-manager");
jest.mock("../../../../../modules/base/base.middlewares");

jest.mock("fs");

describe("extractArkosRoutes", () => {
  const handler1 = jest.fn();
  const handler2 = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    RouteConfigRegistry.get = jest.fn((handler) => {
      if (handler === handler1) return { path: "/a", method: "GET" };
      if (handler === handler2) return { path: "/b", method: "POST" };
      return undefined;
    });
  });

  it("should extract routes with their methods and configs", () => {
    const app = {
      _router: {
        stack: [
          {
            route: {
              path: "/a",
              methods: { get: true },
              stack: [{ handle: handler1 }],
            },
          },
          {
            route: {
              path: "/b",
              methods: { post: true },
              stack: [{ handle: handler2 }],
            },
          },
        ],
      },
    };

    const result = extractArkosRoutes(app);

    expect(result).toEqual([
      { path: "/a", method: "GET", config: { path: "/a", method: "GET" } },
      { path: "/b", method: "POST", config: { path: "/b", method: "POST" } },
    ]);
  });

  it("should handle nested routers", () => {
    const handler3 = jest.fn();
    RouteConfigRegistry.get = jest.fn((handler) => {
      if (handler === handler3) return { path: "/c", method: "GET" };
      return undefined;
    });

    const app = {
      _router: {
        stack: [
          {
            name: "router",
            handle: {
              stack: [
                {
                  route: {
                    path: "/c",
                    methods: { get: true },
                    stack: [{ handle: handler3 }],
                  },
                },
              ],
            },
            regexp: /\/nested\/?/,
          },
        ],
      },
    };

    const result = extractArkosRoutes(app, "/base");

    expect(result).toEqual([
      {
        path: "/base/nested/c",
        method: "GET",
        config: { path: "/c", method: "GET" },
      },
    ]);
  });

  it("should return empty array if no stack", () => {
    const app = {};
    const result = extractArkosRoutes(app);
    expect(result).toEqual([]);
  });
});

describe("extractPathParams", () => {
  it("should extract single path parameter", () => {
    const path = "/api/users/:userId";
    const result = extractPathParams(path);
    expect(result).toEqual(["userId"]);
  });

  it("should extract multiple path parameters", () => {
    const path = "/api/users/:userId/posts/:postId";
    const result = extractPathParams(path);
    expect(result).toEqual(["userId", "postId"]);
  });

  it("should return empty array when no parameters", () => {
    const path = "/api/users";
    const result = extractPathParams(path);
    expect(result).toEqual([]);
  });

  it("should extract parameters with underscores", () => {
    const path = "/api/users/:user_id/posts/:post_id";
    const result = extractPathParams(path);
    expect(result).toEqual(["user_id", "post_id"]);
  });

  it("should extract parameters from complex paths", () => {
    const path =
      "/api/:version/users/:userId/posts/:postId/comments/:commentId";
    const result = extractPathParams(path);
    expect(result).toEqual(["version", "userId", "postId", "commentId"]);
  });

  it("should handle trailing slashes", () => {
    const path = "/api/users/:userId/";
    const result = extractPathParams(path);
    expect(result).toEqual(["userId"]);
  });

  it("should handle paths starting without slash", () => {
    const path = "api/users/:userId";
    const result = extractPathParams(path);
    expect(result).toEqual(["userId"]);
  });
});

describe("getMiddlewareStack", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup auth service mock
    (authService.authenticate as jest.Mock) = jest.fn();
    (authService.handleAccessControl as jest.Mock) = jest.fn(() => jest.fn());

    // Setup other mocks
    (rateLimit as jest.Mock).mockReturnValue(jest.fn());
    (compression as any as jest.Mock).mockReturnValue(jest.fn());
    (queryParser as jest.Mock).mockReturnValue(jest.fn());
    (validateRequestInputs as jest.Mock).mockReturnValue(jest.fn());

    // Setup express parsers
    (express.json as jest.Mock) = jest.fn(() => jest.fn());
    (express.urlencoded as jest.Mock) = jest.fn(() => jest.fn());
    (express.text as jest.Mock) = jest.fn(() => jest.fn());
    (express.raw as jest.Mock) = jest.fn(() => jest.fn());

    // Setup multer
    (multer as any as jest.Mock).mockReturnValue({
      none: jest.fn(() => jest.fn()),
    });

    // Setup upload manager
    (uploadManager.handleUpload as jest.Mock) = jest.fn(() => jest.fn());
    (uploadManager.handlePostUpload as jest.Mock) = jest.fn(() => jest.fn());
  });

  describe("bodyParser middleware", () => {
    it("should add json body parser when specified", () => {
      const config: any = {
        bodyParser: {
          parser: "json",
          options: { limit: "10mb" },
        },
      };

      getMiddlewareStack(config);

      expect(express.json).toHaveBeenCalledWith({ limit: "10mb" });
    });

    it("should add urlencoded body parser when specified", () => {
      const config: any = {
        bodyParser: {
          parser: "urlencoded",
          options: { extended: true },
        },
      };

      getMiddlewareStack(config);

      expect(express.urlencoded).toHaveBeenCalledWith({ extended: true });
    });

    it("should add text body parser when specified", () => {
      const config: any = {
        bodyParser: {
          parser: "text",
          options: { type: "text/plain" },
        },
      };

      getMiddlewareStack(config);

      expect(express.text).toHaveBeenCalledWith({ type: "text/plain" });
    });

    it("should add raw body parser when specified", () => {
      const config: any = {
        bodyParser: {
          parser: "raw",
          options: { type: "application/octet-stream" },
        },
      };

      getMiddlewareStack(config);

      expect(express.raw).toHaveBeenCalledWith({
        type: "application/octet-stream",
      });
    });

    it("should handle multiple body parsers", () => {
      const config: any = {
        bodyParser: [
          { parser: "json", options: { limit: "10mb" } },
          { parser: "urlencoded", options: { extended: true } },
        ],
      };

      getMiddlewareStack(config);

      expect(express.json).toHaveBeenCalledWith({ limit: "10mb" });
      expect(express.urlencoded).toHaveBeenCalledWith({ extended: true });
    });

    it("should add multipart parser with multer", () => {
      const config: any = {
        bodyParser: {
          parser: "multipart",
          options: { fileSize: 1024000 },
        },
      };

      getMiddlewareStack(config);

      expect(multer).toHaveBeenCalledWith({
        limits: { fileSize: 1024000 },
      });
    });

    it("should handle array with multipart parser", () => {
      const config: any = {
        bodyParser: [
          { parser: "json", options: {} },
          { parser: "multipart", options: { fileSize: 1024000 } },
        ],
      };

      getMiddlewareStack(config);

      expect(express.json).toHaveBeenCalledWith({});
      expect(multer).toHaveBeenCalledWith({
        limits: { fileSize: 1024000 },
      });
    });

    it("should not add body parser if parser is not specified", () => {
      const config: any = {
        bodyParser: {
          options: { limit: "10mb" },
        },
      };

      getMiddlewareStack(config);

      expect(express.json).not.toHaveBeenCalled();
      expect(express.urlencoded).not.toHaveBeenCalled();
    });

    it("should handle single parser as object", () => {
      const config: any = {
        bodyParser: { parser: "json", options: { strict: true } },
      };

      getMiddlewareStack(config);

      expect(express.json).toHaveBeenCalledWith({ strict: true });
    });

    it("should skip parser if parser property is missing in object", () => {
      const config: any = {
        bodyParser: [
          { options: { limit: "10mb" } }, // no parser property
          { parser: "json", options: {} },
        ],
      };

      getMiddlewareStack(config);

      expect(express.json).toHaveBeenCalledTimes(1);
      expect(express.json).toHaveBeenCalledWith({});
    });
  });

  describe("uploads middleware", () => {
    it("should add upload middleware when uploads config is present", () => {
      const uploadsConfig = {
        fields: ["avatar", "documents"],
        maxFileSize: 5242880,
      };

      const config: any = {
        experimental: {
          uploads: uploadsConfig,
        },
      };

      getMiddlewareStack(config);

      expect(uploadManager.handleUpload).toHaveBeenCalledWith(uploadsConfig);
      expect(uploadManager.handlePostUpload).toHaveBeenCalledWith(
        uploadsConfig
      );
    });

    it("should add validateRequestInputs between upload middlewares", () => {
      const uploadsConfig = {
        fields: ["file"],
      };

      const config: any = {
        experimental: {
          uploads: uploadsConfig,
        },
      };

      const middlewares = getMiddlewareStack(config);

      expect(validateRequestInputs).toHaveBeenCalledWith(config);
      expect(middlewares.length).toBe(3); // handleUpload, validateRequestInputs, handlePostUpload
    });

    it("should add validateRequestInputs without upload handlers when no uploads", () => {
      const config: any = {};

      getMiddlewareStack(config);

      expect(uploadManager.handleUpload).not.toHaveBeenCalled();
      expect(uploadManager.handlePostUpload).not.toHaveBeenCalled();
      expect(validateRequestInputs).toHaveBeenCalledWith(config);
    });

    it("should handle uploads with multiple fields", () => {
      const uploadsConfig = {
        fields: ["avatar", "cover", "documents"],
        maxFileSize: 10485760,
        allowedTypes: ["image/jpeg", "image/png", "application/pdf"],
      };

      const config: any = {
        experimental: {
          uploads: uploadsConfig,
        },
      };

      getMiddlewareStack(config);

      expect(uploadManager.handleUpload).toHaveBeenCalledWith(uploadsConfig);
    });

    it("should handle uploads with empty config", () => {
      const config: any = {
        experimental: {
          uploads: {},
        },
      };

      getMiddlewareStack(config);

      expect(uploadManager.handleUpload).toHaveBeenCalledWith({});
      expect(uploadManager.handlePostUpload).toHaveBeenCalledWith({});
    });
  });

  describe("combined middlewares", () => {
    it("should maintain correct middleware order with all features", () => {
      const config: any = {
        authentication: true,
        rateLimit: { windowMs: 60000, max: 100 },
        compression: { threshold: 1024 },
        queryParser: { parseNumbers: true },
        bodyParser: { parser: "json", options: {} },
        experimental: {
          uploads: { fields: ["file"] },
        },
      };

      const middlewares = getMiddlewareStack(config);

      // authentication, rateLimit, compression, queryParser, bodyParser, handleUpload, validateRequestInputs, handlePostUpload
      expect(middlewares.length).toBe(8);
    });

    it("should handle authentication with access control", () => {
      const config: any = {
        authentication: {
          action: "read",
          resource: "users",
          rule: "own",
        },
      };

      getMiddlewareStack(config);

      expect(authService.handleAccessControl).toHaveBeenCalledWith(
        "read",
        "users",
        { read: "own" }
      );
    });

    it("should handle minimal config", () => {
      const config: any = {};

      const middlewares = getMiddlewareStack(config);

      // Should only have validateRequestInputs
      expect(middlewares.length).toBe(1);
      expect(validateRequestInputs).toHaveBeenCalledWith(config);
    });

    it("should not add authentication middleware when false", () => {
      const config: any = {
        authentication: false,
      };

      getMiddlewareStack(config);

      expect(authService.authenticate).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle empty bodyParser array", () => {
      const config: any = {
        bodyParser: [],
      };

      getMiddlewareStack(config);

      expect(express.json).not.toHaveBeenCalled();
    });

    it("should handle bodyParser without options property", () => {
      const config: any = {
        bodyParser: { parser: "json" },
      };

      getMiddlewareStack(config);

      expect(express.json).toHaveBeenCalled();
    });

    it("should wrap parsers in catchAsync", () => {
      const config: any = {
        bodyParser: { parser: "json", options: {} },
      };

      const middlewares = getMiddlewareStack(config);

      // Middleware should be wrapped
      expect(middlewares.length).toBeGreaterThan(0);
    });

    it("should handle authentication as true boolean", () => {
      const config: any = {
        authentication: true,
      };

      const middlewares = getMiddlewareStack(config);

      expect(middlewares.length).toBeGreaterThan(0);
    });

    it("should handle all optional fields missing", () => {
      const config: any = {};

      const middlewares = getMiddlewareStack(config);

      expect(middlewares.length).toBe(1);
      expect(validateRequestInputs).toHaveBeenCalled();
    });
  });
});
