import fs from "fs";
import path from "path";
import sharp from "sharp";
import { promisify } from "util";
import { getArkosConfig } from "../../../../server";
import mimetype from "mimetype";
import {
  ArkosNextFunction,
  ArkosRequest,
  ArkosResponse,
} from "../../../../types";
import { fullCleanCwd } from "../../../../utils/helpers/fs.helpers";
import AppError from "../../../error-handler/utils/app-error";

export function adjustRequestUrl(
  req: ArkosRequest,
  _: ArkosResponse,
  next: ArkosNextFunction,
) {
  const { fileUpload } = getArkosConfig();
  req.url = req.url.replace(
    fileUpload?.baseRoute + "/" || "/api/uploads/",
    "/",
  );
  req.url = req.url.replace(fileUpload?.baseRoute || "/api/uploads/", "/");
  next();
}

export function extractRequestInfo(req: ArkosRequest) {
  const { fileUpload } = getArkosConfig();

  // Determine the base URL for file access
  const protocol =
    req.secure || req.headers["x-forwarded-proto"] === "https"
      ? "https"
      : "http";
  const baseURL = `${protocol}://${req.get?.("host")}`;
  const baseRoute = fileUpload?.baseRoute || "/api/uploads";
  return { baseURL, baseRoute };
}

/**
 * Generates the correct relative path regardless of upload directory location
 */
export function generateRelativePath(filePath: string, uploadDir: string) {
  const { fileUpload } = getArkosConfig();

  const baseUploadDir = fileUpload?.baseUploadDir || "/uploads";
  if (baseUploadDir.startsWith("..")) {
    return path.join(uploadDir, path.basename(filePath));
  } else {
    return fullCleanCwd(filePath)
      .replaceAll("\\", "/")
      .replace(`${baseUploadDir}/`, "/")
      .replace(`/${baseUploadDir}/`, "/")
      .replace(`/${baseUploadDir}`, "")
      .replace(`${baseUploadDir}`, "")
      .replaceAll("//", "/");
  }
}

/**
 * Handles basic file processing for non-image files
 */
export const processFile = async (
  req: ArkosRequest,
  filePath: string,
): Promise<string> => {
  const { baseURL, baseRoute } = extractRequestInfo(req);

  const relativePath = generateRelativePath(
    filePath,
    req.params!.fileType,
  ).replace(/\\/g, "/");

  return `${baseURL}${baseRoute === "/" ? "" : baseRoute}${
    relativePath.startsWith("/") ? relativePath : `/${relativePath}`
  }`;
};

/**
 * Options accepted by the image optimizer. Numeric values may arrive as
 * strings from query parameters and are normalized internally.
 */
export interface ImageOptimizationOptions {
  format?: string;
  quality?: number | string;
  width?: number | string;
  height?: number | string;
  resizeTo?: number | string;
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
  withoutEnlargement?: boolean;
}

const SHARP_FORMATS = new Set([
  "jpeg",
  "jpg",
  "png",
  "webp",
  "avif",
  "tiff",
  "tif",
  "gif",
  "heif",
  "heic",
]);

const QUALITY_FORMATS = new Set(["jpeg", "webp", "avif"]);

const toPositiveInt = (value?: number | string): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined;
};

const removeFile = async (target: string): Promise<void> => {
  try {
    await promisify(fs.unlink)(target);
  } catch {}
};

/**
 * Optimizes an image file in place using Sharp. Returns the resulting file
 * path, which may use a different extension when a format is requested.
 */
export const optimizeImage = async (
  filePath: string,
  options: ImageOptimizationOptions = {},
): Promise<string> => {
  const ext = path.extname(filePath).toLowerCase();
  const outputFormat = (options.format || "webp").toLowerCase();
  const sharpFormat = outputFormat === "jpg" ? "jpeg" : outputFormat;

  const directory = path.dirname(filePath);
  const baseName = path.basename(filePath, ext);
  const finalPath = path.join(directory, `${baseName}.${outputFormat}`);
  const tempPath = path.join(
    directory,
    `${baseName}.${Date.now()}-${Math.round(Math.random() * 1e9)}.${outputFormat}`,
  );

  try {
    const width = toPositiveInt(options.width);
    const height = toPositiveInt(options.height);
    const resizeTo = toPositiveInt(options.resizeTo);
    const quality = toPositiveInt(options.quality);

    let transformer = sharp(filePath).rotate();

    if (resizeTo)
      transformer = transformer.resize(resizeTo, resizeTo, {
        fit: options.fit || "inside",
        withoutEnlargement: options.withoutEnlargement ?? true,
      });
    else if (width || height)
      transformer = transformer.resize(width || null, height || null, {
        fit: options.fit || "inside",
        ...(options.withoutEnlargement !== undefined && {
          withoutEnlargement: options.withoutEnlargement,
        }),
      });

    if (SHARP_FORMATS.has(sharpFormat)) {
      const formatOptions =
        quality && QUALITY_FORMATS.has(sharpFormat) ? { quality } : {};
      transformer = transformer.toFormat(sharpFormat as any, formatOptions);
    }

    await transformer.toFile(tempPath);

    await removeFile(filePath);
    if (tempPath !== finalPath)
      await promisify(fs.rename)(tempPath, finalPath);

    return finalPath;
  } catch (error) {
    await removeFile(tempPath);
    throw error;
  }
};

/**
 * Processes image files using Sharp for resizing and format conversion
 */
export const processImage = async (
  req: ArkosRequest,
  next: ArkosNextFunction,
  filePath: string,
  options: ImageOptimizationOptions = {},
): Promise<string | null> => {
  const ext = path.extname(filePath).toLowerCase();

  if (!mimetype.lookup(ext)?.includes?.("image"))
    return processFile(req, filePath);

  try {
    const optimizedPath = await optimizeImage(filePath, options);
    return processFile(req, optimizedPath);
  } catch (error: any) {
    if (error.message === "Input file contains unsupported image format")
      return processFile(req, filePath);
    next(new AppError(error.message, 400, "CannotProcessImage", { error }));
    return null;
  }
};

