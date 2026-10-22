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
  ImageOptimizationOptions,
  optimizeImage,
} from "../../../../modules/file-upload/utils/helpers/file-upload.helpers";
import deepmerge from "../../../helpers/deepmerge.helper";
import { catchAsync } from "../../../../exports/error-handler";
import {
  ArkosFile,
  UploadDirParams,
  UploadPrepare,
  UploadPrepareFile,
  UploadUrlPath,
} from "../../../../types/upload";
import {
  isSafeUploadParam,
  normalizeUploadDir,
  normalizeUploadUrlPath,
  resolveUploadPath,
} from "../../../../modules/file-upload/utils/helpers/upload-path.helper";
import { uploadServingRegistry } from "../../../../modules/file-upload/utils/helpers/upload-serving.registry";
import { ConflictError } from "../../../../modules/error-handler/utils/errors";

function determineUploadDir(file: Express.Multer.File) {
  if (file.mimetype.includes?.("image")) return "/images";
  if (file.mimetype.includes?.("video")) return "/videos";
  if (imagesExtenstions.has(file.mimetype.split("/")[1])) return "/images";
  if (videosExtensions.has(file.mimetype.split("/")[1])) return "/videos";
  if (documentsExtensions.has(file.mimetype.split("/")[1])) return "/documents";
  return "/files";
}

type UploadSettings = {
  uploadDir?: string;
  urlPath?: UploadUrlPath;
  prepare?: UploadPrepare;
  prepareFile?: UploadPrepareFile;
  overwrite?: boolean;
  key: string;
};

type ResolvedUploadSettings = {
  dirParams: UploadDirParams;
  uploadDir: string;
  urlPath: string;
  urlPathExact: boolean;
};

function getTemplateParams(template: string): string[] {
  return template
    .split("/")
    .filter((segment) => segment.startsWith(":"))
    .map((segment) => segment.slice(1).replace(/\(.*\)$/, ""));
}

function substituteUploadTemplate(
  template: string,
  values: Record<string, string>,
  label: string
): string {
  const missing: string[] = [];

  const result = template
    .split("/")
    .map((segment) => {
      if (!segment.startsWith(":")) return segment;

      const name = segment.slice(1).replace(/\(.*\)$/, "");
      const value = values[name];

      if (value === undefined) {
        missing.push(name);
        return segment;
      }

      if (!isSafeUploadParam(value))
        throw new Error(`Invalid upload param ":${name}" for ${label}`);

      return value;
    })
    .join("/");

  if (missing.length > 0)
    throw new Error(
      `Missing required upload param(s) ${missing
        .map((name) => `":${name}"`)
        .join(", ")} for ${label}.`
    );

  return result;
}

function stripExtension(filename: string): string {
  const ext = path.extname(filename);
  return ext ? filename.slice(0, -ext.length) : filename;
}

const RESERVED_FILE_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

function isSafeFileName(filename: string): boolean {
  return (
    typeof filename === "string" &&
    filename.length > 0 &&
    filename.length <= 255 &&
    !filename.includes("/") &&
    !filename.includes("\\") &&
    !filename.includes("\0") &&
    filename !== "." &&
    filename !== ".." &&
    !/[. ]$/.test(filename) &&
    !RESERVED_FILE_NAMES.test(filename)
  );
}

