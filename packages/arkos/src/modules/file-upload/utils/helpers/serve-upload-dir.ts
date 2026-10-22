import express from "express";
import fs from "fs";
import path from "path";
import AppError from "../../../error-handler/utils/app-error";
import { ArkosRequest, ArkosRequestHandler } from "../../../../types";
import type { UploadPrepare } from "../../../../types/upload";
import ArkosRouter from "../../../../utils/arkos-router";
import { IArkosRouter } from "../../../../utils/arkos-router/types";
import { extractPathParams } from "../../../../utils/arkos-router/utils/helpers";
import { getArkosConfig } from "../../../../server";
import deepmerge from "../../../../utils/helpers/deepmerge.helper";
import ExitError from "../../../../utils/helpers/exit-error";
import {
  assertSafeUploadPath,
  isRealPathInside,
  isSafeUploadParam,
  normalizeUploadDir,
  normalizeUploadUrlPath,
  resolveUploadPath,
} from "./upload-path.helper";
import {
  uploadServingRegistry,
  UploadServeRegistration,
} from "./upload-serving.registry";

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
   * Public URL folder, relative to the file upload `baseRoute`.
   *
   * @default `"/" + dir`
   */
  urlPath?: string;
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

function buildStaticOptions(
  overrides?: Parameters<typeof express.static>[1]
) {
  const config = getArkosConfig();

  return deepmerge(
    deepmerge(DEFAULT_STATIC_OPTIONS, config.fileUpload?.expressStatic || {}),
    overrides || {}
  ) as Parameters<typeof express.static>[1];
}

function substituteParams(
  template: string,
  values: Record<string, string>
): string {
  return template
    .split("/")
    .map((segment) =>
      segment.startsWith(":") ? values[segment.slice(1)] : segment
    )
    .join("/");
}

function stripMountSegments(url: string, segmentCount: number): string {
  const queryIndex = url.indexOf("?");
  const rawPath = queryIndex === -1 ? url : url.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : url.slice(queryIndex);
  const parts = rawPath.split("/");
  const start = rawPath.startsWith("/") ? segmentCount + 1 : segmentCount;
  const remainder = parts.slice(start).join("/");

  return `/${remainder}${query}`;
}

function isSafeServedPath(value: string): boolean {
  if (!value || value.includes("\\") || value.includes("\0")) return false;

  return value
    .split("/")
    .every(
      (segment) => segment !== "" && segment !== "." && segment !== ".."
    );
}

function notFound() {
  return new AppError("File not found", 404, "FileNotFound");
}

function getLocals(req: ArkosRequest): Record<string, any> {
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
 *   { authentication: fileUploadPolicy.View },
 *   arkos.serveUploadDir("/storage/acme", { urlPath: "/private/files" })
 * );
 * ```
 *
 * When the resolved `dir` is a file, the route serves that file directly.
 * When it is a directory, the remainder of the request URL is served from it.
 */
export function serveUploadDir(
  dir: string,
  options: ServeUploadDirOptions = {}
): IArkosRouter {
  if (path.isAbsolute(dir))
    throw ExitError(
      `Invalid upload directory "${dir}": absolute paths are not allowed.`
    );

  const normalizedDir = normalizeUploadDir(dir);

  assertSafeUploadPath(normalizedDir, {
    allowParams: true,
    label: "upload directory",
  });

  const mountPath = normalizeUploadUrlPath(
    options.urlPath ?? `/${normalizedDir}`
  );

  if (mountPath === "/")
    throw ExitError(
      `Invalid upload URL path "/" for upload directory "${normalizedDir}": it must contain at least one segment.`
    );

  assertSafeUploadPath(mountPath.replace(/^\//, ""), {
    allowParams: true,
    label: "upload URL path",
  });

  if (options.prepare !== undefined && typeof options.prepare !== "function")
    throw ExitError(
      `Invalid prepare function for upload directory "${normalizedDir}": expected a function.`
    );

  const dirParams = extractPathParams(`/${normalizedDir}`);
  const pathParams = extractPathParams(mountPath);

  if (dirParams.length > 0 && !options.prepare)
    throw ExitError(
      `Dynamic upload directory "${normalizedDir}" requires a prepare function.`
    );

  const recursive = options.recursive === true;
  const dynamic = dirParams.length > 0;
  const mountSegments = mountPath.split("/").filter(Boolean).length;

  const registration: UploadServeRegistration = {
    dir: normalizedDir,
    urlPath: mountPath,
    dirParams,
    pathParams,
    recursive,
    dynamic,
    hasPrepare: !!options.prepare,
  };

  uploadServingRegistry.registerServe(registration);

  const router = ArkosRouter();
  let cachedStatic: express.RequestHandler | undefined;

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
            `Missing required upload directory param ":${param}" for "${normalizedDir}" on "${req.method} ${req.originalUrl}".`
          );

        if (!isSafeUploadParam(value))
          return next(notFound());
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
      buildStaticOptions(options.expressStatic)
    );

    staticHandler(req, res, next);
  };

  const serveFolder: ArkosRequestHandler = (req, res, next) => {
    const rootPath = req.__arkos?.uploadPath;

    if (req.__arkos?.uploadKind !== "directory" || !rootPath)
      return next(notFound());

    if (!recursive) {
      const fileName = (req.params as any).fileName;

      if (
        typeof fileName !== "string" ||
        fileName.includes("/") ||
        !isSafeServedPath(fileName)
      )
        return next(notFound());
    } else {
      const filePath = (req.params as any)[0] as string | undefined;

      if (!filePath || !isSafeServedPath(filePath)) return next(notFound());
    }

    req.url = stripMountSegments(req.url, mountSegments);

    if (req.url.split("?")[0] === "/") return next(notFound());

    if (!dynamic)
      cachedStatic ??= express.static(
        rootPath,
        buildStaticOptions(options.expressStatic)
      );

    const staticHandler =
      cachedStatic ??
      express.static(rootPath, buildStaticOptions(options.expressStatic));

    staticHandler(req, res, next);
  };

  const handleStaticError = (
    err: any,
    req: any,
    _res: any,
    next: (error?: any) => void
  ) => {
    if (
      err?.code === "ENOENT" ||
      err?.status === 403 ||
      err?.statusCode === 403
    )
      return next(
        new AppError(
          `File ${req.path} was not found`,
          404,
          "FileNotFound",
          { filepath: req.path }
        )
      );

    next(err);
  };

  const openapi = openApiConfig(normalizedDir);

  router.get(
    {
      path: mountPath,
      experimental: { openapi },
    },
    resolveDirectory,
    serveExactFile,
    handleStaticError as any
  );

  router.get(
    {
      path: `${mountPath}${recursive ? "/*" : "/:fileName"}`,
      experimental: { openapi },
    },
    resolveDirectory,
    serveFolder,
    handleStaticError as any
  );

  return router;
}
