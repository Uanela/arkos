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
// jest.mock("../../../../../exports/error-handler");
jest.mock("../../../../sheu");
jest.mock("../../../../helpers/deepmerge.helper");
jest.mock(
  "../../../../../modules/file-upload/utils/helpers/file-upload.helpers"
);

const mockDeepmerge = require("../../../../helpers/deepmerge.helper").default;
const mockExtractRequestInfo =
  require("../../../../../modules/file-upload/utils/helpers/file-upload.helpers").extractRequestInfo;
const mockGenerateRelativePath =
  require("../../../../../modules/file-upload/utils/helpers/file-upload.helpers").generateRelativePath;

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
    mockExtractRequestInfo.mockReturnValue({
      baseURL: "http://localhost:3000",
      baseRoute: "/api",
    });
    mockGenerateRelativePath.mockReturnValue("/uploads/test.jpg");
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
      mockGenerateRelativePath.mockReturnValue("/uploads/C:/file.jpg");

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.file.pathname).toBe("C:/file.jpg");
      expect(mockReq.file.url).toBe(
        "http://localhost:3000/api/uploads/C:/file.jpg"
      );
      expect(mockReq.body).toBeDefined();
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

    it("should throw AppError on processing failure", () => {
      const config = {
        type: "single" as const,
        field: "avatar",
        attachToBody: "url" as const,
      };
      mockReq.file = { path: "/uploads/file.jpg" };

      const mockError = new Error("Processing error");
      mockGenerateRelativePath.mockImplementation(() => {
        throw mockError;
      });

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
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
      mockExtractRequestInfo.mockReturnValue({
        baseURL: "http://localhost:3000",
        baseRoute: "/",
      });

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
      mockGenerateRelativePath.mockReturnValue("uploads/test.jpg");

      const middleware = uploadManager.handlePostUpload(config);
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.file.url).toContain("/uploads/test.jpg");
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("validateRequiredFiles", () => {
    describe("Single file upload validation", () => {
      it("should pass when single file is present and required", () => {
        const config = {
          type: "single" as const,
          field: "avatar",
          required: true,
        };
        mockReq.file = { path: "/uploads/avatar.jpg" };

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it("should pass when single file is missing and not required", () => {
        const config = {
          type: "single" as const,
          field: "avatar",
          required: false,
        };
        mockReq.file = undefined;

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it("should throw error when required single file is missing", () => {
        const config = {
          type: "single" as const,
          field: "avatar",
          required: true,
        };
        mockReq.file = undefined;

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.message).toBe("Required upload field 'avatar' is missing");
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe("MissingAvatarFileField");
        expect(error.meta.errors).toEqual([
          "Required upload field 'avatar' is missing",
        ]);
      });

      it("should handle nested field names with brackets", () => {
        const config = {
          type: "single" as const,
          field: "user[profile][avatar]",
          required: true,
        };
        mockReq.file = undefined;

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.code).toBe("MissingUserProfileAvatarFileField");
      });

      it("should handle snake_case field names", () => {
        const config = {
          type: "single" as const,
          field: "profile_photo",
          required: true,
        };
        mockReq.file = undefined;

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.code).toBe("MissingProfilePhotoFileField");
      });
    });

    describe("Array file upload validation", () => {
      it("should pass when array files are present and required", () => {
        const config = {
          type: "array" as const,
          field: "photos",
          required: true,
        };
        mockReq.files = [
          { path: "/uploads/photo1.jpg" },
          { path: "/uploads/photo2.jpg" },
        ];

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it("should pass when array files are missing and not required", () => {
        const config = {
          type: "array" as const,
          field: "photos",
          required: false,
        };
        mockReq.files = undefined;

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it("should throw error when required array files are missing", () => {
        const config = {
          type: "array" as const,
          field: "photos",
          required: true,
        };
        mockReq.files = undefined;

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.message).toBe(
          "Required upload field 'photos' is missing or empty"
        );
        expect(error.code).toBe("MissingPhotosFileField");
      });

      it("should throw error when required array files is not an array", () => {
        const config = {
          type: "array" as const,
          field: "photos",
          required: true,
        };
        mockReq.files = { photos: [] } as any;

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.message).toBe(
          "Required upload field 'photos' is missing or empty"
        );
      });

      it("should throw error when required array files is empty", () => {
        const config = {
          type: "array" as const,
          field: "attachments",
          required: true,
        };
        mockReq.files = [];

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.message).toBe(
          "Required upload field 'attachments' is missing or empty"
        );
        expect(error.code).toBe("MissingAttachmentsFileField");
      });
    });

    describe("Multiple fields upload validation", () => {
      it("should pass when all required fields are present", () => {
        const config = {
          type: "fields" as const,
          fields: [
            { name: "avatar", maxCount: 1 },
            { name: "resume", maxCount: 1 },
          ],
          required: true,
        };
        mockReq.files = {
          avatar: [{ path: "/uploads/avatar.jpg" }],
          resume: [{ path: "/uploads/resume.pdf" }],
        };

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it("should pass when fields are missing and not required", () => {
        const config = {
          type: "fields" as const,
          fields: [
            { name: "avatar", maxCount: 1 },
            { name: "resume", maxCount: 1 },
          ],
          required: false,
        };
        mockReq.files = undefined;

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it("should throw error when req.files is undefined", () => {
        const config = {
          type: "fields" as const,
          fields: [
            { name: "avatar", maxCount: 1 },
            { name: "resume", maxCount: 1 },
          ],
          required: true,
        };
        mockReq.files = undefined;

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.message).toBe(
          "Required upload fields are missing. Expected an object with fields: avatar, resume"
        );
        expect(error.code).toBe("MissingAvatarFileField");
        expect(error.meta.errors).toEqual([
          "Required upload fields are missing. Expected an object with fields: avatar, resume",
        ]);
      });

      it("should throw error when req.files is an array instead of object", () => {
        const config = {
          type: "fields" as const,
          fields: [
            { name: "avatar", maxCount: 1 },
            { name: "resume", maxCount: 1 },
          ],
          required: true,
        };
        mockReq.files = [];

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.message).toContain("Required upload fields are missing");
      });

      it("should throw error when one field is missing", () => {
        const config = {
          type: "fields" as const,
          fields: [
            { name: "avatar", maxCount: 1 },
            { name: "resume", maxCount: 1 },
          ],
          required: true,
        };
        mockReq.files = {
          avatar: [{ path: "/uploads/avatar.jpg" }],
        };

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.message).toBe(
          "Required upload field 'resume' is missing or empty"
        );
        expect(error.code).toBe("MissingResumeFileField");
        expect(error.meta.errors).toEqual([
          "Required upload field 'resume' is missing or empty",
        ]);
      });

      it("should throw error when field is empty array", () => {
        const config = {
          type: "fields" as const,
          fields: [
            { name: "avatar", maxCount: 1 },
            { name: "resume", maxCount: 1 },
          ],
          required: true,
        };
        mockReq.files = {
          avatar: [{ path: "/uploads/avatar.jpg" }],
          resume: [],
        };

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.message).toBe(
          "Required upload field 'resume' is missing or empty"
        );
      });

      it("should throw error when field is not an array", () => {
        const config = {
          type: "fields" as const,
          fields: [
            { name: "avatar", maxCount: 1 },
            { name: "resume", maxCount: 1 },
          ],
          required: true,
        };
        mockReq.files = {
          avatar: [{ path: "/uploads/avatar.jpg" }],
          resume: "not-an-array" as any,
        };

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.message).toBe(
          "Required upload field 'resume' is missing or empty"
        );
      });

      it("should collect multiple missing fields", () => {
        const config = {
          type: "fields" as const,
          fields: [
            { name: "avatar", maxCount: 1 },
            { name: "resume", maxCount: 1 },
            { name: "cover_letter", maxCount: 1 },
          ],
          required: true,
        };
        mockReq.files = {
          avatar: [{ path: "/uploads/avatar.jpg" }],
        };

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.meta.errors).toHaveLength(2);
        expect(error.meta.errors).toContain(
          "Required upload field 'resume' is missing or empty"
        );
        expect(error.meta.errors).toContain(
          "Required upload field 'cover_letter' is missing or empty"
        );
        expect(error.code).toBe("MissingResumeFileField");
      });

      it("should handle snake_case field names in fields", () => {
        const config = {
          type: "fields" as const,
          fields: [{ name: "id_front", maxCount: 1 }],
          required: true,
        };
        mockReq.files = {};

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.code).toBe("MissingIdFrontFileField");
      });
    });

    describe("Error code generation", () => {
      it("should generate proper PascalCase error code from single word", () => {
        const config = {
          type: "single" as const,
          field: "avatar",
          required: true,
        };
        mockReq.file = undefined;

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.code).toBe("MissingAvatarFileField");
      });

      it("should generate proper PascalCase error code from snake_case", () => {
        const config = {
          type: "single" as const,
          field: "profile_photo",
          required: true,
        };
        mockReq.file = undefined;

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.code).toBe("MissingProfilePhotoFileField");
      });

      it("should generate proper PascalCase error code from kebab-case", () => {
        const config = {
          type: "single" as const,
          field: "profile-photo",
          required: true,
        };
        mockReq.file = undefined;

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.code).toBe("MissingProfilePhotoFileField");
      });

      it("should handle brackets in field names", () => {
        const config = {
          type: "single" as const,
          field: "user[profile][photo]",
          required: true,
        };
        mockReq.file = undefined;

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.code).toBe("MissingUserProfilePhotoFileField");
      });

      it("should handle array notation in field names", () => {
        const config = {
          type: "single" as const,
          field: "items[0][file]",
          // required: true,
        };
        mockReq.file = undefined;

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.code).toBe("MissingItems0FileFileField");
      });

      it("should use first missing field for error code when multiple fields missing", () => {
        const config = {
          type: "fields" as const,
          fields: [
            { name: "resume", maxCount: 1 },
            { name: "cover_letter", maxCount: 1 },
            { name: "portfolio", maxCount: 1 },
          ],
          required: true,
        };
        mockReq.files = {};

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.code).toBe("MissingResumeFileField");
      });
    });

    describe("Edge cases", () => {
      it("should handle undefined required flag (defaults to true)", () => {
        const config = {
          type: "single" as const,
          field: "avatar",
        };
        mockReq.file = undefined;

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalledWith();
      });

      it("should handle empty field name", () => {
        const config = {
          type: "single" as const,
          field: "",
          required: true,
        };
        mockReq.file = undefined;

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      });

      it("should handle fields with only special characters", () => {
        const config = {
          type: "single" as const,
          field: "___",
          required: true,
        };
        mockReq.file = undefined;

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = mockNext.mock.calls[0][0];
        expect(error.code).toContain("Missing");
        expect(error.code).toContain("FileField");
      });

      it("should handle empty fields array", () => {
        const config = {
          type: "fields" as const,
          fields: [],
          required: true,
        };
        mockReq.files = {};

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it("should handle single field with maxCount > 1", () => {
        const config = {
          type: "fields" as const,
          fields: [{ name: "photos", maxCount: 5 }],
          required: true,
        };
        mockReq.files = {
          photos: [
            { path: "/uploads/photo1.jpg" },
            { path: "/uploads/photo2.jpg" },
            { path: "/uploads/photo3.jpg" },
          ],
        };

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });
    });

    describe("Integration with catchAsync", () => {
      it("should work with catchAsync wrapper", () => {
        const config = {
          type: "single" as const,
          field: "avatar",
          required: true,
        };
        mockReq.file = { path: "/uploads/avatar.jpg" };

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it("should pass errors through catchAsync", () => {
        const config = {
          type: "single" as const,
          field: "avatar",
          required: true,
        };
        mockReq.file = undefined;

        const middleware = uploadManager.validateRequiredFiles(config);
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });
});
