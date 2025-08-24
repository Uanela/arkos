import AppError from "../error-handler/utils/app-error";
import {
  FileUploadService,
  getFileUploadServices,
} from "./file-upload.service";
import path from "path";
import fs from "fs";
import catchAsync from "../error-handler/utils/catch-async";
import { getArkosConfig } from "../../server";
import { processFile, processImage } from "./utils/helpers/file-upload.helpers";
import { ArkosNextFunction, ArkosRequest, ArkosResponse } from "../../types";
import { getModuleComponents } from "../../utils/dynamic-loader";

/**
 * Handles files uploads and allow to be extended
 */
class FileUploadController {
  /**
   * Model-specific interceptors loaded from model modules
   * @private
   */
  private interceptors: any;

  /**
   * Handles file upload requests, processes images if needed, and returns URLs
   *
   * Supports paths outside of the project directory with '../' prefix
   * @param {ArkosRequest} req - Arkos request object
   * @param {ArkosResponse} res - Arkos response object
   * @param {ArkosNextFunction} next - Arkos next middleware function
   */
  uploadFile = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
      this.interceptors =
        getModuleComponents("file-upload")?.interceptors || {};

      const { fileType } = req.params;
      const { format, width, height, resizeTo } = req.query;
      const options = { format, width, height, resizeTo };

      const {
        documentUploadService,
        fileUploadService,
        imageUploadService,
        videoUploadService,
      } = getFileUploadServices();

      const { fileUpload } = getArkosConfig();
      const baseUploadDir = fileUpload?.baseUploadDir || "/uploads";

      // Ensure upload directory exists
      const uploadPath = path.resolve(process.cwd(), baseUploadDir, fileType);
      try {
        await fs.promises.access(uploadPath);
      } catch (err) {
        // Create directory if it doesn't exist
        await fs.promises.mkdir(uploadPath, { recursive: true });
      }

      // Select the appropriate uploader service based on file type
      let uploader: FileUploadService;
      switch (fileType) {
        case "images":
          uploader = imageUploadService;
          break;
        case "videos":
          uploader = videoUploadService;
          break;
        case "documents":
          uploader = documentUploadService;
          break;
        case "files":
          uploader = fileUploadService;
          break;
        default:
          return next(new AppError("Invalid file type", 400));
      }

