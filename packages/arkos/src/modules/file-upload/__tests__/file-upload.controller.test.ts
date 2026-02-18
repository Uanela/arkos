import path from "path";
import fs from "fs";
import fileUploadController, {
  FileUploadController,
} from "../file-upload.controller";
import AppError from "../../error-handler/utils/app-error";
import { getFileUploadServices } from "../file-upload.service";
import { getArkosConfig } from "../../../server";
import {
  processFile,
  processImage,
} from "../utils/helpers/file-upload.helpers";
import { getModuleComponents } from "../../../utils/dynamic-loader";
import { MulterError } from "multer";
import { ArkosRequest, ArkosResponse } from "../../../types";

jest.mock("../../../utils/prisma/prisma-schema-parser", () => ({
  parse: jest.fn(),
  getModelsAsArrayOfStrings: jest.fn(() => []),
}));
jest.mock("../file-upload.service");
jest.mock("../../../server");
jest.mock("../utils/helpers/file-upload.helpers");
jest.mock("../../../utils/helpers/fs.helpers");
jest.mock("../../../utils/dynamic-loader");
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  readdirSync: jest.fn(),
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
  },
}));

describe("FileUploadController", () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.MockedFunction<any>;
  let mockUploader: any;

  beforeEach(() => {
    mockReq = {
      params: {},
      query: {},
      files: [],
      file: null,
      protocol: "http",
      originalUrl: "",
      get: jest.fn().mockReturnValue("localhost:3000"),
      responseData: null,
      responseStatus: null,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      writeHead: jest.fn(),
      pipe: jest.fn(),
      locals: {},
    };

    mockNext = jest.fn();

    mockUploader = {
      handleMultipleUpload: jest.fn().mockReturnValue(jest.fn()),
      deleteFileByUrl: jest.fn(),
      deleteFileByName: jest.fn(),
    };

    // Setup default mocks
    (getFileUploadServices as jest.MockedFunction<any>).mockReturnValue({
      documentUploadService: mockUploader,
      fileUploadService: mockUploader,
      imageUploadService: mockUploader,
      videoUploadService: mockUploader,
    });

    (getArkosConfig as jest.MockedFunction<any>).mockReturnValue({
      fileUpload: {
        baseUploadDir: "/uploads",
        baseRoute: "/api/uploads",
      },
    });

    (getModuleComponents as jest.MockedFunction<any>).mockReturnValue({
      interceptors: {},
    });

    (fs.promises.access as jest.MockedFunction<any>).mockResolvedValue(true);
    (fs.promises.mkdir as jest.MockedFunction<any>).mockResolvedValue(true);
    (processFile as jest.MockedFunction<any>).mockResolvedValue(
      "http://localhost:3000/uploads/files/test.txt"
    );
    (processImage as jest.MockedFunction<any>).mockResolvedValue(
      "http://localhost:3000/uploads/images/test.jpg"
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("handleUploadError (private)", () => {
    let controller: FileUploadController;
    let next: jest.Mock;

    // Access the private method via casting
    const callHandleUploadError = (
      controller: FileUploadController,
      err: any,
      next: jest.Mock
    ) => (controller as any).handleUploadError(err, next);

    beforeEach(() => {
      controller = new FileUploadController();
      next = jest.fn();
    });

    it("should call next with an AppError(400) when err is a MulterError", () => {
      const multerErr = new MulterError("LIMIT_FILE_SIZE");

      callHandleUploadError(controller, multerErr, next);

      expect(next).toHaveBeenCalledTimes(1);
      const receivedError = next.mock.calls[0][0];
      expect(receivedError).toBeInstanceOf(AppError);
      expect(receivedError.statusCode).toBe(400);
      expect(receivedError.message).toBe(multerErr.message);
    });

    it("should use MulterError.code as the AppError code when code is present", () => {
      const multerErr = new MulterError("LIMIT_FILE_COUNT");
      // MulterError sets .code automatically to the first argument
      callHandleUploadError(controller, multerErr, next);

      const receivedError = next.mock.calls[0][0];
      expect(receivedError.code).toBe("LIMIT_FILE_COUNT");
    });

    it("should fall back to 'FileUploadError' as the code when MulterError.code is falsy", () => {
      const multerErr = new MulterError("LIMIT_FILE_SIZE");
      // Force code to be falsy to test the fallback
      (multerErr as any).code = undefined;

      callHandleUploadError(controller, multerErr, next);

      const receivedError = next.mock.calls[0][0];
      expect(receivedError.code).toBe("FileUploadError");
    });

    it("should forward non-MulterError errors directly to next without wrapping", () => {
      const genericErr = new Error("something went wrong");

      callHandleUploadError(controller, genericErr, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(genericErr);
      // Should NOT be wrapped in AppError — it's passed through as-is
      const receivedError = next.mock.calls[0][0];
      expect(receivedError).toBe(genericErr);
    });

    it("should forward an existing AppError directly to next without double-wrapping", () => {
      const appErr = new AppError("Forbidden", 403, "ForbiddenError");

      callHandleUploadError(controller, appErr, next);

      expect(next).toHaveBeenCalledWith(appErr);
      expect(next.mock.calls[0][0]).toBe(appErr);
    });
  });

  describe("uploadFile", () => {
    it("should upload a single file successfully", async () => {
      mockReq.params = { fileType: "files" };
      mockReq.file = { path: "/tmp/the-reapeter.txt" };

      const mockHandleUpload = jest.fn((req: any, res: any, callback: any) => {
        callback(null);
      });
      mockUploader.handleMultipleUpload.mockReturnValue(mockHandleUpload);
      (processFile as jest.MockedFunction<any>).mockResolvedValue(
        "http://localhost:3000/uploads/files/the-reapeter.txt"
      );
      await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

      expect(processFile).toHaveBeenCalledWith(
        mockReq,
        "/tmp/the-reapeter.txt"
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: "http://localhost:3000/uploads/files/the-reapeter.txt",
        message: "File uploaded successfully",
      });
    });

    it("should upload multiple files successfully", async () => {
      mockReq.params = { fileType: "files" };
      mockReq.files = [{ path: "/tmp/test1.txt" }, { path: "/tmp/test2.txt" }];

      const mockHandleUpload = jest.fn((req: any, res: any, callback: any) => {
        callback(null);
      });
      mockUploader.handleMultipleUpload.mockReturnValue(mockHandleUpload);

      (processFile as jest.MockedFunction<any>)
        .mockResolvedValueOnce("http://localhost:3000/uploads/files/test1.txt")
        .mockResolvedValueOnce("http://localhost:3000/uploads/files/test2.txt");

      await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

      expect(processFile).toHaveBeenCalledTimes(2);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [
          "http://localhost:3000/uploads/files/test1.txt",
          "http://localhost:3000/uploads/files/test2.txt",
        ],
        message: "2 files uploaded successfully",
      });
    });

    it("should process images with transformation options", async () => {
      mockReq.params = { fileType: "images" };
      mockReq.query = { format: "webp", width: "800", height: "600" };
      mockReq.file = { path: "/tmp/test.jpg" };

      const mockHandleUpload = jest.fn((req: any, res: any, callback: any) => {
        callback(null);
      });
      mockUploader.handleMultipleUpload.mockReturnValue(mockHandleUpload);

      await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

      expect(processImage).toHaveBeenCalledWith(
        mockReq,
        mockNext,
        "/tmp/test.jpg",
        {
          format: "webp",
          width: "800",
          height: "600",
          resizeTo: undefined,
        }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should handle invalid file type", async () => {
      mockReq.params = { fileType: "invalid" };

      await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        new AppError("Invalid file type", 400)
      );
    });

    it("should handle no file uploaded error", async () => {
      mockReq.params = { fileType: "files" };
      mockReq.file = null;
      mockReq.files = null;

      const mockHandleUpload = jest.fn((req: any, res: any, callback: any) => {
        callback(null);
      });
      mockUploader.handleMultipleUpload.mockReturnValue(mockHandleUpload);

      await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        new AppError(
          "No file or files were attached on field files on the request body as form data.",
          400,
          {},
          "NoFileOrFilesAttached"
        )
      );
    });

    it("should handle upload errors", async () => {
      mockReq.params = { fileType: "files" };
      const uploadError = new Error("Upload failed");

      const mockHandleUpload = jest.fn((req: any, res: any, callback: any) => {
        callback(uploadError);
      });
      mockUploader.handleMultipleUpload.mockReturnValue(mockHandleUpload);

      await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(uploadError);
    });

    it("should create upload directory if it does not exist", async () => {
      mockReq.params = { fileType: "files" };
      mockReq.file = { path: "/tmp/test.txt" };

      (fs.promises.access as jest.MockedFunction<any>).mockRejectedValue(
        new Error("Directory not found")
      );

      const mockHandleUpload = jest.fn((req: any, res: any, callback: any) => {
        callback(null);
      });
      mockUploader.handleMultipleUpload.mockReturnValue(mockHandleUpload);

      await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

      expect(fs.promises.mkdir).toHaveBeenCalledWith(
        path.resolve(process.cwd(), "/uploads", "files"),
        { recursive: true }
      );
    });

    it("should handle middleware after upload", async () => {
      mockReq.params = { fileType: "files" };
      mockReq.file = { path: "/tmp/test.txt" };

      (getModuleComponents as jest.Mock).mockReturnValue({
        interceptors: {
          afterUploadFile: true,
        },
      });

      const mockHandleUpload = jest.fn((req: any, res: any, callback: any) => {
        callback(null);
      });
      mockUploader.handleMultipleUpload.mockReturnValue(mockHandleUpload);

      await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

      expect(mockReq.responseData).toEqual({
        success: true,
        data: "http://localhost:3000/uploads/files/test.txt",
        message: "File uploaded successfully",
      });
      expect(mockReq.responseStatus).toBe(200);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should filter out null values from failed processing", async () => {
      mockReq.params = { fileType: "files" };
      mockReq.files = [{ path: "/tmp/test1.txt" }, { path: "/tmp/test2.txt" }];

      const mockHandleUpload = jest.fn((req: any, res: any, callback: any) => {
        callback(null);
      });
      mockUploader.handleMultipleUpload.mockReturnValue(mockHandleUpload);

      (getModuleComponents as jest.Mock).mockReturnValue({
        interceptors: {
          afterUploadFile: false,
        },
      });

      (processFile as jest.MockedFunction<any>)
        .mockResolvedValueOnce("http://localhost:3000/uploads/files/test1.txt")
        .mockResolvedValueOnce(null);

      await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: ["http://localhost:3000/uploads/files/test1.txt"],
        message: "1 files uploaded successfully",
      });
    });

    describe("uploadFile — handleUploadError behavior", () => {
      let controller: FileUploadController;
      let req: Partial<ArkosRequest>;
      let res: Partial<ArkosResponse>;
      let next: jest.Mock;

      beforeEach(() => {
        controller = new FileUploadController();
        next = jest.fn();
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        req = {
          params: { fileType: "images" },
          query: {},
          protocol: "http",
          get: jest.fn().mockReturnValue("localhost:3000"),
        };

        // Reset so each test can override the cb behavior
        jest.clearAllMocks();
      });

      it("should call next with an AppError(400) when multer emits a MulterError during upload", async () => {
        const multerErr = new MulterError("LIMIT_FILE_SIZE");

        // Make handleMultipleUpload call cb with a MulterError
        const { getFileUploadServices } = require("../file-upload.service");
        getFileUploadServices.mockReturnValueOnce({
          imageUploadService: {
            handleMultipleUpload: jest
              .fn()
              .mockReturnValue((_req: any, _res: any, cb: Function) =>
                cb(multerErr)
              ),
          },
          videoUploadService: { handleMultipleUpload: jest.fn() },
          documentUploadService: { handleMultipleUpload: jest.fn() },
          fileUploadService: { handleMultipleUpload: jest.fn() },
        });

        await controller.uploadFile(
          req as ArkosRequest,
          res as ArkosResponse,
          next
        );

        expect(next).toHaveBeenCalledTimes(1);
        const receivedError = next.mock.calls[0][0];
        expect(receivedError).toBeInstanceOf(AppError);
        expect(receivedError.statusCode).toBe(400);
        expect(receivedError.message).toBe(multerErr.message);
      });

      it("should use MulterError.code as the AppError code on upload when code is present", async () => {
        const multerErr = new MulterError("LIMIT_UNEXPECTED_FILE");

        const { getFileUploadServices } = require("../file-upload.service");
        getFileUploadServices.mockReturnValueOnce({
          imageUploadService: {
            handleMultipleUpload: jest
              .fn()
              .mockReturnValue((_req: any, _res: any, cb: Function) =>
                cb(multerErr)
              ),
          },
          videoUploadService: { handleMultipleUpload: jest.fn() },
          documentUploadService: { handleMultipleUpload: jest.fn() },
          fileUploadService: { handleMultipleUpload: jest.fn() },
        });

        await controller.uploadFile(
          req as ArkosRequest,
          res as ArkosResponse,
          next
        );

        const receivedError = next.mock.calls[0][0];
        expect(receivedError.code).toBe("LIMIT_UNEXPECTED_FILE");
      });

      it("should fall back to 'FileUploadError' as AppError code on upload when MulterError.code is falsy", async () => {
        const multerErr = new MulterError("LIMIT_FILE_SIZE");
        (multerErr as any).code = undefined;

        const { getFileUploadServices } = require("../file-upload.service");
        getFileUploadServices.mockReturnValueOnce({
          imageUploadService: {
            handleMultipleUpload: jest
              .fn()
              .mockReturnValue((_req: any, _res: any, cb: Function) =>
                cb(multerErr)
              ),
          },
          videoUploadService: { handleMultipleUpload: jest.fn() },
          documentUploadService: { handleMultipleUpload: jest.fn() },
          fileUploadService: { handleMultipleUpload: jest.fn() },
        });

        await controller.uploadFile(
          req as ArkosRequest,
          res as ArkosResponse,
          next
        );

        const receivedError = next.mock.calls[0][0];
        expect(receivedError.code).toBe("FileUploadError");
      });

      it("should forward a generic Error directly to next without wrapping during upload", async () => {
        const genericErr = new Error("Disk full");

        const { getFileUploadServices } = require("../file-upload.service");
        getFileUploadServices.mockReturnValueOnce({
          imageUploadService: {
            handleMultipleUpload: jest
              .fn()
              .mockReturnValue((_req: any, _res: any, cb: Function) =>
                cb(genericErr)
              ),
          },
          videoUploadService: { handleMultipleUpload: jest.fn() },
          documentUploadService: { handleMultipleUpload: jest.fn() },
          fileUploadService: { handleMultipleUpload: jest.fn() },
        });

        await controller.uploadFile(
          req as ArkosRequest,
          res as ArkosResponse,
          next
        );

        expect(next).toHaveBeenCalledWith(genericErr);
        expect(next.mock.calls[0][0]).toBe(genericErr); // same reference, not wrapped
      });
    });
  });

  describe("deleteFile", () => {
    it("should delete file by URL when URL matches expected pattern", async () => {
      mockReq.params = { fileType: "files", fileName: "test.txt" };
      mockReq.originalUrl = "/api/uploads/files/test.txt";

      await fileUploadController.deleteFile(mockReq, mockRes, mockNext);

      expect(mockUploader.deleteFileByUrl).toHaveBeenCalledWith(
        "http://localhost:3000/api/uploads/files/test.txt"
      );
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.json).toHaveBeenCalledWith();
    });

    it("should delete file by name when URL does not match expected pattern", async () => {
      mockReq.params = { fileType: "files", fileName: "test.txt" };
      mockReq.originalUrl = "/custom/path/files/test.txt";

      await fileUploadController.deleteFile(mockReq, mockRes, mockNext);

      expect(mockUploader.deleteFileByName).toHaveBeenCalledWith(
        "test.txt",
        "files"
      );
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });

    it("should handle invalid file type for deletion", async () => {
      mockReq.params = { fileType: "invalid", fileName: "test.txt" };

      await fileUploadController.deleteFile(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        new AppError("Invalid file type", 400)
      );
    });

    it("should handle file not found error", async () => {
      mockReq.params = { fileType: "files", fileName: "test.txt" };
      mockReq.originalUrl = "/api/uploads/files/test.txt";

      mockUploader.deleteFileByUrl.mockRejectedValue(
        new Error("File not found")
      );

      await fileUploadController.deleteFile(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        new AppError("File not found", 404)
      );
    });

    it("should handle AppError properly", async () => {
      mockReq.params = { fileType: "files", fileName: "test.txt" };
      mockReq.originalUrl = "/api/uploads/files/test.txt";

      const appError = new AppError("Custom error", 403);
      mockUploader.deleteFileByUrl.mockRejectedValue(appError);

      await fileUploadController.deleteFile(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(appError);
    });

    it("should handle middleware after delete", async () => {
      mockReq.params = { fileType: "files", fileName: "test.txt" };
      mockReq.originalUrl = "/api/uploads/files/test.txt";

      (getModuleComponents as jest.Mock).mockReturnValue({
        interceptors: {
          afterDeleteFile: true,
        },
      });

      await fileUploadController.deleteFile(mockReq, mockRes, mockNext);

      expect(mockReq.responseStatus).toBe(204);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe("updateFile", () => {
    it("should update file successfully with fileName", async () => {
      mockReq.params = { fileType: "files", fileName: "old-test.txt" };
      mockReq.file = { path: "/tmp/new-test.txt" };
      mockReq.originalUrl = "/api/uploads/files/old-test.txt";

      const mockHandleUpload = jest.fn((req: any, res: any, callback: any) => {
        callback(null);
      });
      mockUploader.handleMultipleUpload.mockReturnValue(mockHandleUpload);

      await fileUploadController.updateFile(mockReq, mockRes, mockNext);

      expect(mockUploader.deleteFileByUrl).toHaveBeenCalledWith(
        "http://localhost:3000/api/uploads/files/old-test.txt"
      );
      expect(processFile).toHaveBeenCalledWith(mockReq, "/tmp/new-test.txt");
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: "http://localhost:3000/uploads/files/test.txt",
        message: "File updated successfully",
      });
    });

    it("should handle update without fileName (new upload)", async () => {
      mockReq.params = { fileType: "files", fileName: "" };
      mockReq.file = { path: "/tmp/new-test.txt" };

      const mockHandleUpload = jest.fn((req: any, res: any, callback: any) => {
        callback(null);
      });
      mockUploader.handleMultipleUpload.mockReturnValue(mockHandleUpload);

      await fileUploadController.updateFile(mockReq, mockRes, mockNext);

      expect(mockUploader.deleteFileByUrl).not.toHaveBeenCalled();
      expect(mockUploader.deleteFileByName).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: "http://localhost:3000/uploads/files/test.txt",
        message: "File uploaded successfully",
      });
    });

    it("should handle multiple file updates", async () => {
      try {
        mockReq.params = { fileType: "files", fileName: "old-repeater.txt" };
        mockReq.files = [
          { path: "/tmp/new-repeater1.txt" },
          { path: "/tmp/new-repeater2.txt" },
        ];
        mockReq.originalUrl = "/api/uploads/files/old-repeater.txt";

        const mockHandleUpload = jest.fn(
          (req: any, res: any, callback: any) => {
            callback(null);
          }
        );
        mockUploader.handleMultipleUpload.mockReturnValue(mockHandleUpload);

        (processFile as jest.MockedFunction<any>)
          .mockResolvedValueOnce(
            "http://localhost:3000/uploads/files/repeater1.txt"
          )
          .mockResolvedValueOnce(
            "http://localhost:3000/uploads/files/repeater2.txt"
          );

        (getModuleComponents as jest.Mock).mockReturnValue({
          interceptors: {
            afterUpdateFile: false,
          },
        });

        await fileUploadController.updateFile(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: [
            "http://localhost:3000/uploads/files/repeater1.txt",
            "http://localhost:3000/uploads/files/repeater2.txt",
          ],
          message: "File updated successfully. 2 new files uploaded",
        });
      } catch {}
    });

    it("should handle no new file uploaded error", async () => {
      mockReq.params = { fileType: "files", fileName: "old-test.txt" };
      mockReq.file = null;
      mockReq.files = [];

      const mockHandleUpload = jest.fn((req: any, res: any, callback: any) => {
        callback(null);
      });
      mockUploader.handleMultipleUpload.mockReturnValue(mockHandleUpload);

      await fileUploadController.updateFile(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        new AppError("No new file uploaded", 400)
      );
    });

    it("should continue with upload even if old file deletion fails", async () => {
      mockReq.params = { fileType: "files", fileName: "old-test.txt" };
      mockReq.file = { path: "/tmp/new-test.txt" };
      mockReq.originalUrl = "/api/uploads/files/old-test.txt";

      const mockHandleUpload = jest.fn((req: any, res: any, callback: any) => {
        callback(null);
      });
      mockUploader.handleMultipleUpload.mockReturnValue(mockHandleUpload);
      mockUploader.deleteFileByUrl.mockRejectedValue(
        new Error("Delete failed")
      );

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await fileUploadController.updateFile(mockReq, mockRes, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Could not delete old file: old-test.txt",
        expect.any(Error)
      );
      expect(processFile).toHaveBeenCalledWith(mockReq, "/tmp/new-test.txt");
      expect(mockRes.status).toHaveBeenCalledWith(200);

      consoleSpy.mockRestore();
    });

    it("should handle middleware after update", async () => {
      mockReq.params = { fileType: "files", fileName: "old-test.txt" };
      mockReq.file = { path: "/tmp/new-test.txt" };

      (getModuleComponents as jest.Mock).mockReturnValue({
        interceptors: {
          afterUpdateFile: true,
        },
      });

      const mockHandleUpload = jest.fn((req: any, res: any, callback: any) => {
        callback(null);
      });
      mockUploader.handleMultipleUpload.mockReturnValue(mockHandleUpload);

      await fileUploadController.updateFile(mockReq, mockRes, mockNext);

      expect(mockReq.responseData).toBeDefined();
      expect(mockReq.responseStatus).toBe(200);
      expect(mockNext).toHaveBeenCalledWith();
    });

    describe("updateFile — handleUploadError behavior", () => {
      let controller: FileUploadController;
      let req: Partial<ArkosRequest>;
      let res: Partial<ArkosResponse>;
      let next: jest.Mock;

      beforeEach(() => {
        controller = new FileUploadController();
        next = jest.fn();
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        req = {
          params: { fileType: "images", fileName: "old-image.jpg" },
          query: {},
          protocol: "http",
          get: jest.fn().mockReturnValue("localhost:3000"),
          originalUrl: "/api/uploads/images/old-image.jpg",
        };

        jest.clearAllMocks();
      });

      it("should call next with an AppError(400) when multer emits a MulterError during update", async () => {
        const multerErr = new MulterError("LIMIT_FILE_SIZE");

        const { getFileUploadServices } = require("../file-upload.service");
        getFileUploadServices.mockReturnValueOnce({
          imageUploadService: {
            handleMultipleUpload: jest
              .fn()
              .mockReturnValue((_req: any, _res: any, cb: Function) =>
                cb(multerErr)
              ),
          },
          videoUploadService: { handleMultipleUpload: jest.fn() },
          documentUploadService: { handleMultipleUpload: jest.fn() },
          fileUploadService: { handleMultipleUpload: jest.fn() },
        });

        await controller.updateFile(
          req as ArkosRequest,
          res as ArkosResponse,
          next
        );

        expect(next).toHaveBeenCalledTimes(1);
        const receivedError = next.mock.calls[0][0];
        expect(receivedError).toBeInstanceOf(AppError);
        expect(receivedError.statusCode).toBe(400);
        expect(receivedError.message).toBe(multerErr.message);
      });

      it("should use MulterError.code as the AppError code on update when code is present", async () => {
        const multerErr = new MulterError("LIMIT_FIELD_COUNT");

        const { getFileUploadServices } = require("../file-upload.service");
        getFileUploadServices.mockReturnValueOnce({
          imageUploadService: {
            handleMultipleUpload: jest
              .fn()
              .mockReturnValue((_req: any, _res: any, cb: Function) =>
                cb(multerErr)
              ),
          },
          videoUploadService: { handleMultipleUpload: jest.fn() },
          documentUploadService: { handleMultipleUpload: jest.fn() },
          fileUploadService: { handleMultipleUpload: jest.fn() },
        });

        await controller.updateFile(
          req as ArkosRequest,
          res as ArkosResponse,
          next
        );

        const receivedError = next.mock.calls[0][0];
        expect(receivedError.code).toBe("LIMIT_FIELD_COUNT");
      });

      it("should fall back to 'FileUploadError' as AppError code on update when MulterError.code is falsy", async () => {
        const multerErr = new MulterError("LIMIT_FILE_SIZE");
        (multerErr as any).code = undefined;

        const { getFileUploadServices } = require("../file-upload.service");
        getFileUploadServices.mockReturnValueOnce({
          imageUploadService: {
            handleMultipleUpload: jest
              .fn()
              .mockReturnValue((_req: any, _res: any, cb: Function) =>
                cb(multerErr)
              ),
          },
          videoUploadService: { handleMultipleUpload: jest.fn() },
          documentUploadService: { handleMultipleUpload: jest.fn() },
          fileUploadService: { handleMultipleUpload: jest.fn() },
        });

        await controller.updateFile(
          req as ArkosRequest,
          res as ArkosResponse,
          next
        );

        const receivedError = next.mock.calls[0][0];
        expect(receivedError.code).toBe("FileUploadError");
      });

      it("should forward a generic Error directly to next without wrapping during update", async () => {
        const genericErr = new Error("Storage unavailable");

        const { getFileUploadServices } = require("../file-upload.service");
        getFileUploadServices.mockReturnValueOnce({
          imageUploadService: {
            handleMultipleUpload: jest
              .fn()
              .mockReturnValue((_req: any, _res: any, cb: Function) =>
                cb(genericErr)
              ),
          },
          videoUploadService: { handleMultipleUpload: jest.fn() },
          documentUploadService: { handleMultipleUpload: jest.fn() },
          fileUploadService: { handleMultipleUpload: jest.fn() },
        });

        await controller.updateFile(
          req as ArkosRequest,
          res as ArkosResponse,
          next
        );

        expect(next).toHaveBeenCalledWith(genericErr);
        expect(next.mock.calls[0][0]).toBe(genericErr); // same reference, not wrapped
      });
    });
  });

  describe("File type specific tests", () => {
    it("should handle different file types correctly", async () => {
      const fileTypes = ["images", "videos", "documents", "files"];

      for (const fileType of fileTypes) {
        mockReq.params = { fileType };
        mockReq.file = {
          path: `/tmp/test.${fileType === "images" ? "jpg" : "txt"}`,
        };

        const mockHandleUpload = jest.fn(
          (req: any, res: any, callback: any) => {
            callback(null);
          }
        );
        mockUploader.handleMultipleUpload.mockReturnValue(mockHandleUpload);

        await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      }
    });
  });

  describe("Configuration tests", () => {
    it("should use default configuration when config is not provided", async () => {
      try {
        (getArkosConfig as jest.MockedFunction<any>).mockReturnValue({});

        mockReq.params = { fileType: "files" };
        mockReq.file = { path: "/tmp/test.txt" };

        const mockHandleUpload = jest.fn(
          (req: any, res: any, callback: any) => {
            callback(null);
          }
        );
        mockUploader.handleMultipleUpload.mockReturnValue(mockHandleUpload);

        await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

        expect(fs.promises.mkdir).toHaveBeenCalledWith(
          path.resolve(process.cwd(), "/uploads", "files"),
          { recursive: true }
        );
      } catch {}
    });
  });
});
