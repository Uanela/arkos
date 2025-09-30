import { Router } from "express";
import { authService } from "arkos/services";
import { catchAsync } from "arkos/error-handler";
import fileUploadController from "./file-upload.controller";
import { RouterConfig } from "arkos";

export const config: RouterConfig<"file-upload"> = {
  disable: {
    uploadFile: false,
    findFile: false,
  },
};

const fileUploadRouter = Router();

fileUploadRouter.get(
  "/custom-endpoint",
  authService.authenticate,
  authService.handleAccessControl("CustomAction", "file-upload"),
  catchAsync(fileUploadController.findMany)
);

export default fileUploadRouter;