      // Handle the file upload
      uploader.handleMultipleUpload()(req, res, async (err) => {
        if (err) return next(err);

        // Process all uploaded files
        let data;
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
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

        const jsonContent = {
          success: true,
          data,
          message: Array.isArray(data)
            ? `${data.length} files uploaded successfully`
            : "File uploaded successfully",
        };

        if (this.interceptors?.afterUploadFile) {
          req.responseData = jsonContent;
          req.responseStatus = 200;
          return next();
        }

        res.status(200).json(jsonContent);
      });
    }
  );

  /**
   * Handles file deletion requests
   *
   * Supports paths outside of the project directory with '../' prefix
   * @param {ArkosRequest} req - Arkos request object
   * @param {ArkosResponse} res - Arkos response object
   * @param {ArkosNextFunction} next - Arkos next middleware function
   */
  deleteFile = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
      this.interceptors =
        getModuleComponents("file-upload")?.interceptors || {};

      const { fileType, fileName } = req.params;

      const {
        documentUploadService,
        fileUploadService,
        imageUploadService,
        videoUploadService,
      } = getFileUploadServices();

      let uploader: FileUploadService;
      switch (fileType) {
        case "images":
          uploader = imageUploadService;
          break;
        case "videos":
          uploader = videoUploadService;
          break;
        case "documents":
          uploader = documentUploadService;
          break;
        case "files":
          uploader = fileUploadService;
          break;
        default:
          return next(new AppError("Invalid file type", 400));
      }

      try {
        const { fileUpload } = getArkosConfig();
        const baseUploadRoute = fileUpload?.baseRoute || "/api/uploads";

        // This checks if the URL follows the expected format: /api/files/{fileType}/{fileName}
        const urlPattern = new RegExp(
          `${baseUploadRoute}/${fileType}/${fileName}`
        );

        const isExpectedUrlPattern = urlPattern.test(req.originalUrl);

        if (isExpectedUrlPattern) {
          // Build the expected URL for this request
          const fullUrl = `${req.protocol}://${req.get("host")}${
            req.originalUrl
          }`;

          // URL matches expected pattern, use deleteFileByUrl
          await uploader.deleteFileByUrl(fullUrl);
        } else {
          // URL doesn't match expected pattern, use deleteFileByName
          await uploader.deleteFileByName(fileName, fileType);
        }

        if (this.interceptors.afterDeleteFile) {
          req.responseStatus = 204;
          return next();
        }

        res.status(204).json();
      } catch (error) {
        // Handle different types of errors
        if (error instanceof AppError) {
          return next(error);
        }
        // File doesn't exist or other error
        return next(new AppError("File not found", 404));
      }
    }
  );

  /**
   * Handles file update requests by deleting the old file and uploading a new one
   * @param {ArkosRequest} req - Arkos request object
   * @param {ArkosResponse} res - Arkos response object
   * @param {ArkosNextFunction} next - Arkos next middleware function
   */
  updateFile = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
      this.interceptors =
        getModuleComponents("file-upload")?.interceptors || {};

      const { fileType, fileName } = req.params;
      const { format, width, height, resizeTo } = req.query;
      const options = { format, width, height, resizeTo };

      const {
        documentUploadService,
        fileUploadService,
        imageUploadService,
        videoUploadService,
      } = getFileUploadServices();

      const { fileUpload } = getArkosConfig();
      const baseUploadDir = fileUpload?.baseUploadDir || "/uploads";

      // Ensure upload directory exists
      const uploadPath = path.resolve(process.cwd(), baseUploadDir, fileType);
      try {
        await fs.promises.access(uploadPath);
      } catch (err) {
        // Create directory if it doesn't exist
        await fs.promises.mkdir(uploadPath, { recursive: true });
      }

      // Select the appropriate uploader service based on file type
      let uploader: FileUploadService;
      switch (fileType) {
        case "images":
          uploader = imageUploadService;
          break;
        case "videos":
          uploader = videoUploadService;
          break;
        case "documents":
          uploader = documentUploadService;
          break;
        case "files":
          uploader = fileUploadService;
          break;
        default:
          return next(new AppError("Invalid file type", 400));
      }

      // Handle the file upload
      uploader.handleMultipleUpload()(req, res, async (err) => {
        if (err) return next(err);

        // Check if new file was uploaded
        if (
          !req.file &&
          (!req.files || !Array.isArray(req.files) || req.files.length === 0)
        ) {
          return next(new AppError("No new file uploaded", 400));
        }

        // Only attempt to delete old file if fileName is specified
        if (fileName && fileName.trim() !== "") {
          try {
            const baseUploadRoute = fileUpload?.baseRoute || "/api/uploads";

            // Check if the URL follows the expected format
            const urlPattern = new RegExp(
              `${baseUploadRoute}/${fileType}/${fileName}`
            );

            const isExpectedUrlPattern = urlPattern.test(req.originalUrl);

            if (isExpectedUrlPattern) {
              // URL matches expected pattern, use deleteFileByUrl
              const oldFileUrl = `${req.protocol}://${req.get("host")}${
                req.originalUrl
              }`;
              await uploader.deleteFileByUrl(oldFileUrl);
            } else {
              // URL doesn't match expected pattern, use deleteFileByName
              await uploader.deleteFileByName(fileName, fileType);
            }
          } catch (error) {
            // Log the error but continue with upload - old file might not exist
            console.warn(`Could not delete old file: ${fileName}`, error);
          }
        }

        // Process the new uploaded file(s)
        let data;
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
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
        }

        const jsonContent = {
          success: true,
          data,
          message: Array.isArray(data)
            ? fileName && fileName.trim() !== ""
              ? `File updated successfully. ${data.length} new files uploaded`
              : `${data.length} files uploaded successfully`
            : fileName && fileName.trim() !== ""
              ? "File updated successfully"
              : "File uploaded successfully",
        };

        if (this.interceptors.afterUpdateFile) {
          req.responseData = jsonContent;
          req.responseStatus = 200;
          return next();
        }

        res.status(200).json(jsonContent);
      });
    }
  );

  /**
   * Not implemented yet
   *
   * @deprecated
   */
  streamFile = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, _: ArkosNextFunction) => {
      const { fileName, fileType } = req.params;

      const filePath = path.join(".", "uploads", fileType, fileName);
      try {
        await fs.promises.access(filePath);
      } catch (err) {
        throw new AppError("File not found", 404);
      }

      const fileStat = await fs.promises.stat(filePath);
      const fileSize = fileStat.size;
      const range = req.headers.range;

      if (range) {
        const [partialStart, partialEnd] = range
          .replace(/bytes=/, "")
          .split("-");
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
}

/**
 * Controller instance responsible for handling file upload operations.
 * Manages the processing and routing of file upload requests.
 *
 * @remarks
 * This controller handles various file upload operations including validation,
 * storage, and response management.
 *
 * @instance
 * @constant
 * @see {@link https://www.arkosjs.com/docs/api-reference/file-upload-controller-object}
 */
const fileUploadController = new FileUploadController();

export default fileUploadController;
