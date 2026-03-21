import { Router } from "express";
import { getModuleComponents } from "../../utils/dynamic-loader";
import fileUploadController from "./file-upload.controller";
import express from "express";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { AuthConfigs } from "../../types/auth";
import { sendResponse } from "../base/base.middlewares";
import {
  createRouteConfig,
  processMiddleware,
} from "../../utils/helpers/routers.helpers";
import { adjustRequestUrl } from "./utils/helpers/file-upload.helpers";
import { isEndpointDisabled } from "../base/utils/helpers/base.router.helpers";
import debuggerService from "../debugger/debugger.service";
import routerValidator from "../base/utils/router-validator";
import { getUserFileExtension } from "../../utils/helpers/fs.helpers";
import path from "path";
import ArkosRouter from "../../utils/arkos-router";
import { UserArkosConfig } from "../../utils/define-config";
import { FileUploadRouterEndpoint } from "../../types/router-config";
import fileUploadJsonSchemaGenerator from "./utils/file-upload-json-schema-generator";

export function getFileUploadRouter(arkosConfig: UserArkosConfig) {
  const router = ArkosRouter();
  const { fileUpload } = arkosConfig;

  const moduleComponents = getModuleComponents("file-upload");
  let {
    interceptors = {} as any,
    authConfigs = {} as AuthConfigs,
    router: customRouterModule,
  }: any = {};

  if (moduleComponents)
    ({
      interceptors = {},
      authConfigs = {},
      router: customRouterModule,
    } = moduleComponents);

  const routerConfig = customRouterModule?.config || {};
  if (routerConfig?.disable === true) return router;

  const customRouter = customRouterModule?.default as Router;
  let basePathname = fileUpload?.baseRoute || "/api/uploads/";

  if (!basePathname.startsWith("/")) basePathname = "/" + basePathname;
  if (!basePathname.endsWith("/")) basePathname = basePathname + "/";

  // Strip leading slash so createRouteConfig can prepend its own "/"
  // e.g. "/api/uploads/" → "api/uploads/" → createRouteConfig builds "/api/uploads/*"
  const baseRoutePrefix = basePathname.slice(1);

  if (customRouter && customRouterModule) {
    if (routerValidator.isExpressRouter(customRouter))
      router.use(basePathname, customRouter);
    else
      throw Error(
        `ValidationError: The exported router from file-upload.router.${getUserFileExtension()} is not a valid express or arkos Router.`
      );
  }

  const endpoints: FileUploadRouterEndpoint[] = [
    "findFile",
    "uploadFile",
    "updateFile",
    "deleteFile",
  ];

  for (const endpoint of endpoints) {
    const endpointConfig = routerConfig[endpoint];
    if (endpointConfig?.experimental?.openapi === false) continue;
    routerConfig[endpoint] = {
      ...(endpointConfig || {}),
      experimental: {
        ...(endpointConfig?.experimental || {}),
        openapi: fileUploadJsonSchemaGenerator.getOpenApiConfig(
          endpointConfig,
          endpoint
        ),
      },
    };
  }

  if (!isEndpointDisabled(routerConfig, "findFile")) {
    const baseUploadDirFullPath = path.resolve(
      path
        .join(process.cwd(), fileUpload?.baseUploadDir || "uploads")
        .replaceAll("//", "/")
    );
    router.get(
      createRouteConfig(
        arkosConfig,
        "findFile",
        baseRoutePrefix,
        `*`,
        routerConfig,
        "file-upload",
        authConfigs
      ),
      ...processMiddleware(interceptors?.beforeFindFile),
      adjustRequestUrl,
      express.static(
        baseUploadDirFullPath,
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
          fileUpload?.expressStatic || {}
        )
      ),
      ...processMiddleware(interceptors?.onFindFileError, { type: "error" })
    );
  }

  if (!isEndpointDisabled(routerConfig, "uploadFile")) {
    router.post(
      createRouteConfig(
        arkosConfig,
        "uploadFile",
        baseRoutePrefix,
        `:fileType`,
        routerConfig,
        "file-upload",
        authConfigs
      ),
      ...processMiddleware(interceptors?.beforeUploadFile),
      fileUploadController.uploadFile,
      ...processMiddleware(interceptors?.afterUploadFile),
      sendResponse,
      ...processMiddleware(interceptors?.onUploadFileError, { type: "error" })
    );
  }

  if (!isEndpointDisabled(routerConfig, "updateFile")) {
    router.patch(
      createRouteConfig(
        arkosConfig,
        "updateFile",
        baseRoutePrefix,
        `:fileType/:fileName`,
        routerConfig,
        "file-upload",
        authConfigs
      ),
      ...processMiddleware(interceptors?.beforeUpdateFile),
      fileUploadController.updateFile,
      ...processMiddleware(interceptors?.afterUpdateFile),
      sendResponse,
      ...processMiddleware(interceptors?.onUpdateFileError, { type: "error" })
    );
  }

  if (!isEndpointDisabled(routerConfig, "deleteFile")) {
    router.delete(
      createRouteConfig(
        arkosConfig,
        "deleteFile",
        baseRoutePrefix,
        `:fileType/:fileName`,
        routerConfig,
        "file-upload",
        authConfigs
      ),
      ...processMiddleware(interceptors?.beforeDeleteFile),
      fileUploadController.deleteFile,
      ...processMiddleware(interceptors?.afterDeleteFile),
      sendResponse,
      ...processMiddleware(interceptors?.onDeleteFileError, { type: "error" })
    );
  }

  debuggerService.logModuleFinalRouter("file-upload", router);
  return router;
}
