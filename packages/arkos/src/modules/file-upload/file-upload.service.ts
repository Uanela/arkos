import multer, { MulterError, StorageEngine } from "multer";
import path from "path";
import fs from "fs";
import { NextFunction } from "express";
import AppError from "../error-handler/utils/app-error";
import { promisify } from "util";
import { getArkosConfig } from "../../server";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import {
  ArkosNextFunction,
  ArkosRequest,
  ArkosRequestHandler,
  ArkosResponse,
} from "../../types";
import { processFile, processImage } from "./utils/helpers/file-upload.helpers";
import { removeBothSlashes } from "../../utils/helpers/text.helpers";

/**
 * Service to handle file uploads, including single and multiple file uploads,
 * file validation (type, size), and file deletion.
 */
export class FileUploadService {
  public readonly uploadDir: string;
  private fileSizeLimit: number;
  private allowedFileTypes: RegExp;
  private storage: StorageEngine;
  private maxCount: number;

  private handleUploadError(err: any, next: ArkosNextFunction) {
    if (err instanceof MulterError)
      return next(
        new AppError(err.message, 400, err.code || "FileUploadError")
      );
    else return next(err);
  }

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

    if (!fs.existsSync(this.uploadDir))
      fs.mkdirSync(this.uploadDir, { recursive: true });

