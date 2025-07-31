import fs from "fs";
import path from "path";
import sharp from "sharp";
import { promisify } from "util";
import {
  extractRequestInfo,
  processFile,
  processImage,
  adjustRequestUrl,
} from "../file-upload.helpers";
import { getArkosConfig } from "../../../../../server";

// Mock dependencies
jest.mock("fs");
jest.mock("path");
jest.mock("sharp");
jest.mock("util");
jest.mock("../../../../../server");

describe("adjustRequestUrl middleware", () => {
  const next = jest.fn();

  beforeEach(() => {
    next.mockClear();
  });

  it('should replace the baseRoute in the request URL with "/"', () => {
    (getArkosConfig as jest.Mock).mockReturnValue({
      fileUpload: { baseRoute: "/custom/uploads" },
    });

    const req = { url: "/custom/uploads/image.png" };
    const res = {};

    adjustRequestUrl(req as any, res as any, next);

    expect(req.url).toBe("/image.png");
    expect(next).toHaveBeenCalled();
  });

  it('should default to replacing "/api/uploads" if no baseRoute is defined', () => {
    (getArkosConfig as jest.Mock).mockReturnValue({ fileUpload: {} });

    const req = { url: "/api/uploads/file.jpg" };
    const res = {};

    adjustRequestUrl(req as any, res as any, next);

    expect(req.url).toBe("/file.jpg");
    expect(next).toHaveBeenCalled();
  });

  it("should call next function after adjusting the URL", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({
      fileUpload: { baseRoute: "/anything" },
    });

    const req = { url: "/anything/file.doc" };
    const res = {};

    adjustRequestUrl(req as any, res as any, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("File Upload Helpers", () => {
  let mockReq = {
    params: {
      fileType: "images",
    },
    get: (() => "example.com") as any,
    headers: {
      "x-forwarded-proto": "https",
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock getArkosConfig
    (getArkosConfig as jest.Mock).mockReturnValue({
      fileUpload: {
        baseUploadDir: "/uploads",
      },
    });

    // Mock path functions
    (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));
    (path.basename as jest.Mock).mockImplementation((filePath, ext) => {
      const base = filePath.split("/").pop();
      return ext ? base.replace(ext, "") : base;
    });
    (path.dirname as jest.Mock).mockImplementation((filePath) => {
      return filePath.substring(0, filePath.lastIndexOf("/"));
    });
    (path.extname as jest.Mock).mockImplementation((filePath) => {
      const parts = filePath.split(".");
      return parts.length > 1 ? `.${parts.pop()}` : "";
    });

    // Mock process.cwd
    jest.spyOn(process, "cwd").mockReturnValue("/app");

    // Mock promisify
    (promisify as any as jest.Mock).mockImplementation((fn) => fn);
  });

  describe("extractRequestInfo", () => {
    it("Should extract the baseURL and baseRoute correctly", () => {
      const { baseURL, baseRoute } = extractRequestInfo(mockReq);

      expect(baseURL).toBe("https://example.com");
      expect(baseRoute).toBe("/api/uploads");
    });
  });

  describe("processFile", () => {
    it("should process a file with internal upload directory", async () => {
      const mockFilePath = "documents/test.pdf";
      // const mockFilePath = "/app/uploads/documents/test.pdf";
      mockReq.params.fileType = "documents";

      const result = await processFile(mockReq, mockFilePath);

      expect(result).toBe("https://example.com/api/uploads/documents/test.pdf");
    });

    it("should process a file with external upload directory", async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        fileUpload: {
          baseUploadDir: "../test/uploads",
          baseRoute: "/",
        },
      });

      const mockFilePath = "../uploads/documents/test.pdf";

      const result = await processFile(mockReq, mockFilePath);

      expect(path.basename).toHaveBeenCalledWith(mockFilePath);
      expect(path.join).toHaveBeenCalledWith(
        mockReq.params.fileType,
        "test.pdf"
      );
      expect(result).toBe("https://example.com/documents/test.pdf");
    });
  });

  describe("processImage", () => {
    beforeEach(() => {
      // Mock sharp
      const mockTransformer = {
        metadata: jest.fn().mockResolvedValue({ width: 1000, height: 800 }),
        resize: jest.fn().mockReturnThis(),
        toFormat: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockResolvedValue(undefined),
      };
      (sharp as any as jest.Mock).mockReturnValue(mockTransformer);

      // Mock fs functions
      (fs.rename as any as jest.Mock) = jest
        .fn()
        .mockImplementation((tempPath, origPath) => {
          return true;
        });
      (fs.stat as any as jest.Mock) = jest
        .fn()
        .mockReturnValue({ isFile: () => true });
      (fs.unlink as any as jest.Mock) = jest
        .fn()
        .mockImplementation((path, callback) => {
          callback(null);
        });
    });

    it("should process a non-image file without transformations", async () => {
      const mockFilePath = "documents/test.pdf";
      // const mockFilePath = "/app/uploads/documents/test.pdf";
      const options = {};

      mockReq.params.fileType = "documents";

      const result = await processImage(mockReq, mockFilePath, options);

      expect(sharp).not.toHaveBeenCalled();
      expect(result).toBe("https://example.com/api/uploads/documents/test.pdf");
    });

    it("should process an image file with resizeTo option", async () => {
      const mockFilePath = "images/test.jpg";
      // const mockFilePath = "/app/uploads/images/test.jpg";
      const options = { resizeTo: 500 };

      mockReq.params.fileType = "images";

      const result = await processImage(mockReq, mockFilePath, options);

      expect(sharp).toHaveBeenCalledWith(mockFilePath);
      expect(sharp().resize).toHaveBeenCalledWith(625, 500);
      expect(sharp().toFile).toHaveBeenCalled();
      expect(fs.rename).toHaveBeenCalled();
      expect(result).toBe("https://example.com/api/uploads/images/test.jpg");
    });

    it("should process an image file with width and height options", async () => {
      const mockFilePath = "images/test.png";
      const options = { width: 300, height: 200 };

      mockReq.params.fileType = "images";

      const result = await processImage(mockReq, mockFilePath, options);

      expect(sharp).toHaveBeenCalledWith(mockFilePath);
      expect(sharp().resize).toHaveBeenCalledWith(300, 200, { fit: "inside" });
      expect(result).toBe("https://example.com/api/uploads/images/test.png");
    });

    it("should convert image format to webp if requested", async () => {
      const mockFilePath = "images/test.jpg";
      const options = { format: "webp" };

      mockReq.params.fileType = "images";

      const result = await processImage(mockReq, mockFilePath, options);

      expect(sharp).toHaveBeenCalledWith(mockFilePath);
      expect(sharp().toFormat).toHaveBeenCalledWith("webp");
      expect(result).toBe("https://example.com/api/uploads/images/test.jpg");
    });

    it("should convert image format to jpeg if requested", async () => {
      const mockFilePath = "images/test.png";
      const options = { format: "jpeg" };

      mockReq.params.fileType = "images";

      const result = await processImage(mockReq, mockFilePath, options);

      expect(sharp).toHaveBeenCalledWith(mockFilePath);
      expect(sharp().toFormat).toHaveBeenCalledWith("jpeg");
      expect(result).toBe("https://example.com/api/uploads/images/test.png");
    });

    it("should handle errors and clean up temp files", async () => {
      const mockFilePath = "test.jpg";
      // const mockFilePath = "/app/uploads/images/test.jpg";
      const options = {};

      const error = new Error("Image processing failed");
      (sharp().toFile as jest.Mock).mockRejectedValue(error);

      await expect(
        processImage(mockReq, mockFilePath, options)
      ).rejects.toThrow(error);

      expect(fs.stat).toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalled();
    });

    it("should handle non-existent temp files gracefully", async () => {
      const mockFilePath = "/app/uploads/images/test.jpg";
      const options = {};

      const error = new Error("Image processing failed");
      (sharp().toFile as jest.Mock).mockRejectedValue(error);
      (fs.stat as any as jest.Mock).mockImplementation((path, callback) => {
        callback(new Error("File not found"), null);
      });

      await expect(
        processImage(mockReq, mockFilePath, options)
      ).rejects.toThrow(error);

      expect(fs.stat).toHaveBeenCalled();
      expect(fs.unlink).not.toHaveBeenCalled();
    });
  });
});
