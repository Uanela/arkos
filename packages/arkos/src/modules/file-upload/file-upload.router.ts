import { Router } from "express";
import { getModuleComponents } from "../../utils/dynamic-loader";
import authService from "../auth/auth.service";
import fileUploadController from "./file-upload.controller";
import { ArkosConfig } from "../../types/arkos-config";
import path from "path";
import express from "express";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { AuthConfigs } from "../../types/auth";
import { sendResponse } from "../base/base.middlewares";
import { processMiddleware } from "../../utils/helpers/routers.helpers";
import { adjustRequestUrl } from "./utils/helpers/file-upload.helpers";

const router: Router = Router();

export async function getFileUploadRouter(arkosConfig: ArkosConfig) {
  const { fileUpload } = arkosConfig;

  const ModuleComponents = getModuleComponents("file-upload");
  let { interceptors = {} as any, authConfigs = {} as AuthConfigs } = {};

  if (ModuleComponents) {
    ({ interceptors = {}, authConfigs = {} } = ModuleComponents);
  }

  let basePathname = fileUpload?.baseRoute || "/api/uploads/";

  if (!basePathname.startsWith("/")) basePathname = "/" + basePathname;
  if (!basePathname.endsWith("/")) basePathname = basePathname + "/";

  // Static file serving route
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
        fileUpload?.expressStaticOptions || {}
      )
    ),
    ...processMiddleware(interceptors?.onFindFileError)
  );

  // POST /{basePathname}:fileType - Upload File
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
    ...processMiddleware(interceptors?.onUploadFileError)
  );

  // PATCH /{basePathname}:fileType/:fileName - Update File
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
    ...processMiddleware(interceptors?.onUpdateFileError)
  );

  // DELETE /{basePathname}:fileType/:fileName - Delete File
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
    ...processMiddleware(interceptors?.onDeleteFileError)
  );

  return router;
}
