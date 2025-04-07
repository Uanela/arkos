import AppError from "../error-handler/utils/app-error";
import {
  FileUploaderService,
  getFileUploaderServices,
} from "./file-upload.service";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { NextFunction, Request, Response } from "express";
import catchAsync from "../error-handler/utils/catch-async";
import { promisify } from "util";
import { getArkosConfig } from "../../server";

const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);
const mkdir = promisify(fs.mkdir);
/**
 * Handles file upload requests, processes images if needed, and returns URLs
 * Supports paths outside of the project directory with '../' prefix
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
export const uploadFile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { fileType } = req.params;
    const { format, width, height, resizeTo } = req.query;

    const {
      documentUploaderService,
      fileUploaderService,
      imageUploaderService,
      videoUploaderService,
    } = getFileUploaderServices();

    const { fileUpload } = getArkosConfig();
    const baseUploadDir = fileUpload?.baseUploadDir || "/uploads";

    // Ensure upload directory exists
    const uploadPath = path.resolve(process.cwd(), baseUploadDir, fileType);
    try {
      await access(uploadPath);
    } catch (error) {
      // Create directory if it doesn't exist
      await mkdir(uploadPath, { recursive: true });
    }

    // Select the appropriate uploader service based on file type
    let uploader: FileUploaderService;
    switch (fileType) {
      case "images":
        uploader = imageUploaderService;
        break;
      case "videos":
        uploader = videoUploaderService;
        break;
      case "documents":
        uploader = documentUploaderService;
        break;
      case "files":
        uploader = fileUploaderService;
        break;
      default:
        return next(new AppError("Invalid file type", 400));
    }

    // Handle the file upload
    uploader.handleMultipleUpload()(req, res, async (err) => {
      if (err) return next(err);

      // Determine the base URL for file access
      const protocol = req.get("host")?.includes("localhost")
        ? "http"
        : "https";
      const baseURL = `${protocol}://${req.get("host")}`;
      const baseRoute = fileUpload?.baseRoute || "/api/uploads";

      /**
       * Generates the correct relative path regardless of upload directory location
       * @param {string} filePath - Full path to the uploaded file
       * @returns {string} Relative path for URL generation
       */
      const generateRelativePath = (filePath: string) => {
        if (baseUploadDir.startsWith("..")) {
          // For paths outside project directory
          return path.join(fileType, path.basename(filePath));
        } else {
          // Original approach for paths within project
          return filePath.replace(`${process.cwd()}${baseUploadDir}/`, "");
        }
      };

      /**
       * Processes image files using Sharp for resizing and format conversion
       * @param {string} filePath - Path to the uploaded image file
       * @returns {Promise<string|null>} Public URL for the processed file or null if processing failed
       */
      const processImage = async (filePath: string): Promise<string | null> => {
        const ext = path.extname(filePath).toLowerCase();
        const originalFormat = ext.replace(".", "");
        const outputFormat = format
          ? format.toString().toLowerCase()
          : originalFormat;

        // Skip processing for non-image files
        if (!/jpeg|jpg|png|gif|webp|svg|bmp|tiff|heif/i.test(originalFormat)) {
          const relativePath = generateRelativePath(filePath);
          return `${baseURL}${baseRoute}/${relativePath}`;
        }

        // Create a temp filename with original name + random string
        const tempName = `${path.basename(filePath, ext)}_${Date.now()}${ext}`;
        const tempPath = path.join(path.dirname(filePath), tempName);

        try {
          let transformer = sharp(filePath);
          const metadata = await transformer.metadata();

          // Apply resize transformations if requested
          if (resizeTo && metadata.width && metadata.height) {
            const targetSize = parseInt(resizeTo.toString());
            const scaleFactor =
              targetSize / Math.min(metadata.width, metadata.height);
            const newWidth = Math.round(metadata.width * scaleFactor);
            const newHeight = Math.round(metadata.height * scaleFactor);
            transformer = transformer.resize(newWidth, newHeight);
          } else if (width || height) {
            transformer = transformer.resize(
              width ? parseInt(width as string) : null,
              height ? parseInt(height as string) : null,
              { fit: "inside" }
            );
          }

          // Apply format transformations if requested
          if (outputFormat === "webp") {
            transformer = transformer.toFormat("webp");
          } else if (outputFormat === "jpeg" || outputFormat === "jpg") {
            transformer = transformer.toFormat("jpeg");
          }

          // Save to temp file first
          await transformer.toFile(tempPath);

          // Rename temp file to original filename
          await fs.promises.rename(tempPath, filePath);

          // Return the public URL for the file
          const relativePath = generateRelativePath(filePath);
          return `${baseURL}${baseRoute}/${relativePath}`;
        } catch (error) {
          // Clean up temp file if it exists
          try {
            await fs.promises.stat(tempPath);
            await fs.promises.unlink(tempPath);
          } catch {
            // If temp file doesn't exist, no need to clean up
          }
          next(error);
          return null;
        }
      };

      /**
       * Handles basic file processing for non-image files
       * @param {string} filePath - Path to the uploaded file
       * @returns {Promise<string>} Public URL for the file
       */
      const processFile = async (filePath: string) => {
        const relativePath = generateRelativePath(filePath);
        return `${baseURL}${baseRoute}/${relativePath}`;
      };

      // Process all uploaded files
      let data;
      if (req.files && Array.isArray(req.files)) {
        if (fileType === "images") {
          // Process multiple image files with image transformations
          data = await Promise.all(
            req.files.map((file) => processImage(file.path))
          );
        } else {
          // Just store other file types without processing
          data = await Promise.all(
            req.files.map((file) => processFile(file.path))
          );
        }
        // Filter out any null values from failed processing
        data = data.filter((url) => url !== null);
      } else if (req.file) {
        // Process a single file
        if (fileType === "images") {
          data = await processImage(req.file.path);
        } else {
          data = await processFile(req.file.path);
        }
      } else {
        return next(new AppError("No file uploaded", 400));
      }

      res.status(200).json({
        success: true,
        data,
        message: Array.isArray(data)
          ? `${data.length} files uploaded successfully`
          : "File uploaded successfully",
      });
    });
  }
);

