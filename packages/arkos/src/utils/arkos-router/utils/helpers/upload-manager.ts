import multer from "multer";
import {
  ArkosRouterBaseUploadConfig,
  UploadConfig,
  UploadConfigFieldEntry,
} from "../../types/upload-config";
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
import { ArkosFile } from "../../../../types/upload";

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

/**
 * Returns true if a bracket-notation path contains at least one `[]` array marker.
 * e.g. "banners[][images]" → true, "profile[photo]" → false
 */
function isNestedArrayPath(fieldPath: string): boolean {
  return fieldPath.includes("[]");
}

/**
 * Converts a config bracket path (e.g. "banners[][images]") into a RegExp
 * that matches what the client actually sends (e.g. "banners[0][images]").
 * `[]` in the pattern matches `[<digits>]`.
 */
function buildPathMatcher(pattern: string): RegExp {
  const escaped = pattern
    .replace(/\[]/g, "\x00")
    .replace(/[\[\]]/g, "\\$&")
    .replace(/\x00/g, "\\[\\d+\\]");
  return new RegExp(`^${escaped}$`);
}
/**
 * Extracts the numeric index from a segment like "[0]", "[12]", etc.
 */
function extractIndex(segment: string): number {
  return parseInt(segment.replace(/\[|\]/g, ""), 10);
}

/**
 * Given a client-sent key like "banners[0][images]" and a pattern like
 * "banners[][images]", extracts an ordered list of array indices.
 */
function extractIndices(key: string, pattern: string): number[] {
  const patternParts = pattern.match(/\[[^\]]*\]/g) || [];
  const keyParts = key.match(/\[[^\]]*\]/g) || [];
  const indices: number[] = [];
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i] === "[]") {
      indices.push(extractIndex(keyParts[i]));
    }
  }
  return indices;
}

/**
 * Groups files from req.files by their array indices for a given pattern.
 */
function groupFilesByPattern(
  files: { [fieldname: string]: ArkosFile[] },
  pattern: string
): Map<string, ArkosFile[]> {
  const matcher = buildPathMatcher(pattern);
  const groups = new Map<string, ArkosFile[]>();

  for (const key of Object.keys(files)) {
    if (!matcher.test(key)) continue;
    const indices = extractIndices(key, pattern);
    const groupKey = indices.join(",");
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push(...files[key]);
  }

  return groups;
}

/**
 * Validates file type and size for files that bypass multer's own fileFilter
 * (i.e. nested array path fields handled via .any()).
 */
function validateFileConstraints(
  file: ArkosFile,
  allowedFileTypes?: string[] | RegExp,
  maxSize?: number
): string | null {
  if (maxSize && file.size > maxSize) {
    return `File '${file.originalname}' exceeds the maximum allowed size of ${maxSize} bytes`;
  }

  if (allowedFileTypes) {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = Array.isArray(allowedFileTypes)
      ? allowedFileTypes.includes(ext)
      : allowedFileTypes.test(ext);
    if (!allowed) {
      return `File type '${ext}' is not allowed for '${file.originalname}'`;
    }
  }

  return null;
}

/**
 * Flattens a fields config for multer's fields() call.
 */
function flattenFieldsForMulter(
  fields: UploadConfigFieldEntry[]
): { name: string; maxCount: number }[] {
  return fields.map((field) => ({
    name: field.name,
    maxCount:
      "type" in field && field.type === "single" ? 1 : (field.maxCount ?? 5),
  }));
}

/**
 * Returns true if any field path uses nested array bracket notation.
 */
function configHasNestedArrayPaths(config: UploadConfig): boolean {
  if (config.type === "single" || config.type === "array") {
    return isNestedArrayPath(config.field);
  }
  if (config.type === "fields") {
    return config.fields.some((f) => isNestedArrayPath(f.name));
  }
  return false;
}

/**
 * Narrows a field entry to its typed props.
 * Legacy entries ({ name, maxCount } with no type) are treated as array with defaults.
 */
