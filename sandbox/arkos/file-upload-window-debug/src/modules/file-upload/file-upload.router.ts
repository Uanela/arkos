import { authService } from "arkos/services";
import { catchAsync } from "arkos/error-handler";
import fileUploadController from "./file-upload.controller";
import { ArkosRouter, RouterConfig } from "arkos";
import z from "zod";

export const config: RouterConfig<"file-upload"> = {
  disable: {
    uploadFile: false,
    findFile: false,
  },
  findFile: {
    validation: {
      body: z.object({ the: z.string() }),
      // params: z.object({ sheu: z.string() }),
    },
    experimental: {
      openapi: {
        parameters: [
          // { name: "uanela", in: "path", schema: { type: "string" } },
        ],
        responses: {
          201: z.object({ data: z.object({ uanela: z.number() }) }),
        },
      },
    },
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
