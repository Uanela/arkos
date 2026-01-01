import { Router } from "express";
import { authService } from "arkos/services";
import { catchAsync } from "arkos/error-handler";
import fileUploadController from "./file-upload.controller";
import { ArkosRouter, RouterConfig } from "arkos";

export const config: RouterConfig<"file-upload"> = {
  disable: {
    uploadFile: false,
    findFile: false,
  },
};

const fileUploadRouter = ArkosRouter();

fileUploadRouter.get(
  { path: "u" },
  authService.authenticate,
  authService.handleAccessControl("CustomAction", "file-upload"),
  catchAsync(fileUploadController.findMany)
);

export default fileUploadRouter;