function resolveFieldEntry(
  field: UploadConfigFieldEntry,
  config: ArkosRouterBaseUploadConfig = {}
): {
  name: string;
  type: "single" | "array";
  required: boolean;
  minCount: number | undefined;
  maxCount: number | undefined;
  allowedFileTypes: string[] | RegExp | undefined;
  maxSize: number | undefined;
  attachToBody: ArkosRouterBaseUploadConfig["attachToBody"];
} {
  const isLegacy = !("type" in field) || field.type === undefined;
  if (isLegacy) {
    return {
      ...config,
      name: field.name,
      type: "array",
      required: !!config.required,
      minCount: field.minCount,
      maxCount: field.maxCount,
      allowedFileTypes: config.allowedFileTypes,
      maxSize: config.maxSize,
      attachToBody: config.attachToBody,
    };
  }

  if (field.type === "single") {
    return {
      name: field.name,
      type: "single",
      required: field.required !== false,
      minCount: undefined,
      maxCount: undefined,
      allowedFileTypes: field.allowedFileTypes,
      maxSize: field.maxSize,
      attachToBody: field.attachToBody,
    };
  }

  // type === "array"
  return {
    name: field.name,
    type: "array",
    required: field.required !== false,
    minCount: field.minCount,
    maxCount: field.maxCount,
    allowedFileTypes: field.allowedFileTypes,
    maxSize: field.maxSize,
    attachToBody: field.attachToBody,
  };
}

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
    if (configHasNestedArrayPaths(config)) {
      return multer({ storage }).any();
    }

    if (config.type === "single") {
      return this.getUpload(config).single(config.field);
    } else if (config.type === "array") {
      return this.getUpload(config).array(config.field, config.maxCount ?? 5);
    } else {
      const multerOptions =
        "maxSize" in config || "allowedFileTypes" in config
          ? {
              maxSize: (config as any).maxSize,
              allowedFileTypes: (config as any).allowedFileTypes,
            }
          : {};
      return this.getUpload(multerOptions).fields(
        flattenFieldsForMulter(config.fields)
      );
    }
  }

  handleUpload(config: UploadConfig, oldFilePath?: string) {
    return catchAsync(
      (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        const middleware = this.getMiddleware(config);
        req.headers["x-upload-dir"] =
          "uploadDir" in config ? config.uploadDir : undefined;
        middleware(req, res, async (err: any) => {
          if (err) return next(err);

          // .any() gives req.files as File[] — normalize to { [fieldname]: File[] }
          // so groupFilesByPattern works correctly for nested array paths
          if (configHasNestedArrayPaths(config) && Array.isArray(req.files)) {
            const normalized: { [fieldname: string]: ArkosFile[] } = {};
            for (const file of req.files) {
              if (!normalized[file.fieldname]) normalized[file.fieldname] = [];
              normalized[file.fieldname].push(file);
            }
            req.files = normalized;
          }

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

  validateRequiredFiles(uploadConfig: UploadConfig) {
    return catchAsync((req: ArkosRequest, _: any, next: ArkosNextFunction) => {
      const errors: string[] = [];
      const errorCodes: string[] = [];

      const addError = (msg: string, code: string) => {
        errors.push(msg);
        errorCodes.push(code);
      };

      const validateField = (
        field: string,
        type: "single" | "array",
        required: boolean,
        minCount: number | undefined,
        maxCount: number | undefined,
        allowedFileTypes: string[] | RegExp | undefined,
        maxSize: number | undefined
      ) => {
        const isNested = isNestedArrayPath(field);

        if (isNested) {
          const filesObj = req.files as {
            [fieldname: string]: ArkosFile[];
          };
          if (!filesObj || Array.isArray(filesObj)) {
            if (required)
              addError(`Required field '${field}' is missing`, field);
            return;
          }

          const groups = groupFilesByPattern(filesObj, field);

          if (groups.size === 0) {
            if (required)
              addError(`Required field '${field}' is missing`, field);
            return;
          }

          for (const [groupKey, groupFiles] of groups) {
            const label = `'${field}' (group ${groupKey})`;

            if (type === "single" && groupFiles.length !== 1) {
              addError(`Field ${label} must have exactly 1 file`, field);
            }

            if (type === "array") {
              if (minCount && groupFiles.length < minCount) {
                addError(
                  `Field ${label} requires at least ${minCount} files, got ${groupFiles.length}`,
                  field
                );
              }
              if (maxCount && groupFiles.length > maxCount) {
                addError(
                  `Field ${label} allows at most ${maxCount} files, got ${groupFiles.length}`,
                  field
                );
              }
            }

            for (const file of groupFiles) {
              const err = validateFileConstraints(
                file,
                allowedFileTypes,
                maxSize
              );
              if (err) addError(err, field);
            }
          }
        } else {
          if (type === "single") {
            if (required && !req.file) {
              addError(`Required upload field '${field}' is missing`, field);
            }
          } else {
            const filesObj = req.files as {
              [fieldname: string]: ArkosFile[];
            };
            const files = Array.isArray(req.files)
              ? req.files
              : filesObj?.[field];

            if (!files || files.length === 0) {
              if (required)
                addError(
                  `Required upload field '${field}' is missing or empty`,
                  field
                );
            } else if (!Array.isArray(files)) {
              if (required)
                addError(`Malformed upload field '${field}'`, field);
            } else {
              if (minCount && files.length < minCount) {
                addError(
                  `Field '${field}' requires at least ${minCount} files, got ${files.length}`,
                  field
                );
              }
            }
          }
        }
      };

      if (uploadConfig.type === "single") {
        validateField(
          uploadConfig.field,
          "single",
          uploadConfig.required !== false,
          undefined,
          undefined,
          isNestedArrayPath(uploadConfig.field)
            ? uploadConfig.allowedFileTypes
            : undefined,
          isNestedArrayPath(uploadConfig.field)
            ? uploadConfig.maxSize
            : undefined
        );
      } else if (uploadConfig.type === "array") {
        validateField(
          uploadConfig.field,
          "array",
          uploadConfig.required !== false,
          uploadConfig.minCount,
          uploadConfig.maxCount,
          isNestedArrayPath(uploadConfig.field)
            ? uploadConfig.allowedFileTypes
            : undefined,
          isNestedArrayPath(uploadConfig.field)
            ? uploadConfig.maxSize
            : undefined
        );
      } else if (uploadConfig.type === "fields") {
        for (const fieldEntry of uploadConfig.fields) {
          const resolved = resolveFieldEntry(fieldEntry, uploadConfig);
          validateField(
            resolved.name,
            resolved.type,
            resolved.required,
            resolved.minCount,
            resolved.maxCount,
            isNestedArrayPath(resolved.name)
              ? resolved.allowedFileTypes
              : undefined,
            isNestedArrayPath(resolved.name) ? resolved.maxSize : undefined
          );
        }
      }

      if (errors.length > 0) {
        throw new AppError(
          errors[0],
          400,
          uploadConfig.type !== "single"
            ? `MissingUploadFields`
            : `MissingUploadField`,
          { errors }
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
      const deleteFile = async (file: ArkosFile) => {
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
        } else if (
          (config.type === "array" || configHasNestedArrayPaths(config)) &&
          Array.isArray(req.files)
        ) {
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

        const buildFileURL = (file: ArkosFile): string => {
          const relativePath = generateRelativePath(
            file.path,
            req.headers["x-upload-dir"] as string
          );
          return `${baseURL}${baseRoute === "/" ? "" : baseRoute}${
            relativePath.startsWith("/") ? relativePath : `/${relativePath}`
          }`;
        };

        const getAttachValue = (
          file: ArkosFile,
          attachToBody: ArkosRouterBaseUploadConfig["attachToBody"]
        ) => {
          const url = buildFileURL(file);

          file.url = url;
          file.pathname =
            (baseRoute === "/"
              ? ""
              : baseRoute.startsWith("/")
                ? baseRoute
                : `/${baseRoute}`) + normalizePath(file.path);

          if (attachToBody === false) return undefined;
          if (attachToBody === "url") return url;
          if (attachToBody === "file") return file;

          return (file as any).pathname;
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

        /**
         * Reconstructs nested array structure from grouped files.
         *
         * Pattern: "banners[][images]"
         * Groups: { "0": [file1, file2], "1": [file3] }
         *
         * Result in req.body:
         * banners: [
         *   { images: ["path1", "path2"] },
         *   { images: ["path3"] }
         * ]
         */
        const reconstructNestedArrayPath = (
          pattern: string,
          filesObj: { [fieldname: string]: ArkosFile[] },
          attachToBody: ArkosRouterBaseUploadConfig["attachToBody"],
          type: "single" | "array",
          sharedBodyUpdate?: any
        ) => {
          const groups = groupFilesByPattern(filesObj, pattern);
          if (groups.size === 0) return;

          // Parse the pattern to build the reconstruction path.
          // Split into segments: static keys and [] markers.
          // e.g. "banners[][images]" → ["banners", "[]", "images"]
          const segments = pattern.match(/[^\[\]]+|\[\]/g) || [];

          // Sort group keys so indices are in order
          const sortedGroups = [...groups.entries()].sort((a, b) => {
            const ai = a[0].split(",").map(Number);
            const bi = b[0].split(",").map(Number);
            for (let i = 0; i < Math.min(ai.length, bi.length); i++) {
              if (ai[i] !== bi[i]) return ai[i] - bi[i];
            }
            return 0;
          });

          const bodyUpdate = sharedBodyUpdate ?? {};

          for (const [groupKey, groupFiles] of sortedGroups) {
            const indices = groupKey.split(",").map(Number);
            let indexCounter = 0;

            // Build the concrete path for this group by replacing [] with actual indices
            const concretePath = segments
              .map((seg) => {
                if (seg === "[]") return `[${indices[indexCounter++]}]`;
                return seg;
              })
              .reduce((acc, seg, i) => {
                if (i === 0) return seg;
                if (seg.startsWith("[")) return acc + seg;
                return acc + `[${seg}]`;
              }, "");

            const values = groupFiles
              .map((f) => getAttachValue(f, attachToBody))
              .filter((v) => v !== undefined);

            if (values.length === 0) continue;

            const valueToSet = type === "single" ? values[0] : values;
            setNestedValue(bodyUpdate, concretePath, valueToSet);
          }

          if (!sharedBodyUpdate) {
            req.body = deepmerge(req.body || {}, bodyUpdate);
          }
        };

        try {
          if (config.type === "single") {
            if (isNestedArrayPath(config.field)) {
              const filesObj = req.files as {
                [fieldname: string]: ArkosFile[];
              };
              if (filesObj && !Array.isArray(filesObj)) {
                reconstructNestedArrayPath(
                  config.field,
                  filesObj,
                  config.attachToBody,
                  "single"
                );
              }
            } else if (req.file) {
              const value = getAttachValue(req.file, config.attachToBody);
              if (value !== undefined) {
                const bodyUpdate: any = {};
                setNestedValue(bodyUpdate, config.field, value);
                req.body = deepmerge(req.body || {}, bodyUpdate);
              }
            }
          } else if (config.type === "array") {
            if (isNestedArrayPath(config.field)) {
              const filesObj = req.files as {
                [fieldname: string]: ArkosFile[];
              };
              if (filesObj && !Array.isArray(filesObj)) {
                reconstructNestedArrayPath(
                  config.field,
                  filesObj,
                  config.attachToBody,
                  "array"
                );
              }
            } else if (Array.isArray(req.files)) {
              const values = req.files
                .map((file) => getAttachValue(file, config.attachToBody))
                .filter((v) => v !== undefined);
              if (values.length > 0) {
                const bodyUpdate: any = {};
                setNestedValue(bodyUpdate, config.field, values);
                req.body = deepmerge(req.body || {}, bodyUpdate);
              }
            }
          } else if (config.type === "fields") {
            const filesObj = req.files as {
              [fieldname: string]: ArkosFile[];
            };
            if (!filesObj || Array.isArray(filesObj)) return next();

            const bodyUpdate: any = {};
            const configAttachToBody =
              "attachToBody" in config ? config.attachToBody : undefined;

            for (const fieldEntry of config.fields) {
              const resolved = resolveFieldEntry(fieldEntry);

              if (isNestedArrayPath(resolved.name)) {
                reconstructNestedArrayPath(
                  resolved.name,
                  filesObj,
                  resolved.attachToBody ?? configAttachToBody,
                  resolved.type,
                  bodyUpdate
                );
              } else {
                const files = filesObj[resolved.name];
                if (!files || files.length === 0) continue;

                const attachTo = resolved.attachToBody ?? configAttachToBody;
                const values = files
                  .map((f) => getAttachValue(f, attachTo))
                  .filter((v) => v !== undefined);

                if (values.length === 0) continue;

                const valueToAttach =
                  resolved.type === "single" ? values[0] : values;
                setNestedValue(bodyUpdate, resolved.name, valueToAttach);
              }
            }

            if (Object.keys(bodyUpdate).length > 0) {
              req.body = deepmerge(req.body || {}, bodyUpdate, {
                arrayMerge: (target, source) => {
                  const result = [...target];
                  source.forEach((item, i) => {
                    result[i] = result[i] ? deepmerge(result[i], item) : item;
                  });
                  return result;
                },
              });
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
