import { Router } from "express";
import { importPrismaModelModules } from "../../utils/helpers/models.helpers";
import authService from "../auth/auth.service";
import { deleteFile, uploadFile } from "./file-uploader.controller";

const router: Router = Router();

(async () => {
  const modelModules = await importPrismaModelModules("file-uploader");
  let { middlewares = {}, authConfigs = {}, prismaQueryOptions = {} } = {};

  if (modelModules) {
    ({
      middlewares = {},
      authConfigs = {},
      prismaQueryOptions = {},
    } = modelModules);
  }

  router.post(
    "/uploads/:fileType",
    authService.handleAuthenticationControl(
      authConfigs,
      "create",
      "file-upload"
    ),
    authService.handleActionAccessControl(authConfigs, "create", "file-upload"),
    uploadFile
  );
  router.delete(
    "/uploads/:fileType/:fileName",
    authService.handleAuthenticationControl(
      authConfigs,
      "create",
      "file-upload"
    ),
    authService.handleActionAccessControl(authConfigs, "create", "file-upload"),
    deleteFile
  );
})();

export { router as fileUploaderRouter };
