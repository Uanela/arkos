import { NextFunction, Request, Response } from "express";
import catchAsync from "../error-handler/utils/catch-async";
import APIFeatures from "../../utils/features/api.features";
import { BaseService, getBaseServices } from "./base.service";
import AppError from "../error-handler/utils/app-error";
import {
  documentUploaderService,
  fileUploaderService,
  FileUploaderService,
  imageUploaderService,
  videoUploaderService,
} from "../file-uploader/file-uploader.service";
import { ROOT_DIR } from "../../paths";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import sharp from "sharp";
import { kebabCase } from "change-case-all";
import { getExpressApp } from "../../server";

const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

export async function handlerFactory(modelName: string, middlewares: any) {
  const baseService = new BaseService(modelName);

  return {
    createOne: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        const data = await baseService.createOne(
          req.body,
          req.query?.prismaQueryOptions as string
        );

        if (middlewares?.afterCreateOne) {
          (req as any).responseData = { data };
          (req as any).responseStatus = 201;
          return next();
        }

        res.status(201).json({ data });
      }
    ),

    createMany: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        const { data, total } = await baseService.createMany(req.body);

        if (middlewares?.afterCreateMany) {
          (req as any).responseData = { total, results: data.length, data };
          (req as any).responseStatus = 201;
          return next();
        }

        res.status(201).json({ total, results: data.length, data });
      }
    ),

    findMany: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        const features = new APIFeatures(
          req,
          modelName,
          baseService.relationFields?.singular.reduce(
            (acc: Record<string, boolean>, curr) => {
              acc[curr.name] = true;
              return acc;
            },
            {}
          )
        )
          .filter()
          .sort()
          .limitFields()
          .paginate();

        const { data, total } = await baseService.findMany(features.filters);

        if (middlewares?.afterFindMany) {
          (req as any).responseData = { total, results: data.length, data };
          (req as any).responseStatus = 200;
          return next();
        }

        res.status(200).json({ total, results: data.length, data });
      }
    ),

    findOne: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        const data = await baseService.findOne(
          req.params,
          req.query?.prismaQueryOptions as string
        );

        if (middlewares?.afterFindOne) {
          (req as any).responseData = { data };
          (req as any).responseStatus = 200;
          return next();
        }

        res.status(200).json({ data });
      }
    ),

    updateOne: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        const data = await baseService.updateOne(
          req.params,
          req.body,
          req.query?.prismaQueryOptions as string
        );

        if (middlewares?.afterUpdateOne) {
          (req as any).responseData = { data };
          (req as any).responseStatus = 200;
          return next();
        }

        res.status(200).json({ data });
      }
    ),

    updateMany: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        if (
          !Object.keys(req.query).some(
            (value) => value !== "prismaQueryOptions"
          )
        ) {
          return next(
            new AppError("Filter criteria not provided for bulk update.", 400)
          );
        }

        const features = new APIFeatures(req, modelName).filter().sort();
        delete features.filters.include;

        const { data, total } = await baseService.updateMany(
          features.filters,
          req.body
        );

        if (middlewares?.afterUpdateMany) {
          (req as any).responseData = { total, results: data.length, data };
          (req as any).responseStatus = 200;
          return next();
        }

        res.status(200).json({ total, results: data.length, data });
      }
    ),

    deleteOne: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        await baseService.deleteOne(req.params);

        if (middlewares?.afterDeleteOne) {
          (req as any).responseData = { id: String(req.params.id) };
          (req as any).responseStatus = 204;
          return next();
        }

        res.status(204).send();
      }
    ),

    deleteMany: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        if (
          !Object.keys(req.query).some(
            (value) => value !== "prismaQueryOptions"
          )
        ) {
          return next(
            new AppError("Filter criteria not provided for bulk deletion.", 400)
          );
        }

        const features = new APIFeatures(req, modelName).filter().sort();
        delete features.filters.include;

        const { data, total } = await baseService.deleteMany(features.filters);

        if (middlewares?.afterDeleteMany) {
          (req as any).responseData = { total, results: data.length, data };
          (req as any).responseStatus = 200;
          return next();
        }

        res.status(200).json({ total, results: data.length, data });
      }
    ),
  };
}

export function getAvalibleRoutes(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const routes: { method: string; path: string }[] = [];
  req.params;
  const app = getExpressApp();

  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      Object.keys(middleware.route.methods).forEach((method) => {
        routes.push({
          method: method.toUpperCase(),
          path: middleware.route.path,
        });
      });
    } else if (middleware.handle && middleware.handle.stack) {
      middleware.handle.stack.forEach((routerMiddleware: any) => {
        if (routerMiddleware.route) {
          Object.keys(routerMiddleware.route.methods).forEach((method) => {
            const fullPath =
              (middleware.regexp
                ? middleware.regexp.toString().replace("/", "")
                : "") + routerMiddleware.route.path;
            routes.push({
              method: method.toUpperCase(),
              path: routerMiddleware.route.path,
            });
          });
        }
      });
    }
  });

  res.json(routes);
}

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
            .replace(`${ROOT_DIR}/`, "")
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
            .replace(`${ROOT_DIR}/`, "")
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

    const actualFilePath = path.join(ROOT_DIR, "uploads", fileType, fileName);

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

export const getDatabaseModels = catchAsync(async (req, res, next) => {
  const models = ["test"];
  res.status(200).json({ data: models.map((model) => kebabCase(model)) });
});
