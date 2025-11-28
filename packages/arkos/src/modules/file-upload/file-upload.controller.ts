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
export class FileUploadController {
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

      const uploadPath = path.resolve(process.cwd(), baseUploadDir, fileType);
      try {
        await fs.promises.access(uploadPath);
      } catch (err) {
        await fs.promises.mkdir(uploadPath, { recursive: true });
      }

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

      uploader.handleMultipleUpload()(req, res, async (err) => {
        if (err) return next(err);

        let data;
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
          if (fileType === "images") {
            data = await Promise.all(
              req.files.map((file) =>
                processImage(req, next, file.path, options)
              )
            );
          } else {
            data = await Promise.all(
              req.files.map((file) => processFile(req, file.path))
            );
          }
          data = data.filter((url) => url !== null);
        } else if (req.file) {
          if (fileType === "images") {
            data = await processImage(req, next, req.file.path, options);
          } else {
            data = await processFile(req, req.file.path);
          }
        } else {
          return next(
            new AppError(
              `No file or files were attached on field ${fileType} on the request body as form data.`,
              400,
              {},
              "NoFileOrFilesAttached"
            )
          );
        }

        const jsonContent = {
          success: true,
          data,
          message: Array.isArray(data)
            ? `${data.length} files uploaded successfully`
            : "File uploaded successfully",
        };

        if (this.interceptors?.afterUploadFile) {
          (res as any).originalData = jsonContent;
          req.responseData = jsonContent;
          res.locals.data = jsonContent;
          (res as any).originalStatus = 200;
          req.responseStatus = 200;
          res.locals.status = 200;
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

        const urlPattern = new RegExp(
          `${baseUploadRoute}/${fileType}/${fileName}`
        );

        const isExpectedUrlPattern = urlPattern.test(req.originalUrl);

        if (isExpectedUrlPattern) {
          // Build the expected URL for this request
          const fullUrl = `${req.protocol}://${req.get("host")}${
            req.originalUrl
          }`;

          await uploader.deleteFileByUrl(fullUrl);
        } else {
          await uploader.deleteFileByName(fileName, fileType);
        }

        if (this.interceptors.afterDeleteFile) {
          req.responseStatus = 204;
          return next();
        }

        res.status(204).json();
      } catch (error) {
        if (error instanceof AppError) return next(error);

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

      const uploadPath = path.resolve(process.cwd(), baseUploadDir, fileType);
      try {
        await fs.promises.access(uploadPath);
      } catch (err) {
        await fs.promises.mkdir(uploadPath, { recursive: true });
      }

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

      uploader.handleMultipleUpload()(req, res, async (err) => {
        if (err) return next(err);

        if (
          !req.file &&
          (!req.files || !Array.isArray(req.files) || req.files.length === 0)
        )
          return next(new AppError("No new file uploaded", 400));

        if (fileName && fileName.trim() !== "") {
          try {
            const baseUploadRoute = fileUpload?.baseRoute || "/api/uploads";

            const urlPattern = new RegExp(
              `${baseUploadRoute}/${fileType}/${fileName}`
            );

            const isExpectedUrlPattern = urlPattern.test(req.originalUrl);

            if (isExpectedUrlPattern) {
              const oldFileUrl = `${req.protocol}://${req.get("host")}${
                req.originalUrl
              }`;
              await uploader.deleteFileByUrl(oldFileUrl);
            } else {
              await uploader.deleteFileByName(fileName, fileType);
            }
          } catch (error) {
            console.warn(`Could not delete old file: ${fileName}`, error);
          }
        }

        let data;
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
          if (fileType === "images") {
            data = await Promise.all(
              req.files.map((file) =>
                processImage(req, next, file.path, options)
              )
            );
          } else {
            data = await Promise.all(
              req.files.map((file) => processFile(req, file.path))
            );
          }
          data = data.filter((url) => url !== null);
        } else if (req.file) {
          if (fileType === "images") {
            data = await processImage(req, next, req.file.path, options);
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
          (res as any).originalData = jsonContent;
          req.responseData = jsonContent;
          res.locals.data = jsonContent;
          (res as any).originalStatus = 200;
          req.responseStatus = 200;
          res.locals.status = 200;
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
  // streamFile = catchAsync(
  //   async (req: ArkosRequest, res: ArkosResponse, _: ArkosNextFunction) => {
  //     const { fileName, fileType } = req.params;

  //     const filePath = path.join(".", "uploads", fileType, fileName);
  //     try {
  //       await fs.promises.access(filePath);
  //     } catch (err) {
  //       throw new AppError("File not found", 404);
  //     }

  //     const fileStat = await fs.promises.stat(filePath);
  //     const fileSize = fileStat.size;
  //     const range = req.headers.range;

  //     if (range) {
  //       const [partialStart, partialEnd] = range
  //         .replace(/bytes=/, "")
  //         .split("-");
  //       const start = parseInt(partialStart, 10) || 0;
  //       const end = partialEnd ? parseInt(partialEnd, 10) : fileSize - 1;

  //       if (start >= fileSize || end >= fileSize) {
  //         res.status(416).json({ error: "Range Not Satisfiable" });
  //         return;
  //       }

  //       res.writeHead(206, {
  //         "Content-Range": `bytes ${start}-${end}/${fileSize}`,
  //         "Accept-Ranges": "bytes",
  //         "Content-Length": end - start + 1,
  //         "Content-Type": "application/octet-stream",
  //         "Content-Disposition": `inline; filename="${fileName}"`,
  //       });

  //       fs.createReadStream(filePath, { start, end }).pipe(res);
  //     } else {
  //       res.writeHead(200, {
  //         "Content-Length": fileSize,
  //         "Content-Type": "application/octet-stream",
  //         "Content-Disposition": `inline; filename="${fileName}"`,
  //       });
  //       fs.createReadStream(filePath).pipe(res);
  //     }
  //   }
  // );
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
