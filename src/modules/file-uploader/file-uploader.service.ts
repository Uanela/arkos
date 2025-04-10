import multer, { StorageEngine } from "multer";
import path from "path";
import fs from "fs";
import { NextFunction } from "express";
import AppError from "../error-handler/utils/app-error";
import { promisify } from "util";
import { getArkosConfig } from "../../server";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { ArkosRequest, ArkosResponse } from "../../types";
import {
  processFile,
  processImage,
} from "./utils/helpers/file-uploader.helpers";

/**
 * Service to handle file uploads, including single and multiple file uploads,
 * file validation (type, size), and file deletion.
 */
export class FileUploaderService {
  private uploadDir: string;
  private fileSizeLimit: number;
  private allowedFileTypes: RegExp;
  private storage: StorageEngine;
  private maxCount: number;

  /**
   * Constructor to initialize the file uploader service.
   * @param {string} uploadDir - The directory where files will be uploaded.
   * @param {number} fileSizeLimit - The maximum allowed file size.
   * @param {RegExp} allowedFileTypes - The regular expression for allowed file types.
   */
  constructor(
    uploadDir: string,
    fileSizeLimit: number = 1024 * 1024 * 5,
    allowedFileTypes: RegExp = /.*/,
    maxCount: number = 30
  ) {
    uploadDir = uploadDir.startsWith("/") ? uploadDir.substring(1) : uploadDir;
    uploadDir = uploadDir.endsWith("/") ? uploadDir.slice(0, -1) : uploadDir;

    this.uploadDir = path.resolve(process.cwd(), `${uploadDir}/`);
    this.fileSizeLimit = fileSizeLimit;
    this.allowedFileTypes = allowedFileTypes;
    this.maxCount = maxCount;

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    this.storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
      },
    });
  }

  /**
   * Validates the file's type and MIME type.
   * @param {Request} req - The Express request object.
   * @param {Express.Multer.File} file - The uploaded file.
   * @param {Function} cb - The callback function to indicate if file is valid.
   */
  private fileFilter = (req: any, file: any, cb: any) => {
    const extName = this.allowedFileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimeType = this.allowedFileTypes.test(file.mimetype);

    if (mimeType && extName) {
      cb(null, true);
    } else {
      cb(new AppError("Invalid file type", 400));
    }
  };

  /**
   * Returns the multer upload configuration.
   * @returns {multer.Instance} The multer instance configured for file uploads.
   */
  public getUploader() {
    return multer({
      storage: this.storage,
      fileFilter: this.fileFilter,
      limits: { fileSize: this.fileSizeLimit },
    });
  }

  /**
   * Middleware to handle single file upload.
   * @param {string} [oldFilePath] - The path to the file to delete before uploading.
   * @returns {Function} Middleware function for handling file upload.
   */
  public handleSingleUpload(oldFilePath?: string) {
    return (req: ArkosRequest, res: ArkosResponse, next: NextFunction) => {
      const upload = this.getUploader().single(this.getFieldName());
      upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
          return next(err);
        } else if (err) {
          return next(err);
        }

        if (oldFilePath) {
          const filePath = path.join(oldFilePath);
          try {
            const stats = await promisify(fs.stat)(filePath);
            if (stats) await promisify(fs.unlink)(filePath);
          } catch (err) {
            console.error(err);
          }
        }

        next();
      });
    };
  }

  /**
   * Middleware to handle multiple file uploads.
   * @param {number} maxCount - The maximum number of files allowed for upload.
   * @returns {Function} Middleware function for handling multiple file uploads.
   */
  public handleMultipleUpload() {
    return (req: ArkosRequest, res: ArkosResponse, next: NextFunction) => {
      console.log(this.getFieldName(), this.maxCount, "handleMultipleUpload");
      const upload = this.getUploader().array(
        this.getFieldName(),
        this.maxCount
      );
      upload(req, res, (err) => {
        if (err instanceof multer.MulterError) return next(err);
        else if (err) return next(err);
        next();
      });
    };
  }

  /**
   * Middleware to handle deletion of a single file from the filesystem.
   * @param {string} oldFilePath - The path to the file to be deleted.
   * @returns {Function} Middleware function for handling file deletion.
   */
  public handleDeleteSingleFile(oldFilePath: string) {
    return async (
      req: ArkosRequest,
      res: ArkosResponse,
      next: NextFunction
    ) => {
      const filePath = path.join(oldFilePath);
      try {
        const stats = await promisify(fs.stat)(filePath);
        if (stats) {
          await promisify(fs.unlink)(filePath);
        }
      } catch (err) {
        console.error(err);
      }

      next();
    };
  }

  /**
   * Deletes a file based on its URL by identifying the appropriate uploader service
   * @param {string} fileUrl - The URL of the file to delete
   * @returns {Promise<boolean>} - True if deletion successful, false otherwise
   */
  public async deleteFileByUrl(fileUrl: string): Promise<boolean> {
    try {
      // Get configuration values
      const { fileUpload } = getArkosConfig();
      const baseRoute = fileUpload?.baseRoute || "/api/uploads";

      // Parse the URL to get the path
      let urlPath: string;
      if (fileUrl.startsWith("http")) {
        const url = new URL(fileUrl);
        urlPath = url.pathname;
      } else {
        urlPath = fileUrl;
      }

      // Extract the path after the base route
      const baseRouteIndex = urlPath.indexOf(baseRoute);
      if (baseRouteIndex === -1) {
        throw new AppError("Invalid file URL: base route not found", 400);
      }

      const pathAfterBaseRoute = urlPath.substring(
        baseRouteIndex + baseRoute.length
      );
      const cleanPath = pathAfterBaseRoute.startsWith("/")
        ? pathAfterBaseRoute.substring(1)
        : pathAfterBaseRoute;

      // Determine file type and file name
      const fileTypes = ["images", "videos", "documents", "files"];
      let fileType: string | null = null;
      let fileName: string | null = null;

      for (const type of fileTypes) {
        const typeIndex = cleanPath.indexOf(type + "/");
        if (typeIndex !== -1) {
          fileType = type;
          fileName = cleanPath.substring(typeIndex + type.length + 1);
          break;
        }
      }

      if (!fileType || !fileName) {
        throw new AppError(
          "Unable to determine file type or file name from URL",
          400
        );
      }

      // Get the appropriate uploader service based on file type
      const {
        documentUploaderService,
        fileUploaderService,
        imageUploaderService,
        videoUploaderService,
      } = getFileUploaderServices();

      let filePath: string;
      switch (fileType) {
        case "images":
          filePath = path.join(imageUploaderService.uploadDir, fileName);
          break;
        case "videos":
          filePath = path.join(videoUploaderService.uploadDir, fileName);
          break;
        case "documents":
          filePath = path.join(documentUploaderService.uploadDir, fileName);
          break;
        case "files":
          filePath = path.join(fileUploaderService.uploadDir, fileName);
          break;
        default:
          throw new AppError(`Unsupported file type: ${fileType}`, 400);
      }

      // Delete the file

      await promisify(fs.stat)(filePath);
      await promisify(fs.unlink)(filePath);

      return true;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error.code === "ENOENT") {
        throw new AppError("File not found", 404);
      }

      throw new AppError(`Failed to delete file: ${error.message}`, 500);
    }
  }

  private getFieldName() {
    let fieldName = "files";
    if (this.uploadDir.endsWith("images") || this.uploadDir.endsWith("images/"))
      fieldName === "images";
    if (this.uploadDir.endsWith("videos") || this.uploadDir.endsWith("videos/"))
      fieldName === "videos";
    if (
      this.uploadDir.endsWith("documents") ||
      this.uploadDir.endsWith("documents/")
    )
      fieldName === "documents";
    if (this.uploadDir.endsWith("files") || this.uploadDir.endsWith("files/"))
      fieldName === "files";
    return fieldName;
  }

  /**
   * Handles the upload process and returns the full URLs of uploaded files
   * @param {ArkosRequest} req - Arkos request object containing the files
   * @param {ArkosResponse} res - Arkos response object
   * @param {object} options - Optional parameters for image processing
   * @returns {Promise<string|string[]>} URL or array of URLs to the uploaded files
   */
  public async upload(
    req: ArkosRequest,
    res: ArkosResponse,
    options: {
      format?: string;
      width?: number;
      height?: number;
      resizeTo?: number;
    } = {}
  ): Promise<string | string[] | null> {
    const { fileUpload } = getArkosConfig();
    const baseRoute = fileUpload?.baseRoute || "/api/uploads";

    return new Promise((resolve, reject) => {
      // Determine if it's a single or multiple file upload
      const isMultiple = Array.isArray(req.query.multiple)
        ? req.query.multiple[0] == "true"
        : req.query.multiple == "true";

      // Use appropriate upload handler
      const uploadHandler = isMultiple
        ? this.getUploader().array(this.getFieldName(), this.maxCount)
        : this.getUploader().single(this.getFieldName());

      uploadHandler(req, res, async (err) => {
        if (err) return reject(err);

        try {
          // Determine the base URL for file access
          const protocol = req.get("host")?.includes("localhost")
            ? "http"
            : "https";
          const baseURL = `${protocol}://${req.get("host")}`;

          // Get file type from uploadDir path
          const dirParts = this.uploadDir.split("/");
          const fileType =
            (this.uploadDir.endsWith("/")
              ? dirParts[dirParts.length - 2]
              : dirParts[dirParts.length - 1]) || "files";

          // Process all uploaded files
          let data;
          if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            // Process multiple files
            const isImageUploader = this.uploadDir.includes("/images");
            if (isImageUploader) {
              data = await Promise.all(
                req.files.map((file) =>
                  processImage(file.path, baseURL, baseRoute, options, fileType)
                )
              );
            } else {
              data = await Promise.all(
                req.files.map((file) =>
                  processFile(file.path, baseURL, baseRoute, fileType)
                )
              );
            }
            // Filter out any null values from failed processing
            data = data.filter((url) => url !== null);
          } else if (req.file) {
            // Process a single file
            const isImageUploader = this.uploadDir.includes("/images");
            // console.log(req.file.path, baseURL, baseRoute, options, fileType);
            if (isImageUploader) {
              data = await processImage(
                req.file.path,
                baseURL,
                baseRoute,
                options,
                fileType
              );
            } else {
              data = await processFile(
                req.file.path,
                baseURL,
                baseRoute,
                fileType
              );
            }
          } else {
            return reject(new AppError("No file uploaded", 400));
          }

          resolve(data);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}

/**
 * Creates and returns all file uploader services based on config
 * @returns Object containing all specialized file uploader services
 */
export const getFileUploaderServices = () => {
  const { fileUpload } = getArkosConfig();
  const baseUploadDir = fileUpload?.baseUploadDir || "/uploads";

  // Default regex patterns for each file type
  const defaultRegexPatterns = {
    images:
      /jpeg|jpg|png|gif|webp|svg|bmp|tiff|heif|heic|ico|jfif|raw|cr2|nef|orf|sr2|arw|dng|pef|raf|rw2|psd|ai|eps|xcf|jxr|wdp|hdp|jp2|j2k|jpf|jpx|jpm|mj2|avif/,
    videos:
      /mp4|avi|mov|mkv|flv|wmv|webm|mpg|mpeg|3gp|m4v|ts|rm|rmvb|vob|ogv|dv|qt|asf|m2ts|mts|divx|f4v|swf|mxf|roq|nsv|mvb|svi|mpe|m2v|mp2|mpv|h264|h265|hevc/,
    documents:
      /pdf|doc|docx|xls|xlsx|ppt|pptx|odt|ods|odg|odp|txt|rtf|csv|epub|md|tex|pages|numbers|key|xml|json|yaml|yml|ini|cfg|conf|log|html|htm|xhtml|djvu|mobi|azw|azw3|fb2|lit|ps|wpd|wps|dot|dotx|xlt|xltx|pot|potx|oft|one|onetoc2|opf|oxps|hwp/,
    files: /.*/,
  };

  // Default upload restrictions
  const defaultRestrictions = {
    images: {
      maxCount: 30,
      maxSize: 1024 * 1024 * 15, // 15 MB
      supportedFilesRegex:
        /jpeg|jpg|png|gif|webp|svg|bmp|tiff|heif|heic|ico|jfif|raw|cr2|nef|orf|sr2|arw|dng|pef|raf|rw2|psd|ai|eps|xcf|jxr|wdp|hdp|jp2|j2k|jpf|jpx|jpm|mj2|avif/,
    },
    videos: {
      maxCount: 10,
      maxSize: 1024 * 1024 * 5096, // 5 GB
      supportedFilesRegex:
        /mp4|avi|mov|mkv|flv|wmv|webm|mpg|mpeg|3gp|m4v|ts|rm|rmvb|vob|ogv|dv|qt|asf|m2ts|mts|divx|f4v|swf|mxf|roq|nsv|mvb|svi|mpe|m2v|mp2|mpv|h264|h265|hevc/,
    },
    documents: {
      maxCount: 30,
      maxSize: 1024 * 1024 * 50, // 50 MB
      supportedFilesRegex:
        /pdf|doc|docx|xls|xlsx|ppt|pptx|odt|ods|odg|odp|txt|rtf|csv|epub|md|tex|pages|numbers|key|xml|json|yaml|yml|ini|cfg|conf|log|html|htm|xhtml|djvu|mobi|azw|azw3|fb2|lit|ps|wpd|wps|dot|dotx|xlt|xltx|pot|potx|oft|one|onetoc2|opf|oxps|hwp/,
    },
    files: {
      maxCount: 10,
      maxSize: 1024 * 1024 * 5096, // 5 GB
      supportedFilesRegex: /.*/,
    },
  };

  // Merge with user configuration (if any)
  const restrictions = fileUpload?.restrictions
    ? deepmerge(defaultRestrictions, fileUpload.restrictions)
    : defaultRestrictions;

  console.log(JSON.stringify(restrictions, null, 2));

  console.log(restrictions.images.supportedFilesRegex);
  console.log(restrictions.videos.supportedFilesRegex);

  /**
   * Specialized file uploader service for handling image uploads.
   */
  const imageUploaderService = new FileUploaderService(
    `${baseUploadDir}/images`,
    restrictions.images.maxSize,
    restrictions.images.supportedFilesRegex,
    restrictions.images.maxCount
  );

  /**
   * Specialized file uploader service for handling video uploads.
   */
  const videoUploaderService = new FileUploaderService(
    `${baseUploadDir}/videos`,
    restrictions.videos.maxSize,
    restrictions.videos.supportedFilesRegex,
    restrictions.videos.maxCount
  );

  /**
   * Specialized file uploader service for handling document uploads.
   */
  const documentUploaderService = new FileUploaderService(
    `${baseUploadDir}/documents`,
    restrictions.documents.maxSize,
    restrictions.documents.supportedFilesRegex,
    restrictions.documents.maxCount
  );

  /**
   * Generic file uploader service for handling all file uploads.
   */
  const fileUploaderService = new FileUploaderService(
    `${baseUploadDir}/files`,
    restrictions.files.maxSize,
    restrictions.files.supportedFilesRegex,
    restrictions.files.maxCount
  );

  return {
    imageUploaderService,
    videoUploaderService,
    documentUploaderService,
    fileUploaderService,
  };
};
