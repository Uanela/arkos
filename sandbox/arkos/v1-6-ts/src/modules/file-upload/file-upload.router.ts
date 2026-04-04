import { ArkosRouter, RouterConfig } from "arkos";
import fileUploadPolicy from "@/src/modules/file-upload/file-upload.policy";

export const config: RouterConfig<"file-upload"> = {
  findFile: { authentication: fileUploadPolicy.View },
  uploadFile: { authentication: fileUploadPolicy.Create },
  updateFile: { authentication: fileUploadPolicy.Update },
  deleteFile: { authentication: fileUploadPolicy.Delete },
};

const fileUploadRouter = ArkosRouter({ openapi: { tags: ["File Uploads"] } });

export default fileUploadRouter;
