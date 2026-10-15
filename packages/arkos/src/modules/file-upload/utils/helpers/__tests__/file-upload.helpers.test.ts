import fs from "fs";
import path from "path";
import sharp from "sharp";
import { promisify } from "util";
import {
  extractRequestInfo,
  optimizeImage,
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
  let mockNext = jest.fn();

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
    let mockTransformer: any;

    beforeEach(() => {
      mockTransformer = {
        metadata: jest.fn().mockResolvedValue({ width: 1000, height: 800 }),
        rotate: jest.fn().mockReturnThis(),
        resize: jest.fn().mockReturnThis(),
        toFormat: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockResolvedValue(undefined),
      };
      (sharp as any as jest.Mock).mockReturnValue(mockTransformer);

      (fs.rename as any as jest.Mock) = jest
        .fn()
        .mockImplementation(() => true);
      (fs.stat as any as jest.Mock) = jest
        .fn()
        .mockReturnValue({ isFile: () => true, size: 123 });
      (fs.unlink as any as jest.Mock) = jest
        .fn()
        .mockImplementation((_path, callback) => {
          if (typeof callback === "function") callback(null);
        });
    });

    it("should process a non-image file without transformations", async () => {
      mockReq.params.fileType = "documents";

      const result = await processImage(
        mockReq,
        mockNext,
        "documents/test.pdf",
        {}
      );

      expect(sharp).not.toHaveBeenCalled();
      expect(result).toBe("https://example.com/api/uploads/documents/test.pdf");
    });

    it("should default to webp and auto-orient the image", async () => {
      mockReq.params.fileType = "images";

      const result = await processImage(mockReq, mockNext, "images/test.jpg", {});

      expect(sharp).toHaveBeenCalledWith("images/test.jpg");
      expect(mockTransformer.rotate).toHaveBeenCalled();
      expect(mockTransformer.toFormat).toHaveBeenCalledWith("webp", {});
      expect(fs.rename).toHaveBeenCalled();
      expect(result).toBe("https://example.com/api/uploads/images/test.webp");
    });

    it("should resize to fit within the target without enlarging", async () => {
      mockReq.params.fileType = "images";

      await processImage(mockReq, mockNext, "images/test.jpg", {
        resizeTo: 500,
      });

      expect(mockTransformer.resize).toHaveBeenCalledWith(500, 500, {
        fit: "inside",
        withoutEnlargement: true,
      });
    });

    it("should resize by width and height", async () => {
      mockReq.params.fileType = "images";

      await processImage(mockReq, mockNext, "images/test.png", {
        width: 300,
        height: 200,
      });

      expect(mockTransformer.resize).toHaveBeenCalledWith(300, 200, {
        fit: "inside",
      });
    });

    it("should apply quality to lossy formats", async () => {
      mockReq.params.fileType = "images";

      await processImage(mockReq, mockNext, "images/test.jpg", {
        format: "webp",
        quality: 70,
      });

      expect(mockTransformer.toFormat).toHaveBeenCalledWith("webp", {
        quality: 70,
      });
    });

    it("should use the requested format as the output extension", async () => {
      mockReq.params.fileType = "images";

      const result = await processImage(mockReq, mockNext, "images/test.png", {
        format: "jpeg",
      });

      expect(mockTransformer.toFormat).toHaveBeenCalledWith("jpeg", {});
      expect(result).toBe("https://example.com/api/uploads/images/test.jpeg");
    });

    it("should replace the original without deleting the output when the format is unchanged", async () => {
      const result = await optimizeImage("images/test.webp", {});

      expect(result).toBe("images/test.webp");
      expect(fs.unlink).toHaveBeenCalled();
      expect(fs.rename).toHaveBeenCalled();
    });

    it("should forward an error when processing fails", async () => {
      mockReq.params.fileType = "images";
      mockTransformer.toFile.mockRejectedValue(new Error("Image failed"));

      const result = await processImage(mockReq, mockNext, "images/test.jpg", {});

      expect(result).toBe(null);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Image failed" })
      );
    });

    it("should fall back to the original file on unsupported format", async () => {
      mockReq.params.fileType = "images";
      mockTransformer.toFile.mockRejectedValue(
        new Error("Input file contains unsupported image format")
      );

      const result = await processImage(mockReq, mockNext, "images/test.bmp", {});

      expect(result).toBe("https://example.com/api/uploads/images/test.bmp");
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
