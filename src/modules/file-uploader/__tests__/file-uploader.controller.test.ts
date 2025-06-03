import { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import AppError from "../../error-handler/utils/app-error";
import * as fileUploaderService from "../file-uploader.service";
import * as helpers from "../utils/helpers/file-uploader.helpers";
import * as server from "../../../server";
import fileUploaderController from "../file-uploader.controller";
import { accessAsync, statAsync } from "../../../utils/helpers/fs.helpers";

jest.mock("fs");
jest.mock("path");
jest.mock("util", () => ({
  ...jest.requireActual("util"),
  promisify: jest.fn((fn) => fn),
}));
jest.mock("../../error-handler/utils/app-error");
jest.mock("../file-uploader.service");
jest.mock("../utils/helpers/file-uploader.helpers");
jest.mock("../../../server");

describe("File Uploader Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      params: {},
      query: {},
      protocol: "http",
      get: jest.fn().mockReturnValue("example.com"),
      originalUrl: "/api/uploads/images/test.jpg",
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      writeHead: jest.fn(),
    };

    mockNext = jest.fn();

    // Mock fs functions
    (fs.access as any as jest.Mock) = jest.fn();
    (fs.stat as any as jest.Mock) = jest.fn().mockResolvedValue({ size: 1024 });
    (fs.createReadStream as jest.Mock) = jest.fn().mockReturnValue({
      pipe: jest.fn(),
    });

    // Mock promisify
    (promisify as any as jest.Mock).mockImplementation((fn) => fn);

    // Mock path.resolve
    (path.resolve as jest.Mock).mockImplementation((...args) => args.join("/"));
    (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

    // Mock getArkosConfig
    (server.getArkosConfig as jest.Mock).mockReturnValue({
      fileUpload: {
        baseUploadDir: "/uploads",
      },
    });

    // Mock getFileUploaderServices
    const mockImageUploaderService = {
      handleMultipleUpload: jest
        .fn()
        .mockReturnValue((req: any, res: any, cb: any) => cb()),
      deleteFileByUrl: jest.fn().mockResolvedValue(true),
      deleteFileByName: jest.fn().mockResolvedValue(true),
    };

    const mockFileUploaderService = {
      handleMultipleUpload: jest
        .fn()
        .mockReturnValue((req: any, res: any, cb: any) => cb()),
      deleteFileByUrl: jest.fn().mockResolvedValue(true),
      deleteFileByName: jest.fn().mockResolvedValue(true),
    };

    const mockDocumentUploaderService = {
      handleMultipleUpload: jest
        .fn()
        .mockReturnValue((req: any, res: any, cb: any) => cb()),
      deleteFileByUrl: jest.fn().mockResolvedValue(true),
      deleteFileByName: jest.fn().mockResolvedValue(true),
    };

    const mockVideoUploaderService = {
      handleMultipleUpload: jest
        .fn()
        .mockReturnValue((req: any, res: any, cb: any) => cb()),
      deleteFileByUrl: jest.fn().mockResolvedValue(true),
      deleteFileByName: jest.fn().mockResolvedValue(true),
    };

    (fileUploaderService.getFileUploaderServices as jest.Mock).mockReturnValue({
      imageUploaderService: mockImageUploaderService,
      fileUploaderService: mockFileUploaderService,
      documentUploaderService: mockDocumentUploaderService,
      videoUploaderService: mockVideoUploaderService,
    });

    // Mock helpers
    (helpers.processImage as jest.Mock).mockResolvedValue(
      "http://example.com/images/test.jpg"
    );
    (helpers.processFile as jest.Mock).mockResolvedValue(
      "http://example.com/files/test.txt"
    );
  });

  describe("uploadFile", () => {
    it("should create directory if it doesn't exist", async () => {
      mockRequest.params = { fileType: "images" };

      // Mock directory doesn't exist
      (accessAsync as any as jest.Mock).mockRejectedValueOnce(
        new Error("ENOENT")
      );

      try {
        await fileUploaderController.uploadFile(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );
      } catch (err) {
        console.error(err);
      }

      expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining("images"), {
        recursive: true,
      });
    });

    it("should return error for invalid file type", async () => {
      mockRequest.params = { fileType: "invalid" };

      await fileUploaderController.uploadFile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(AppError).toHaveBeenCalledWith("Invalid file type", 400);
    });

    it("should process multiple image files", async () => {
      mockRequest.params = { fileType: "images" };
      mockRequest.files = [
        { path: "/tmp/upload1.jpg" },
        { path: "/tmp/upload2.jpg" },
      ] as Express.Multer.File[];

      await fileUploaderController.uploadFile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(helpers.processImage).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [
          "http://example.com/images/test.jpg",
          "http://example.com/images/test.jpg",
        ],
        message: "2 files uploaded successfully",
      });
    });

    it("should process a single image file", async () => {
      mockRequest.params = { fileType: "images" };
      mockRequest.file = { path: "/tmp/upload1.jpg" } as Express.Multer.File;

      await fileUploaderController.uploadFile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(helpers.processImage).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: "http://example.com/images/test.jpg",
        message: "File uploaded successfully",
      });
    });

    it("should process a single document file", async () => {
      mockRequest.params = { fileType: "documents" };
      mockRequest.file = { path: "/tmp/document.pdf" } as Express.Multer.File;

      await fileUploaderController.uploadFile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(helpers.processFile).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should return error when no file is uploaded", async () => {
      mockRequest.params = { fileType: "images" };

      await fileUploaderController.uploadFile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(AppError).toHaveBeenCalledWith("No file uploaded", 400);
    });

    it("should handle uploader error", async () => {
      mockRequest.params = { fileType: "images" };

      const mockImageService =
        fileUploaderService.getFileUploaderServices().imageUploaderService;
      (mockImageService.handleMultipleUpload as jest.Mock).mockReturnValue(
        (req: any, res: any, cb: any) => cb(new Error("Upload failed"))
      );

      await fileUploaderController.uploadFile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(new Error("Upload failed"));
    });
  });

  describe("deleteFile", () => {
    it("should delete a file successfully by url", async () => {
      mockRequest.params = { fileType: "images", fileName: "test.jpg" };

      await fileUploaderController.deleteFile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const imageService =
        fileUploaderService.getFileUploaderServices().imageUploaderService;
      expect(imageService.deleteFileByUrl).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "File deleted successfully",
      });
    });

    it("should delete a file successfully by file name", async () => {
      mockRequest.params = { fileType: "images", fileName: "test.jpg" };

      await fileUploaderController.deleteFile(
        { ...mockRequest, originalUrl: "/api/users/avatar" } as Request,
        mockResponse as Response,
        mockNext
      );

      const imageService =
        fileUploaderService.getFileUploaderServices().imageUploaderService;
      expect(imageService.deleteFileByUrl).not.toHaveBeenCalled();
      expect(imageService.deleteFileByName).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "File deleted successfully",
      });
    });

    it("should return error for invalid file type", async () => {
      mockRequest.params = { fileType: "invalid", fileName: "test.jpg" };

      await fileUploaderController.deleteFile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(AppError).toHaveBeenCalledWith("Invalid file type", 400);
    });

    it("should return error when file not found", async () => {
      mockRequest.params = { fileType: "images", fileName: "nonexistent.jpg" };

      const imageService =
        fileUploaderService.getFileUploaderServices().imageUploaderService;

      (imageService.deleteFileByName as jest.Mock).mockRejectedValueOnce(
        new Error("File not found")
      );

      await fileUploaderController.deleteFile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(AppError).toHaveBeenCalledWith("File not found", 404);
    });
  });

  describe("streamFile", () => {
    beforeEach(() => {
      (statAsync as any as jest.Mock).mockResolvedValue({
        size: 1024,
      });
    });

    it("should stream a file with no range header", async () => {
      mockRequest.params = { fileType: "images", fileName: "test.jpg" };
      mockRequest.headers = {
        range: undefined,
      };

      await fileUploaderController.streamFile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.writeHead).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          "Content-Length": 1024,
          "Content-Type": "application/octet-stream",
        })
      );

      expect(fs.createReadStream).toHaveBeenCalledWith(
        expect.stringContaining("test.jpg")
      );
    });

    it("should stream a file with range header", async () => {
      mockRequest.params = { fileType: "images", fileName: "test.jpg" };
      mockRequest.headers = { range: "bytes=0-511" };

      await fileUploaderController.streamFile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.writeHead).toHaveBeenCalledWith(
        206,
        expect.objectContaining({
          "Content-Range": "bytes 0-511/1024",
          "Content-Length": 512,
        })
      );

      expect(fs.createReadStream).toHaveBeenCalledWith(
        expect.stringContaining("test.jpg"),
        { start: 0, end: 511 }
      );
    });

    it("should return error when range is not satisfiable", async () => {
      mockRequest.params = { fileType: "images", fileName: "test.jpg" };
      mockRequest.headers = { range: "bytes=2000-3000" };

      await fileUploaderController.streamFile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(416);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Range Not Satisfiable",
      });
    });

    it("should return error when file not found", async () => {
      mockRequest.params = { fileType: "images", fileName: "nonexistent.jpg" };
      mockRequest.headers = { range: "bytes=2000-3000" };

      (accessAsync as any as jest.Mock).mockRejectedValueOnce(
        new Error("ENOENT")
      );

      await fileUploaderController.streamFile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(AppError).toHaveBeenCalledWith("File not found", 404);
    });
  });

  describe("updateFile", () => {
    it("should update a single image file successfully and delete old file by url", async () => {
      mockRequest.params = {
        fileType: "images",
        fileName: "old-image.jpg",
      };
      mockRequest.file = { path: "/tmp/new-upload.jpg" } as Express.Multer.File;

      await fileUploaderController.updateFile(
        {
          ...mockRequest,
          originalUrl: "/api/uploads/images/old-image.jpg",
        } as Request,
        mockResponse as Response,
        mockNext
      );

      const imageService =
        fileUploaderService.getFileUploaderServices().imageUploaderService;
      expect(imageService.deleteFileByUrl).toHaveBeenCalledWith(
        "http://example.com/api/uploads/images/old-image.jpg"
      );
      expect(helpers.processImage).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: "http://example.com/images/test.jpg",
        message: "File updated successfully",
      });
    });

    it("should update a single image file successfully and delete old file by name", async () => {
      mockRequest.params = {
        fileType: "images",
        fileName: "old-image.jpg",
      };
      mockRequest.file = { path: "/tmp/new-upload.jpg" } as Express.Multer.File;

      await fileUploaderController.updateFile(
        {
          ...mockRequest,
          originalUrl: "/api/users/me/avatar",
        } as Request,
        mockResponse as Response,
        mockNext
      );

      const imageService =
        fileUploaderService.getFileUploaderServices().imageUploaderService;
      expect(imageService.deleteFileByName).toHaveBeenCalledWith(
        "old-image.jpg",
        "images"
      );
      expect(helpers.processImage).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: "http://example.com/images/test.jpg",
        message: "File updated successfully",
      });
    });

    // it("should update multiple image files successfully", async () => {
    //   mockRequest.params = { fileType: "images", fileName: "old-image.jpg" };
    //   mockRequest.files = [
    //     { path: "/tmp/new-upload1.jpg" },
    //     { path: "/tmp/new-upload2.jpg" },
    //   ] as Express.Multer.File[];

    //   await fileUploaderController.updateFile(
    //     mockRequest as Request,
    //     mockResponse as Response,
    //     mockNext
    //   );

    //   const imageService =
    //     fileUploaderService.getFileUploaderServices().imageUploaderService;
    //   expect(imageService.deleteFileByUrl).toHaveBeenCalledWith(
    //     "http://example.com/api/files/images/old-image.jpg"
    //   );
    //   expect(helpers.processImage).toHaveBeenCalledTimes(2);
    //   expect(mockResponse.status).toHaveBeenCalledWith(200);
    //   expect(mockResponse.json).toHaveBeenCalledWith({
    //     success: true,
    //     data: [
    //       "http://example.com/images/test.jpg",
    //       "http://example.com/images/test.jpg",
    //     ],
    //     message: "File updated successfully. 2 new files uploaded",
    //   });
    // });

    it("should update a document file successfully", async () => {
      mockRequest.params = { fileType: "documents", fileName: "old-doc.pdf" };
      mockRequest.file = {
        path: "/tmp/new-document.pdf",
      } as Express.Multer.File;

      await fileUploaderController.updateFile(
        {
          ...mockRequest,
          originalUrl: "/api/uploads/documents/old-doc.pdf",
        } as Request,
        mockResponse as Response,
        mockNext
      );

      const documentService =
        fileUploaderService.getFileUploaderServices().documentUploaderService;
      expect(documentService.deleteFileByUrl).toHaveBeenCalledWith(
        "http://example.com/api/uploads/documents/old-doc.pdf"
      );
      expect(helpers.processFile).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should return error for invalid file type", async () => {
      mockRequest.params = { fileType: "invalid", fileName: "test.jpg" };
      mockRequest.file = { path: "/tmp/new-upload.jpg" } as Express.Multer.File;

      await fileUploaderController.updateFile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(AppError).toHaveBeenCalledWith("Invalid file type", 400);
    });

    it("should return error when no new file is uploaded", async () => {
      mockRequest.params = { fileType: "images", fileName: "old-image.jpg" };

      await fileUploaderController.updateFile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(AppError).toHaveBeenCalledWith("No new file uploaded", 400);
    });

    it("should continue with upload even if old file deletion fails", async () => {
      mockRequest.params = { fileType: "images", fileName: "nonexistent.jpg" };
      mockRequest.file = { path: "/tmp/new-upload.jpg" } as Express.Multer.File;

      const imageService =
        fileUploaderService.getFileUploaderServices().imageUploaderService;
      (imageService.deleteFileByName as jest.Mock).mockRejectedValueOnce(
        new Error("File not found")
      );

      // Mock console.warn to avoid output during tests
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await fileUploaderController.updateFile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Could not delete old file: nonexistent.jpg",
        expect.any(Error)
      );
      expect(helpers.processImage).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      consoleSpy.mockRestore();
    });

    it("should handle uploader error", async () => {
      mockRequest.params = { fileType: "images", fileName: "old-image.jpg" };
      mockRequest.file = { path: "/tmp/new-upload.jpg" } as Express.Multer.File;

      const mockImageService =
        fileUploaderService.getFileUploaderServices().imageUploaderService;
      (mockImageService.handleMultipleUpload as jest.Mock).mockReturnValue(
        (req: any, res: any, cb: any) => cb(new Error("Upload failed"))
      );

      await fileUploaderController.updateFile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(new Error("Upload failed"));
    });

    it("should create directory if it doesn't exist during update", async () => {
      mockRequest.params = { fileType: "images", fileName: "old-image.jpg" };
      mockRequest.file = { path: "/tmp/new-upload.jpg" } as Express.Multer.File;

      // Mock directory doesn't exist
      (accessAsync as any as jest.Mock).mockRejectedValueOnce(
        new Error("ENOENT")
      );

      try {
        await fileUploaderController.updateFile(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );
      } catch (err) {
        console.error(err);
      }

      expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining("images"), {
        recursive: true,
      });
    });
  });
});
