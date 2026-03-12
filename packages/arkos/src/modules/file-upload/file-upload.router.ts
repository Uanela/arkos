import { Router } from "express";
import fileUploadController from "./file-upload.controller";
import express from "express";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { AuthConfigs } from "../../types/auth";
import { sendResponse } from "../base/base.middlewares";
import {
  createRouteConfig,
  processMiddleware,
} from "../../utils/helpers/routers.helpers";
import { adjustRequestUrl } from "./utils/helpers/file-upload.helpers";
import { isEndpointDisabled } from "../base/utils/helpers/base.router.helpers";
import routerValidator from "../base/utils/router-validator";
import { getUserFileExtension } from "../../utils/helpers/fs.helpers";
import path from "path";
import ArkosRouter from "../../utils/arkos-router";
import { UserArkosConfig } from "../../utils/define-config";

export function getFileUploadRouter(arkosConfig: UserArkosConfig) {
  const router = ArkosRouter();
  const { fileUpload } = arkosConfig;

  const moduleComponents = {} as any;
  let {
    interceptors = {} as any,
    authConfigs = {} as AuthConfigs,
    router: customRouterModule,
  }: any = {};

  if (moduleComponents)
    ({
      interceptors = {},
      authConfigs = {},
      router: customRouterModule,
    } = moduleComponents);

  const routerConfig = customRouterModule?.config || {};
  if (routerConfig?.disable === true) return router;

  const customRouter = customRouterModule?.default as Router;
  let basePathname = fileUpload?.baseRoute || "/api/uploads/";

  if (customRouter && customRouterModule) {
    if (routerValidator.isExpressRouter(customRouter))
      router.use(basePathname, customRouter);
    else
      throw Error(
        `ValidationError: The exported router from file-upload.router.${getUserFileExtension()} is not a valid express or arkos Router.`
      );
  }

  if (!basePathname.startsWith("/")) basePathname = "/" + basePathname;
  if (!basePathname.endsWith("/")) basePathname = basePathname + "/";

  if (!isEndpointDisabled(routerConfig, "findFile")) {
    const baseUploadDirFullPath = path.resolve(
      path
        .join(process.cwd(), fileUpload?.baseUploadDir || "uploads")
        .replaceAll("//", "/")
    );
    router.get(
      createRouteConfig(
        arkosConfig,
        "findFile",
        "file-upload",
        `${basePathname}*`,
        routerConfig,
        "file-upload",
        authConfigs
      ),
      ...processMiddleware(interceptors?.beforeFindFile),
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
      ...processMiddleware(interceptors?.onFindFileError, { type: "error" })
    );
  }

  if (!isEndpointDisabled(routerConfig, "uploadFile")) {
    router.post(
      createRouteConfig(
        arkosConfig,
        "uploadFile",
        "file-upload",
        `${basePathname}:fileType`,
        routerConfig,
        "file-upload",
        authConfigs
      ),
      ...processMiddleware(interceptors?.beforeUploadFile),
      fileUploadController.uploadFile,
      ...processMiddleware(interceptors?.afterUploadFile),
      sendResponse,
      ...processMiddleware(interceptors?.onUploadFileError, { type: "error" })
    );
  }

  if (!isEndpointDisabled(routerConfig, "updateFile")) {
    router.patch(
      createRouteConfig(
        arkosConfig,
        "updateFile",
        "file-upload",
        `${basePathname}:fileType/:fileName`,
        routerConfig,
        "file-upload",
        authConfigs
      ),
      ...processMiddleware(interceptors?.beforeUpdateFile),
      fileUploadController.updateFile,
      ...processMiddleware(interceptors?.afterUpdateFile),
      sendResponse,
      ...processMiddleware(interceptors?.onUpdateFileError, { type: "error" })
    );
  }

  if (!isEndpointDisabled(routerConfig, "deleteFile")) {
    router.delete(
      createRouteConfig(
        arkosConfig,
        "deleteFile",
        "file-upload",
        `${basePathname}:fileType/:fileName`,
        routerConfig,
        "file-upload",
        authConfigs
      ),
      ...processMiddleware(interceptors?.beforeDeleteFile),
      fileUploadController.deleteFile,
      ...processMiddleware(interceptors?.afterDeleteFile),
      sendResponse,
      ...processMiddleware(interceptors?.onDeleteFileError, { type: "error" })
    );
  }

  return router;
}
