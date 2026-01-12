import uploadManager from "../upload-manager";
import multer from "multer";
import fs from "fs";
import { promisify } from "util";
import { getArkosConfig } from "../../../../../exports";

jest.mock("multer");
jest.mock("fs", () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  stat: jest.fn(),
  unlink: jest.fn(),
  promises: {
    unlink: jest.fn(),
  },
  readdirSync: jest.fn(),
}));
jest.mock("util");
jest.mock("../../../../../exports");
jest.mock("../../../../sheu");
jest.mock("../../../../helpers/deepmerge.helper");

const mockDeepmerge = require("../../../../helpers/deepmerge.helper").default;

describe("UploadManager", () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;
  let mockMulterInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      headers: {},
      body: {},
      file: undefined,
      files: undefined,
      get: () => "localhost:3000",
    };
    mockRes = {};
    mockNext = jest.fn();

    mockMulterInstance = {
      single: jest.fn().mockReturnValue(jest.fn()),
      array: jest.fn().mockReturnValue(jest.fn()),
      fields: jest.fn().mockReturnValue(jest.fn()),
    };

    (multer as unknown as jest.Mock).mockReturnValue(mockMulterInstance);
    (getArkosConfig as jest.Mock).mockReturnValue({
      fileUpload: { baseUploadDir: "/uploads" },
    });
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);

    mockDeepmerge.mockImplementation((a: any, b: any) => ({ ...a, ...b }));
    // mockExtractRequestInfo.mockReturnValue({
    //   baseURL: "http://localhost:3000",
    //   baseRoute: "/api",
    // });
    // mockGenerateRelativePath.mockReturnValue("/uploads/test.jpg");
  });

  describe("handleUpload", () => {
    it("should handle single file upload", () => {
      const config = { type: "single" as const, field: "avatar" };
      const middleware = uploadManager.handleUpload(config);

      mockMulterInstance.single.mockReturnValue((req: any, res: any, cb: any) =>
        cb()
      );

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.headers["x-upload-dir"]).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle array file upload", () => {
      const config = { type: "array" as const, field: "photos", maxCount: 3 };
      const middleware = uploadManager.handleUpload(config);

      mockMulterInstance.array.mockReturnValue((req: any, res: any, cb: any) =>
        cb()
      );

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle fields file upload", () => {
      const config = {
        type: "fields" as const,
        fields: [{ name: "avatar", maxCount: 1 }],
      };
      const middleware = uploadManager.handleUpload(config);

      mockMulterInstance.fields.mockReturnValue((req: any, res: any, cb: any) =>
        cb()
      );

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should set custom upload directory", () => {
      const config = {
        type: "single" as const,
        field: "avatar",
        uploadDir: "/custom",
      };
      const middleware = uploadManager.handleUpload(config);

      mockMulterInstance.single.mockReturnValue((req: any, res: any, cb: any) =>
        cb()
      );

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.headers["x-upload-dir"]).toBe("/custom");
    });

    it("should handle upload errors", () => {
      const config = { type: "single" as const, field: "avatar" };
      const middleware = uploadManager.handleUpload(config);
      const mockError = new Error("Upload failed");

      mockMulterInstance.single.mockReturnValue((req: any, res: any, cb: any) =>
        cb(mockError)
      );

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(mockError);
    });

    it("should delete old file when oldFilePath is provided", async () => {
      const config = { type: "single" as const, field: "avatar" };
      const oldFilePath = "/old/file.jpg";

      const mockStat = jest.fn().mockResolvedValue({ isFile: () => true });
      const mockUnlink = jest.fn().mockResolvedValue(undefined);

      (promisify as any as jest.Mock).mockImplementation((fn: any) => {
        if (fn.name === "stat" || fn === fs.stat) return mockStat;
        if (fn.name === "unlink" || fn === fs.unlink) return mockUnlink;
        return jest.fn();
      });

      mockMulterInstance.single.mockReturnValue(
        (req: any, res: any, cb: any) => {
          setTimeout(() => cb(), 0);
        }
      );

      const middleware = uploadManager.handleUpload(config, oldFilePath);
      middleware(mockReq, mockRes, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockStat).toHaveBeenCalled();
      expect(mockUnlink).toHaveBeenCalled();
    });
  });

  describe("handleFileCleanup", () => {
    it("should delete single file and remove from req", async () => {
      const config = { type: "single" as const, field: "avatar" };
      mockReq.file = { path: "/path/to/file.jpg" };

      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const middleware = uploadManager.handleFileCleanup(config);
      await middleware(null, mockReq, mockRes, mockNext);

      expect(fs.promises.unlink).toHaveBeenCalledWith("/path/to/file.jpg");
      expect(mockReq.file).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith(null);
    });

    it("should delete array files and remove from req", async () => {
      const config = { type: "array" as const, field: "photos" };
      mockReq.files = [
        { path: "/path/to/file1.jpg" },
        { path: "/path/to/file2.jpg" },
      ];

      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const middleware = uploadManager.handleFileCleanup(config);
      await middleware(null, mockReq, mockRes, mockNext);

      expect(fs.promises.unlink).toHaveBeenCalledTimes(2);
      expect(mockReq.files).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith(null);
    });

    it("should delete fields files and remove from req", async () => {
      const config = {
        type: "fields" as const,
        fields: [{ name: "avatar", maxCount: 1 }],
      };
      mockReq.files = {
        avatar: [{ path: "/path/to/avatar.jpg" }],
        cover: [{ path: "/path/to/cover.jpg" }],
      };

      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const middleware = uploadManager.handleFileCleanup(config);
      await middleware(null, mockReq, mockRes, mockNext);

      expect(fs.promises.unlink).toHaveBeenCalledTimes(2);
      expect(mockReq.files).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith(null);
    });

    it("should handle deletion errors gracefully", async () => {
      const config = { type: "single" as const, field: "avatar" };
      mockReq.file = { path: "/path/to/file.jpg" };

      (fs.promises.unlink as jest.Mock).mockRejectedValue(
        new Error("Delete failed")
      );

      const middleware = uploadManager.handleFileCleanup(config);
      await middleware(null, mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(null);
    });

    it("should pass error to next", async () => {
      const config = { type: "single" as const, field: "avatar" };
      const mockError = new Error("Some error");

      const middleware = uploadManager.handleFileCleanup(config);
      await middleware(mockError, mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });

  describe("handlePostUpload", () => {
    it("should attach pathname to body for single file", () => {
      const config = {
        type: "single" as const,
        field: "avatar",
        attachToBody: "pathname" as const,
      };
      mockReq.file = { path: "C:\\uploads\\file.jpg" };
      // mockGenerateRelativePath.mockReturnValue("/uploads/C:/file.jpg");

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.file.pathname).toBe("C:/uploads/file.jpg");
      expect(mockReq.file.url).toBe(
        "http://localhost:3000/api/uploads/C:/file.jpg"
      );
      expect(mockReq.body).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should attach pathname to body for single file in windows", () => {
      const config = {
        type: "single" as const,
        field: "avatar",
        attachToBody: "url" as const,
      };
      jest
        .spyOn(process, "cwd")
        .mockImplementation(() => "S:/projects/store/backend");
      mockReq.file = {
        path: "S:/projects/store/backend/uploads/mobile/apps/product-image.png",
      };

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.file.url).toBe(
        "http://localhost:3000/api/uploads/mobile/apps/product-image.png"
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it("should attach url to body for single file", () => {
      const config = {
        type: "single" as const,
        field: "avatar",
        attachToBody: "url" as const,
      };
      mockReq.file = { path: "/uploads/file.jpg" };

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.file.url).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should attach file object to body", () => {
      const config = {
        type: "single" as const,
        field: "avatar",
        attachToBody: "file" as const,
      };
      mockReq.file = { path: "/uploads/file.jpg" };

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should not attach to body when attachToBody is false", () => {
      const config = {
        type: "single" as const,
        field: "avatar",
        attachToBody: false as const,
      };
      mockReq.file = { path: "/uploads/file.jpg" };
      mockReq.body = {};

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.file.url).toBeDefined();
      expect(Object.keys(mockReq.body).length).toBe(0);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle array files", () => {
      const config = {
        type: "array" as const,
        field: "photos",
        attachToBody: "url" as const,
      };
      mockReq.files = [
        { path: "/uploads/file1.jpg" },
        { path: "/uploads/file2.jpg" },
      ];

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.files[0].url).toBeDefined();
      expect(mockReq.files[1].url).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle fields with single file", () => {
      const config = {
        type: "fields" as const,
        fields: [{ name: "avatar", maxCount: 1 }],
        attachToBody: "url" as const,
      };
      mockReq.files = {
        avatar: [{ path: "/uploads/avatar.jpg" }],
      };

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle fields with multiple files", () => {
      const config = {
        type: "fields" as const,
        fields: [{ name: "photos", maxCount: 2 }],
        attachToBody: "url" as const,
      };
      mockReq.files = {
        photos: [
          { path: "/uploads/photo1.jpg" },
          { path: "/uploads/photo2.jpg" },
        ],
      };

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle nested field names with brackets", () => {
      const config = {
        type: "single" as const,
        field: "user[profile][avatar]",
        attachToBody: "url" as const,
      };
      mockReq.file = { path: "/uploads/file.jpg" };

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should normalize Windows paths", () => {
      const config = {
        type: "single" as const,
        field: "avatar",
        attachToBody: "pathname" as const,
      };
      mockReq.file = { path: "C:\\uploads\\windows\\file.jpg" };

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.file.pathname).not.toContain("\\");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should default to pathname when attachToBody is undefined", () => {
      const config = {
        type: "single" as const,
        field: "avatar",
      };
      mockReq.file = { path: "/uploads/file.jpg" };

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("getMiddleware", () => {
    it("should return single upload middleware", () => {
      const config = { type: "single" as const, field: "avatar" };
      const middleware = (uploadManager as any).getMiddleware(config);

      expect(mockMulterInstance.single).toHaveBeenCalledWith("avatar");
      expect(middleware).toBeDefined();
    });

    it("should return array upload middleware with default maxCount", () => {
      const config = { type: "array" as const, field: "photos" };
      const middleware = (uploadManager as any).getMiddleware(config);

      expect(mockMulterInstance.array).toHaveBeenCalledWith("photos", 5);
      expect(middleware).toBeDefined();
    });

    it("should return array upload middleware with custom maxCount", () => {
      const config = { type: "array" as const, field: "photos", maxCount: 10 };
      const middleware = (uploadManager as any).getMiddleware(config);

      expect(mockMulterInstance.array).toHaveBeenCalledWith("photos", 10);
      expect(middleware).toBeDefined();
    });

    it("should return fields upload middleware", () => {
      const config = {
        type: "fields" as const,
        fields: [{ name: "avatar", maxCount: 1 }],
      };
      const middleware = (uploadManager as any).getMiddleware(config);

      expect(mockMulterInstance.fields).toHaveBeenCalledWith(config.fields);
      expect(middleware).toBeDefined();
    });
  });

  describe("fileFilter", () => {
    it("should allow file with valid extension from array", () => {
      const cb = jest.fn();
      const file = { originalname: "test.jpg" };
      const allowedFileTypes = [".jpg", ".png"];

      (uploadManager as any).fileFilter(null, file, cb, allowedFileTypes);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it("should allow file with valid extension from regex", () => {
      const cb = jest.fn();
      const file = { originalname: "test.jpg" };
      const allowedFileTypes = /jpg|png/;

      (uploadManager as any).fileFilter(null, file, cb, allowedFileTypes);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it("should reject file with invalid extension from array", () => {
      const cb = jest.fn();
      const file = { originalname: "test.exe" };
      const allowedFileTypes = [".jpg", ".png"];

      (uploadManager as any).fileFilter(null, file, cb, allowedFileTypes);

      expect(cb).toHaveBeenCalled();
      const callArg = cb.mock.calls[0][0];
      expect(callArg).toBeTruthy();
      expect(callArg.message).toContain("File type not allowed");
    });

    it("should reject file with invalid extension from regex", () => {
      const cb = jest.fn();
      const file = { originalname: "test.exe" };
      const allowedFileTypes = /jpg|png/;

      (uploadManager as any).fileFilter(null, file, cb, allowedFileTypes);

      expect(cb).toHaveBeenCalled();
      const callArg = cb.mock.calls[0][0];
      expect(callArg).toBeTruthy();
    });
  });

  describe("storage configuration", () => {
    it("should create upload directory if it does not exist", () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const mkdirSyncSpy = fs.mkdirSync as jest.Mock;

      const config = { type: "single" as const, field: "avatar" };
      uploadManager.handleUpload(config);

      expect(mkdirSyncSpy).not.toHaveBeenCalled();
    });

    it("should determine correct upload dir for images", () => {
      const config = { type: "single" as const, field: "avatar" };
      const uploadMw = uploadManager.handleUpload(config);
      uploadMw(mockReq, mockRes, mockNext);
      expect(mockMulterInstance.single).toHaveBeenCalled();
    });

    it("should determine correct upload dir for videos", () => {
      const config = { type: "single" as const, field: "video" };
      const uploadMw = uploadManager.handleUpload(config);
      uploadMw(mockReq, mockRes, mockNext);
      expect(mockMulterInstance.single).toHaveBeenCalled();
    });

    it("should determine correct upload dir for documents", () => {
      const config = { type: "single" as const, field: "document" };
      const uploadMw = uploadManager.handleUpload(config);
      uploadMw(mockReq, mockRes, mockNext);
      expect(mockMulterInstance.single).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle missing file in handlePostUpload", () => {
      const config = {
        type: "single" as const,
        field: "avatar",
        attachToBody: "url" as const,
      };
      mockReq.file = undefined;

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle missing files array in handlePostUpload", () => {
      const config = {
        type: "array" as const,
        field: "photos",
        attachToBody: "url" as const,
      };
      mockReq.files = undefined;

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle empty fields in handlePostUpload", () => {
      const config = {
        type: "fields" as const,
        fields: [{ name: "avatar", maxCount: 1 }],
        attachToBody: "url" as const,
      };
      mockReq.files = {};

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle array index notation in field names", () => {
      const config = {
        type: "single" as const,
        field: "items[0][file]",
        attachToBody: "url" as const,
      };
      mockReq.file = { path: "/uploads/file.jpg" };

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle missing config field in handlePostUpload", () => {
      const config = {
        type: "single" as const,
        field: undefined as any,
        attachToBody: "url" as const,
      };
      mockReq.file = { path: "/uploads/file.jpg" };

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle baseRoute as root in handlePostUpload", () => {
      const config = {
        type: "single" as const,
        field: "avatar",
        attachToBody: "url" as const,
      };
      mockReq.file = { path: "/uploads/file.jpg" };
      // mockExtractRequestInfo.mockReturnValue({
      //   baseURL: "http://localhost:3000",
      //   baseRoute: "/",
      // });

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.file.url).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle relative path without leading slash", () => {
      const config = {
        type: "single" as const,
        field: "avatar",
        attachToBody: "url" as const,
      };
      mockReq.file = { path: "/uploads/file.jpg" };
      // mockGenerateRelativePath.mockReturnValue("uploads/test.jpg");

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.file.url).toContain("/uploads/file.jpg");
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
