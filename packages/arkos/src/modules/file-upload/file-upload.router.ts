import { Router } from "express";
import { getModuleComponents } from "../../utils/dynamic-loader";
import authService from "../auth/auth.service";
import fileUploadController from "./file-upload.controller";
import express from "express";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { AuthConfigs } from "../../types/auth";
import { sendResponse } from "../base/base.middlewares";
import { processMiddleware } from "../../utils/helpers/routers.helpers";
import { adjustRequestUrl } from "./utils/helpers/file-upload.helpers";
import { isEndpointDisabled } from "../base/utils/helpers/base.router.helpers";
import debuggerService from "../debugger/debugger.service";
import routerValidator from "../base/utils/router-validator";
import { getUserFileExtension } from "../../utils/helpers/fs.helpers";
import { ArkosConfig } from "../../exports";
import path from "path";

const router: Router = Router();

export async function getFileUploadRouter(arkosConfig: ArkosConfig) {
  const { fileUpload } = arkosConfig;

  const moduleComponents = getModuleComponents("file-upload");
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
    router.get(
      `${basePathname}*`,
      authService.handleAuthenticationControl(
        "View",
        authConfigs.authenticationControl
      ),
      authService.handleAccessControl(
        "View",
        "file-upload",
        authConfigs.accessControl
      ),
      ...processMiddleware(interceptors?.beforeFindFile),
      adjustRequestUrl,
      express.static(
        path.resolve(process.cwd(), fileUpload?.baseUploadDir || "uploads"),
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
      `${basePathname}:fileType`,
      authService.handleAuthenticationControl(
        "Create",
        authConfigs.authenticationControl
      ),
      authService.handleAccessControl(
        "Create",
        "file-upload",
        authConfigs.accessControl
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
      `${basePathname}:fileType/:fileName`,
      authService.handleAuthenticationControl(
        "Update",
        authConfigs.authenticationControl
      ),
      authService.handleAccessControl(
        "Update",
        "file-upload",
        authConfigs.accessControl
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
      `${basePathname}:fileType/:fileName`,
      authService.handleAuthenticationControl(
        "Delete",
        authConfigs.authenticationControl
      ),
      authService.handleAccessControl(
        "Delete",
        "file-upload",
        authConfigs.accessControl
      ),
      ...processMiddleware(interceptors?.beforeDeleteFile),
      fileUploadController.deleteFile,
      ...processMiddleware(interceptors?.afterDeleteFile),
      sendResponse,
      ...processMiddleware(interceptors?.onDeleteFileError, { type: "error" })
    );
  }

  debuggerService.logModuleFinalRouter("file-upload", router);
  return router;
}
