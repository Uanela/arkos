import path from "path";
import fs from "fs";
import fileUploadController, {
  FileUploadController,
} from "../file-upload.controller";
import AppError from "../../error-handler/utils/app-error";
import { getFileUploadServices } from "../file-upload.service";
import { getArkosConfig } from "../../../server";
import * as fileUploadHelpers from "../utils/helpers/file-upload.helpers";
import { MulterError } from "multer";
import loadableRegistry from "../../../components/arkos-loadable-registry";
import { routeHookReader } from "../../../components/arkos-route-hook/reader";

const processImage = jest
  .spyOn(fileUploadHelpers, "processImage")
  .mockImplementation(jest.fn());
const mockProcessFile = jest.spyOn(fileUploadHelpers, "processFile");

jest.spyOn(process, "cwd").mockReturnValue("/tmp");

jest.mock("../../../utils/prisma/prisma-schema-parser", () => ({
  parse: jest.fn(),
  getModelsAsArrayOfStrings: jest.fn(() => []),
}));
jest.mock("../file-upload.service");
jest.mock("../../../server");
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  readdirSync: jest.fn(),
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
  },
}));
jest.mock("../../../components/arkos-loadable-registry", () => ({
  __esModule: true,
  default: { getItem: jest.fn() },
}));
jest.mock("../../../components/arkos-route-hook/reader", () => ({
  routeHookReader: { getHooks: jest.fn() },
}));

