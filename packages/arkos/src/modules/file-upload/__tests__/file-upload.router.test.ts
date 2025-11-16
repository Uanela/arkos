import { Router } from "express";
import { getFileUploadRouter } from "../file-upload.router"; // Update with the correct path
import { getModuleComponents } from "../../../utils/dynamic-loader";
import authService from "../../auth/auth.service";
import fileUploadController from "../file-upload.controller";
import { sendResponse } from "../../base/base.middlewares";
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

  // Create a mock express function
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
jest.mock("../../auth/auth.service");
jest.mock("../file-upload.controller");
jest.mock("../../base/base.middlewares");
jest.mock("path");
jest.mock("fs");
jest.mock("../../../utils/helpers/deepmerge.helper");

describe("File Upload Router", () => {
  let mockRouter: any;
  let mockArkosConfig: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mocks
    mockRouter = Router();

    (authService.handleAuthenticationControl as jest.Mock).mockReturnValue(
      jest.fn()
    );
    (authService.handleAccessControl as jest.Mock).mockReturnValue(jest.fn());
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
    expect(Router).toHaveBeenCalled();
    expect(getModuleComponents).toHaveBeenCalledWith("file-upload");

    // Check static file middleware setup
    expect(path.resolve).toHaveBeenCalledWith(process.cwd(), "uploads");
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
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      expect.any(Function), // helper middlware for handling params corrections
      "mockedStaticMiddleware" // express.static middleware
    );

    // Check upload route setup
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/api/uploads/:fileType",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      fileUploadController.uploadFile, // First middleware (no beforeUploadFile)
      sendResponse
    );

    // Check update route setup
    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/api/uploads/:fileType/:fileName",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      fileUploadController.updateFile, // First middleware (no beforeUpdateFile)
      sendResponse
    );

    // Check Delete route setup
    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/api/uploads/:fileType/:fileName",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      fileUploadController.deleteFile, // First middleware (no beforeDeleteFile)
      sendResponse
    );

    // Expect the router to be returned
    expect(router).toBe(mockRouter);
  });

  test("should handle custom interceptors with beforeUploadFile only", async () => {
    // Arrange
    const beforeUploadFile = jest.fn();
    const customMiddlewares = {
      beforeUploadFile,
    };

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: customMiddlewares,
      authConfigs: {},
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/api/uploads/:fileType",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      expect.any(Function), // First middleware (beforeUploadFile)
      fileUploadController.uploadFile, // Second middleware (controller)
      sendResponse
    );
  });

  test("should handle custom interceptors with afterUploadFile only", async () => {
    // Arrange
    const afterUploadFile = jest.fn();
    const customMiddlewares = {
      afterUploadFile,
    };

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: customMiddlewares,
      authConfigs: {},
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/api/uploads/:fileType",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      fileUploadController.uploadFile, // First middleware (controller, no beforeUploadFile)
      expect.any(Function), // Second middleware (afterUploadFile)
      sendResponse
    );
  });

  test("should handle custom interceptors with both beforeUploadFile and afterUploadFile", async () => {
    // Arrange
    const beforeUploadFile = jest.fn();
    const afterUploadFile = jest.fn();
    const onUploadFileError = jest.fn();
    const customMiddlewares = {
      beforeUploadFile,
      afterUploadFile,
      onUploadFileError,
    };

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: customMiddlewares,
      authConfigs: {},
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/api/uploads/:fileType",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      expect.any(Function), // First middleware (beforeUploadFile)
      fileUploadController.uploadFile, // Second middleware (controller)
      expect.any(Function), // Third middleware (afterUploadFile)
      sendResponse,
      expect.any(Function) // Error handling middleware
    );
  });

  test("should handle custom interceptors for update file operations", async () => {
    // Arrange
    const beforeUpdateFile = jest.fn();
    const afterUpdateFile = jest.fn();
    const onUpdateFileError = jest.fn();
    const customMiddlewares = {
      beforeUpdateFile,
      afterUpdateFile,
      onUpdateFileError,
    };

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: customMiddlewares,
      authConfigs: {},
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/api/uploads/:fileType/:fileName",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      expect.any(Function), // First middleware (beforeUpdateFile)
      fileUploadController.updateFile, // Second middleware (controller)
      expect.any(Function), // Third middleware (afterUpdateFile)
      sendResponse,
      expect.any(Function) // Final middleware
    );
  });

  test("should handle custom interceptors for delete file operations", async () => {
    // Arrange
    const beforeDeleteFile = jest.fn();
    const afterDeleteFile = jest.fn();
    const onDeleteFileError = jest.fn();
    const customMiddlewares = {
      beforeDeleteFile,
      afterDeleteFile,
      onDeleteFileError,
    };

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: customMiddlewares,
      authConfigs: {},
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/api/uploads/:fileType/:fileName",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      expect.any(Function), // First middleware (beforeDeleteFile)
      fileUploadController.deleteFile, // Second middleware (controller)
      expect.any(Function), // Third middleware (afterDeleteFile)
      sendResponse,
      expect.any(Function) // Final middleware
    );
  });

  test("should handle custom interceptors for find file operations (static serving)", async () => {
    // Arrange
    const beforeFindFile = jest.fn();
    const customMiddlewares = {
      beforeFindFile,
    };

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: customMiddlewares,
      authConfigs: {},
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/api/uploads/*",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      expect.any(Function), // before mw
      expect.any(Function), // url corrector
      "mockedStaticMiddleware"
    );
  });

  test("should handle mixed custom interceptors across different operations", async () => {
    // Arrange
    const beforeUploadFile = jest.fn();
    const afterUpdateFile = jest.fn();
    const beforeDeleteFile = jest.fn();
    const beforeFindFile = jest.fn();

    const customMiddlewares = {
      beforeUploadFile,
      afterUpdateFile,
      beforeDeleteFile,
      beforeFindFile,
    };

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: customMiddlewares,
      authConfigs: {},
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    // Check static file route
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/api/uploads/*",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function), // after mw
      "mockedStaticMiddleware"
    );

    // Check upload route with beforeUploadFile only
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/api/uploads/:fileType",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      fileUploadController.uploadFile,
      sendResponse
    );

    // Check update route with afterUpdateFile only
    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/api/uploads/:fileType/:fileName",
      expect.any(Function),
      expect.any(Function),
      fileUploadController.updateFile,
      expect.any(Function), // after mw
      sendResponse
    );

    // Check delete route with beforeDeleteFile only
    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/api/uploads/:fileType/:fileName",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function), // before mw
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

    // Test cases with different baseRoute configurations
    const testCases = [
      { baseRoute: "api/files", expected: "/api/files/*" },
      { baseRoute: "/api/files", expected: "/api/files/*" },
      { baseRoute: "api/files/", expected: "/api/files/*" },
      { baseRoute: "/api/files/", expected: "/api/files/*" },
    ];

    for (const testCase of testCases) {
      // Reset mocks for each test case
      jest.clearAllMocks();

      // Set up config for this test case
      const config = {
        fileUpload: {
          ...mockArkosConfig.fileUpload,
          baseRoute: testCase.baseRoute,
        },
      };

      // Act
      await getFileUploadRouter(config);

      // Assert
      expect(mockRouter.get).toHaveBeenCalledWith(
        testCase.expected,
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(String)
      );

      expect(mockRouter.post).toHaveBeenCalledWith(
        `${testCase.expected}:fileType`.replace("*", ""),
        expect.any(Function),
        expect.any(Function),
        fileUploadController.uploadFile,
        sendResponse
      );

      expect(mockRouter.patch).toHaveBeenCalledWith(
        `${testCase.expected}:fileType/:fileName`.replace("*", ""),
        expect.any(Function),
        expect.any(Function),
        fileUploadController.updateFile,
        sendResponse
      );

      expect(mockRouter.delete).toHaveBeenCalledWith(
        `${testCase.expected}:fileType/:fileName`.replace("*", ""),
        expect.any(Function),
        expect.any(Function),
        fileUploadController.deleteFile,
        sendResponse
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
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/api/uploads/*",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(String)
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
    expect(path.resolve).toHaveBeenCalledWith(process.cwd(), "uploads");
  });

  test("should handle custom interceptors and auth configs from model modules", async () => {
    // Arrange
    const customMiddlewares = {
      beforeUploadFile: jest.fn(),
      afterUploadFile: jest.fn(),
    };

    const customAuthConfigs = {
      authenticationControl: { View: false },
      accessControl: { Delete: ["Admin"] },
    };

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: customMiddlewares,
      authConfigs: customAuthConfigs,
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(authService.handleAuthenticationControl).toHaveBeenCalledWith(
      "View",
      customAuthConfigs.authenticationControl
    );

    expect(authService.handleAccessControl).toHaveBeenCalledWith(
      "View",
      "file-upload",
      customAuthConfigs.accessControl
    );

    expect(authService.handleAuthenticationControl).toHaveBeenCalledWith(
      "Create",
      customAuthConfigs.authenticationControl
    );

    expect(authService.handleAccessControl).toHaveBeenCalledWith(
      "Create",
      "file-upload",
      customAuthConfigs.accessControl
    );

    expect(authService.handleAuthenticationControl).toHaveBeenCalledWith(
      "Update",
      customAuthConfigs.authenticationControl
    );

    expect(authService.handleAuthenticationControl).toHaveBeenCalledWith(
      "Delete",
      customAuthConfigs.authenticationControl
    );
  });

  test("should handle missing model modules gracefully", async () => {
    // Arrange
    (getModuleComponents as jest.Mock).mockResolvedValue(null);

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(authService.handleAuthenticationControl).toHaveBeenCalledWith(
      "View",
      undefined
    );

    expect(authService.handleAccessControl).toHaveBeenCalledWith(
      "View",
      "file-upload",
      undefined
    );

    // All the routes should still be configured correctly
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
