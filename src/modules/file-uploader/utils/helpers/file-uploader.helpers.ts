import fs from "fs";
import path from "path";
import sharp from "sharp";
import { promisify } from "util";
import { getArkosConfig } from "../../../../server";
import mimetype from "mimetype";
import { ArkosRequest } from "../../../../types";

export function extractRequestInfo(req: Partial<ArkosRequest>) {
  const { fileUpload } = getArkosConfig();

  // Determine the base URL for file access
  const protocol = req.get?.("host")?.includes("localhost") ? "http" : "https";
  const baseURL = `${protocol}://${req.get?.("host")}`;
  const baseRoute = fileUpload?.baseRoute || "/api/uploads";
  return { baseURL, baseRoute };
}

/**
 * Generates the correct relative path regardless of upload directory location
 */
const generateRelativePath = (filePath: string, fileType: string) => {
  const { fileUpload } = getArkosConfig();

  const baseUploadDir = fileUpload?.baseUploadDir || "/uploads";
  if (baseUploadDir.startsWith("..")) {
    // For paths outside project directory
    return path.join(fileType, path.basename(filePath));
  } else {
    // For paths within project
    return (
      `${fileType}/` + filePath.replace(`${process.cwd()}${baseUploadDir}/`, "")
    );
  }
};

/**
 * Handles basic file processing for non-image files
 */
export const processFile = async (
  req: Partial<ArkosRequest>,
  filePath: string
): Promise<string> => {
  const { baseURL, baseRoute } = extractRequestInfo(req);

  const relativePath = generateRelativePath(filePath, req.params!.fileType);
  return `${baseURL}${baseRoute === "/" ? "" : baseRoute}/${relativePath}`;
};

/**
 * Processes image files using Sharp for resizing and format conversion
 */
export const processImage = async (
  req: Partial<ArkosRequest>,
  filePath: string,
  options: Record<string, any>
): Promise<string | null> => {
  const { baseURL, baseRoute } = extractRequestInfo(req);

  const ext = path.extname(filePath).toLowerCase();
  const originalFormat = ext.replace(".", "");
  const outputFormat = options.format || originalFormat;

  if (!mimetype.lookup(ext)?.includes("image")) {
    const relativePath = generateRelativePath(filePath, req.params!.fileType);
    return `${baseURL}${baseRoute}/${relativePath}`;
  }

  // Create a temp filename with original name + random string
  const tempName = `${path.basename(filePath, ext)}_${Date.now()}${ext}`;
  const tempPath = path.join(path.dirname(filePath), tempName);

  try {
    let transformer = sharp(filePath);
    const metadata = await transformer.metadata();

    // Apply resize transformations if requested
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

    // Apply format transformations if requested
    if (outputFormat === "webp") {
      transformer = transformer.toFormat("webp");
    } else if (outputFormat === "jpeg" || outputFormat === "jpg") {
      transformer = transformer.toFormat("jpeg");
    }

    // Save to temp file first
    await transformer.toFile(tempPath);

    // Rename temp file to original filename
    await promisify(fs.rename)(tempPath, filePath);

    // Return the public URL for the file
    const relativePath = generateRelativePath(filePath, req?.params!.fileType);

    return `${baseURL}${baseRoute}/${relativePath}`;
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await promisify(fs.stat)(tempPath);
      await promisify(fs.unlink)(tempPath);
    } catch (err) {
      // If temp file doesn't exist, no need to clean up
    }
    throw error;
  }
};
