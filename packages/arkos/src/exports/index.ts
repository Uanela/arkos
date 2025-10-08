import { RouterConfig } from "../types/router-config";
import { BaseController } from "./../modules/base/base.controller";
import { initApp, getArkosConfig } from "../server";
import ArkosRouter from "../utils/arkos-router";
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
  RouterConfig,
  getArkosConfig,
  /**
   * Creates an enhanced Express Router with features like OpenAPI documentation capabilities and smart data validation.
   *
   * The ArkosRouter extends the standard Express Router with the ability to
   * automatically capture OpenAPI metadata from route configurations.
   *
   * @example
   * const router = ArkosRouter();
   *
   * router.get(
   *   {
   *     route: "/users/:id",
   *     openapi: {
   *       summary: "Get user by ID",
   *       tags: ["Users"]
   *     }
   *   },
   *   (req, res) => { ... }
   * );
   *
   * @returns {IArkosRouter} A proxied Express Router instance with enhanced OpenAPI capabilities
   *
   * @see {@link ArkosRouteConfig} for configuration options
   */
  ArkosRouter,
};

/**
 * Main entry point for the Arkos module.
 *
 * @module arkos
 */
export default arkos;
