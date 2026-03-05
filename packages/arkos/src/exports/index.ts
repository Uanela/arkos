import { RouterConfig } from "../types/router-config";
import { BaseController } from "./../modules/base/base.controller";
import { initApp, getArkosConfig } from "../server";
import ArkosRouter from "../utils/arkos-router";
import { IArkosRouter } from "../utils/arkos-router/types";
import { ArkosRouteConfig } from "../utils/arkos-router/types";
import {
  ArkosRequest,
  ArkosResponse,
  ArkosNextFunction,
  ArkosRequestHandler,
} from "../types";
import { ArkosConfig } from "../types/new-arkos-config";
import { ArkosInitConfig } from "../types/arkos-config";
import { loadEnvironmentVariables } from "../utils/dotenv.helpers";
import { arkos } from "../app";
import { ArkosRouteHook } from "../components/arkos-route-hook";
import { ArkosServiceHook } from "../components/arkos-service-hook";
import { defineConfig } from "../utils/define-config";
import { ArkosRouteHookInstance } from "../components/arkos-route-hook/types";

export {
  defineConfig,
  ArkosRequest,
  ArkosResponse,
  ArkosNextFunction,
  ArkosRequestHandler,
  IArkosRouter,
  BaseController,
  ArkosConfig,
  ArkosInitConfig,
  RouterConfig,
  loadEnvironmentVariables,
  getArkosConfig,
  initApp,
  ArkosRouteHook,
  ArkosServiceHook,
  ArkosRouter,
  ArkosRouteConfig,
  ArkosRouteHookInstance,
};

/**
 * Main entry point for the Arkos module.
 *
 * @module arkos
 */
export default arkos;
