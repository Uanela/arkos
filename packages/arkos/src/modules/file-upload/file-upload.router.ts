import { Router } from "express";
import { importPrismaModelModules } from "../../utils/helpers/models.helpers";
import authService from "../auth/auth.service";
import fileUploadController from "./file-upload.controller";
import { ArkosConfig } from "../../types/arkos-config";
import path from "path";
import express from "express";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { AuthConfigs } from "../../types/auth";
import { sendResponse } from "../base/base.middlewares";

const router: Router = Router();

export async function getFileUploadRouter({ fileUpload }: ArkosConfig) {
  const modelModules = await importPrismaModelModules("file-upload");
  let { middlewares = {} as any, authConfigs = {} as AuthConfigs } = {};

  if (modelModules) {
    ({ middlewares = {}, authConfigs = {} } = modelModules);
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
    ...(middlewares?.beforeFindFile ? [middlewares?.beforeFindFile] : []),
    (req, res, next) => {
      req.url = req.url.replace(basePathname, "/");
      next();
    },
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
    middlewares?.beforeUploadFile || fileUploadController.uploadFile,
    middlewares?.beforeUploadFile
      ? fileUploadController.uploadFile
      : middlewares?.afterUploadFile || sendResponse,
    middlewares?.beforeUploadFile && middlewares?.afterUploadFile
      ? middlewares?.afterUploadFile
      : sendResponse,
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
    middlewares?.beforeUpdateFile || fileUploadController.updateFile,
    middlewares?.beforeUpdateFile
      ? fileUploadController.updateFile
      : middlewares?.afterUpdateFile || sendResponse,
    middlewares?.beforeUpdateFile && middlewares?.afterUpdateFile
      ? middlewares?.afterUpdateFile
      : sendResponse,
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
    middlewares?.beforeDeleteFile || fileUploadController.deleteFile,
    middlewares?.beforeDeleteFile
      ? fileUploadController.deleteFile
      : middlewares?.afterDeleteFile || sendResponse,
    middlewares?.beforeDeleteFile && middlewares?.afterDeleteFile
      ? middlewares?.afterDeleteFile
      : sendResponse,
    sendResponse
  );

  return router;
}
