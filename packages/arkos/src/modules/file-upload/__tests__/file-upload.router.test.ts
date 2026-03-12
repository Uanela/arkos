import { Router } from "express";
import { getFileUploadRouter } from "../file-upload.router";
import fileUploadController from "../file-upload.controller";
import { sendResponse } from "../../base/base.middlewares";
import express from "express";
import deepmerge from "../../../utils/helpers/deepmerge.helper";
import path from "path";
import loadableRegistry from "../../../components/arkos-loadable-registry";
import { routeHookReader } from "../../../components/arkos-route-hook/reader";
import { getArkosConfig } from "../../../server";

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

jest.mock("../../../server");
jest.mock("../file-upload.controller");
jest.mock("../../base/base.middlewares");
jest.mock("../../../utils/helpers/routers.helpers", () => ({
  processMiddleware: jest.fn((mw) => (Array.isArray(mw) ? mw : mw ? [mw] : [])),
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
jest.mock("../../../components/arkos-loadable-registry", () => ({
  __esModule: true,
  default: { getItem: jest.fn() },
}));
jest.mock("../../../components/arkos-route-hook/reader", () => ({
  routeHookReader: { forOperation: jest.fn() },
}));

const mockGetItem = loadableRegistry.getItem as jest.Mock;
const mockForOperation = routeHookReader.forOperation as jest.Mock;

const emptyHook = () => ({
  before: [],
  after: [],
  onError: [],
  routeConfig: {},
});

describe("File Upload Router", () => {
  let mockRouter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRouter = Router();

    (sendResponse as jest.Mock).mockImplementation(jest.fn());
    (path.resolve as jest.Mock).mockReturnValue("/resolved/path/to/uploads");
    (deepmerge as any as jest.Mock).mockImplementation((obj1, obj2) => ({
      ...obj1,
      ...obj2,
    }));

    (getArkosConfig as jest.Mock).mockReturnValue({
      fileUpload: {
        baseRoute: "/api/uploads/",
        baseUploadDir: "uploads",
        expressStatic: { maxAge: "30d" },
      },
    });

    mockGetItem.mockReturnValue(null);
    mockForOperation.mockImplementation(emptyHook);
  });

  test("should create router with default configuration", () => {
    getFileUploadRouter();

    expect(mockRouter.get).toHaveBeenCalledWith(
      { path: "/api/uploads/*" },
      expect.any(Function), // adjustRequestUrl
      "mockedStaticMiddleware"
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
      { path: "/api/uploads/:fileType" },
      fileUploadController.uploadFile,
      sendResponse
    );
    expect(mockRouter.patch).toHaveBeenCalledWith(
      { path: "/api/uploads/:fileType/:fileName" },
      fileUploadController.updateFile,
      sendResponse
    );
    expect(mockRouter.delete).toHaveBeenCalledWith(
      { path: "/api/uploads/:fileType/:fileName" },
      fileUploadController.deleteFile,
      sendResponse
    );
  });

  test("should call routeHookReader.forOperation for each route when interceptor exists", () => {
    mockGetItem.mockReturnValue({ some: "hook" });
    mockForOperation.mockImplementation(emptyHook);

    getFileUploadRouter();

    expect(mockForOperation).toHaveBeenCalledWith("file-upload", "findFile");
    expect(mockForOperation).toHaveBeenCalledWith("file-upload", "uploadFile");
    expect(mockForOperation).toHaveBeenCalledWith("file-upload", "updateFile");
    expect(mockForOperation).toHaveBeenCalledWith("file-upload", "deleteFile");
  });

  test("should not call routeHookReader.forOperation when no interceptor registered", () => {
    mockGetItem.mockReturnValue(null);

    getFileUploadRouter();

    expect(mockForOperation).not.toHaveBeenCalled();
  });

  test("should include before middleware when provided by route hook", () => {
    const beforeUploadFile = jest.fn();
    mockGetItem.mockReturnValue({ some: "hook" });
    mockForOperation.mockImplementation((_, op) =>
      op === "uploadFile"
        ? {
            before: [beforeUploadFile],
            after: [],
            onError: [],
            routeConfig: {},
          }
        : emptyHook()
    );

    getFileUploadRouter();

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/uploads/:fileType" }),
      beforeUploadFile,
      fileUploadController.uploadFile,
      sendResponse
    );
  });

  test("should include after middleware when provided by route hook", () => {
    const afterUploadFile = jest.fn();
    mockGetItem.mockReturnValue({ some: "hook" });
    mockForOperation.mockImplementation((_, op) =>
      op === "uploadFile"
        ? { before: [], after: [afterUploadFile], onError: [], routeConfig: {} }
        : emptyHook()
    );

    getFileUploadRouter();

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/uploads/:fileType" }),
      fileUploadController.uploadFile,
      afterUploadFile,
      sendResponse
    );
  });

  test("should include onError middleware when provided by route hook", () => {
    const onUploadFileError = jest.fn();
    mockGetItem.mockReturnValue({ some: "hook" });
    mockForOperation.mockImplementation((_, op) =>
      op === "uploadFile"
        ? {
            before: [],
            after: [],
            onError: [onUploadFileError],
            routeConfig: {},
          }
        : emptyHook()
    );

    getFileUploadRouter();

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/uploads/:fileType" }),
      fileUploadController.uploadFile,
      sendResponse,
      onUploadFileError
    );
  });

  test("should spread routeConfig into route path object", () => {
    const routeConfig = { someAuthOption: true };
    mockGetItem.mockReturnValue({ some: "hook" });
    mockForOperation.mockImplementation((_, op) =>
      op === "uploadFile"
        ? { before: [], after: [], onError: [], routeConfig }
        : emptyHook()
    );

    getFileUploadRouter();

    expect(mockRouter.post).toHaveBeenCalledWith(
      { ...routeConfig, path: "/api/uploads/:fileType" },
      fileUploadController.uploadFile,
      sendResponse
    );
  });

  test("should support before + after + onError together on same route", () => {
    const before = jest.fn();
    const after = jest.fn();
    const onError = jest.fn();
    mockGetItem.mockReturnValue({ some: "hook" });
    mockForOperation.mockImplementation((_, op) =>
      op === "uploadFile"
        ? {
            before: [before],
            after: [after],
            onError: [onError],
            routeConfig: {},
          }
        : emptyHook()
    );

    getFileUploadRouter();

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/uploads/:fileType" }),
      before,
      fileUploadController.uploadFile,
      after,
      sendResponse,
      onError
    );
  });

  test("should apply route hooks independently across different operations", () => {
    const beforeUpdate = jest.fn();
    const afterDelete = jest.fn();
    mockGetItem.mockReturnValue({ some: "hook" });
    mockForOperation.mockImplementation((_, op) => {
      if (op === "updateFile")
        return {
          before: [beforeUpdate],
          after: [],
          onError: [],
          routeConfig: {},
        };
      if (op === "deleteFile")
        return {
          before: [],
          after: [afterDelete],
          onError: [],
          routeConfig: {},
        };
      return emptyHook();
    });

    getFileUploadRouter();

    expect(mockRouter.patch).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/uploads/:fileType/:fileName" }),
      beforeUpdate,
      fileUploadController.updateFile,
      sendResponse
    );
    expect(mockRouter.delete).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/uploads/:fileType/:fileName" }),
      fileUploadController.deleteFile,
      afterDelete,
      sendResponse
    );
  });

  test("should normalize basePathname — add leading and trailing slashes", () => {
    const cases = [
      { baseRoute: "api/files", expectedBase: "/api/files/" },
      { baseRoute: "/api/files", expectedBase: "/api/files/" },
      { baseRoute: "api/files/", expectedBase: "/api/files/" },
      { baseRoute: "/api/files/", expectedBase: "/api/files/" },
    ];

    for (const { baseRoute, expectedBase } of cases) {
      jest.clearAllMocks();
      mockGetItem.mockReturnValue(null);
      mockForOperation.mockImplementation(emptyHook);
      (getArkosConfig as jest.Mock).mockReturnValue({
        fileUpload: { baseRoute, baseUploadDir: "uploads" },
      });
      (path.resolve as jest.Mock).mockReturnValue("/resolved/path/to/uploads");
      (deepmerge as any as jest.Mock).mockImplementation((a, b) => ({
        ...a,
        ...b,
      }));

      getFileUploadRouter();

      expect(mockRouter.get).toHaveBeenCalledWith(
        expect.objectContaining({ path: `${expectedBase}*` }),
        expect.any(Function),
        "mockedStaticMiddleware"
      );
      expect(mockRouter.post).toHaveBeenCalledWith(
        expect.objectContaining({ path: `${expectedBase}:fileType` }),
        fileUploadController.uploadFile,
        sendResponse
      );
    }
  });

  test("should use default baseRoute /api/uploads/ when not provided", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({
      fileUpload: { baseUploadDir: "uploads" },
    });

    getFileUploadRouter();

    expect(mockRouter.get).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/uploads/*" }),
      expect.any(Function),
      "mockedStaticMiddleware"
    );
  });

  test("should use default baseUploadDir uploads when not provided", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({
      fileUpload: { baseRoute: "/api/uploads/" },
    });

    getFileUploadRouter();

    expect(path.resolve).toHaveBeenCalledWith(
      expect.stringContaining("uploads")
    );
  });

  test("should merge default and custom express static options", () => {
    const customStaticOptions = { maxAge: "30d", etag: false, index: true };
    (getArkosConfig as jest.Mock).mockReturnValue({
      fileUpload: {
        baseRoute: "/api/uploads/",
        baseUploadDir: "uploads",
        expressStatic: customStaticOptions,
      },
    });

    getFileUploadRouter();

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

  test("should set up static file serving with resolved upload path", () => {
    getFileUploadRouter();

    expect(express.static).toHaveBeenCalledWith(
      "/resolved/path/to/uploads",
      expect.any(Object)
    );
  });
});
