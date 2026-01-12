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
  next: ArkosNextFunction
) {
  const { fileUpload } = getArkosConfig();
  req.url = req.url.replace(
    fileUpload?.baseRoute + "/" || "/api/uploads/",
    "/"
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
    return fullCleanCwd(
      filePath
        .replace(`${baseUploadDir}/`, "")
        .replace(`/${baseUploadDir}/`, "")
        .replace(`/${baseUploadDir}`, "")
        .replace(`${baseUploadDir}`, "")
        .replaceAll("\\", "/")
        .replaceAll("//", "/")
    );
  }
}

/**
 * Handles basic file processing for non-image files
 */
export const processFile = async (
  req: ArkosRequest,
  filePath: string
): Promise<string> => {
  const { baseURL, baseRoute } = extractRequestInfo(req);

  const relativePath = generateRelativePath(
    filePath,
    req.params!.fileType
  ).replace(/\\/g, "/");

  return `${baseURL}${baseRoute === "/" ? "" : baseRoute}${
    relativePath.startsWith("/") ? relativePath : `/${relativePath}`
  }`;
};

/**
 * Processes image files using Sharp for resizing and format conversion
 */
export const processImage = async (
  req: ArkosRequest,
  next: ArkosNextFunction,
  filePath: string,
  options: Record<string, any>
): Promise<string | null> => {
  const ext = path.extname(filePath).toLowerCase();
  const originalFormat = ext.replace(".", "");
  const outputFormat = options.format || originalFormat;

  if (!mimetype.lookup(ext)?.includes?.("image"))
    return processFile(req, filePath);

  const tempName = `${path.basename(filePath, ext)}_${Date.now()}${ext}`;
  const tempPath = path.join(path.dirname(filePath), tempName);

  try {
    let transformer = sharp(filePath);
    const metadata = await transformer.metadata();

    if (options.resizeTo && metadata.width && metadata.height) {
      const targetSize = options.resizeTo;
      const scaleFactor =
        targetSize / Math.min(metadata.width, metadata.height);
      const newWidth = Math.round(metadata.width * scaleFactor);
      const newHeight = Math.round(metadata.height * scaleFactor);
      transformer = transformer.resize(newWidth, newHeight);
    } else if (options.width || options.height) {
      transformer = transformer.resize(
        options.width || null,
        options.height || null,
        {
          fit: "inside",
        }
      );
    }

    if (outputFormat === "webp") transformer = transformer.toFormat("webp");
    else if (outputFormat === "jpeg" || outputFormat === "jpg")
      transformer = transformer.toFormat("jpeg");

    await transformer.toFile(tempPath);

    await promisify(fs.rename)(tempPath, filePath);

    return processFile(req, filePath);
  } catch (error: any) {
    try {
      await promisify(fs.stat)(tempPath);
      await promisify(fs.unlink)(tempPath);
    } catch (err) {
      // If temp file doesn't exist, no need to clean up
    }

    if (error.message === "Input file contains unsupported image format")
      return processFile(req, filePath);
    next(new AppError(error.message, 400, "CannotProcessImage", { error }));
    return null;
  }
};
