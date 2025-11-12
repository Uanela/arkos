import multer from "multer";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import sharp from "sharp";
import {
  FileUploadService,
  getFileUploadServices,
} from "../file-upload.service";
import AppError from "../../error-handler/utils/app-error";
import { getArkosConfig } from "../../../server";
import * as helpers from "../utils/helpers/file-upload.helpers";

// Mock dependencies
jest.mock("multer");
jest.mock("path");
jest.mock("fs");
jest.mock("sharp");
jest.mock("util");
jest.mock("process");
jest.mock("../../../server");
jest.mock("../../error-handler/utils/app-error");
jest.mock("../../../utils/helpers/prisma.helpers");
jest.mock("../../../utils/dynamic-loader");

describe("FileUploadService", () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;
  let fileUploadService: FileUploadService;
  let mockStorage: any;
  let mockUpload: any;
  let mockSharp: any;
  let mockUnlink = jest.fn().mockResolvedValue(undefined);

  let mockStat = jest.fn().mockResolvedValue({ isFile: () => true });

  let mockRename = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    // Reset all mocks
    jest.resetAllMocks();

    // Setup mock request, response, and next function
    mockReq = {
      get: jest.fn((key) => {
        if (key === "host") return "localhost:3000";
        return null;
      }),
      query: {},
      files: [],
      file: null,
      params: {
        fileType: "images",
      },
      headers: {
        "x-forwarded-proto": "http",
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();

    (fs.existsSync as any as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as any as jest.Mock).mockReturnValue(undefined);

    const mockPromisify = jest.fn((fn) => fn);
    (promisify as any as jest.Mock).mockImplementation(mockPromisify);

    (fs.stat as any as jest.Mock) = jest
      .fn()
      .mockReturnValue({ isFile: () => true });

    (fs.unlink as any as jest.Mock) = jest.fn();

    (fs.access as any as jest.Mock) = jest
      .fn()
      .mockReturnValue({ isFile: () => true });

    // (fs.rename as any as jest.Mock) = jest
    //   .fn()
    //   .mockReturnValue({ isFile: () => true });

    mockUnlink = jest.fn().mockResolvedValue(undefined);

    mockStat = jest.fn().mockResolvedValue({ isFile: () => true });

    (promisify as any as jest.Mock).mockImplementation((fn) => {
      if (fn === fs.unlink) return mockUnlink;
      if (fn === fs.stat) return mockStat;
      if (fn === fs.rename) return mockRename;
      return jest.fn();
    });

    (path.resolve as any as jest.Mock).mockImplementation((...args) => {
      // Handle relative paths manually
      const input = args.join("/");

      // Simple handling of ../ patterns
      if (input?.includes?.("../")) {
        // Basic implementation for handling parent directories
        let parts = input.split("/");
        const result: string[] = [];

        for (const part of parts) {
          if (part === "..") {
            result.pop(); // Remove the last directory
          } else if (part && part !== ".") {
            result.push(part);
          }
        }

        return "/" + result.join("/") + "/";
      }

      // For non-relative paths or simpler cases
      return input;
    });

    (path.join as any as jest.Mock).mockImplementation((...args) =>
      args.join("/").replaceAll("//", "/")
    );
    (path.extname as any as jest.Mock).mockImplementation((filePath) => ".jpg");
    (path.basename as any as jest.Mock).mockImplementation((filePath, ext) => {
      return ext ? filePath.replace(ext, "") : filePath;
    });
    (path.dirname as any as jest.Mock).mockImplementation((filePath) => {
      const parts = filePath.split("/");
      return parts.slice(0, -1).join("/");
    });

    // Setup mock for multer storage
    mockStorage = {
      destination: jest.fn(),
      filename: jest.fn(),
    };

    (multer.diskStorage as any as jest.Mock).mockReturnValue(mockStorage);

    // Setup mock for multer uploader
    mockUpload = {
      single: jest
        .fn()
        .mockReturnValue((req: any, res: any, next: any) => next()),
      array: jest
        .fn()
        .mockReturnValue((req: any, res: any, next: any) => next()),
    };

    (multer as unknown as any as jest.Mock).mockReturnValue(mockUpload);

    // Setup mock for getArkosConfig
    (getArkosConfig as any as jest.Mock).mockReturnValue({
      fileUpload: {
        baseRoute: "/api/uploads",
        baseUploadDir: "/uploads",
        restrictions: {
          images: {
            maxCount: 30,
            maxSize: 15 * 1024 * 1024,
            supportedFilesRegex: /jpeg|jpg|png/,
          },
        },
      },
    });

    // Setup mock for sharp
    mockSharp = {
      metadata: jest.fn().mockResolvedValue({ width: 800, height: 600 }),
      resize: jest.fn().mockReturnThis(),
      toFormat: jest.fn().mockReturnThis(),
      toFile: jest.fn().mockResolvedValue({}),
    };

    (sharp as unknown as any as jest.Mock).mockReturnValue(mockSharp);

    // Initialize the service
    fileUploadService = new FileUploadService(
      "uploads/images",
      5 * 1024 * 1024,
      /jpeg|jpg|png/,
      30
    );
  });

  describe("constructor", () => {
    it("should initialize with default parameters when not provided", () => {
      const service = new FileUploadService("../uploads/images");
      expect(service["uploadDir"]).toContain("uploads/images/");
      expect(service["fileSizeLimit"]).toBe(5 * 1024 * 1024); // Default 5MB
      expect(service["allowedFileTypes"]).toEqual(/.*/);
      expect(service["maxCount"]).toBe(30);
    });

    it("should create the upload directory if it doesn't exist", () => {
      expect(fs.existsSync).toHaveBeenCalledWith(
        process.cwd() + "/uploads/images/"
      );
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        process.cwd() + "/uploads/images/",
        {
          recursive: true,
        }
      );
    });

    it("should configure multer storage with correct destination and filename", () => {
      const mockDestinationFn = jest.fn();
      const mockFilenameFn = jest.fn();

      (multer.diskStorage as jest.Mock).mockReturnValue({
        destination: mockDestinationFn,
        filename: mockFilenameFn,
      });

      new FileUploadService("uploads/images");

      const destinationCallback = (multer.diskStorage as jest.Mock).mock
        .calls[0][0].destination;

      const cb = jest.fn();
      destinationCallback({}, {}, cb);
      expect(cb).toHaveBeenCalledWith(null, process.cwd() + "/uploads/images/");

      const filenameCallback = (multer.diskStorage as jest.Mock).mock
        .calls[0][0].filename;

      const fileCb = jest.fn();
      const mockFile = { originalname: "test.jpg" };
      filenameCallback({}, mockFile, fileCb);
      expect(fileCb).toHaveBeenCalledWith(null, expect.stringMatching("test"));
    });
  });

  describe("fileFilter", () => {
    it("should accept valid file types", () => {
      const fileFilter = fileUploadService["fileFilter"];
      const cb = jest.fn();
      const mockFile = {
        originalname: "test.jpg",
        mimetype: "image/jpeg",
      };

      fileFilter({}, mockFile, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it("should reject invalid file types", () => {
      // Override the regex for this test
      fileUploadService["allowedFileTypes"] = /jpeg|jpg|png/;

      const fileFilter = fileUploadService["fileFilter"];
      const cb = jest.fn();
      const mockFile = {
        originalname: "test.pdf",
        mimetype: "application/pdf",
      };

      // Mock path.extname to return .pdf
      (path.extname as any as jest.Mock).mockReturnValueOnce(".pdf");

      fileFilter({}, mockFile, cb);

      expect(cb).toHaveBeenCalledWith(expect.any(AppError));
      expect(AppError).toHaveBeenCalledWith(
        "File type not allowed, allowed files are jpeg, jpg, png",
        400,
        "NotAllowedFileType",
        { filename: "test.pdf" }
      );
    });
  });

  describe("getUpload", () => {
    it("should return multer instance with correct configuration", () => {
      const uploader = fileUploadService.getUpload();

      expect(multer).toHaveBeenCalledWith({
        storage: mockStorage,
        fileFilter: expect.any(Function),
        limits: { fileSize: 5 * 1024 * 1024 },
      });

      expect(uploader).toBe(mockUpload);
    });
  });

  describe("handleSingleUpload", () => {
    it("should call next() if upload is successful", () => {
      const middleware = fileUploadService.handleSingleUpload();

      middleware(mockReq, mockRes, mockNext);

      expect(mockUpload.single).toHaveBeenCalledWith(expect.any(String));
      expect(mockNext).toHaveBeenCalled();
    });

    it("should delete old file if oldFilePath is provided", async () => {
      // Make promisify return our specific mocks when called with the right functions

      // Override multer implementation
      mockUpload.single.mockReturnValueOnce((req: any, res: any, next: any) =>
        next()
      );

      const middleware = fileUploadService.handleSingleUpload(
        "old22/path/to/file.jpg"
      );

      await middleware(mockReq, mockRes, () => {});

      expect(mockStat).toHaveBeenCalledWith(
        process.cwd() + "/uploads/old22/path/to/file.jpg"
      );
      expect(mockUnlink).toHaveBeenCalledWith(
        process.cwd() + "/uploads/old22/path/to/file.jpg"
      );
    });

    it("should pass multer errors to next", () => {
      const multerError = new multer.MulterError(
        "LIMIT_FILE_SIZE",
        "fieldname"
      );

      mockUpload.single.mockReturnValueOnce((req: any, res: any, next: any) =>
        next(multerError)
      );

      const middleware = fileUploadService.handleSingleUpload();

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(multerError);
    });

    it("should pass regular errors to next", () => {
      const regularError = new Error("Some other error");

      mockUpload.single.mockReturnValueOnce((req: any, res: any, next: any) =>
        next(regularError)
      );

      const middleware = fileUploadService.handleSingleUpload();

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(regularError);
    });
  });

  describe("handleMultipleUpload", () => {
    it("should call next() if multiple upload is successful", () => {
      const middleware = fileUploadService.handleMultipleUpload();

      middleware(mockReq, mockRes, mockNext);

      expect(mockUpload.array).toHaveBeenCalledWith(expect.any(String), 30);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should pass multer errors to next", () => {
      const multerError = new multer.MulterError(
        "LIMIT_FILE_COUNT",
        "fieldname"
      );

      mockUpload.array.mockReturnValueOnce((req: any, res: any, next: any) =>
        next(multerError)
      );

      const middleware = fileUploadService.handleMultipleUpload();

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(multerError);
    });
  });

  describe("handleDeleteSingleFile", () => {
    it("should delete the file if it exists", async () => {
      const middleware =
        fileUploadService.handleDeleteSingleFile("path/to/file.jpg");

      await middleware(mockReq, mockRes, mockNext);

      expect(mockStat).toHaveBeenCalledWith("path/to/file.jpg");
      expect(mockUnlink).toHaveBeenCalledWith("path/to/file.jpg");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should call next even if file doesn't exist", async () => {
      const middleware = fileUploadService.handleDeleteSingleFile(
        "nonexistent/file.jpg"
      );

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("deleteFileByUrl", () => {
    it("should delete a file by its URL", async () => {
      const result = await fileUploadService.deleteFileByUrl(
        "http://localhost:3000/api/uploads/images/file.jpg"
      );

      expect(mockStat).toHaveBeenCalled();
      expect(mockUnlink).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should throw AppError if file URL is invalid", async () => {
      await expect(
        fileUploadService.deleteFileByUrl("http://localhost:3000/invalid/path")
      ).rejects.toBeInstanceOf(AppError);

      expect(AppError).toHaveBeenCalledWith(
        "Invalid file URL: base route not found",
        400
      );
    });

    it("should throw AppError if file doesn't exist", async () => {
      // Setup fs.access to fail with ENOENT error
      const enoentError = new Error("File not found");
      (enoentError as any).code = "ENOENT";
      mockStat.mockImplementationOnce((path, mode, cb) => {
        throw enoentError;
      });

      await expect(
        fileUploadService.deleteFileByUrl(
          "http://localhost:3000/api/uploads/images/nonexistent.jpg"
        )
      ).rejects.toBeInstanceOf(AppError);

      expect(AppError).toHaveBeenCalledWith("File not found", 404);
    });
  });

  describe("upload", () => {
    beforeEach(() => {
      // Setup base test environment
      mockReq.query = { multiple: "false" };
      mockReq.file = {
        path: "images/test.jpg",
        originalname: "test.jpg",
      };
    });

    it("should handle single file upload successfully", async () => {
      // Setup mocks
      mockUpload.single.mockReturnValueOnce(
        (req: any, res: any, next: Function) => {
          req.file = mockReq.file;
          next();
        }
      );

      const result = await fileUploadService.upload(mockReq, mockRes, mockNext);

      expect(result).toBe("http://localhost:3000/api/uploads/images/test.jpg");
    });

    it("should handle multiple file uploads successfully", async () => {
      // Setup mocks for multiple files
      mockReq.query = { multiple: "true" };
      mockReq.files = [
        { path: "images/test1.jpg", originalname: "test1.jpg" },
        { path: "images/test2.jpg", originalname: "test2.jpg" },
      ];
      mockReq.file = null;

      mockUpload.array.mockReturnValueOnce(
        (req: any, res: any, next: Function) => {
          req.files = mockReq.files;
          next();
        }
      );

      const result = await fileUploadService.upload(mockReq, mockRes, mockNext);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result![0]).toBe(
        "http://localhost:3000/api/uploads/images/test1.jpg"
      );
      expect(result![1]).toBe(
        "http://localhost:3000/api/uploads/images/test2.jpg"
      );
    });

    it("should process images with Sharp when uploading image files", async () => {
      // Setup specific mock for image processing
      mockReq.file = {
        path: "images/test.jpg",
        originalname: "test.jpg",
      };

      const imageUploadService = new FileUploadService("uploads/images");

      mockUpload.single.mockReturnValueOnce(
        (req: any, res: any, next: Function) => {
          req.file = mockReq.file;
          next();
        }
      );

      const result = await imageUploadService.upload(
        mockReq,
        mockRes,
        mockNext,
        {
          width: 300,
          height: 200,
          format: "webp",
        }
      );

      expect(sharp).toHaveBeenCalledWith("images/test.jpg");
      expect(mockSharp.resize).toHaveBeenCalledWith(
        300,
        200,
        expect.any(Object)
      );
      expect(mockSharp.toFormat).toHaveBeenCalledWith("webp");
      expect(mockSharp.toFile).toHaveBeenCalled();
      expect(mockRename).toHaveBeenCalled();
      expect(result).toBe("http://localhost:3000/api/uploads/images/test.jpg");
    });

    it("should throw AppError if no file is uploaded", async () => {
      // Setup no files
      mockReq.file = null;
      mockReq.files = null;

      mockUpload.single.mockReturnValueOnce(
        (req: any, res: any, next: Function) => next()
      );

      await expect(
        fileUploadService.upload(mockReq, mockRes, mockNext)
      ).rejects.toBeInstanceOf(AppError);
      expect(AppError).toHaveBeenCalledWith(
        "No file or files were attached on field images on the request body as form data.",
        400,
        {},
        "NoFileOrFilesAttached"
      );
    });

    it("should handle upload errors", async () => {
      const uploadError = new Error("Upload failed");

      mockUpload.single.mockReturnValueOnce(
        (req: any, res: any, next: Function) => next(uploadError)
      );

      await expect(
        fileUploadService.upload(mockReq, mockRes, mockNext)
      ).rejects.toEqual(uploadError);
    });

    it("should handle image processing errors", async () => {
      mockReq.file = {
        path: "uploads/images/test.jpg",
        originalname: "test.jpg",
      };

      // Mock that we're using the image uploader
      const imageUploadService = new FileUploadService("uploads/images");

      mockUpload.single.mockReturnValueOnce(
        (req: any, res: any, next: Function) => {
          req.file = mockReq.file;
          next();
        }
      );

      // Setup Sharp to throw an error
      const processingError = new Error("Image processing failed");
      mockSharp.toFile.mockRejectedValueOnce(processingError);

      await expect(
        imageUploadService.upload(mockReq, mockRes, mockNext, {
          format: "webp",
        })
      ).resolves.toBe(null);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("getFileUploadServices", () => {
    it("should return all file uploader services", () => {
      const services = getFileUploadServices();

      expect(services).toHaveProperty("imageUploadService");
      expect(services).toHaveProperty("videoUploadService");
      expect(services).toHaveProperty("documentUploadService");
      expect(services).toHaveProperty("fileUploadService");

      expect(services.imageUploadService).toBeInstanceOf(FileUploadService);
      expect(services.videoUploadService).toBeInstanceOf(FileUploadService);
      expect(services.documentUploadService).toBeInstanceOf(FileUploadService);
      expect(services.fileUploadService).toBeInstanceOf(FileUploadService);
    });

    it("should use config values when available", () => {
      // Setup config with custom values
      (getArkosConfig as any as jest.Mock).mockReturnValue({
        fileUpload: {
          baseRoute: "/custom/api/uploads",
          baseUploadDir: "../custom/uploads",
          restrictions: {
            images: {
              maxCount: 50,
              maxSize: 20 * 1024 * 1024,
              supportedFilesRegex: /custom-regex/,
            },
          },
        },
      });

      const services = getFileUploadServices();

      // Test that the custom config values were used
      expect(services.imageUploadService["uploadDir"]).toBe(
        process.cwd().split("/").slice(0, -1).join("/") +
          "/custom/uploads/images/"
      );
      expect(services.imageUploadService["maxCount"]).toBe(50);
      expect(services.imageUploadService["fileSizeLimit"]).toBe(
        20 * 1024 * 1024
      );
      expect(services.imageUploadService["allowedFileTypes"]).toEqual(
        /custom-regex/
      );
    });

    it("should use default values when config is not available", () => {
      // Setup empty config
      (getArkosConfig as any as jest.Mock).mockReturnValue({});

      const services = getFileUploadServices();

      // Test that default values were used
      expect(services.imageUploadService["uploadDir"]).toBe(
        process.cwd() + "/uploads/images/"
      );
      expect(services.videoUploadService["uploadDir"]).toBe(
        process.cwd() + "/uploads/videos/"
      );
      expect(services.documentUploadService["uploadDir"]).toBe(
        process.cwd() + "/uploads/documents/"
      );
      expect(services.fileUploadService["uploadDir"]).toBe(
        process.cwd() + "/uploads/files/"
      );
    });
  });

  describe("deleteFileByName", () => {
    it("should delete a file by name and file type", async () => {
      const fileType = "images";
      const fileName = "test-image.jpg";

      const result = await fileUploadService.deleteFileByName(
        fileName,
        fileType
      );

      expect(mockStat).toHaveBeenCalledWith(
        expect.stringContaining("uploads/images/" + fileName)
      );
      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringContaining("uploads/images/" + fileName)
      );
      expect(result).toBe(true);
    });

    it("should work with videos file type", async () => {
      const fileType = "videos";
      const fileName = "test-video.mp4";

      const result = await fileUploadService.deleteFileByName(
        fileName,
        fileType
      );

      expect(mockStat).toHaveBeenCalledWith(
        expect.stringContaining("uploads/videos/" + fileName)
      );
      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringContaining("uploads/videos/" + fileName)
      );
      expect(result).toBe(true);
    });

    it("should work with documents file type", async () => {
      const fileType = "documents";
      const fileName = "test-document.pdf";

      const result = await fileUploadService.deleteFileByName(
        fileName,
        fileType
      );

      expect(mockStat).toHaveBeenCalledWith(
        expect.stringContaining("uploads/documents/" + fileName)
      );
      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringContaining("uploads/documents/" + fileName)
      );
      expect(result).toBe(true);
    });

    it("should work with files file type", async () => {
      const fileType = "files";
      const fileName = "test-file.zip";

      const result = await fileUploadService.deleteFileByName(
        fileName,
        fileType
      );

      expect(mockStat).toHaveBeenCalledWith(
        expect.stringContaining("uploads/files/" + fileName)
      );
      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringContaining("uploads/files/" + fileName)
      );
      expect(result).toBe(true);
    });

    it("should throw AppError if fileType is missing", async () => {
      const fileName = "test.jpg";

      await expect(
        fileUploadService.deleteFileByName(fileName, undefined as any)
      ).rejects.toBeInstanceOf(AppError);

      expect(AppError).toHaveBeenCalledWith(
        "File type parameter is required",
        400
      );
    });

    it("should throw AppError for invalid file type", async () => {
      const fileType = "invalid";
      const fileName = "test.jpg";

      await expect(
        fileUploadService.deleteFileByName(fileName, fileType as any)
      ).rejects.toBeInstanceOf(AppError);

      expect(AppError).toHaveBeenCalledWith(
        "Invalid file type: invalid. Must be one of: images, videos, documents, files",
        400
      );
    });

    it("should throw AppError if file doesn't exist", async () => {
      const fileType = "images";
      const fileName = "nonexistent.jpg";

      const enoentError = new Error("File not found");
      (enoentError as any).code = "ENOENT";
      mockStat.mockRejectedValueOnce(enoentError);

      await expect(
        fileUploadService.deleteFileByName(fileName, fileType)
      ).rejects.toBeInstanceOf(AppError);

      expect(AppError).toHaveBeenCalledWith("File not found", 404);
    });

    it("should throw AppError for other filesystem errors", async () => {
      const fileType = "images";
      const fileName = "test.jpg";

      const permissionError = new Error("Permission denied");
      (permissionError as any).code = "EACCES";
      mockStat.mockRejectedValueOnce(permissionError);

      await expect(
        fileUploadService.deleteFileByName(fileName, fileType)
      ).rejects.toBeInstanceOf(AppError);

      expect(AppError).toHaveBeenCalledWith(
        "Failed to delete file: Permission denied",
        500
      );
    });

    it("should handle deletion failure gracefully", async () => {
      const fileType = "images";
      const fileName = "test.jpg";

      const unlinkError = new Error("Cannot delete file");
      mockUnlink.mockRejectedValueOnce(unlinkError);

      await expect(
        fileUploadService.deleteFileByName(fileName, fileType)
      ).rejects.toBeInstanceOf(AppError);

      expect(AppError).toHaveBeenCalledWith(
        "Failed to delete file: Cannot delete file",
        500
      );
    });

    it("should re-throw AppError instances without wrapping", async () => {
      const fileType = "images";
      const fileName = "test.jpg";

      const originalAppError = new AppError("Custom app error", 422);
      mockStat.mockRejectedValueOnce(originalAppError);

      await expect(
        fileUploadService.deleteFileByName(fileName, fileType)
      ).rejects.toEqual(originalAppError);

      expect(AppError).not.toHaveBeenCalledWith(
        expect.stringContaining("Failed to delete file"),
        500
      );
    });
  });

  describe("upload method - protocol detection", () => {
    it("should use HTTPS protocol for non-localhost hosts", async () => {
      mockReq.get = jest.fn((key) => {
        if (key === "host") return "example.com";
        return null;
      });
      mockReq.file = {
        path: "images/test.jpg",
        originalname: "test.jpg",
      };

      mockUpload.single.mockReturnValueOnce(
        (req: any, res: any, next: Function) => {
          req.file = mockReq.file;
          next();
        }
      );

      const result = await fileUploadService.upload(mockReq, mockRes, mockNext);
      expect(result).toBe("http://example.com/api/uploads/images/test.jpg");
    });

    it("should use HTTP protocol for localhost hosts", async () => {
      mockReq.get = jest.fn((key) => {
        if (key === "host") return "localhost:3000";
        return null;
      });
      mockReq.file = {
        path: "images/test.jpg",
        originalname: "test.jpg",
      };

      mockUpload.single.mockReturnValueOnce(
        (req: any, res: any, next: Function) => {
          req.file = mockReq.file;
          next();
        }
      );

      const result = await fileUploadService.upload(mockReq, mockRes, mockNext);
      expect(result).toBe("http://localhost:3000/api/uploads/images/test.jpg");
    });
  });

  describe("upload method - directory path parsing", () => {
    it("should handle uploadDir ending with slash", async () => {
      const serviceWithSlash = new FileUploadService("uploads/images/");
      mockReq.file = {
        path: "/images/test.jpg",
        originalname: "test.jpg",
      };

      mockUpload.single.mockReturnValueOnce(
        (req: any, res: any, next: Function) => {
          req.file = mockReq.file;
          next();
        }
      );

      const result = await serviceWithSlash.upload(mockReq, mockRes, mockNext);
      expect(result).toContain("/api/uploads/images/test.jpg");
    });

    it("should handle uploadDir not ending with slash on windows environment", async () => {
      const serviceWithoutSlash = new FileUploadService("uploads/videos");
      mockReq.file = {
        path: "\\videos\\test.mp4",
        originalname: "test.mp4",
      };

      mockUpload.single.mockReturnValueOnce(
        (req: any, res: any, next: Function) => {
          req.file = mockReq.file;
          next();
        }
      );

      const result = await serviceWithoutSlash.upload(
        mockReq,
        mockRes,
        mockNext
      );
      expect(result).toContain("/api/uploads/videos/test.mp4");
    });
  });

  describe("upload method - file filtering", () => {
    it("should filter out null values from failed processing in multiple files", async () => {
      mockReq.query = { multiple: "true" };
      mockReq.files = [
        { path: "images/test1.jpg", originalname: "test1.jpg" },
        { path: "images/test2.jpg", originalname: "test2.jpg" },
      ];
      mockReq.file = null;

      jest
        .spyOn(helpers, "processImage")
        .mockResolvedValueOnce(
          "http://localhost:3000/api/uploads/images/test1.jpg"
        )
        .mockResolvedValueOnce(null);

      mockUpload.array.mockReturnValueOnce(
        (req: any, res: any, next: Function) => {
          req.files = mockReq.files;
          next();
        }
      );

      const imageService = new FileUploadService("uploads/images");
      const result = await imageService.upload(mockReq, mockRes, mockNext);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result![0]).toBe(
        "http://localhost:3000/api/uploads/images/test1.jpg"
      );
    });
  });

  describe("getFieldName method", () => {
    it("should return 'images' for images directory", () => {
      const imageService = new FileUploadService("uploads/images");
      const fieldName = imageService["getFieldName"]();
      expect(fieldName).toBe("images");
    });

    it("should return 'videos' for videos directory", () => {
      const videoService = new FileUploadService("uploads/videos");
      const fieldName = videoService["getFieldName"]();
      expect(fieldName).toBe("videos");
    });

    it("should return 'documents' for documents directory", () => {
      const docService = new FileUploadService("uploads/documents");
      const fieldName = docService["getFieldName"]();
      expect(fieldName).toBe("documents");
    });

    it("should return 'files' for files directory", () => {
      const fileService = new FileUploadService("uploads/files");
      const fieldName = fileService["getFieldName"]();
      expect(fieldName).toBe("files");
    });

    it("should return 'files' for unknown directory", () => {
      const unknownService = new FileUploadService("uploads/unknown");
      const fieldName = unknownService["getFieldName"]();
      expect(fieldName).toBe("files");
    });

    it("should handle directory paths with trailing slash", () => {
      const imageService = new FileUploadService("uploads/images/");
      const fieldName = imageService["getFieldName"]();
      expect(fieldName).toBe("images");
    });
  });

  describe("deleteFileByUrl - URL parsing edge cases", () => {
    it("should handle relative URLs without http protocol", async () => {
      const relativeUrl = "/api/uploads/images/test.jpg";

      const result = await fileUploadService.deleteFileByUrl(relativeUrl);

      expect(mockStat).toHaveBeenCalled();
      expect(mockUnlink).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should handle URLs with path starting with slash after base route", async () => {
      const result = await fileUploadService.deleteFileByUrl(
        "http://localhost:3000/api/uploads/images/subfolder/test.jpg"
      );

      expect(result).toBe(true);
    });

    it("should handle URLs with path not starting with slash after base route", async () => {
      const result = await fileUploadService.deleteFileByUrl(
        "http://localhost:3000/api/uploadsimages/test.jpg"
      );

      expect(result).toBe(true);
    });

    it("should throw error when unable to determine file type from URL", async () => {
      await expect(
        fileUploadService.deleteFileByUrl(
          "http://localhost:3000/api/uploads/unknown/test.jpg"
        )
      ).rejects.toBeInstanceOf(AppError);

      expect(AppError).toHaveBeenCalledWith(
        "Unable to determine file type or file name from URL",
        400
      );
    });

    it("should throw error for unsupported file type in switch case", async () => {
      // This test might be tricky since we'd need to mock the fileTypes loop differently
      // Let's create a scenario where we can't find a valid file type
      const invalidUrl =
        "http://localhost:3000/api/uploads/invalidtype/test.jpg";

      await expect(
        fileUploadService.deleteFileByUrl(invalidUrl)
      ).rejects.toBeInstanceOf(AppError);
    });
  });

  describe("constructor - directory path handling", () => {
    it("should handle uploadDir starting with slash", () => {
      const service = new FileUploadService("/uploads/images");
      expect(service["uploadDir"]).toContain("uploads/images/");
    });

    it("should handle uploadDir not starting with slash", () => {
      const service = new FileUploadService("uploads/images");
      expect(service["uploadDir"]).toContain("uploads/images/");
    });

    it("should handle uploadDir ending with slash", () => {
      const service = new FileUploadService("uploads/images/");
      expect(service["uploadDir"]).toContain("uploads/images/");
      expect(service["uploadDir"]).not.toMatch(/\/\/$/);
    });

    it("should handle uploadDir not ending with slash", () => {
      const service = new FileUploadService("uploads/images");
      expect(service["uploadDir"]).toContain("uploads/images/");
    });
  });

  describe("handleSingleUpload - oldFilePath variations", () => {
    it("should handle oldFilePath deletion when file exists", async () => {
      const middleware = fileUploadService.handleSingleUpload(
        "images/old-file.jpg"
      );

      mockUpload.single.mockReturnValueOnce((req: any, res: any, next: any) => {
        next();
      });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockStat).toHaveBeenCalled();
      expect(mockUnlink).toHaveBeenCalled();
    });

    it("should handle oldFilePath deletion when file stat fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const middleware = fileUploadService.handleSingleUpload(
        "images/nonexistent.jpg"
      );

      mockUpload.single.mockReturnValueOnce((req: any, res: any, next: any) => {
        next();
      });

      mockStat.mockRejectedValueOnce(new Error("File not found"));

      await middleware(mockReq, mockRes, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("handleDeleteSingleFile - error handling", () => {
    it("should log error and continue when file stat fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const middleware =
        fileUploadService.handleDeleteSingleFile("nonexistent.jpg");

      mockStat.mockRejectedValueOnce(new Error("Stat failed"));

      await middleware(mockReq, mockRes, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should log error and continue when file unlink fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const middleware = fileUploadService.handleDeleteSingleFile("test.jpg");

      mockUnlink.mockRejectedValueOnce(new Error("Unlink failed"));

      await middleware(mockReq, mockRes, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
