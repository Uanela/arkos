import { Router } from "express";
import { getFileUploaderRouter } from "../file-uploader.router"; // Update with the correct path
import { importPrismaModelModules } from "../../../utils/helpers/models.helpers";
import authService from "../../auth/auth.service";
import fileUploaderController from "../file-uploader.controller";
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
jest.mock("../file-uploader.controller");
jest.mock("path");
jest.mock("fs");
jest.mock("../../../utils/helpers/deepmerge.helper");

describe("File Uploader Router", () => {
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
    const router = await getFileUploaderRouter(mockArkosConfig);

    // Assert
    expect(Router).toHaveBeenCalled();
    expect(importPrismaModelModules).toHaveBeenCalledWith("file-upload");

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

    expect(mockRouter.use).toHaveBeenCalledWith(
      "/api/uploads/",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      "mockedStaticMiddleware" // express.static middleware
    );

    // Check upload route setup
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/api/uploads/:fileType",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      fileUploaderController.uploadFile
    );

    // Check Delete route setup
    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/api/uploads/:fileType/:fileName",
      expect.any(Function), // authService.handleAuthenticationControl
      expect.any(Function), // authService.handleAccessControl
      fileUploaderController.deleteFile
    );

    // Expect the router to be returned
    expect(router).toBe(mockRouter);
  });

  test("should normalize basePathname by adding leading and trailing slashes", async () => {
    // Arrange
    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: {},
      authConfigs: {},
    });

    // Test cases with different baseRoute configurations
    const testCases = [
      { baseRoute: "api/files", expected: "/api/files/" },
      { baseRoute: "/api/files", expected: "/api/files/" },
      { baseRoute: "api/files/", expected: "/api/files/" },
      { baseRoute: "/api/files/", expected: "/api/files/" },
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
      await getFileUploaderRouter(config);

      // Assert
      expect(mockRouter.use).toHaveBeenCalledWith(
        testCase.expected,
        expect.any(Function),
        expect.any(Function),
        expect.any(String)
      );

      expect(mockRouter.post).toHaveBeenCalledWith(
        `${testCase.expected}:fileType`,
        expect.any(Function),
        expect.any(Function),
        fileUploaderController.uploadFile
      );

      expect(mockRouter.delete).toHaveBeenCalledWith(
        `${testCase.expected}:fileType/:fileName`,
        expect.any(Function),
        expect.any(Function),
        fileUploaderController.deleteFile
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
    await getFileUploaderRouter(configWithoutBaseRoute);

    // Assert
    expect(mockRouter.use).toHaveBeenCalledWith(
      "/api/uploads/",
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
    await getFileUploaderRouter(configWithoutBaseUploadDir);

    // Assert
    expect(path.resolve).toHaveBeenCalledWith(process.cwd(), "uploads");
  });

  test("should handle custom middlewares and auth configs from model modules", async () => {
    // Arrange
    const customMiddlewares = {
      beforeUpload: jest.fn(),
      afterUpload: jest.fn(),
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
    await getFileUploaderRouter(mockArkosConfig);

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
      "Delete",
      customAuthConfigs.authenticationControl
    );
  });

  test("should handle missing model modules gracefully", async () => {
    // Arrange
    (importPrismaModelModules as jest.Mock).mockResolvedValue(null);

    // Act
    await getFileUploaderRouter(mockArkosConfig);

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
    expect(mockRouter.use).toHaveBeenCalledTimes(1);
    expect(mockRouter.post).toHaveBeenCalledTimes(1);
    expect(mockRouter.delete).toHaveBeenCalledTimes(2);
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
    await getFileUploaderRouter(configWithCustomStaticOptions);

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
