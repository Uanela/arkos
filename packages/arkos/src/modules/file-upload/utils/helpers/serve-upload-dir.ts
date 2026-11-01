import express from "express";
import fs from "fs";
import path from "path";
import AppError from "../../../error-handler/utils/app-error";
import {
  ArkosNextFunction,
  ArkosRequest,
  ArkosRequestHandler,
  ArkosResponse,
} from "../../../../types";
import type { UploadPrepare } from "../../../../types/upload";
import ArkosRouter from "../../../../utils/arkos-router";
import {
  IArkosRouter,
  InternalIArkosRouter,
} from "../../../../utils/arkos-router/types";
import { extractPathParams } from "../../../../utils/arkos-router/utils/helpers";
import { getArkosConfig } from "../../../../server";
import deepmerge from "../../../../utils/helpers/deepmerge.helper";
import {
  assertSafeUploadPath,
  isRealPathInside,
  isSafeUploadParam,
  normalizeUploadDir,
  resolveUploadPath,
} from "./upload-path.helper";
import { uploadServingRegistry } from "./upload-serving.registry";

const DEFAULT_STATIC_OPTIONS = {
  maxAge: "1y",
  etag: true,
  lastModified: true,
  dotfiles: "ignore",
  fallthrough: false,
  index: false,
  cacheControl: true,
};

export type ServeUploadDirOptions = {
  /**
   * Resolves the disk parameters for this folder. Required for every dynamic
   * folder (`:param` in `dir`). It may be async and may throw to deny the
   * request.
   */
  prepare?: UploadPrepare;
  /**
   * Options passed to `express.static`.
   */
  expressStatic?: Parameters<typeof express.static>[1];
  /**
   * Allow files in nested folders.
   *
   * @default false
   */
  recursive?: boolean;
};

function buildStaticOptions(overrides?: Parameters<typeof express.static>[1]) {
  const config = getArkosConfig();

  return deepmerge(
    deepmerge(DEFAULT_STATIC_OPTIONS, config.fileUpload?.expressStatic || {}),
    overrides || {},
  ) as Parameters<typeof express.static>[1];
}

function substituteParams(
  template: string,
  values: Record<string, string>,
): string {
  return template
    .split("/")
    .map((segment) =>
      segment.startsWith(":") ? values[segment.slice(1)] : segment,
    )
    .join("/");
}

