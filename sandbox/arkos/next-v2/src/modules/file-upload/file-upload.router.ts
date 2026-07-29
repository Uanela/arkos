import { ArkosRouter, ArkosRouteHook } from 'arkos';
import fileUploadPolicy from '@/src/modules/file-upload/file-upload.policy';
import config from '@/arkos.config';

const fileUploadRouteHook = ArkosRouteHook("file-upload");

fileUploadRouteHook.findFile({
  authentication: fileUploadPolicy.View,
});

fileUploadRouteHook.uploadFile({
  authentication: fileUploadPolicy.Create,
});

fileUploadRouteHook.updateFile({
  authentication: fileUploadPolicy.Update,
});

fileUploadRouteHook.deleteFile({
  authentication: fileUploadPolicy.Delete,
});

const fileUploadRouter = ArkosRouter({
  prefix: config?.fileUpload?.baseRoute,
  openapi: { tags: ["File Upload"] },
});

fileUploadRouter.load(fileUploadRouteHook);

export default fileUploadRouter;