    this.storage = multer.diskStorage({
      destination: (_, _1, cb) => {
        cb(null, this.uploadDir);
      },
      filename: (_, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.originalname.replace(ext, "")}-${uniqueSuffix}${ext}`);
      },
    });
  }

  /**
   * Validates the file's type and MIME type.
   * @param {Express.Multer.File} file - The uploaded file.
   * @param {Function} cb - The callback function to indicate if file is valid.
   */
  private fileFilter = (_: any, file: any, cb: any) => {
    const extName = this.allowedFileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (extName) cb(null, true);
    else
      cb(
        new AppError(
          `File type not allowed, allowed files are ${String(this.allowedFileTypes).replaceAll("/", "").split("|").join(", ")}`,
          400,
          "FileTypeNotAllowed",
          { filename: file.originalname }
        )
      );
  };

  /**
   * Returns the multer upload configuration.
   * @returns {multer.Multer} The multer instance configured for file uploads.
   */
  public getUpload(): multer.Multer {
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
  public handleSingleUpload(oldFilePath?: string): ArkosRequestHandler {
    return (req: ArkosRequest, res: ArkosResponse, next: NextFunction) => {
      const upload = this.getUpload().single(this.getFieldName());
      upload(req, res, async (err) => {
        if (err) return this.handleUploadError(err, next);

        if (oldFilePath) {
          const { fileUpload: configs } = getArkosConfig();

          const filePath = path.resolve(
            process.cwd(),
            removeBothSlashes(configs?.baseUploadDir!),
            removeBothSlashes(oldFilePath)
          );
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
   * @returns {Function} Middleware function for handling multiple file uploads.
   */
  public handleMultipleUpload(): ArkosRequestHandler {
    return (req: ArkosRequest, res: ArkosResponse, next: NextFunction) => {
      const upload = this.getUpload().array(this.getFieldName(), this.maxCount);
      upload(req, res, next);
    };
  }

  /**
   * Middleware to handle deletion of a single file from the filesystem.
   * @param {string} oldFilePath - The path to the file to be deleted.
   * @returns {Function} Middleware function for handling file deletion.
   */
  public handleDeleteSingleFile(oldFilePath: string): ArkosRequestHandler {
    return async (_: ArkosRequest, _1: ArkosResponse, next: NextFunction) => {
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
      const { fileUpload } = getArkosConfig();
      const baseRoute = fileUpload?.baseRoute || "/api/uploads";

      let urlPath: string;
      if (fileUrl.startsWith("http")) {
        const url = new URL(fileUrl);
        urlPath = url.pathname;
      } else urlPath = fileUrl;

      const baseRouteIndex = urlPath.indexOf(baseRoute);
      if (baseRouteIndex === -1)
        throw new AppError(
          "Invalid file URL: base route not found",
          400,
          "InvalidFileUrl"
        );

      const pathAfterBaseRoute = urlPath.substring(
        baseRouteIndex + baseRoute.length
      );
      const cleanPath = pathAfterBaseRoute.startsWith("/")
        ? pathAfterBaseRoute.substring(1)
        : pathAfterBaseRoute;

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
          400,
          "UnableToProcessFileURL"
        );
      }

      // Get the appropriate uploader service based on file type
      const {
        documentUploadService,
        fileUploadService,
        imageUploadService,
        videoUploadService,
      } = getFileUploadServices();

      let filePath: string;
      switch (fileType) {
        case "images":
          filePath = path.join(imageUploadService.uploadDir, fileName);
          break;
        case "videos":
          filePath = path.join(videoUploadService.uploadDir, fileName);
          break;
        case "documents":
          filePath = path.join(documentUploadService.uploadDir, fileName);
          break;
        case "files":
          filePath = path.join(fileUploadService.uploadDir, fileName);
          break;
        default:
          throw new AppError(
            `Unsupported file type: ${fileType}`,
            400,
            "UnsupportedFileType"
          );
      }

      await promisify(fs.stat)(filePath);
      await promisify(fs.unlink)(filePath);

      return true;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error.code === "ENOENT")
        throw new AppError("File not found", 404, "FileNotFound");

      throw new AppError(
        `Failed to delete file: ${error.message}`,
        500,
        "UnableToDeleteFile"
      );
    }
  }

  private getFieldName() {
    let fieldName = "files";
    if (this.uploadDir.endsWith("images") || this.uploadDir.endsWith("images/"))
      fieldName = "images";
    if (this.uploadDir.endsWith("videos") || this.uploadDir.endsWith("videos/"))
      fieldName = "videos";
    if (
      this.uploadDir.endsWith("documents") ||
      this.uploadDir.endsWith("documents/")
    )
      fieldName = "documents";
    if (this.uploadDir.endsWith("files") || this.uploadDir.endsWith("files/"))
      fieldName = "files";
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
    next: ArkosNextFunction,
    options: {
      format?: string;
      width?: number;
      height?: number;
      resizeTo?: number;
    } = {}
  ): Promise<string | string[] | null> {
    const { fileUpload } = getArkosConfig();
    fileUpload?.baseRoute || "/api/uploads";

    return new Promise((resolve, reject) => {
      const isMultiple = Array.isArray(req.query.multiple)
        ? req.query.multiple[0] == "true"
        : req.query.multiple == "true";

      const uploadHandler = isMultiple
        ? this.getUpload().array(this.getFieldName(), this.maxCount)
        : this.getUpload().single(this.getFieldName());

      uploadHandler(req, res, async (err) => {
        if (err) return reject(err);

        try {
          const dirParts = this.uploadDir.split("/");
          (this.uploadDir.endsWith("/")
            ? dirParts[dirParts.length - 2]
            : dirParts[dirParts.length - 1]) || "files";

          let data;
          if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            const isImageUpload = this.uploadDir?.includes?.("/images");
            if (isImageUpload) {
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
            const isImageUpload = this.uploadDir?.includes?.("/images");
            if (isImageUpload) {
              data = await processImage(req, next, req.file.path, options);
            } else {
              data = await processFile(req, req.file.path);
            }
          } else {
            return reject(
              new AppError(
                `No file or files were attached on field ${req.params.fileType} on the request body as form data.`,
                400,
                {},
                "NoFileOrFilesAttached"
              )
            );
          }

          resolve(data);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Deletes a file based on filename and file type from request parameters
   * @param {string} fileName - The name of the file to delete
   * @returns {Promise<boolean>} - True if deletion successful, false otherwise
   */
  public async deleteFileByName(
    fileName: string,
    fileType: "images" | "videos" | "documents" | "files"
  ): Promise<boolean> {
    try {
      if (!fileType)
        throw new AppError(
          "File type parameter is required",
          400,
          "MissingFileType"
        );

      const validFileTypes = ["images", "videos", "documents", "files"];
      if (!validFileTypes.includes(fileType)) {
        throw new AppError(
          `Invalid file type: ${fileType}. Must be one of: ${validFileTypes.join(
            ", "
          )}`,
          400
        );
      }

      const {
        documentUploadService,
        fileUploadService,
        imageUploadService,
        videoUploadService,
      } = getFileUploadServices();

      let targetService: FileUploadService;
      switch (fileType) {
        case "images":
          targetService = imageUploadService;
          break;
        case "videos":
          targetService = videoUploadService;
          break;
        case "documents":
          targetService = documentUploadService;
          break;
        case "files":
          targetService = fileUploadService;
          break;
        default:
          throw new AppError(`Unsupported file type: ${fileType}`, 400);
      }

      // Construct the full file path
      const filePath = path.join(targetService.uploadDir, fileName);

      // Check if file exists and delete it
      await promisify(fs.stat)(filePath);
      await promisify(fs.unlink)(filePath);

      return true;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error.code === "ENOENT")
        throw new AppError("File not found", 404, "FileNotFound");

      throw new AppError(
        `Failed to delete file: ${error.message}`,
        500,
        "UnableToDeleteFile"
      );
    }
  }
}

/**
 * Creates and returns all file uploader services based on config
 * @returns Object containing all specialized file uploader services
 */
export const getFileUploadServices = () => {
  const { fileUpload } = getArkosConfig();
  const baseUploadDir = fileUpload?.baseUploadDir || "/uploads";

  const restrictions = fileUpload?.restrictions
    ? deepmerge(fileUploadDefaultRestrictions, fileUpload.restrictions)
    : fileUploadDefaultRestrictions;

  /**
   * Specialized file uploader service for handling image uploads.
   */
  const imageUploadService = new FileUploadService(
    `${baseUploadDir}/images`,
    restrictions.images.maxSize,
    restrictions.images.supportedFilesRegex,
    restrictions.images.maxCount
  );

  /**
   * Specialized file uploader service for handling video uploads.
   */
  const videoUploadService = new FileUploadService(
    `${baseUploadDir}/videos`,
    restrictions.videos.maxSize,
    restrictions.videos.supportedFilesRegex,
    restrictions.videos.maxCount
  );

  /**
   * Specialized file uploader service for handling document uploads.
   */
  const documentUploadService = new FileUploadService(
    `${baseUploadDir}/documents`,
    restrictions.documents.maxSize,
    restrictions.documents.supportedFilesRegex,
    restrictions.documents.maxCount
  );

  /**
   * Generic file uploader service for handling all file uploads.
   */
  const fileUploadService = new FileUploadService(
    `${baseUploadDir}/files`,
    restrictions.files.maxSize,
    restrictions.files.supportedFilesRegex,
    restrictions.files.maxCount
  );

  return {
    imageUploadService,
    videoUploadService,
    documentUploadService,
    fileUploadService,
  };
};

export const fileUploadDefaultRestrictions = {
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
