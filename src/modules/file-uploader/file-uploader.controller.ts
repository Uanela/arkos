import AppError from "../error-handler/utils/app-error";
import {
  documentUploaderService,
  fileUploaderService,
  FileUploaderService,
  imageUploaderService,
  videoUploaderService,
} from "../file-uploader/file-uploader.service";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { NextFunction, Request, Response } from "express";
import catchAsync from "../error-handler/utils/catch-async";
import { promisify } from "util";

const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

export const uploadFile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { fileType } = req.params;
    const { format, width, height, resizeTo } = req.query;
    let uploader: FileUploaderService;
    switch (fileType) {
      case "images":
        uploader = imageUploaderService;
        break;
      case "videos":
        uploader = videoUploaderService;
        break;
      case "documents":
        uploader = documentUploaderService;
        break;
      case "file":
        uploader = fileUploaderService;
        break;
      default:
        return next(new AppError("Invalid file type", 400));
    }

    uploader.handleMultipleUpload(fileType, 30)(req, res, async (err) => {
      if (err) return next(err);
      const protocol = req.get("host")?.includes("localhost")
        ? "http"
        : "https";
      const baseURL = `${protocol}://${req.get("host")}`;

      const processImage = async (filePath: string) => {
        const ext = path.extname(filePath).toLowerCase();
        const originalFormat = ext.replace(".", "");
        const outputFormat = format
          ? format.toString().toLowerCase()
          : originalFormat;

        if (!/jpeg|jpg|png|gif|webp|svg|bmp|tiff|heif/i.test(originalFormat)) {
          return `${baseURL}/api/${filePath
            .replace(`${process.cwd()}/`, "")
            .replace(/\\/g, "/")}`;
        }

        // Create a temp filename with original name + random string
        const tempName = `${path.basename(filePath, ext)}_${Date.now()}${ext}`;
        const tempPath = path.join(path.dirname(filePath), tempName);

        try {
          let transformer = sharp(filePath);
          const metadata = await transformer.metadata();

          if (resizeTo) {
            const targetSize = parseInt(resizeTo.toString());
            const scaleFactor =
              targetSize / Math.min(metadata.width!, metadata.height!);
            const newWidth = Math.round(metadata.width! * scaleFactor);
            const newHeight = Math.round(metadata.height! * scaleFactor);
            transformer = transformer.resize(newWidth, newHeight);
          } else if (width || height) {
            transformer = transformer.resize(
              parseInt(width as string) || null,
              parseInt(height as string) || null,
              { fit: "inside" }
            );
          }

          if (outputFormat === "webp") {
            transformer = transformer.toFormat("webp");
          } else if (outputFormat === "jpeg" || outputFormat === "jpg") {
            transformer = transformer.toFormat("jpeg");
          }

          // Save to temp file first
          await transformer.toFile(tempPath);

          // Remove original file
          // await fs.promises.unlink(filePath)

          // Rename temp file to original filename
          await fs.promises.rename(tempPath, filePath);

          return `${baseURL}/api/${filePath
            .replace(`${process.cwd()}/`, "")
            .replace(/\\/g, "/")}`;
        } catch (error) {
          // Clean up temp file if it exists

          if (await fs.promises.stat(tempPath)) {
            await fs.promises.unlink(tempPath);
          }
          next(error);
        }
      };

      let data;
      if (req.files && Array.isArray(req.files)) {
        data = await Promise.all(
          req.files.map((file) => processImage(file.path))
        );
      } else if (req.file) {
        data = await processImage(req.file.path);
      } else {
        return next(new AppError("No file uploaded", 400));
      }

      res.json({ data });
    });
  }
);

export const deleteFile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { fileType, fileName } = req.params;
    if (!fileName) return next(new AppError("File name is required", 400));

    const actualFilePath = path.join(
      process.cwd(),
      "uploads",
      fileType,
      fileName
    );

    try {
      await access(actualFilePath);
    } catch {
      return next(new AppError("File not found", 404));
    }

    await unlink(actualFilePath);
    res.json({ message: "File deleted successfully" });
  }
);

export const streamFile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { fileName, fileType } = req.params;

    const filePath = path.join(".", "uploads", fileType, fileName);
    try {
      await access(filePath);
    } catch {
      return next(new AppError("File not found", 404));
    }

    const fileStat = await stat(filePath);
    const fileSize = fileStat.size;
    const range = req.headers.range;

    if (range) {
      const [partialStart, partialEnd] = range.replace(/bytes=/, "").split("-");
      const start = parseInt(partialStart, 10) || 0;
      const end = partialEnd ? parseInt(partialEnd, 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).json({ error: "Range Not Satisfiable" });
        return;
      }

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `inline; filename="${fileName}"`,
      });

      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `inline; filename="${fileName}"`,
      });
      fs.createReadStream(filePath).pipe(res);
    }
  }
);
