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
import { ArkosPolicy } from "../components/arkos-policy";
import { IArkosPolicy } from "../components/arkos-policy/types";

/**
 * Initializes the Arkos application.
 *
 * @module arkos
 * @property {Function} init - Function to initialize the app.
 */
const arkos = {
  init: initApp,
};

export {
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
