import { PrismaModelRouterConfig } from "../types/prisma-model-router-config";
import { BaseController } from "./../modules/base/base.controller";
import { initApp } from "../server";
import {
  ArkosRequest,
  ArkosResponse,
  ArkosNextFunction,
  ArkosRequestHandler,
} from "../types";
import { ArkosConfig } from "../types/arkos-config";

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
  BaseController,
  ArkosConfig,
  PrismaModelRouterConfig,
};

/**
 * Main entry point for the Arkos module.
 *
 * @module arkos
 */
export default arkos;
