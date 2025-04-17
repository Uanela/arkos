import multer from "multer";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import sharp from "sharp";
import {
  FileUploaderService,
  getFileUploaderServices,
} from "../file-uploader.service";
import AppError from "../../error-handler/utils/app-error";
import { getArkosConfig } from "../../../server";

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
jest.mock("../../../utils/helpers/models.helpers");

describe("FileUploaderService", () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;
  let fileUploaderService: FileUploaderService;
  let mockStorage: any;
  let mockUploader: any;
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
      if (input?.includes("../")) {
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
      args.join("/")
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
    mockUploader = {
      single: jest
        .fn()
        .mockReturnValue((req: any, res: any, next: any) => next()),
      array: jest
        .fn()
        .mockReturnValue((req: any, res: any, next: any) => next()),
    };

    (multer as unknown as any as jest.Mock).mockReturnValue(mockUploader);

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
    fileUploaderService = new FileUploaderService(
      "uploads/images",
      5 * 1024 * 1024,
      /jpeg|jpg|png/,
      30
    );
  });

  describe("constructor", () => {
    it("should initialize with default parameters when not provided", () => {
      const service = new FileUploaderService("../uploads/images");
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

      new FileUploaderService("uploads/images");

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
      expect(fileCb).toHaveBeenCalledWith(
        null,
        expect.stringMatching(/\d+-\d+\.jpg/)
      );
    });
  });

  describe("fileFilter", () => {
    it("should accept valid file types", () => {
      const fileFilter = fileUploaderService["fileFilter"];
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
      fileUploaderService["allowedFileTypes"] = /jpeg|jpg|png/;

      const fileFilter = fileUploaderService["fileFilter"];
      const cb = jest.fn();
      const mockFile = {
        originalname: "test.pdf",
        mimetype: "application/pdf",
      };

      // Mock path.extname to return .pdf
      (path.extname as any as jest.Mock).mockReturnValueOnce(".pdf");

      fileFilter({}, mockFile, cb);

      expect(cb).toHaveBeenCalledWith(expect.any(AppError));
      expect(AppError).toHaveBeenCalledWith("Invalid file type", 400);
    });
  });

  describe("getUploader", () => {
    it("should return multer instance with correct configuration", () => {
      const uploader = fileUploaderService.getUploader();

      expect(multer).toHaveBeenCalledWith({
        storage: mockStorage,
        fileFilter: expect.any(Function),
        limits: { fileSize: 5 * 1024 * 1024 },
      });

      expect(uploader).toBe(mockUploader);
    });
  });

  describe("handleSingleUpload", () => {
    it("should call next() if upload is successful", () => {
      const middleware = fileUploaderService.handleSingleUpload();

      middleware(mockReq, mockRes, mockNext);

      expect(mockUploader.single).toHaveBeenCalledWith(expect.any(String));
      expect(mockNext).toHaveBeenCalled();
    });

    it("should delete old file if oldFilePath is provided", async () => {
      // Make promisify return our specific mocks when called with the right functions

      // Override multer implementation
      mockUploader.single.mockReturnValueOnce((req: any, res: any, next: any) =>
        next()
      );

      const middleware = fileUploaderService.handleSingleUpload(
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

      mockUploader.single.mockReturnValueOnce((req: any, res: any, next: any) =>
        next(multerError)
      );

      const middleware = fileUploaderService.handleSingleUpload();

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(multerError);
    });

    it("should pass regular errors to next", () => {
      const regularError = new Error("Some other error");

      mockUploader.single.mockReturnValueOnce((req: any, res: any, next: any) =>
        next(regularError)
      );

      const middleware = fileUploaderService.handleSingleUpload();

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(regularError);
    });
  });

  describe("handleMultipleUpload", () => {
    it("should call next() if multiple upload is successful", () => {
      const middleware = fileUploaderService.handleMultipleUpload();

      middleware(mockReq, mockRes, mockNext);

      expect(mockUploader.array).toHaveBeenCalledWith(expect.any(String), 30);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should pass multer errors to next", () => {
      const multerError = new multer.MulterError(
        "LIMIT_FILE_COUNT",
        "fieldname"
      );

      mockUploader.array.mockReturnValueOnce((req: any, res: any, next: any) =>
        next(multerError)
      );

      const middleware = fileUploaderService.handleMultipleUpload();

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(multerError);
    });
  });

  describe("handleDeleteSingleFile", () => {
    it("should delete the file if it exists", async () => {
      const middleware =
        fileUploaderService.handleDeleteSingleFile("path/to/file.jpg");

      await middleware(mockReq, mockRes, mockNext);

      expect(mockStat).toHaveBeenCalledWith("path/to/file.jpg");
      expect(mockUnlink).toHaveBeenCalledWith("path/to/file.jpg");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should call next even if file doesn't exist", async () => {
      const middleware = fileUploaderService.handleDeleteSingleFile(
        "nonexistent/file.jpg"
      );

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("deleteFileByUrl", () => {
    it("should delete a file by its URL", async () => {
      const result = await fileUploaderService.deleteFileByUrl(
        "http://localhost:3000/api/uploads/images/file.jpg"
      );

      expect(mockStat).toHaveBeenCalled();
      expect(mockUnlink).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should throw AppError if file URL is invalid", async () => {
      await expect(
        fileUploaderService.deleteFileByUrl(
          "http://localhost:3000/invalid/path"
        )
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
        fileUploaderService.deleteFileByUrl(
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
      mockUploader.single.mockReturnValueOnce(
        (req: any, res: any, next: Function) => {
          req.file = mockReq.file;
          next();
        }
      );

      const result = await fileUploaderService.upload(mockReq, mockRes);

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

      mockUploader.array.mockReturnValueOnce(
        (req: any, res: any, next: Function) => {
          req.files = mockReq.files;
          next();
        }
      );

      const result = await fileUploaderService.upload(mockReq, mockRes);

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

      const imageUploaderService = new FileUploaderService("uploads/images");

      mockUploader.single.mockReturnValueOnce(
        (req: any, res: any, next: Function) => {
          req.file = mockReq.file;
          next();
        }
      );

      const result = await imageUploaderService.upload(mockReq, mockRes, {
        width: 300,
        height: 200,
        format: "webp",
      });

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

      mockUploader.single.mockReturnValueOnce(
        (req: any, res: any, next: Function) => next()
      );

      await expect(
        fileUploaderService.upload(mockReq, mockRes)
      ).rejects.toBeInstanceOf(AppError);
      expect(AppError).toHaveBeenCalledWith("No file uploaded", 400);
    });

    it("should handle upload errors", async () => {
      const uploadError = new Error("Upload failed");

      mockUploader.single.mockReturnValueOnce(
        (req: any, res: any, next: Function) => next(uploadError)
      );

      await expect(
        fileUploaderService.upload(mockReq, mockRes)
      ).rejects.toEqual(uploadError);
    });

    it("should handle image processing errors", async () => {
      mockReq.file = {
        path: "uploads/images/test.jpg",
        originalname: "test.jpg",
      };

      // Mock that we're using the image uploader
      const imageUploaderService = new FileUploaderService("uploads/images");

      mockUploader.single.mockReturnValueOnce(
        (req: any, res: any, next: Function) => {
          req.file = mockReq.file;
          next();
        }
      );

      // Setup Sharp to throw an error
      const processingError = new Error("Image processing failed");
      mockSharp.toFile.mockRejectedValueOnce(processingError);

      await expect(
        imageUploaderService.upload(mockReq, mockRes, { format: "webp" })
      ).rejects.toEqual(processingError);
    });
  });

  describe("getFileUploaderServices", () => {
    it("should return all file uploader services", () => {
      const services = getFileUploaderServices();

      expect(services).toHaveProperty("imageUploaderService");
      expect(services).toHaveProperty("videoUploaderService");
      expect(services).toHaveProperty("documentUploaderService");
      expect(services).toHaveProperty("fileUploaderService");

      expect(services.imageUploaderService).toBeInstanceOf(FileUploaderService);
      expect(services.videoUploaderService).toBeInstanceOf(FileUploaderService);
      expect(services.documentUploaderService).toBeInstanceOf(
        FileUploaderService
      );
      expect(services.fileUploaderService).toBeInstanceOf(FileUploaderService);
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

      const services = getFileUploaderServices();

      // Test that the custom config values were used
      expect(services.imageUploaderService["uploadDir"]).toBe(
        process.cwd().split("/").slice(0, -1).join("/") +
          "/custom/uploads/images/"
      );
      expect(services.imageUploaderService["maxCount"]).toBe(50);
      expect(services.imageUploaderService["fileSizeLimit"]).toBe(
        20 * 1024 * 1024
      );
      expect(services.imageUploaderService["allowedFileTypes"]).toEqual(
        /custom-regex/
      );
    });

    it("should use default values when config is not available", () => {
      // Setup empty config
      (getArkosConfig as any as jest.Mock).mockReturnValue({});

      const services = getFileUploaderServices();

      // Test that default values were used
      expect(services.imageUploaderService["uploadDir"]).toBe(
        process.cwd() + "/uploads/images/"
      );
      expect(services.videoUploaderService["uploadDir"]).toBe(
        process.cwd() + "/uploads/videos/"
      );
      expect(services.documentUploaderService["uploadDir"]).toBe(
        process.cwd() + "/uploads/documents/"
      );
      expect(services.fileUploaderService["uploadDir"]).toBe(
        process.cwd() + "/uploads/files/"
      );
    });
  });
});
