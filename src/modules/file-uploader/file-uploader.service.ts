import multer, { StorageEngine } from "multer";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";
import AppError from "../error-handler/utils/app-error";
import { promisify } from "util";

const baseUploadDir = process.env.BASE_UPLOAD_DIR || "uploads";

/**
 * Service to handle file uploads, including single and multiple file uploads,
 * file validation (type, size), and file deletion.
 */
export class FileUploaderService {
  private uploadDir: string;
  private fileSizeLimit: number;
  private allowedFileTypes: RegExp;
  private storage: StorageEngine;

  /**
   * Constructor to initialize the file uploader service.
   * @param {string} uploadDir - The directory where files will be uploaded.
   * @param {number} fileSizeLimit - The maximum allowed file size.
   * @param {RegExp} allowedFileTypes - The regular expression for allowed file types.
   */
  constructor(
    uploadDir: string = baseUploadDir,
    fileSizeLimit: number = 1024 * 1024 * 5,
    allowedFileTypes: RegExp = /jpeg|jpg|png|gif/
  ) {
    this.uploadDir = path.join(".", `${uploadDir}/`);
    this.fileSizeLimit = fileSizeLimit;
    this.allowedFileTypes = allowedFileTypes;

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
   * @param {string} fieldName - The name of the file input field.
   * @param {string} [oldFilePath] - The path to the file to delete before uploading.
   * @returns {Function} Middleware function for handling file upload.
   */
  public handleSingleUpload(fieldName: string, oldFilePath?: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const upload = this.getUploader().single(fieldName);
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
            if (stats) {
              await promisify(fs.unlink)(filePath);
            }
          } catch (err) {}
        }

        next();
      });
    };
  }

  /**
   * Middleware to handle multiple file uploads.
   * @param {string} fieldName - The name of the file input field.
   * @param {number} maxCount - The maximum number of files allowed for upload.
   * @returns {Function} Middleware function for handling multiple file uploads.
   */
  public handleMultipleUpload(fieldName: string, maxCount: number) {
    return (req: Request, res: Response, next: NextFunction) => {
      const upload = this.getUploader().array(fieldName, maxCount);
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
    return (req: Request, res: Response, next: NextFunction) => {
      (async () => {
        const filePath = path.join(oldFilePath);
        try {
          const stats = await promisify(fs.stat)(filePath);
          if (stats) {
            await promisify(fs.unlink)(filePath);
          }
        } catch (err) {}

        next();
      })();
    };
  }
}

/**
 * Specialized file uploader service for handling image uploads.
 */
const imageUploaderService = new FileUploaderService(
  `${baseUploadDir}/images`,
  1024 * 1024 * 15,
  /jpeg|jpg|png|gif|webp|svg|bmp|tiff|heif|heic|ico|jfif|raw|cr2|nef|orf|sr2|arw|dng|pef|raf|rw2|psd|ai|eps|xcf|jxr|wdp|hdp|jp2|j2k|jpf|jpx|jpm|mj2|avif/
);

/**
 * Specialized file uploader service for handling video uploads.
 */
const videoUploaderService = new FileUploaderService(
  `${baseUploadDir}/videos`,
  1024 * 1024 * 100,
  /mp4|avi|mov|mkv|flv|wmv|webm|mpg|mpeg|3gp|m4v|ts|rm|rmvb|vob|ogv|dv|qt|asf|m2ts|mts|divx|f4v|swf|mxf|roq|nsv|mvb|svi|mpe|m2v|mp2|mpv|h264|h265|hevc/
);

/**
 * Specialized file uploader service for handling document uploads.
 */
const documentUploaderService = new FileUploaderService(
  `${baseUploadDir}/documents`,
  1024 * 1024 * 50,
  /pdf|doc|docx|xls|xlsx|ppt|pptx|odt|ods|odg|odp|txt|rtf|csv|epub|md|tex|pages|numbers|key|xml|json|yaml|yml|ini|cfg|conf|log|html|htm|xhtml|djvu|mobi|azw|azw3|fb2|lit|ps|wpd|wps|dot|dotx|xlt|xltx|pot|potx|oft|one|onetoc2|opf|oxps|hwp/
);

/**
 * Generic file uploader service for handling all file uploads.
 */
const fileUploaderService = new FileUploaderService(
  `${baseUploadDir}/`,
  1024 * 1024 * 1024,
  /.*/
);

export {
  imageUploaderService,
  documentUploaderService,
  videoUploaderService,
  fileUploaderService,
};
