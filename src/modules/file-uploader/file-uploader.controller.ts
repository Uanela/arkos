import AppError from "../error-handler/utils/app-error";
import {
  FileUploaderService,
  getFileUploaderServices,
} from "./file-uploader.service";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { NextFunction, Request, Response } from "express";
import catchAsync from "../error-handler/utils/catch-async";
import { promisify } from "util";
import { getArkosConfig } from "../../server";
import {
  processFile,
  processImage,
} from "./utils/helpers/file-uploader.helpers";

const stat = promisify(fs.stat);
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
    const options = { format, width, height, resizeTo };

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

      // Process all uploaded files
      let data;
      if (req.files && Array.isArray(req.files)) {
        if (fileType === "images") {
          // Process multiple image files with image transformations
          data = await Promise.all(
            req.files.map((file) => processImage(req, file.path, options))
          );
        } else {
          // Just store other file types without processing
          data = await Promise.all(
            req.files.map((file) => processFile(req, file.path))
          );
        }
        // Filter out any null values from failed processing
        data = data.filter((url) => url !== null);
      } else if (req.file) {
        // Process a single file
        if (fileType === "images") {
          data = await processImage(req, req.file.path, options);
        } else {
          data = await processFile(req, req.file.path);
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
