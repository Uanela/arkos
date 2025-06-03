import { Router } from "express";
import { importPrismaModelModules } from "../../utils/helpers/models.helpers";
import authService from "../auth/auth.service";
import fileUploaderController from "./file-uploader.controller";
import { ArkosConfig } from "../../types/arkos-config";
import path from "path";
import express from "express";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { AuthConfigs } from "../../types/auth";

const router: Router = Router();

export async function getFileUploaderRouter({ fileUpload }: ArkosConfig) {
  const modelModules = await importPrismaModelModules("file-upload");
  let { middlewares = {}, authConfigs = {} as AuthConfigs } = {};

  if (modelModules) {
    ({ middlewares = {}, authConfigs = {} } = modelModules);
  }

  let basePathname = fileUpload?.baseRoute || "/api/uploads/";

  if (!basePathname.startsWith("/")) basePathname = "/" + basePathname;
  if (!basePathname.endsWith("/")) basePathname = basePathname + "/";

  router.use(
    basePathname,
    authService.handleAuthenticationControl(
      "View",
      authConfigs.authenticationControl
    ),
    authService.handleAccessControl(
      "View",
      "file-upload",
      authConfigs.accessControl
    ),
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
    fileUploaderController.uploadFile
  );

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
    fileUploaderController.deleteFile
  );

  router.delete(
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
    fileUploaderController.updateFile
  );

  return router;
}
