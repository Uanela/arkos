import { Router } from "express";
import { getFileUploadRouter } from "../file-upload.router";
import { getModuleComponents } from "../../../utils/dynamic-loader";
import fileUploadController from "../file-upload.controller";
import { sendResponse } from "../../base/base.middlewares";
import { createRouteConfig } from "../../../utils/helpers/routers.helpers";
import express from "express";
import deepmerge from "../../../utils/helpers/deepmerge.helper";
import path from "path";

// Mock dependencies
jest.mock("express", () => {
  const mockRouter = {
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    patch: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    use: jest.fn().mockReturnThis(),
  };

  const mockExpress: any = jest.fn(() => ({
    use: jest.fn().mockReturnThis(),
    listen: jest.fn().mockReturnThis(),
  }));

  mockExpress.Router = jest.fn(() => mockRouter);
  mockExpress.default = mockExpress;
  mockExpress.json = jest.fn();
  mockExpress.urlencoded = jest.fn();
  mockExpress.static = jest.fn().mockReturnValue("mockedStaticMiddleware");

  return mockExpress;
});

jest.mock("../../../utils/dynamic-loader");
jest.mock("../file-upload.controller");
jest.mock("../../base/base.middlewares");
jest.mock("../../../utils/helpers/routers.helpers", () => ({
  createRouteConfig: jest.fn(
    (_, __, routeName, path) => `/${routeName}${path}`
  ),
  processMiddleware: jest.fn((mw, opts) => (mw ? [mw] : [])),
}));
jest.mock("path", () => ({
  resolve: jest.fn(),
  join: jest.fn((...val: string[]) => val.join("/")),
}));
jest.mock("fs");
jest.mock("../../../utils/helpers/deepmerge.helper");
jest.mock("../../../utils/arkos-router", () => {
  return jest.fn().mockImplementation(() => Router());
});

