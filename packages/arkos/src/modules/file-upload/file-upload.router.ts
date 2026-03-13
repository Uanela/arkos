import fileUploadController from "./file-upload.controller";
import express from "express";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { sendResponse } from "../base/base.middlewares";
import { processMiddleware } from "../../utils/helpers/routers.helpers";
import { adjustRequestUrl } from "./utils/helpers/file-upload.helpers";
import path from "path";
import ArkosRouter from "../../utils/arkos-router";
import loadableRegistry from "../../components/arkos-loadable-registry";
import {
  OperationByModule,
  routeHookReader,
} from "../../components/arkos-route-hook/reader";
import { getArkosConfig } from "../../server";

export function getFileUploadRouter() {
  const router = ArkosRouter();
  const { fileUpload } = getArkosConfig();

  const routeHook = loadableRegistry.getItem("ArkosRouteHook", "file-upload");

  const op = (operation: OperationByModule<"file-upload">) =>
    routeHook
      ? routeHookReader.forOperation("file-upload", operation)
      : {
          before: [],
          after: [],
          onError: [],
          routeConfig: {},
        };

  let basePathname = fileUpload?.baseRoute || "/api/uploads/";
  if (!basePathname.startsWith("/")) basePathname = "/" + basePathname;
  if (!basePathname.endsWith("/")) basePathname = basePathname + "/";

  // FIND FILE
  {
    const { before, onError, routeConfig } = op("findFile");
    const baseUploadDirFullPath = path.resolve(
      path
        .join(process.cwd(), fileUpload?.baseUploadDir || "uploads")
        .replaceAll("//", "/")
    );
    router.get(
      {
        authentication: { action: "View", resource: "file-upload" },
        ...routeConfig,
        path: `${basePathname}*`,
      },
      ...processMiddleware(before),
      adjustRequestUrl,
      express.static(
        baseUploadDirFullPath,
        deepmerge(
          {
            maxAge: "1y",
            etag: true,
            lastModified: true,
            dotfiles: "ignore",
            fallthrough: true,
            index: false,
            cacheControl: true,
          },
          fileUpload?.expressStatic || {}
        )
      ),
      ...processMiddleware(onError, { type: "error" })
    );
  }

  // UPLOAD FILE
  {
    const { before, after, onError, routeConfig } = op("uploadFile");
    router.post(
      {
        authentication: { action: "Create", resource: "file-upload" },
        ...routeConfig,
        path: `${basePathname}:fileType`,
      },
      ...processMiddleware(before),
      fileUploadController.uploadFile,
      ...processMiddleware(after),
      sendResponse,
      ...processMiddleware(onError, { type: "error" })
    );
  }

  // UPDATE FILE
  {
    const { before, after, onError, routeConfig } = op("updateFile");
    router.patch(
      {
        authentication: { action: "Update", resource: "file-upload" },
        ...routeConfig,
        path: `${basePathname}:fileType/:fileName`,
      },
      ...processMiddleware(before),
      fileUploadController.updateFile,
      ...processMiddleware(after),
      sendResponse,
      ...processMiddleware(onError, { type: "error" })
    );
  }

  // DELETE FILE
  {
    const { before, after, onError, routeConfig } = op("deleteFile");
    router.delete(
      {
        authentication: { action: "Delete", resource: "file-upload" },
        ...routeConfig,
        path: `${basePathname}:fileType/:fileName`,
      },
      ...processMiddleware(before),
      fileUploadController.deleteFile,
      ...processMiddleware(after),
      sendResponse,
      ...processMiddleware(onError, { type: "error" })
    );
  }

  return router;
}
