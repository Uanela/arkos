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
import { uploadServingRegistry } from "../utils/helpers/upload-serving.registry";
import { DEFAULT_UPLOAD_DIRS } from "../utils/helpers/upload-path.helper";

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
    uploadServingRegistry.reset();

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
      expect.objectContaining({ path: "/api/uploads/*slug" }),
      expect.any(Function), // adjustRequestUrl
      "mockedStaticMiddleware",
      expect.any(Function) // file not found handler
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/uploads/:fileType" }),
      fileUploadController.uploadFile,
      sendResponse
    );
    expect(mockRouter.patch).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/uploads/:fileType/*fileName" }),
      fileUploadController.updateFile,
      sendResponse
    );
    expect(mockRouter.delete).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/uploads/:fileType/*fileName" }),
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
      expect.objectContaining({ ...routeConfig, path: "/api/uploads/:fileType" }
      ),
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
      expect.objectContaining({ path: "/api/uploads/:fileType/*fileName" }),
      beforeUpdate,
      fileUploadController.updateFile,
      sendResponse
    );
    expect(mockRouter.delete).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/uploads/:fileType/*fileName" }),
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
        expect.objectContaining({ path: `${expectedBase}*slug` }),
        expect.any(Function),
        "mockedStaticMiddleware",
        expect.any(Function), // Error handler

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
      expect.objectContaining({ path: "/api/uploads/*slug" }),
      expect.any(Function),
      "mockedStaticMiddleware",
      expect.any(Function), // Error handler
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
        fallthrough: false,
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

  describe("upload serving", () => {
    test("should enable find file serving in the registry by default", () => {
      getFileUploadRouter();

      expect(uploadServingRegistry.isFindFileServingEnabled()).toBe(true);
    });

    test("should disable find file serving when findFile route is disabled", () => {
      mockGetItem.mockReturnValue({ some: "hook" });
      mockForOperation.mockImplementation((_module: string, operation: string) =>
        operation === "findFile"
          ? { ...emptyHook(), routeConfig: { disabled: true } }
          : emptyHook()
      );

      getFileUploadRouter();

      expect(uploadServingRegistry.isFindFileServingEnabled()).toBe(false);
    });

    test("should not register routes and should disable serving when fileUpload.enabled is false", () => {
      uploadServingRegistry.setFindFileServingEnabled(true);
      (getArkosConfig as jest.Mock).mockReturnValue({
        fileUpload: { enabled: false },
      });

      getFileUploadRouter();

      expect(mockRouter.get).not.toHaveBeenCalled();
      expect(mockRouter.post).not.toHaveBeenCalled();
      expect(uploadServingRegistry.isFindFileServingEnabled()).toBe(false);
    });

    test("should serve by wildcard path without a file type guard when serving is all", () => {
      getFileUploadRouter();

      const getCall = mockRouter.get.mock.calls[0];

      expect(getCall[0]).toEqual(
        expect.objectContaining({ path: "/api/uploads/*slug" })
      );
      expect(getCall).toHaveLength(4);
    });

    describe("serving registered", () => {
      beforeEach(() => {
        (getArkosConfig as jest.Mock).mockReturnValue({
          fileUpload: {
            baseRoute: "/api/uploads/",
            baseUploadDir: "uploads",
            serving: "registered",
          },
        });
      });

      test("should scope find file path by file type and add a guard middleware", () => {
        getFileUploadRouter();

        const getCall = mockRouter.get.mock.calls[0];

        expect(getCall[0]).toEqual(
          expect.objectContaining({ path: "/api/uploads/:fileType/*slug" })
        );
        expect(getCall).toHaveLength(5);
      });

      test("should respond 404 for a file type that is not a built-in upload dir", () => {
        getFileUploadRouter();

        const guard = mockRouter.get.mock.calls[0][2];
        const next = jest.fn();

        guard({ params: { fileType: "private" }, path: "/private/a.png" }, {}, next);

        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({ statusCode: 404, code: "FileNotFound" })
        );
      });

      test("should continue for built-in upload dirs", () => {
        getFileUploadRouter();

        const guard = mockRouter.get.mock.calls[0][2];
        const next = jest.fn();

        guard(
          { params: { fileType: DEFAULT_UPLOAD_DIRS[0] }, path: "/a.png" },
          {},
          next
        );

        expect(next).toHaveBeenCalledWith();
      });
    });
  });
});