describe("File Upload Router", () => {
  let mockRouter: any;
  let mockArkosConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRouter = Router();

    (sendResponse as jest.Mock).mockImplementation(jest.fn());
    (path.resolve as jest.Mock).mockReturnValue("/resolved/path/to/uploads");
    (deepmerge as any as jest.Mock).mockImplementation((obj1, obj2) => ({
      ...obj1,
      ...obj2,
    }));

    mockArkosConfig = {
      fileUpload: {
        baseRoute: "/api/uploads/",
        baseUploadDir: "uploads",
        expressStatic: {
          maxAge: "30d",
        },
      },
    };
  });

  test("should create router with default configuration", async () => {
    // Arrange
    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      authConfigs: {},
    });

    // Act
    const router = await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(getModuleComponents).toHaveBeenCalledWith("file-upload");

    // Check createRouteConfig was called for each endpoint
    expect(createRouteConfig).toHaveBeenCalledWith(
      mockArkosConfig,
      "findFile",
      "api/uploads/",
      "*",
      expect.any(Object),
      "file-upload",
      expect.any(Object)
    );
    expect(createRouteConfig).toHaveBeenCalledWith(
      mockArkosConfig,
      "uploadFile",
      "api/uploads/",
      ":fileType",
      expect.any(Object),
      "file-upload",
      expect.any(Object)
    );
    expect(createRouteConfig).toHaveBeenCalledWith(
      mockArkosConfig,
      "updateFile",
      "api/uploads/",
      ":fileType/:fileName",
      expect.any(Object),
      "file-upload",
      expect.any(Object)
    );
    expect(createRouteConfig).toHaveBeenCalledWith(
      mockArkosConfig,
      "deleteFile",
      "api/uploads/",
      ":fileType/:fileName",
      expect.any(Object),
      "file-upload",
      expect.any(Object)
    );

    // Check static file middleware setup
    expect(path.resolve).toHaveBeenCalledWith(process.cwd() + "/uploads");
    expect(express.static).toHaveBeenCalledWith(
      "/resolved/path/to/uploads",
      expect.any(Object)
    );
    expect(deepmerge).toHaveBeenCalledWith(
      {
        maxAge: "1y",
        etag: true,
        lastModified: true,
        dotfiles: "ignore",
        fallthrough: true,
        index: false,
        cacheControl: true,
      },
      { maxAge: "30d" }
    );

    expect(mockRouter.get).toHaveBeenCalledWith(
      "/api/uploads/*",
      expect.any(Function), // adjustRequestUrl
      "mockedStaticMiddleware"
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/api/uploads/:fileType",
      fileUploadController.uploadFile,
      sendResponse
    );

    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/api/uploads/:fileType/:fileName",
      fileUploadController.updateFile,
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/api/uploads/:fileType/:fileName",
      fileUploadController.deleteFile,
      sendResponse
    );

    expect(router).toBe(mockRouter);
  });

  test("should handle custom interceptors with beforeUploadFile only", async () => {
    // Arrange
    const beforeUploadFile = jest.fn();

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: { beforeUploadFile },
      authConfigs: {},
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/api/uploads/:fileType",
      expect.any(Function), // beforeUploadFile
      fileUploadController.uploadFile,
      sendResponse
    );
  });

  test("should handle custom interceptors with afterUploadFile only", async () => {
    // Arrange
    const afterUploadFile = jest.fn();

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: { afterUploadFile },
      authConfigs: {},
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/api/uploads/:fileType",
      fileUploadController.uploadFile,
      expect.any(Function), // afterUploadFile
      sendResponse
    );
  });

  test("should handle custom interceptors with both beforeUploadFile and afterUploadFile", async () => {
    // Arrange
    const beforeUploadFile = jest.fn();
    const afterUploadFile = jest.fn();
    const onUploadFileError = jest.fn();

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: { beforeUploadFile, afterUploadFile, onUploadFileError },
      authConfigs: {},
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/api/uploads/:fileType",
      expect.any(Function), // beforeUploadFile
      fileUploadController.uploadFile,
      expect.any(Function), // afterUploadFile
      sendResponse,
      expect.any(Function) // onUploadFileError
    );
  });

  test("should handle custom interceptors for update file operations", async () => {
    // Arrange
    const beforeUpdateFile = jest.fn();
    const afterUpdateFile = jest.fn();
    const onUpdateFileError = jest.fn();

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: { beforeUpdateFile, afterUpdateFile, onUpdateFileError },
      authConfigs: {},
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/api/uploads/:fileType/:fileName",
      expect.any(Function), // beforeUpdateFile
      fileUploadController.updateFile,
      expect.any(Function), // afterUpdateFile
      sendResponse,
      expect.any(Function) // onUpdateFileError
    );
  });

  test("should handle custom interceptors for delete file operations", async () => {
    // Arrange
    const beforeDeleteFile = jest.fn();
    const afterDeleteFile = jest.fn();
    const onDeleteFileError = jest.fn();

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: { beforeDeleteFile, afterDeleteFile, onDeleteFileError },
      authConfigs: {},
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/api/uploads/:fileType/:fileName",
      expect.any(Function), // beforeDeleteFile
      fileUploadController.deleteFile,
      expect.any(Function), // afterDeleteFile
      sendResponse,
      expect.any(Function) // onDeleteFileError
    );
  });

  test("should handle custom interceptors for find file operations (static serving)", async () => {
    // Arrange
    const beforeFindFile = jest.fn();

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: { beforeFindFile },
      authConfigs: {},
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/api/uploads/*",
      expect.any(Function), // beforeFindFile
      expect.any(Function), // adjustRequestUrl
      "mockedStaticMiddleware"
    );
  });

  test("should handle mixed custom interceptors across different operations", async () => {
    // Arrange
    const beforeUploadFile = jest.fn();
    const afterUpdateFile = jest.fn();
    const beforeDeleteFile = jest.fn();
    const beforeFindFile = jest.fn();

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {
        beforeUploadFile,
        afterUpdateFile,
        beforeDeleteFile,
        beforeFindFile,
      },
      authConfigs: {},
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/api/uploads/*",
      expect.any(Function), // beforeFindFile
      expect.any(Function), // adjustRequestUrl
      "mockedStaticMiddleware"
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/api/uploads/:fileType",
      expect.any(Function), // beforeUploadFile
      fileUploadController.uploadFile,
      sendResponse
    );

    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/api/uploads/:fileType/:fileName",
      fileUploadController.updateFile,
      expect.any(Function), // afterUpdateFile
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/api/uploads/:fileType/:fileName",
      expect.any(Function), // beforeDeleteFile
      fileUploadController.deleteFile,
      sendResponse
    );
  });

  test("should normalize basePathname by adding leading and trailing slashes", async () => {
    // Arrange
    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      authConfigs: {},
    });

    const testCases = [
      { baseRoute: "api/files", prefix: "api/files/" },
      { baseRoute: "/api/files", prefix: "api/files/" },
      { baseRoute: "api/files/", prefix: "api/files/" },
      { baseRoute: "/api/files/", prefix: "api/files/" },
    ];

    for (const testCase of testCases) {
      jest.clearAllMocks();

      const config = {
        fileUpload: {
          ...mockArkosConfig.fileUpload,
          baseRoute: testCase.baseRoute,
        },
      };

      // Act
      await getFileUploadRouter(config);

      // Assert
      expect(createRouteConfig).toHaveBeenCalledWith(
        config,
        "findFile",
        testCase.prefix,
        "*",
        expect.any(Object),
        "file-upload",
        expect.any(Object)
      );

      expect(createRouteConfig).toHaveBeenCalledWith(
        config,
        "uploadFile",
        testCase.prefix,
        ":fileType",
        expect.any(Object),
        "file-upload",
        expect.any(Object)
      );

      expect(createRouteConfig).toHaveBeenCalledWith(
        config,
        "updateFile",
        testCase.prefix,
        ":fileType/:fileName",
        expect.any(Object),
        "file-upload",
        expect.any(Object)
      );

      expect(createRouteConfig).toHaveBeenCalledWith(
        config,
        "deleteFile",
        testCase.prefix,
        ":fileType/:fileName",
        expect.any(Object),
        "file-upload",
        expect.any(Object)
      );
    }
  });

  test("should use default baseRoute when not provided", async () => {
    // Arrange
    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      authConfigs: {},
    });

    const configWithoutBaseRoute = {
      fileUpload: {
        baseUploadDir: "uploads",
      },
    };

    // Act
    await getFileUploadRouter(configWithoutBaseRoute);

    // Assert
    expect(createRouteConfig).toHaveBeenCalledWith(
      configWithoutBaseRoute,
      "findFile",
      "api/uploads/",
      "*",
      expect.any(Object),
      "file-upload",
      expect.any(Object)
    );
  });

  test("should use default baseUploadDir when not provided", async () => {
    // Arrange
    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      authConfigs: {},
    });

    const configWithoutBaseUploadDir = {
      fileUpload: {
        baseRoute: "/api/uploads/",
      },
    };

    // Act
    await getFileUploadRouter(configWithoutBaseUploadDir);

    // Assert
    expect(path.resolve).toHaveBeenCalledWith(process.cwd() + "/uploads");
  });

  test("should pass authConfigs to createRouteConfig for all endpoints", async () => {
    // Arrange
    const customAuthConfigs = {
      authenticationControl: { View: false },
      accessControl: { Delete: ["Admin"] },
    };

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      authConfigs: customAuthConfigs,
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(createRouteConfig).toHaveBeenCalledWith(
      mockArkosConfig,
      "findFile",
      "api/uploads/",
      "*",
      expect.any(Object),
      "file-upload",
      customAuthConfigs
    );
    expect(createRouteConfig).toHaveBeenCalledWith(
      mockArkosConfig,
      "uploadFile",
      "api/uploads/",
      ":fileType",
      expect.any(Object),
      "file-upload",
      customAuthConfigs
    );
    expect(createRouteConfig).toHaveBeenCalledWith(
      mockArkosConfig,
      "updateFile",
      "api/uploads/",
      ":fileType/:fileName",
      expect.any(Object),
      "file-upload",
      customAuthConfigs
    );
    expect(createRouteConfig).toHaveBeenCalledWith(
      mockArkosConfig,
      "deleteFile",
      "api/uploads/",
      ":fileType/:fileName",
      expect.any(Object),
      "file-upload",
      customAuthConfigs
    );
  });

  test("should handle missing model modules gracefully", async () => {
    // Arrange
    (getModuleComponents as jest.Mock).mockResolvedValue(null);

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert — createRouteConfig is still called with empty authConfigs
    expect(createRouteConfig).toHaveBeenCalledWith(
      mockArkosConfig,
      "findFile",
      "api/uploads/",
      "*",
      expect.any(Object),
      "file-upload",
      {}
    );

    // All routes should still be configured
    expect(mockRouter.get).toHaveBeenCalledTimes(1);
    expect(mockRouter.post).toHaveBeenCalledTimes(1);
    expect(mockRouter.patch).toHaveBeenCalledTimes(1);
    expect(mockRouter.delete).toHaveBeenCalledTimes(1);
  });

  test("should merge default and custom express static options", async () => {
    // Arrange
    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      authConfigs: {},
    });

    const customStaticOptions = {
      maxAge: "30d",
      etag: false,
      index: true,
    };

    const configWithCustomStaticOptions = {
      fileUpload: {
        ...mockArkosConfig.fileUpload,
        expressStatic: customStaticOptions,
      },
    };

    // Act
    await getFileUploadRouter(configWithCustomStaticOptions);

    // Assert
    expect(deepmerge).toHaveBeenCalledWith(
      {
        maxAge: "1y",
        etag: true,
        lastModified: true,
        dotfiles: "ignore",
        fallthrough: true,
        index: false,
        cacheControl: true,
      },
      customStaticOptions
    );
  });
});
