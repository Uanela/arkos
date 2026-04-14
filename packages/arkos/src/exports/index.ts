import { RouterConfig, RouteHook } from "../types/router-config";
import { BaseController } from "./../modules/base/base.controller";
import { getArkosConfig } from "../server";
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
import { loadEnvironmentVariables } from "../utils/dotenv.helpers";
import { ArkosPolicy } from "../components/arkos-policy";
import { IArkosPolicy } from "../components/arkos-policy/types";
import { arkos } from "../app";

export {
  ArkosRequest,
  ArkosResponse,
  ArkosNextFunction,
  ArkosRequestHandler,
  IArkosRouter,
  BaseController,
  ArkosConfig,
  RouterConfig,
  RouteHook,
  loadEnvironmentVariables,
  getArkosConfig,
  ArkosRouter,
  ArkosRouteConfig,
  ArkosPolicy,
  IArkosPolicy,
};

/**
 * Main entry point for the Arkos module.
 *
 * @module arkos
 */
export default arkos;