function isInside(base: string, target: string): boolean {
  const relative = path.relative(base, target);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

function safeOriginalBaseName(file: Express.Multer.File): string {
  const ext = path.extname(file.originalname);
  const base = path
    .basename(file.originalname, ext)
    .replace(/[^A-Za-z0-9._ -]/g, "-")
    .replace(/^[. ]+/, "");

  return base || "file";
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    void (async () => {
      try {
        const arkosReq = req as ArkosRequest;
        const arkosConfig = getArkosConfig();
        const baseUploadDir =
          arkosConfig.fileUpload?.baseUploadDir || "/uploads";
        const settings = uploadManager.getUploadSettingsForFile(
          arkosReq.__arkos?.uploadConfig,
          file
        );
        const resolved = await uploadManager.resolveUploadSettings(
          arkosReq,
          file,
          settings
        );
        const basePath = path.resolve(
          process.cwd(),
          baseUploadDir.replaceAll("//", "/")
        );
        const fullUploadDir = resolveUploadPath(
          basePath,
          resolved.uploadDir,
          { strictSegments: true }
        );

        if (!fullUploadDir)
          throw new Error(`Invalid upload directory "${resolved.uploadDir}"`);

        (file as ArkosFile).__arkos = {
          uploadDir: resolved.uploadDir,
          urlPath: resolved.urlPath,
          urlPathExact: resolved.urlPathExact,
          dirParams: resolved.dirParams,
          uploadPath: fullUploadDir,
        };

        if (!fs.existsSync(fullUploadDir))
          fs.mkdirSync(fullUploadDir, { recursive: true });

        cb(null, fullUploadDir);
      } catch (error) {
        cb(error as Error, "");
      }
    })();
  },
  filename: (req, file, cb) => {
    void (async () => {
      try {
        const arkosReq = req as ArkosRequest;
        const settings = uploadManager.getUploadSettingsForFile(
          arkosReq.__arkos?.uploadConfig,
          file
        );
        const meta = (file as ArkosFile).__arkos;
        const index = uploadManager.nextFileIndex(arkosReq, file);
        let preparedBase: string | undefined;

        if (settings.prepareFile) {
          const result = await settings.prepareFile(
            {
              file: file as ArkosFile,
              dirParams: meta?.dirParams || {},
              index,
            },
            arkosReq,
            arkosReq.res?.locals || {}
          );

          if (result?.filename !== undefined) {
            if (typeof result.filename !== "string")
              throw new Error("prepareFile must return a string filename");

            preparedBase = stripExtension(result.filename);

            if (!isSafeFileName(preparedBase))
              throw new Error(
                `Invalid file name "${result.filename}" returned by prepareFile`
              );
          }
        }

        const ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const finalName = preparedBase
          ? `${preparedBase}${ext}`
          : `${safeOriginalBaseName(file)}-${uniqueSuffix}${ext}`;
        const uploadPath = meta?.uploadPath || "";

        if (!uploadPath)
          throw new Error(
            `Unable to resolve the upload directory for file "${file.originalname}"`
          );

        const targetPath = path.resolve(uploadPath, finalName);

        if (!isInside(uploadPath, targetPath))
          throw new Error(`Invalid file name "${finalName}"`);

        const targets = (arkosReq.__arkos!.uploadTargetPaths ??= new Set());

        if (targets.has(targetPath))
          throw new ConflictError(
            `Duplicate upload target "${finalName}" in the same request`,
            "UploadConflict",
            { filename: finalName }
          );

        if (settings.overwrite === false && fs.existsSync(targetPath))
          throw new ConflictError(
            `File "${finalName}" already exists and overwrite is disabled`,
            "UploadConflict",
            { filename: finalName }
          );

        targets.add(targetPath);
        (arkosReq.__arkos!.uploadWrittenPaths ??= []).push(targetPath);
        (file as ArkosFile).__arkos = {
          ...meta,
          targetPath,
        };

        cb(null, finalName);
      } catch (error) {
        cb(error as Error, "");
      }
    })();
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

const isImageFile = (file: ArkosFile): boolean =>
  !!file?.mimetype?.includes?.("image");

const collectUploadedFiles = (req: ArkosRequest): ArkosFile[] => {
  if (req.file) return [req.file as ArkosFile];
  if (Array.isArray(req.files)) return req.files as ArkosFile[];
  if (req.files && typeof req.files === "object")
    return Object.values(req.files).flat() as ArkosFile[];
  return [];
};

const getImageOptionsForFile = (
  config: UploadConfig,
  file: ArkosFile
): ImageOptimizationOptions | undefined => {
  const baseOptions = (config as ArkosRouterBaseUploadConfig).image;
  if (config.type !== "fields") return baseOptions;

  const field = config.fields.find((entry) => {
    if (entry.name === file.fieldname) return true;
    try {
      return buildPathMatcher(entry.name).test(file.fieldname);
    } catch {
      return false;
    }
  }) as
    | (UploadConfigFieldEntry & { image?: ImageOptimizationOptions })
    | undefined;

  return field?.image ?? baseOptions;
};

const optimizeUploadedImages = async (
  config: UploadConfig,
  files: ArkosFile[]
): Promise<void> => {
  for (const file of files) {
    try {
      const optimizedPath = await optimizeImage(
        file.path,
        getImageOptionsForFile(config, file)
      );
      file.path = optimizedPath;
      file.filename = path.basename(optimizedPath);
      try {
        file.size = (await promisify(fs.stat)(optimizedPath)).size;
      } catch {}
    } catch (error: any) {
      if (error?.message === "Input file contains unsupported image format")
        continue;
      throw new Error(`Cannot process uploaded image: ${error.message}`);
    }
  }
};

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
  getUploadSettingsForFile(
    config: UploadConfig | undefined,
    file: Express.Multer.File
  ): UploadSettings {
    if (!config) return { key: "config" };

    if (config.type === "fields") {
      const field = config.fields.find((entry) => {
        if (entry.name === file.fieldname) return true;
        try {
          return buildPathMatcher(entry.name).test(file.fieldname);
        } catch {
          return false;
        }
      });
      const typedField =
        field && "type" in field && field.type !== undefined ? field : undefined;

      return {
        uploadDir: typedField?.uploadDir ?? config.uploadDir,
        urlPath: typedField?.urlPath ?? config.urlPath,
        prepare: typedField?.prepare ?? config.prepare,
        prepareFile: typedField?.prepareFile ?? config.prepareFile,
        overwrite: typedField?.overwrite ?? config.overwrite,
        key: `field:${field?.name ?? file.fieldname}`,
      };
    }

    return {
      uploadDir: config.uploadDir,
      urlPath: config.urlPath,
      prepare: config.prepare,
      prepareFile: config.prepareFile,
      overwrite: config.overwrite,
      key: `config:${config.type}`,
    };
  }

  async resolveUploadSettings(
    req: ArkosRequest,
    file: Express.Multer.File,
    settings: UploadSettings
  ): Promise<ResolvedUploadSettings> {
    req.__arkos ??= {};
    const cached = req.__arkos.preparedUploads?.get(settings.key);
    if (cached) return cached;

    const prepared = settings.prepare
      ? await settings.prepare(req, req.res?.locals || {})
      : undefined;
    const dirParams: UploadDirParams = {};

    for (const [key, value] of Object.entries(prepared?.dirParams || {})) {
      if (typeof value !== "string")
        throw new Error(`prepare returned a non-string value for ":${key}"`);

      dirParams[key] = value;
    }

    const values: Record<string, string> = {};

    for (const [key, value] of Object.entries(req.params || {}))
      if (typeof value === "string") values[key] = value;

    Object.assign(values, dirParams);

    const uploadDir = normalizeUploadDir(
      substituteUploadTemplate(
        settings.uploadDir || determineUploadDir(file),
        values,
        "upload directory"
      )
    );

    let urlPath: string;
    let urlPathExact = false;

    if (settings.urlPath && typeof settings.urlPath === "object") {
      urlPath = normalizeUploadUrlPath(settings.urlPath.exact);
      urlPathExact = true;
    } else {
      urlPath = normalizeUploadUrlPath(
        substituteUploadTemplate(
          settings.urlPath || `/${uploadDir}`,
          values,
          "upload URL path"
        )
      );
    }

    const resolved: ResolvedUploadSettings = {
      dirParams,
      uploadDir,
      urlPath,
      urlPathExact,
    };

    (req.__arkos!.preparedUploads ??= new Map()).set(settings.key, resolved);

    return resolved;
  }

  nextFileIndex(req: ArkosRequest, file: Express.Multer.File): number {
    req.__arkos ??= {};
    const indexes = (req.__arkos.uploadFileIndexes ??= {});
    const index = indexes[file.fieldname] ?? 0;
    indexes[file.fieldname] = index + 1;
    return index;
  }

  async cleanupRequestFiles(req: ArkosRequest): Promise<void> {
    const paths = req.__arkos?.uploadWrittenPaths || [];

    for (const filePath of paths) {
      try {
        await fs.promises.unlink(filePath);
      } catch (error: any) {
        if (error?.code !== "ENOENT")
          sheu.warn(
            `Failed to delete file: ${filePath} because ${error.message}`,
            { timestamp: true }
          );
      }
    }

    if (req.__arkos) {
      req.__arkos.uploadWrittenPaths = [];
      req.__arkos.uploadTargetPaths = new Set();
    }

    delete req.file;
    delete req.files;
  }

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

  registerUploadConfig(config: UploadConfig, route: string) {
    const register = (
      dir: string | undefined,
      urlPath: UploadUrlPath | undefined,
      serve: boolean | undefined,
      hasPrepare: boolean,
      type: "single" | "array" | "fields"
    ) =>
      uploadServingRegistry.registerWrite({
        dir,
        urlPath,
        serve,
        route,
        hasPrepare,
        type,
      });

    if (config.type === "single" || config.type === "array") {
      register(
        config.uploadDir,
        config.urlPath,
        config.serve,
        !!config.prepare,
        config.type
      );
      return;
    }

    for (const field of config.fields) {
      const isLegacy = !("type" in field) || field.type === undefined;

      if (isLegacy) {
        register(
          config.uploadDir,
          config.urlPath,
          config.serve,
          !!config.prepare,
          "array"
        );
        continue;
      }

      register(
        field.uploadDir ?? config.uploadDir,
        field.urlPath ?? config.urlPath,
        field.serve ?? config.serve,
        !!(field.prepare ?? config.prepare),
        field.type ?? "array"
      );
    }
  }

  handleUpload(config: UploadConfig, oldFilePath?: string) {
    return catchAsync(
      (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        const middleware = this.getMiddleware(config);
        req.__arkos = { ...req.__arkos, uploadConfig: config };
        middleware(req, res, async (err: any) => {
          if (err) {
            if (
              err instanceof ConflictError ||
              err?.code === "UploadConflict"
            )
              await this.cleanupRequestFiles(req);

            return next(err);
          }

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
      async (req: ArkosRequest, _: ArkosResponse, next: ArkosNextFunction) => {
        const { baseURL, baseRoute } = extractRequestInfo(req);

        const baseRoutePath =
          baseRoute === "/" ? "" : normalizeUploadUrlPath(baseRoute);

        const getPublicRelativePath = (file: ArkosFile): string => {
          if (file.__arkos?.urlPathExact)
            return normalizeUploadUrlPath(file.__arkos.urlPath || "/");

          const publicDir =
            file.__arkos?.urlPath ||
            `/${normalizeUploadDir(file.__arkos?.uploadDir || "")}`;

          return `${normalizeUploadUrlPath(publicDir)}/${
            file.filename || path.basename(file.path)
          }`.replace(/\/+/g, "/");
        };

        const buildFileURL = (file: ArkosFile): string =>
          `${baseURL}${baseRoutePath}${getPublicRelativePath(file)}`;

        const getAttachValue = (
          file: ArkosFile,
          attachToBody: ArkosRouterBaseUploadConfig["attachToBody"]
        ) => {
          const url = buildFileURL(file);

          file.url = url;
          file.pathname = `${baseRoutePath}${getPublicRelativePath(file)}`;

          if (attachToBody === false) return undefined;
          if (attachToBody === "url") return url;
          if (attachToBody === "file") return file;
          if (typeof attachToBody === "function") {
            const result = attachToBody(file);
            if (result) return result;
          }

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
          const imageFiles = collectUploadedFiles(req).filter(isImageFile);
          if (imageFiles.length > 0)
            await optimizeUploadedImages(config, imageFiles);

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
          if (err instanceof AppError) throw err;
          throw new Error(`File uploads post processing failed: ${err.message}`);
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

  isAllFieldRequired(uploadConfig: UploadConfig): boolean {
    let isRequired = false;
    if (!uploadConfig) return false;

    if (uploadConfig.type !== "fields")
      isRequired = uploadConfig.required !== false;
    else {
      isRequired =
        (uploadConfig as any).required !== undefined
          ? (uploadConfig as any).required
          : uploadConfig.fields.every(
              (field) =>
                (field as any).required || (field as any).required === undefined
            );
    }

    return isRequired;
  }
}

const uploadManager = new UploadManager();

export default uploadManager;
