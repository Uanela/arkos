import { RouterConfig } from "../types/router-config";
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
import { arkos } from "../app";
import { ArkosRouteHook } from "../components/arkos-route-hook";
import { ArkosServiceHook } from "../components/arkos-service-hook";
import { ArkosRouteHookInstance } from "../components/arkos-route-hook/types";
import { ArkosPolicy } from "../components/arkos-policy";
import { IArkosPolicy } from "../components/arkos-policy/types";
import type { ArkosLoadable } from "../types/arkos";

export {
  ArkosLoadable,
  ArkosRequest,
  ArkosResponse,
  ArkosNextFunction,
  ArkosRequestHandler,
  IArkosRouter,
  BaseController,
  ArkosConfig,
  RouterConfig,
  loadEnvironmentVariables,
  getArkosConfig,
  ArkosRouteHook,
  ArkosServiceHook,
  ArkosRouter,
  ArkosRouteConfig,
  ArkosRouteHookInstance,
  ArkosPolicy,
  IArkosPolicy,
};

export default arkos;
