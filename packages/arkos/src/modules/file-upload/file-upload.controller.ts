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
import { MulterError } from "multer";
import { pascalCase, kebabCase } from "../../exports/utils";
import loadableRegistry from "../../components/arkos-loadable-registry";
import { routeHookReader } from "../../components/arkos-route-hook/reader";

/**
 * Handles file uploads and allows to be extended via route hooks.
 */
export class FileUploadController {
  private handleUploadError(err: any, next: ArkosNextFunction) {
    if (err instanceof MulterError)
      return next(
        new AppError(
          err.message,
          400,
          pascalCase(err.code || "FileUploadError")
        )
      );
    else return next(err);
  }

  private getRouteHook() {
    return loadableRegistry.getItem("ArkosRouteHook", "file-upload");
  }

  private getAfterHook(operation: string) {
    const hook = this.getRouteHook();
    if (!hook) return null;
    return (
      routeHookReader.getHooks("file-upload", operation as any)?.after ?? null
    );
  }

  /**
   * Handles file upload requests, processes images if needed, and returns URLs.
   *
   * @param {ArkosRequest} req - Arkos request object
   * @param {ArkosResponse} res - Arkos response object
   * @param {ArkosNextFunction} next - Arkos next middleware function
   */
  uploadFile = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
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
      } catch {
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
          return next(
            new AppError("Invalid file type", 400, "InvalidFileType")
          );
      }

      uploader.handleMultipleUpload()(req, res, async (err) => {
        if (err) return this.handleUploadError(err, next);

        let data;
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
          if (fileType === "images") {
            data = await Promise.all(
              req.files.map((file) =>
                processImage(req, next, file.path, options)
              )
            );
          } else {
            data = req.files.map((file) => processFile(req, file.path));
          }
          data = data.filter((url) => url !== null);
        } else if (req.file) {
          if (fileType === "images") {
            data = await processImage(req, next, req.file.path, options);
          } else {
            data = processFile(req, req.file.path);
          }
        } else {
          return next(
            new AppError(
              `No file or files were attached on field ${fileType} on the request body as form data.`,
              400,
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

        const afterHook = this.getAfterHook("uploadFile");
        if (afterHook) {
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
   * Handles file deletion requests.
   *
   * @param {ArkosRequest} req - Arkos request object
   * @param {ArkosResponse} res - Arkos response object
   * @param {ArkosNextFunction} next - Arkos next middleware function
   */
  deleteFile = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
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
          return next(
            new AppError("Invalid file type", 400, "InvalidFileType")
          );
      }

      try {
        const { fileUpload } = getArkosConfig();
        const baseUploadRoute = fileUpload?.baseRoute || "/api/uploads";

        const urlPattern = new RegExp(
          `${baseUploadRoute}/${fileType}/${fileName}`
        );

        const isExpectedUrlPattern = urlPattern.test(req.originalUrl);

        if (isExpectedUrlPattern) {
          const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
          await uploader.deleteFileByUrl(fullUrl);
        } else {
          await uploader.deleteFileByName(fileName, fileType);
        }

        const afterHook = this.getAfterHook("deleteFile");
        if (afterHook) {
          req.responseStatus = 204;
          return next();
        }

        res.status(204).json();
      } catch (error) {
        if (error instanceof AppError) return next(error);
        return next(new AppError("File not found", 404, "FileNotFound"));
      }
    }
  );

  /**
   * Handles file update requests by deleting the old file and uploading a new one.
   *
   * @param {ArkosRequest} req - Arkos request object
   * @param {ArkosResponse} res - Arkos response object
   * @param {ArkosNextFunction} next - Arkos next middleware function
   */
  updateFile = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
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
      } catch {
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
          return next(
            new AppError("Invalid file type", 400, "InvalidFileType")
          );
      }

      uploader.handleMultipleUpload()(req, res, async (err) => {
        if (err) return this.handleUploadError(err, next);

        if (
          !req.file &&
          (!req.files || !Array.isArray(req.files) || req.files.length === 0)
        )
          return next(
            new AppError("No new file uploaded", 400, "MissingNewFile")
          );

        if (fileName && fileName.trim() !== "") {
          try {
            const baseUploadRoute = fileUpload?.baseRoute || "/api/uploads";
            const urlPattern = new RegExp(
              `${baseUploadRoute}/${fileType}/${fileName}`
            );
            const isExpectedUrlPattern = urlPattern.test(req.originalUrl);

            if (isExpectedUrlPattern) {
              const oldFileUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
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
            data = req.files.map((file) => processFile(req, file.path));
          }
          data = data.filter((url) => url !== null);
        } else if (req.file) {
          if (fileType === "images") {
            data = await processImage(req, next, req.file.path, options);
          } else {
            data = processFile(req, req.file.path);
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

        const afterHook = this.getAfterHook("updateFile");
        if (afterHook) {
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
}

/**
 * Controller instance responsible for handling file upload operations.
 *
 * @see {@link https://www.arkosjs.com/docs/api-reference/file-upload-controller-object}
 */
const fileUploadController = new FileUploadController();

export default fileUploadController;