/**
 * Handles file deletion requests
 * Supports paths outside of the project directory with '../' prefix
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
export const deleteFile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { fileType, fileName } = req.params;

    // if (!fileName) {
    //   return next(new AppError("File name is required", 400));
    // }

    // if (!fileType) {
    //   return next(new AppError("File type is required", 400));
    // }

    // // Get the base upload directory from config
    // const { fileUpload } = getArkosConfig();
    // const baseUploadDir = fileUpload?.baseUploadDir || "/uploads";

    // // Construct the actual file path using path.resolve to handle '../' paths
    // const actualFilePath = path.resolve(
    //   process.cwd(),
    //   baseUploadDir,
    //   fileType,
    //   fileName
    // );

    const {
      documentUploaderService,
      fileUploaderService,
      imageUploaderService,
      videoUploaderService,
    } = getFileUploaderServices();

    let uploader: FileUploaderService;
    switch (fileType) {
      case "images":
        uploader = imageUploaderService;
        break;
      case "videos":
        uploader = videoUploaderService;
        break;
      case "documents":
        uploader = documentUploaderService;
        break;
      case "files":
        uploader = fileUploaderService;
        break;
      default:
        return next(new AppError("Invalid file type", 400));
    }

    try {
      // // Check if file exists
      // await access(actualFilePath, fs.constants.F_OK);

      // // Delete the file
      // await unlink(actualFilePath);

      const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
      await uploader.deleteFileByUrl(fullUrl);

      res.status(200).json({
        success: true,
        message: "File deleted successfully",
      });
    } catch (error) {
      // File doesn't exist
      return next(new AppError("File not found", 404));
    }
  }
);

export const streamFile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { fileName, fileType } = req.params;

    const filePath = path.join(".", "uploads", fileType, fileName);
    try {
      await access(filePath);
    } catch {
      return next(new AppError("File not found", 404));
    }

    const fileStat = await stat(filePath);
    const fileSize = fileStat.size;
    const range = req.headers.range;

    if (range) {
      const [partialStart, partialEnd] = range.replace(/bytes=/, "").split("-");
      const start = parseInt(partialStart, 10) || 0;
      const end = partialEnd ? parseInt(partialEnd, 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).json({ error: "Range Not Satisfiable" });
        return;
      }

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `inline; filename="${fileName}"`,
      });

      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `inline; filename="${fileName}"`,
      });
      fs.createReadStream(filePath).pipe(res);
    }
  }
);
