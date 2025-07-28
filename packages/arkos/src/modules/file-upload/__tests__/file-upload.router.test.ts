import { Router } from "express";
import { getFileUploadRouter } from "../file-upload.router"; // Update with the correct path
import { importPrismaModelModules } from "../../../utils/helpers/models.helpers";
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

jest.mock("../../../utils/helpers/models.helpers");
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
        expressStaticOptions: {
          maxAge: "30d",
        },
      },
    };
  });

  test("should create router with default configuration", async () => {
    // Arrange
    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: {},
      authConfigs: {},
    });

    // Act
    const router = await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(Router).toHaveBeenCalled();
    expect(importPrismaModelModules).toHaveBeenCalledWith(
      "file-upload",
      mockArkosConfig
    );

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
      expect.any(Function), // authService.handleAccessControl
      "mockedStaticMiddleware" // express.static middleware
    );

    // Check upload route setup
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/api/uploads/:fileType",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      fileUploadController.uploadFile, // First middleware (no beforeUploadFile)
      sendResponse, // Second middleware (no afterUploadFile)
      sendResponse, // Third middleware
      sendResponse // Final middleware
    );

    // Check update route setup
    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/api/uploads/:fileType/:fileName",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      fileUploadController.updateFile, // First middleware (no beforeUpdateFile)
      sendResponse, // Second middleware (no afterUpdateFile)
      sendResponse, // Third middleware
      sendResponse // Final middleware
    );

    // Check Delete route setup
    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/api/uploads/:fileType/:fileName",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      fileUploadController.deleteFile, // First middleware (no beforeDeleteFile)
      sendResponse, // Second middleware (no afterDeleteFile)
      sendResponse, // Third middleware
      sendResponse // Final middleware
    );

    // Expect the router to be returned
    expect(router).toBe(mockRouter);
  });

  test("should handle custom middlewares with beforeUploadFile only", async () => {
    // Arrange
    const beforeUploadFile = jest.fn();
    const customMiddlewares = {
      beforeUploadFile,
    };

    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: customMiddlewares,
      authConfigs: {},
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/api/uploads/:fileType",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      beforeUploadFile, // First middleware (beforeUploadFile)
      fileUploadController.uploadFile, // Second middleware (controller)
      sendResponse, // Third middleware
      sendResponse // Final middleware
    );
  });

  test("should handle custom middlewares with afterUploadFile only", async () => {
    // Arrange
    const afterUploadFile = jest.fn();
    const customMiddlewares = {
      afterUploadFile,
    };

    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: customMiddlewares,
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
      afterUploadFile, // Second middleware (afterUploadFile)
      sendResponse, // Third middleware
      sendResponse // Final middleware
    );
  });

  test("should handle custom middlewares with both beforeUploadFile and afterUploadFile", async () => {
    // Arrange
    const beforeUploadFile = jest.fn();
    const afterUploadFile = jest.fn();
    const customMiddlewares = {
      beforeUploadFile,
      afterUploadFile,
    };

    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: customMiddlewares,
      authConfigs: {},
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/api/uploads/:fileType",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      beforeUploadFile, // First middleware (beforeUploadFile)
      fileUploadController.uploadFile, // Second middleware (controller)
      afterUploadFile, // Third middleware (afterUploadFile)
      sendResponse // Final middleware
    );
  });

  test("should handle custom middlewares for update file operations", async () => {
    // Arrange
    const beforeUpdateFile = jest.fn();
    const afterUpdateFile = jest.fn();
    const customMiddlewares = {
      beforeUpdateFile,
      afterUpdateFile,
    };

    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: customMiddlewares,
      authConfigs: {},
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/api/uploads/:fileType/:fileName",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      beforeUpdateFile, // First middleware (beforeUpdateFile)
      fileUploadController.updateFile, // Second middleware (controller)
      afterUpdateFile, // Third middleware (afterUpdateFile)
      sendResponse // Final middleware
    );
  });

  test("should handle custom middlewares for delete file operations", async () => {
    // Arrange
    const beforeDeleteFile = jest.fn();
    const afterDeleteFile = jest.fn();
    const customMiddlewares = {
      beforeDeleteFile,
      afterDeleteFile,
    };

    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: customMiddlewares,
      authConfigs: {},
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/api/uploads/:fileType/:fileName",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      beforeDeleteFile, // First middleware (beforeDeleteFile)
      fileUploadController.deleteFile, // Second middleware (controller)
      afterDeleteFile, // Third middleware (afterDeleteFile)
      sendResponse // Final middleware
    );
  });

  test("should handle custom middlewares for find file operations (static serving)", async () => {
    // Arrange
    const beforeFindFile = jest.fn();
    const customMiddlewares = {
      beforeFindFile,
    };

    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: customMiddlewares,
      authConfigs: {},
    });

    // Act
    await getFileUploadRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/api/uploads/*",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      beforeFindFile, // beforeFindFile middleware instead of express.static,
      expect.any(Function), // authService.handleAccessControl
      "mockedStaticMiddleware"
    );
  });

  test("should handle mixed custom middlewares across different operations", async () => {
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

    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: customMiddlewares,
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
      beforeFindFile,
      expect.any(Function),
      "mockedStaticMiddleware"
    );

    // Check upload route with beforeUploadFile only
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/api/uploads/:fileType",
      expect.any(Function),
      expect.any(Function),
      beforeUploadFile,
      fileUploadController.uploadFile,
      sendResponse,
      sendResponse
    );

    // Check update route with afterUpdateFile only
    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/api/uploads/:fileType/:fileName",
      expect.any(Function),
      expect.any(Function),
      fileUploadController.updateFile,
      afterUpdateFile,
      sendResponse,
      sendResponse
    );

    // Check delete route with beforeDeleteFile only
    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/api/uploads/:fileType/:fileName",
      expect.any(Function),
      expect.any(Function),
      beforeDeleteFile,
      fileUploadController.deleteFile,
      sendResponse,
      sendResponse
    );
  });

  test("should normalize basePathname by adding leading and trailing slashes", async () => {
    // Arrange
    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: {},
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
        sendResponse,
        sendResponse,
        sendResponse
      );

      expect(mockRouter.patch).toHaveBeenCalledWith(
        `${testCase.expected}:fileType/:fileName`.replace("*", ""),
        expect.any(Function),
        expect.any(Function),
        fileUploadController.updateFile,
        sendResponse,
        sendResponse,
        sendResponse
      );

      expect(mockRouter.delete).toHaveBeenCalledWith(
        `${testCase.expected}:fileType/:fileName`.replace("*", ""),
        expect.any(Function),
        expect.any(Function),
        fileUploadController.deleteFile,
        sendResponse,
        sendResponse,
        sendResponse
      );
    }
  });

  test("should use default baseRoute when not provided", async () => {
    // Arrange
    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: {},
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
    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: {},
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

  test("should handle custom middlewares and auth configs from model modules", async () => {
    // Arrange
    const customMiddlewares = {
      beforeUploadFile: jest.fn(),
      afterUploadFile: jest.fn(),
    };

    const customAuthConfigs = {
      authenticationControl: { View: false },
      accessControl: { Delete: ["Admin"] },
    };

    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: customMiddlewares,
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
    (importPrismaModelModules as jest.Mock).mockResolvedValue(null);

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
    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: {},
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
        expressStaticOptions: customStaticOptions,
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
