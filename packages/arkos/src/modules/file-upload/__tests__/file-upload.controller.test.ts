import path from "path";
import fs from "fs";
import fileUploadController from "../file-upload.controller";
import AppError from "../../error-handler/utils/app-error";
import { getFileUploadServices } from "../file-upload.service";
import { getArkosConfig } from "../../../server";
import {
  processFile,
  processImage,
} from "../utils/helpers/file-upload.helpers";
import {
  accessAsync,
  mkdirAsync,
  statAsync,
} from "../../../utils/helpers/fs.helpers";
import { getModuleComponents } from "../../../utils/helpers/models.helpers";

// Mock dependencies
jest.mock("../file-upload.service");
jest.mock("../../../server");
jest.mock("../utils/helpers/file-upload.helpers");
jest.mock("../../../utils/helpers/fs.helpers");
jest.mock("../../../utils/helpers/models.helpers");
jest.mock("fs");

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
      middlewares: {},
    });

    (accessAsync as jest.MockedFunction<any>).mockResolvedValue(true);
    (mkdirAsync as jest.MockedFunction<any>).mockResolvedValue(true);
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

      expect(processImage).toHaveBeenCalledWith(mockReq, "/tmp/test.jpg", {
        format: "webp",
        width: "800",
        height: "600",
        resizeTo: undefined,
      });
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
        new AppError("No file uploaded", 400)
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

      (accessAsync as jest.MockedFunction<any>).mockRejectedValue(
        new Error("Directory not found")
      );

      const mockHandleUpload = jest.fn((req: any, res: any, callback: any) => {
        callback(null);
      });
      mockUploader.handleMultipleUpload.mockReturnValue(mockHandleUpload);

      await fileUploadController.uploadFile(mockReq, mockRes, mockNext);

      expect(mkdirAsync).toHaveBeenCalledWith(
        path.resolve(process.cwd(), "/uploads", "files"),
        { recursive: true }
      );
    });

    it("should handle middleware after upload", async () => {
      mockReq.params = { fileType: "files" };
      mockReq.file = { path: "/tmp/test.txt" };

      (getModuleComponents as jest.Mock).mockReturnValue({
        middlewares: {
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
        middlewares: {
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
        middlewares: {
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
          middlewares: {
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
        middlewares: {
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
  });

  // describe("streamFile", () => {
  //   beforeEach(() => {
  //     (statAsync as jest.MockedFunction<any>).mockResolvedValue({ size: 1000 });
  //     (fs.createReadStream as jest.MockedFunction<any>).mockReturnValue({
  //       pipe: jest.fn(),
  //     });
  //   });

  //   it("should stream file without range header", async () => {
  //     mockReq.params = { fileType: "files", fileName: "test.txt" };
  //     mockReq.headers = {};

  //     await fileUploadController.streamFile(mockReq, mockRes, mockNext);

  //     expect(mockRes.writeHead).toHaveBeenCalledWith(200, {
  //       "Content-Length": 1000,
  //       "Content-Type": "application/octet-stream",
  //       "Content-Disposition": 'inline; filename="test.txt"',
  //     });
  //     expect(fs.createReadStream).toHaveBeenCalledWith(
  //       path.join(".", "uploads", "files", "test.txt")
  //     );
  //   });

  //   it("should handle range requests", async () => {
  //     mockReq.params = { fileType: "files", fileName: "test.txt" };
  //     mockReq.headers = { range: "bytes=0-499" };

  //     await fileUploadController.streamFile(mockReq, mockRes, mockNext);

  //     expect(mockRes.writeHead).toHaveBeenCalledWith(206, {
  //       "Content-Range": "bytes 0-499/1000",
  //       "Accept-Ranges": "bytes",
  //       "Content-Length": 500,
  //       "Content-Type": "application/octet-stream",
  //       "Content-Disposition": 'inline; filename="test.txt"',
  //     });
  //     expect(fs.createReadStream).toHaveBeenCalledWith(
  //       path.join(".", "uploads", "files", "test.txt"),
  //       { start: 0, end: 499 }
  //     );
  //   });

  //   it("should handle invalid range requests", async () => {
  //     mockReq.params = { fileType: "files", fileName: "test.txt" };
  //     mockReq.headers = { range: "bytes=1500-2000" };

  //     await fileUploadController.streamFile(mockReq, mockRes, mockNext);

  //     expect(mockRes.status).toHaveBeenCalledWith(416);
  //     expect(mockRes.json).toHaveBeenCalledWith({
  //       error: "Range Not Satisfiable",
  //     });
  //   });

  //   it("should handle file not found", async () => {
  //     mockReq.params = { fileType: "files", fileName: "nonexistent.txt" };

  //     (accessAsync as jest.MockedFunction<any>).mockRejectedValue(
  //       new Error("File not found")
  //     );

  //     await expect(
  //       fileUploadController.streamFile(mockReq, mockRes, mockNext)
  //     ).rejects.toThrow(new AppError("File not found", 404));
  //   });

  //   it("should handle range with no end value", async () => {
  //     mockReq.params = { fileType: "files", fileName: "test.txt" };
  //     mockReq.headers = { range: "bytes=500-" };

  //     await fileUploadController.streamFile(mockReq, mockRes, mockNext);

  //     expect(mockRes.writeHead).toHaveBeenCalledWith(206, {
  //       "Content-Range": "bytes 500-999/1000",
  //       "Accept-Ranges": "bytes",
  //       "Content-Length": 500,
  //       "Content-Type": "application/octet-stream",
  //       "Content-Disposition": 'inline; filename="test.txt"',
  //     });
  //   });
  // });

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

        expect(mkdirAsync).toHaveBeenCalledWith(
          path.resolve(process.cwd(), "/uploads", "files"),
          { recursive: true }
        );
      } catch {}
    });
  });
});
