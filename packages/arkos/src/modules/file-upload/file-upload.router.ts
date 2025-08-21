import { Router } from "express";
import { importModuleComponents } from "../../utils/helpers/models.helpers";
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

  const ModuleComponents = await importModuleComponents(
    "file-upload",
    arkosConfig
  );
  let { middlewares = {} as any, authConfigs = {} as AuthConfigs } = {};

  if (ModuleComponents) {
    ({ middlewares = {}, authConfigs = {} } = ModuleComponents);
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
    ...processMiddleware(middlewares?.beforeFindFile),
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
    )
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
    ...processMiddleware(middlewares?.beforeUploadFile),
    fileUploadController.uploadFile,
    ...processMiddleware(middlewares?.afterUploadFile),
    sendResponse
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
    ...processMiddleware(middlewares?.beforeUpdateFile),
    fileUploadController.updateFile,
    ...processMiddleware(middlewares?.afterUpdateFile),
    sendResponse
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
    ...processMiddleware(middlewares?.beforeDeleteFile),
    fileUploadController.deleteFile,
    ...processMiddleware(middlewares?.afterDeleteFile),
    sendResponse
  );

  return router;
}
