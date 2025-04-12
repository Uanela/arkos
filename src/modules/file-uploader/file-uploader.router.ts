import { Router } from "express";
import { importPrismaModelModules } from "../../utils/helpers/models.helpers";
import authService from "../auth/auth.service";
import { deleteFile, uploadFile } from "./file-uploader.controller";
import { ArkosConfig } from "../../types/arkos-config";
import path from "path";
import express from "express";
import deepmerge from "../../utils/helpers/deepmerge.helper";

const router: Router = Router();

export async function getFileUploaderRouter({ fileUpload }: ArkosConfig) {
  const modelModules = await importPrismaModelModules("file-upload");
  let { middlewares = {}, authConfigs = {} } = {};

  if (modelModules) {
    ({ middlewares = {}, authConfigs = {} } = modelModules);
  }

  let basePathname = fileUpload?.baseRoute || "/api/uploads/";

  if (!basePathname.startsWith("/")) basePathname = "/" + basePathname;
  if (!basePathname.endsWith("/")) basePathname = basePathname + "/";

  router.use(
    basePathname,
    authService.handleAuthenticationControl(authConfigs, "view"),
    authService.handleActionAccessControl(authConfigs, "view", "file-upload"),
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
    authService.handleAuthenticationControl(authConfigs, "create"),
    authService.handleActionAccessControl(authConfigs, "create", "file-upload"),
    uploadFile
  );

  router.delete(
    `${basePathname}:fileType/:fileName`,
    authService.handleAuthenticationControl(authConfigs, "delete"),
    authService.handleActionAccessControl(authConfigs, "create", "file-upload"),
    deleteFile
  );

  return router;
}
