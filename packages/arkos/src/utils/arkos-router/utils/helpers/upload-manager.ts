import multer from "multer";
import { UploadConfig } from "../../types/upload-config";
import {
  documentsExtensions,
  imagesExtenstions,
  videosExtensions,
} from "../../../../modules/file-upload/utils/helpers/file-extensions";
import {
  ArkosNextFunction,
  ArkosRequest,
  ArkosResponse,
  getArkosConfig,
} from "../../../../exports";
import path from "path";
import fs from "fs";
import { removeBothSlashes } from "../../../helpers/text.helpers";
import { promisify } from "util";
import sheu from "../../../sheu";
import AppError from "../../../../modules/error-handler/utils/app-error";
import { RequestHandler } from "express";
import {
  extractRequestInfo,
  generateRelativePath,
} from "../../../../modules/file-upload/utils/helpers/file-upload.helpers";
import deepmerge from "../../../helpers/deepmerge.helper";
import { catchAsync } from "../../../../exports/error-handler";
import { pascalCase } from "../../../helpers/change-case.helpers";

function determineUploadDir(file: Express.Multer.File) {
  if (file.mimetype.includes?.("image")) return "/images";
  if (file.mimetype.includes?.("video")) return "/videos";
  if (imagesExtenstions.has(file.mimetype.split("/")[1])) return "/images";
  if (videosExtensions.has(file.mimetype.split("/")[1])) return "/videos";
  if (documentsExtensions.has(file.mimetype.split("/")[1])) return "/documents";
  return "/files";
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const arkosConfig = getArkosConfig();
    const baseUploadDir = arkosConfig.fileUpload?.baseUploadDir || "/uploads";
    let uploadDir =
      (req.headers["x-upload-dir"] as string) || determineUploadDir(file);
    req.headers["x-upload-dir"] = uploadDir;

    const fullUploadDir = path.resolve(
      path.join(
        process.cwd(),
        baseUploadDir.replaceAll("//", "/"),
        uploadDir.replaceAll("//", "/")
      )
    );

    if (!fs.existsSync(fullUploadDir))
      fs.mkdirSync(fullUploadDir, { recursive: true });

    cb(null, fullUploadDir);
  },
  filename: (_, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.originalname.replace(ext, "")}-${uniqueSuffix}${ext}`);
  },
});

class UploadManager {
  private getUpload({
    maxSize = 1024 * 1024 * 5,
    allowedFileTypes = /.*/,
  }: {
    maxSize?: number;
    allowedFileTypes?: string[] | RegExp;
  }): multer.Multer {
    return multer({
      storage,
      fileFilter: (req, file, cb) =>
        this.fileFilter(req, file, cb, allowedFileTypes),
      limits: { fileSize: maxSize },
    });
  }

  getMiddleware(config: UploadConfig): RequestHandler {
    let upload;
    if (config.type === "single")
      upload = this.getUpload(config)[config.type](config.field);
    else if (config.type === "array")
      upload = this.getUpload(config)[config.type](
        config.field,
        config.maxCount || 5
      );
    else upload = this.getUpload(config)[config.type](config.fields);
    return upload;
  }

  handleUpload(config: UploadConfig, oldFilePath?: string) {
    return catchAsync(
      (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        const middleware = this.getMiddleware(config);
        req.headers["x-upload-dir"] = config.uploadDir;
        middleware(req, res, async (err) => {
          if (err) return next(err);

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
              sheu.warn(err);
            }
          }

          next();
        });
      }
    );
  }

  /**
   * Validates that all required upload files are present in the request.
   * Checks req.file or req.files based on upload configuration type.
   *
   * @param {UploadConfig} uploadConfig - The upload configuration from config.experimental.uploads
   * @throws {AppError} If required files are missing
   *
   * @example
   * // Single file upload - checks req.file
   * validateRequiredFiles(
   *   { type: 'single', field: 'avatar', required: true },
   *   req,
   *   '/users/:id/avatar'
   * )
   *
   * @example
   * // Array file upload - checks req.files array
   * validateRequiredFiles(
   *   { type: 'array', field: 'photos', required: true },
   *   req,
   *   '/gallery/upload'
   * )
   *
   * @example
   * // Multiple fields - checks req.files object
   * validateRequiredFiles(
   *   { type: 'fields', fields: [{ name: 'avatar' }, { name: 'resume' }], required: true },
   *   req,
   *   '/profile/upload'
   * )
   */
  validateRequiredFiles(uploadConfig: UploadConfig) {
    return catchAsync((req: ArkosRequest, _: any, next: ArkosNextFunction) => {
      const errors: string[] = [];
      const errorCodes: string[] = [];

      if (uploadConfig.required === false) return next();

      if (uploadConfig.type === "single") {
        if (!req.file) {
          errors.push(
            `Required upload field '${uploadConfig.field}' is missing`
          );
          errorCodes.push(uploadConfig.field);
        }
      } else if (uploadConfig.type === "array") {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
          errors.push(
            `Required upload field '${uploadConfig.field}' is missing or empty`
          );
          errorCodes.push(uploadConfig.field);
        }
      } else if (uploadConfig.type === "fields") {
        if (
          !req.files ||
          typeof req.files !== "object" ||
          Array.isArray(req.files)
        ) {
          errors.push(
            `Required upload fields are missing. Expected an object with fields: ${uploadConfig.fields.map((f) => f.name).join(", ")}`
          );
          errorCodes.push(...uploadConfig.fields.map((f) => f.name));
        } else {
          for (const field of uploadConfig.fields) {
            const filesForField = (req.files as any)[field.name];
            if (
              !filesForField ||
              !Array.isArray(filesForField) ||
              filesForField.length === 0
            ) {
              errors.push(
                `Required upload field '${field.name}' is missing or empty`
              );
              errorCodes.push(field.name);
            }
          }
        }
      }

      if (errors.length > 0) {
        throw new AppError(
          errors[0],
          400,
          `Missing${pascalCase(errorCodes[0]).replaceAll("_", "")}FileField`,
          {
            errors,
          }
        );
      }

      next();
    });
  }

  handleFileCleanup(config: UploadConfig) {
    return async (
      err: any,
      req: ArkosRequest,
      _: ArkosResponse,
      next: ArkosNextFunction
    ) => {
      const deleteFile = async (file: Express.Multer.File) => {
        try {
          await fs.promises.unlink(file.path);
        } catch (error: any) {
          sheu.warn(
            `Failed to delete file: ${file.path} because ${error.message}`,
            { timestamp: true }
          );
        }
      };

      try {
        if (config.type === "single" && req.file) {
          await deleteFile(req.file);
          delete req.file;
        } else if (config.type === "array" && Array.isArray(req.files)) {
          for (const file of req.files) {
            await deleteFile(file);
          }
          delete req.files;
        } else if (
          config.type === "fields" &&
          req.files &&
          !Array.isArray(req.files)
        ) {
          for (const fieldName in req.files) {
            for (const file of req.files[fieldName]) {
              await deleteFile(file);
            }
          }
          delete req.files;
        }
      } catch (error: any) {
        sheu.warn(`File cleanup error: ${error.message}`, { timestamp: true });
      }

      next(err);
    };
  }

  handlePostUpload(config: UploadConfig) {
    return catchAsync(
      (req: ArkosRequest, _: ArkosResponse, next: ArkosNextFunction) => {
        const { baseURL, baseRoute } = extractRequestInfo(req);
        const arkosConfig = getArkosConfig();

        const normalizePath = (filePath: string): string => {
          let fullBaseUploadDir = path.resolve(
            path.join(process.cwd(), arkosConfig.fileUpload?.baseUploadDir!)
          );
          fullBaseUploadDir = fullBaseUploadDir.replace(process.cwd(), "");

          return filePath
            .replaceAll(process.cwd(), "")
            .replace(`/${fullBaseUploadDir}`, "")
            .replace(fullBaseUploadDir, "")
            .replace(/\\/g, "/");
        };

        const buildFileURL = (file: Express.Multer.File): string => {
          const relativePath = generateRelativePath(
            file.path,
            req.headers["x-upload-dir"] as string
          );

          console.log(relativePath, "thepath");
          return `${baseURL}${baseRoute === "/" ? "" : baseRoute}${
            relativePath.startsWith("/") ? relativePath : `/${relativePath}`
          }`;
        };

        const getAttachValue = (file: Express.Multer.File): any => {
          const url = buildFileURL(file);

          (file as any).url = url;
          (file as any).pathname = normalizePath(file.path);

          if (config.attachToBody === false) return undefined;
          if (config.attachToBody === "pathname" || !config.attachToBody)
            return (
              (baseRoute === "/"
                ? ""
                : baseRoute.startsWith("/")
                  ? baseRoute
                  : `/${baseRoute}`) + normalizePath(file.path)
            );
          if (config.attachToBody === "url") return url;
          if (config.attachToBody === "file") return file;

          return undefined;
        };

        const setNestedValue = (obj: any, path: string, value: any) => {
          const keys = path.match(/[^\[\]]+/g) || [];

          let current = obj;
          for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key]) {
              const nextKey = keys[i + 1];
              current[key] = /^\d+$/.test(nextKey) ? [] : {};
            }
            current = current[key];
          }

          const lastKey = keys[keys.length - 1];
          current[lastKey] = value;
        };

        try {
          if (config.type === "single" && req.file) {
            const value = getAttachValue(req.file);

            if (value !== undefined && config.field) {
              const bodyUpdate: any = {};
              setNestedValue(bodyUpdate, config.field, value);
              req.body = deepmerge(req.body || {}, bodyUpdate);
            }
          } else if (config.type === "array" && Array.isArray(req.files)) {
            const values = req.files
              .map((file) => getAttachValue(file))
              .filter((v) => v !== undefined);

            if (values.length > 0 && config.field) {
              const bodyUpdate: any = {};
              setNestedValue(bodyUpdate, config.field, values);
              req.body = deepmerge(req.body || {}, bodyUpdate);
            }
          } else if (
            config.type === "fields" &&
            req.files &&
            !Array.isArray(req.files)
          ) {
            const bodyUpdate: any = {};

            for (const fieldName in req.files) {
              const files = req.files[fieldName];
              const values = files
                .map((file) => getAttachValue(file))
                .filter((v) => v !== undefined);

              if (values.length > 0) {
                const valueToAttach = values.length === 1 ? values[0] : values;
                setNestedValue(bodyUpdate, fieldName, valueToAttach);
              }
            }

            if (Object.keys(bodyUpdate).length > 0) {
              req.body = deepmerge(req.body || {}, bodyUpdate);
            }
          }
        } catch (err: any) {
          throw new AppError(
            `File uploads post processing failed ${err.message}`,
            500,
            "FileUploadPostProcessError"
          );
        }

        next();
      }
    );
  }

  /**
   * Validates the file's type and MIME type.
   * @param {Express.Multer.File} file - The uploaded file.
   * @param {Function} cb - The callback function to indicate if file is valid.
   */
  private fileFilter = (
    _: any,
    file: any,
    cb: any,
    allowedFileTypes: string[] | RegExp
  ) => {
    const ext = path.extname(file.originalname).toLowerCase();
    let isAllowed = false;
    if (Array.isArray(allowedFileTypes))
      isAllowed = allowedFileTypes.includes(ext);
    else isAllowed = allowedFileTypes.test(ext);

    if (isAllowed) cb(null, true);
    else
      cb(
        new AppError(
          `File type not allowed, allowed files are ${String(allowedFileTypes).replaceAll("/", "").split("|").join(", ")}`,
          400,
          "FileTypeNotAllowed",
          { filename: file.originalname }
        )
      );
  };
}

const uploadManager = new UploadManager();

export default uploadManager;