const mockGetItem = loadableRegistry.getItem as jest.Mock;
const mockGetHooks = routeHookReader.getHooks as jest.Mock;

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
      headers: {},
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

    mockGetItem.mockReturnValue(null);
    mockGetHooks.mockReturnValue(null);

    (fs.promises.access as jest.MockedFunction<any>).mockResolvedValue(true);
    (fs.promises.mkdir as jest.MockedFunction<any>).mockResolvedValue(true);
    // (mockProcessFile as jest.MockedFunction<any>).mockReturnValue(
    //   "http://localhost:3000/api/uploads/files/test.txt"
    // );
    (processImage as jest.MockedFunction<any>).mockResolvedValue(
      "http://localhost:3000/api/uploads/images/test.jpg"
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("uploadFile", () => {
    it("should upload a single file successfully", async () => {
      mockReq.params = { fileType: "files" };
      mockReq.file = { path: "/tmp/files/the-repeater.txt" };

      mockUploader.handleMultipleUpload.mockReturnValue(
        jest.fn((_: any, _1: any, cb: any) => cb(null))
      );
      // (mockProcessFile as jest.MockedFunction<any>).mockReturnValue(
      //   "http://localhost:3000/api/uploads/files/the-repeater.txt"
      // );

      await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

      expect(mockProcessFile).toHaveBeenCalledWith(
        mockReq,
        "/tmp/files/the-repeater.txt"
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: "http://localhost:3000/api/uploads/files/the-repeater.txt",
        message: "File uploaded successfully",
      });
    });

    it("should upload multiple files successfully", async () => {
      mockReq.params = { fileType: "files" };
      mockReq.files = [
        { path: "/tmp/files/test1.txt" },
        { path: "/tmp/files/test2.txt" },
      ];

      mockUploader.handleMultipleUpload.mockReturnValue(
        jest.fn((_: any, _1: any, cb: any) => cb(null))
      );
      // (mockProcessFile as jest.MockedFunction<any>)
      //   .mockReturnValue("http://localhost:3000/api/uploads/files/test1.txt")
      //   .mockReturnValue("http://localhost:3000/api/uploads/files/test2.txt");

      await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

      expect(mockProcessFile).toHaveBeenCalledTimes(2);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [
          "http://localhost:3000/api/uploads/files/test1.txt",
          "http://localhost:3000/api/uploads/files/test2.txt",
        ],
        message: "2 files uploaded successfully",
      });
    });

    it("should process images with transformation options", async () => {
      mockReq.params = { fileType: "images" };
      mockReq.query = { format: "webp", width: "800", height: "600" };
      mockReq.file = { path: "/tmp/files/test.jpg" };

      mockUploader.handleMultipleUpload.mockReturnValue(
        jest.fn((_: any, _1: any, cb: any) => cb(null))
      );

      await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

      expect(processImage).toHaveBeenCalledWith(
        mockReq,
        mockNext,
        "/tmp/files/test.jpg",
        {
          format: "webp",
          width: "800",
          height: "600",
          resizeTo: undefined,
        }
      );
    });

    it("should handle invalid file type", async () => {
      mockReq.params = { fileType: "invalid" };
      await fileUploadController.uploadFile(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it("should handle no file uploaded error", async () => {
      mockReq.params = { fileType: "files" };
      mockReq.file = null;
      mockReq.files = null;

      mockUploader.handleMultipleUpload.mockReturnValue(
        jest.fn((_: any, _1: any, cb: any) => cb(null))
      );

      await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it("should create upload directory if it does not exist", async () => {
      mockReq.params = { fileType: "files" };
      mockReq.file = { path: "/tmp/files/test.txt" };

      (fs.promises.access as jest.MockedFunction<any>).mockRejectedValue(
        new Error("Directory not found")
      );
      mockUploader.handleMultipleUpload.mockReturnValue(
        jest.fn((_: any, _1: any, cb: any) => cb(null))
      );

      await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

      expect(fs.promises.mkdir).toHaveBeenCalledWith(
        path.resolve(path.join(process.cwd(), "/uploads", "files")),
        { recursive: true }
      );
    });

    it("should call next with responseData when afterUploadFile route hook exists", async () => {
      mockReq.params = { fileType: "files" };
      mockReq.file = { path: "/tmp/files/test.txt" };

      mockGetItem.mockReturnValue({ afterUploadFile: jest.fn() });
      mockGetHooks.mockImplementation((_, op) =>
        op === "uploadFile" ? { after: jest.fn() } : null
      );

      mockUploader.handleMultipleUpload.mockReturnValue(
        jest.fn((_: any, _1: any, cb: any) => cb(null))
      );

      await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

      expect(mockReq.responseStatus).toBe(200);
      expect(mockReq.responseData).toBeDefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should filter out null values from failed processing", async () => {
      mockReq.params = { fileType: "files" };
      mockReq.files = [
        { path: "/tmp/files/test1.txt" },
        { path: "/tmp/files/test2.txt" },
      ];

      mockUploader.handleMultipleUpload.mockReturnValue(
        jest.fn((_: any, _1: any, cb: any) => cb(null))
      );
      (mockProcessFile as jest.MockedFunction<any>)
        .mockReturnValueOnce(
          "http://localhost:3000/api/uploads/files/test1.txt"
        )
        .mockReturnValueOnce(null);

      await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: ["http://localhost:3000/api/uploads/files/test1.txt"],
        message: "1 files uploaded successfully",
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
    });

    it("should delete file by name when URL does not match expected pattern", async () => {
      mockReq.params = { fileType: "files", fileName: "test.txt" };
      mockReq.originalUrl = "/custom/path/files/test.txt";

      await fileUploadController.deleteFile(mockReq, mockRes, mockNext);

      expect(mockUploader.deleteFileByName).toHaveBeenCalledWith(
        "test.txt",
        "files"
      );
    });

    it("should handle invalid file type for deletion", async () => {
      mockReq.params = { fileType: "invalid", fileName: "test.txt" };
      await fileUploadController.deleteFile(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it("should handle file not found error", async () => {
      mockReq.params = { fileType: "files", fileName: "test.txt" };
      mockReq.originalUrl = "/api/uploads/files/test.txt";
      mockUploader.deleteFileByUrl.mockRejectedValue(
        new Error("File not found")
      );

      await fileUploadController.deleteFile(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it("should forward AppError directly to next", async () => {
      mockReq.params = { fileType: "files", fileName: "test.txt" };
      mockReq.originalUrl = "/api/uploads/files/test.txt";
      const appError = new AppError("Custom error", 403, "CustomError");
      mockUploader.deleteFileByUrl.mockRejectedValue(appError);

      await fileUploadController.deleteFile(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(appError);
    });

    it("should call next with responseStatus when afterDeleteFile route hook exists", async () => {
      mockReq.params = { fileType: "files", fileName: "test.txt" };
      mockReq.originalUrl = "/api/uploads/files/test.txt";

      mockGetItem.mockReturnValue({ afterDeleteFile: jest.fn() });
      mockGetHooks.mockImplementation((_, op) =>
        op === "deleteFile" ? { after: jest.fn() } : null
      );

      await fileUploadController.deleteFile(mockReq, mockRes, mockNext);

      expect(mockReq.responseStatus).toBe(204);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe("updateFile", () => {
    it("should update file successfully with fileName", async () => {
      mockReq.params = { fileType: "files", fileName: "old-test.txt" };
      mockReq.file = { path: "/tmp/files/new-test.txt" };
      mockReq.originalUrl = "/api/uploads/files/old-test.txt";

      mockUploader.handleMultipleUpload.mockReturnValue(
        jest.fn((_: any, _1: any, cb: any) => cb(null))
      );

      await fileUploadController.updateFile(mockReq, mockRes, mockNext);

      expect(mockUploader.deleteFileByUrl).toHaveBeenCalledWith(
        "http://localhost:3000/api/uploads/files/old-test.txt"
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: "http://localhost:3000/api/uploads/files/new-test.txt",
        message: "File updated successfully",
      });
    });

    it("should handle update without fileName", async () => {
      mockReq.params = { fileType: "files", fileName: "" };
      mockReq.file = { path: "/tmp/files/new-test.txt" };

      mockUploader.handleMultipleUpload.mockReturnValue(
        jest.fn((_: any, _1: any, cb: any) => cb(null))
      );

      await fileUploadController.updateFile(mockReq, mockRes, mockNext);

      expect(mockUploader.deleteFileByUrl).not.toHaveBeenCalled();
      expect(mockUploader.deleteFileByName).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: "http://localhost:3000/api/uploads/files/new-test.txt",
        message: "File uploaded successfully",
      });
    });

    it("should handle multiple file updates", async () => {
      mockReq.params = { fileType: "files", fileName: "old-repeater.txt" };
      mockReq.files = [
        { path: "/tmp/files/new-repeater1.txt" },
        { path: "/tmp/files/new-repeater2.txt" },
      ];
      mockReq.originalUrl = "/api/uploads/files/old-repeater.txt";
      mockUploader.deleteFileByUrl.mockResolvedValue(undefined);
      mockUploader.handleMultipleUpload.mockReturnValue(
        jest.fn((_: any, _1: any, cb: any) => cb(null))
      );

      await fileUploadController.updateFile(mockReq, mockRes, mockNext);
      console.log("mockNext calls:", JSON.stringify(mockNext.mock.calls));
      console.log("mockRes.status calls:", mockRes.status.mock.calls);
      console.log(
        "mockRes.json calls:",
        JSON.stringify(mockRes.json.mock.calls)
      );
      console.log(
        "processFile calls:",
        (mockProcessFile as jest.Mock).mock.calls.length
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [
          "http://localhost:3000/api/uploads/files/new-repeater1.txt",
          "http://localhost:3000/api/uploads/files/new-repeater2.txt",
        ],
        message: "File updated successfully. 2 new files uploaded",
      });
    });

    it("should handle no new file uploaded error", async () => {
      mockReq.params = { fileType: "files", fileName: "old-test.txt" };
      mockReq.file = null;
      mockReq.files = [];

      mockUploader.handleMultipleUpload.mockReturnValue(
        jest.fn((_: any, _1: any, cb: any) => cb(null))
      );

      await fileUploadController.updateFile(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it("should continue with upload even if old file deletion fails", async () => {
      mockReq.params = { fileType: "files", fileName: "old-test.txt" };
      mockReq.file = { path: "/tmp/files/new-test.txt" };
      mockReq.originalUrl = "/api/uploads/files/old-test.txt";

      mockUploader.handleMultipleUpload.mockReturnValue(
        jest.fn((_: any, _1: any, cb: any) => cb(null))
      );
      mockUploader.deleteFileByUrl.mockRejectedValue(
        new Error("Delete failed")
      );

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await fileUploadController.updateFile(mockReq, mockRes, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Could not delete old file: old-test.txt",
        expect.any(Error)
      );
      expect(mockProcessFile).toHaveBeenCalledWith(
        mockReq,
        "/tmp/files/new-test.txt"
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);

      consoleSpy.mockRestore();
    });

    it("should call next with responseData when afterUpdateFile route hook exists", async () => {
      mockReq.params = { fileType: "files", fileName: "old-test.txt" };
      mockReq.file = { path: "/tmp/files/new-test.txt" };

      mockGetItem.mockReturnValue({ afterUpdateFile: jest.fn() });
      mockGetHooks.mockImplementation((_, op) =>
        op === "updateFile" ? { after: jest.fn() } : null
      );

      mockUploader.handleMultipleUpload.mockReturnValue(
        jest.fn((_: any, _1: any, cb: any) => cb(null))
      );

      await fileUploadController.updateFile(mockReq, mockRes, mockNext);

      expect(mockReq.responseStatus).toBe(200);
      expect(mockReq.responseData).toBeDefined();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe("file type routing", () => {
    it("should handle all valid file types", async () => {
      for (const fileType of ["images", "videos", "documents", "files"]) {
        mockReq.params = { fileType };
        mockReq.file = {
          path: `/tmp/files/test.${fileType === "images" ? "jpg" : "txt"}`,
        };

        mockUploader.handleMultipleUpload.mockReturnValue(
          jest.fn((_: any, _1: any, cb: any) => cb(null))
        );

        await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        jest.clearAllMocks();
        mockGetItem.mockReturnValue(null);
        mockGetHooks.mockReturnValue(null);
        (getFileUploadServices as jest.MockedFunction<any>).mockReturnValue({
          documentUploadService: mockUploader,
          fileUploadService: mockUploader,
          imageUploadService: mockUploader,
          videoUploadService: mockUploader,
        });
        (getArkosConfig as jest.MockedFunction<any>).mockReturnValue({
          fileUpload: { baseUploadDir: "/uploads", baseRoute: "/api/uploads" },
        });
        (fs.promises.access as jest.MockedFunction<any>).mockResolvedValue(
          true
        );
        // (mockProcessFile as jest.MockedFunction<any>).mockReturnValue(
        //   "http://localhost/file"
        // );
        (processImage as jest.MockedFunction<any>).mockResolvedValue(
          "http://localhost/image"
        );
        mockRes.status.mockReturnThis();
        mockRes.json.mockReturnThis();
      }
    });
  });
});
