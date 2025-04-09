import fs from "fs";
import path from "path";
import sharp from "sharp";
import { promisify } from "util";
import { processFile, processImage } from "../file-uploader.helpers";
import { getArkosConfig } from "../../../../../server";

// Mock dependencies
jest.mock("fs");
jest.mock("path");
jest.mock("sharp");
jest.mock("util");
jest.mock("../../../../../server");

describe("File Uploader Helpers", () => {
  let mockBaseURL = "https://example.com";
  let mockBaseRoute = "/files";
  let mockFileType = "images";

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

  describe("processFile", () => {
    it("should process a file with internal upload directory", async () => {
      const mockFilePath = "test.pdf";
      // const mockFilePath = "/app/uploads/documents/test.pdf";
      mockFileType = "documents";

      const result = await processFile(
        mockFilePath,
        mockBaseURL,
        mockBaseRoute,
        mockFileType
      );

      expect(result).toBe("https://example.com/files/documents/test.pdf");
    });

    it("should process a file with external upload directory", async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        fileUpload: {
          baseUploadDir: "../uploads",
        },
      });

      const mockFilePath = "../uploads/documents/test.pdf";

      const result = await processFile(
        mockFilePath,
        mockBaseURL,
        mockBaseRoute,
        mockFileType
      );

      expect(path.basename).toHaveBeenCalledWith(mockFilePath);
      expect(path.join).toHaveBeenCalledWith(mockFileType, "test.pdf");
      expect(result).toBe("https://example.com/files/documents/test.pdf");
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
      const mockFilePath = "test.pdf";
      // const mockFilePath = "/app/uploads/documents/test.pdf";
      const options = {};

      mockFileType = "documents";

      const result = await processImage(
        mockFilePath,
        mockBaseURL,
        mockBaseRoute,
        options,
        mockFileType
      );

      expect(sharp).not.toHaveBeenCalled();
      expect(result).toBe("https://example.com/files/documents/test.pdf");
    });

    it("should process an image file with resizeTo option", async () => {
      const mockFilePath = "test.jpg";
      // const mockFilePath = "/app/uploads/images/test.jpg";
      const options = { resizeTo: 500 };

      mockFileType = "images";

      const result = await processImage(
        mockFilePath,
        mockBaseURL,
        mockBaseRoute,
        options,
        mockFileType
      );

      expect(sharp).toHaveBeenCalledWith(mockFilePath);
      expect(sharp().resize).toHaveBeenCalledWith(625, 500);
      expect(sharp().toFile).toHaveBeenCalled();
      expect(fs.rename).toHaveBeenCalled();
      expect(result).toBe("https://example.com/files/images/test.jpg");
    });

    it("should process an image file with width and height options", async () => {
      // const mockFilePath = "/app/uploads/images/test.png";
      const mockFilePath = "test.png";
      const options = { width: 300, height: 200 };

      mockFileType = "images";

      const result = await processImage(
        mockFilePath,
        mockBaseURL,
        mockBaseRoute,
        options,
        mockFileType
      );

      expect(sharp).toHaveBeenCalledWith(mockFilePath);
      expect(sharp().resize).toHaveBeenCalledWith(300, 200, { fit: "inside" });
      expect(result).toBe("https://example.com/files/images/test.png");
    });

    it("should convert image format to webp if requested", async () => {
      const mockFilePath = "test.jpg";
      const options = { format: "webp" };

      mockFileType = "images";

      const result = await processImage(
        mockFilePath,
        mockBaseURL,
        mockBaseRoute,
        options,
        mockFileType
      );

      expect(sharp).toHaveBeenCalledWith(mockFilePath);
      expect(sharp().toFormat).toHaveBeenCalledWith("webp");
      expect(result).toBe("https://example.com/files/images/test.jpg");
    });

    it("should convert image format to jpeg if requested", async () => {
      // const mockFilePath = "/app/uploads/images/test.png";
      const mockFilePath = "test.png";
      const options = { format: "jpeg" };

      mockFileType = "images";

      const result = await processImage(
        mockFilePath,
        mockBaseURL,
        mockBaseRoute,
        options,
        mockFileType
      );

      expect(sharp).toHaveBeenCalledWith(mockFilePath);
      expect(sharp().toFormat).toHaveBeenCalledWith("jpeg");
      expect(result).toBe("https://example.com/files/images/test.png");
    });

    it("should handle errors and clean up temp files", async () => {
      const mockFilePath = "test.jpg";
      // const mockFilePath = "/app/uploads/images/test.jpg";
      const options = {};

      const error = new Error("Image processing failed");
      (sharp().toFile as jest.Mock).mockRejectedValue(error);

      await expect(
        processImage(
          mockFilePath,
          mockBaseURL,
          mockBaseRoute,
          options,
          mockFileType
        )
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
        processImage(
          mockFilePath,
          mockBaseURL,
          mockBaseRoute,
          options,
          mockFileType
        )
      ).rejects.toThrow(error);

      expect(fs.stat).toHaveBeenCalled();
      expect(fs.unlink).not.toHaveBeenCalled();
    });
  });
});