function isSafeServedPath(value: string): boolean {
  if (!value || value.includes("\\") || value.includes("\0")) return false;

  return value
    .split("/")
    .every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

type StaticError = {
  code?: string;
  status?: number;
  statusCode?: number;
};

function notFound() {
  return new AppError("File not found", 404, "FileNotFound");
}

function getLocals(req: ArkosRequest): Record<string, unknown> {
  return req.res?.locals || {};
}

function openApiConfig(dir: string) {
  return {
    tags: ["File Upload"],
    summary: "Retrieve uploaded file",
    description: `Serves files from the "${dir}" upload directory.`,
    responses: {
      "200": {
        description: "File retrieved successfully",
        content: {
          "application/octet-stream": {
            schema: { type: "string", format: "binary" },
          },
        },
      },
      "404": {
        description: "File not found",
      },
    },
  };
}

/**
 * Serves a folder from the upload directory.
 *
 * Authentication belongs on the router mount:
 *
 * ```ts
 * fileUploadRouter.use(
 *   { path: "/private/files", authentication: fileUploadPolicy.View },
 *   arkos.serveUploadDir("/storage/acme")
 * );
 * ```
 *
 * The `path` of the `use()` config is the public URL folder, relative to the
 * file upload `baseRoute`. When the resolved `dir` is a file, the route serves
 * that file directly. When it is a directory, the remainder of the request URL
 * is served from it.
 */
export function serveUploadDir(
  dir: string,
  options: ServeUploadDirOptions = {},
): IArkosRouter {
  const normalizedDir = normalizeUploadDir(dir);

  assertSafeUploadPath(normalizedDir, {
    allowParams: true,
    label: "upload directory",
  });

  if (options.prepare !== undefined && typeof options.prepare !== "function")
    throw new Error(
      `Invalid prepare function for upload directory "${normalizedDir}": expected a function.`,
    );

  const dirParams = extractPathParams(`/${normalizedDir}`);

  if (dirParams.length > 0 && !options.prepare)
    throw new Error(
      `Dynamic upload directory "${normalizedDir}" requires a prepare function.`,
    );

  const recursive = options.recursive === true;
  const dynamic = dirParams.length > 0;

  const router = ArkosRouter({ mergeParams: true });
  let cachedStatic: express.RequestHandler | undefined;

  uploadServingRegistry.registerServeSource({
    dir: normalizedDir,
    dirParams,
    recursive,
    dynamic,
    hasPrepare: !!options.prepare,
    router: (router as InternalIArkosRouter)._arkos,
  });

  const resolveDirectory: ArkosRequestHandler = async (req, _res, next) => {
    try {
      const config = getArkosConfig();
      const baseUploadDir = config.fileUpload?.baseUploadDir || "uploads";
      const basePath = path.resolve(process.cwd(), baseUploadDir);
      const prepared = options.prepare
        ? await options.prepare(req, getLocals(req))
        : undefined;
      const values = prepared?.dirParams ?? {};

      for (const param of dirParams) {
        const value = values[param];

        if (value === undefined)
          throw new Error(
            `Missing required upload directory param ":${param}" for "${normalizedDir}" on "${req.method} ${req.originalUrl}".`,
          );

        if (!isSafeUploadParam(value)) return next(notFound());
      }

      const resolvedDir = substituteParams(normalizedDir, values);
      const rootPath = resolveUploadPath(basePath, resolvedDir, {
        strictSegments: true,
      });

      if (!rootPath) return next(notFound());

      if (!(await isRealPathInside(basePath, rootPath)))
        return next(notFound());

      let stats: fs.Stats;

      try {
        stats = await fs.promises.stat(rootPath);
      } catch {
        return next(notFound());
      }

      req.__arkos = {
        ...req.__arkos,
        uploadDir: resolvedDir,
        uploadPath: rootPath,
        uploadKind: stats.isFile()
          ? "file"
          : stats.isDirectory()
            ? "directory"
            : undefined,
      };

      if (!req.__arkos.uploadKind) return next(notFound());

      next();
    } catch (error) {
      next(error);
    }
  };

  const serveExactFile: ArkosRequestHandler = (req, res, next) => {
    const rootPath = req.__arkos?.uploadPath;

    if (req.__arkos?.uploadKind !== "file" || !rootPath)
      return next(notFound());

    req.url = `/${encodeURIComponent(path.basename(rootPath))}${
      req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""
    }`;

    const staticHandler = express.static(
      path.dirname(rootPath),
      buildStaticOptions(options.expressStatic),
    );

    staticHandler(req, res, next);
  };

  const serveFolder: ArkosRequestHandler = (req, res, next) => {
    const rootPath = req.__arkos?.uploadPath;

    if (req.__arkos?.uploadKind !== "directory" || !rootPath)
      return next(notFound());

    if (!recursive) {
      const fileName: unknown = req.params.fileName;

      if (
        typeof fileName !== "string" ||
        fileName.includes("/") ||
        !isSafeServedPath(fileName)
      )
        return next(notFound());
    } else {
      const filePath: unknown = req.params[0];

      if (typeof filePath !== "string" || !isSafeServedPath(filePath))
        return next(notFound());
    }

    if (req.url.split("?")[0] === "/") return next(notFound());

    if (!dynamic)
      cachedStatic ??= express.static(
        rootPath,
        buildStaticOptions(options.expressStatic),
      );

    const staticHandler =
      cachedStatic ??
      express.static(rootPath, buildStaticOptions(options.expressStatic));

    staticHandler(req, res, next);
  };

  const handleStaticError = (
    err: StaticError | undefined,
    req: ArkosRequest,
    _res: ArkosResponse,
    next: ArkosNextFunction,
  ) => {
    if (
      err?.code === "ENOENT" ||
      err?.status === 403 ||
      err?.statusCode === 403
    )
      return next(
        new AppError(`File ${req.path} was not found`, 404, "FileNotFound", {
          filepath: req.path,
        }),
      );

    next(err);
  };

  const openapi = openApiConfig(normalizedDir);

  router.get(
    {
      path: "/",
      experimental: { openapi },
    },
    resolveDirectory,
    serveExactFile,
    handleStaticError,
  );

  router.get(
    {
      path: recursive ? "/*" : "/:fileName",
      experimental: { openapi },
    },
    resolveDirectory,
    serveFolder,
    handleStaticError,
  );

  return router;
}

