import { PrismaModelRouterConfig } from "../types/prisma-model-router-config";
import { ArkosConfig } from "./../../dist/types/types/arkos-config.d";
import { BaseController } from "./../modules/base/base.controller";
import { initApp } from "../server";
import {
  ArkosRequest,
  ArkosResponse,
  ArkosNextFunction,
  ArkosRequestHandler,
} from "../types";

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
