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

export { ArkosRequest, ArkosResponse, ArkosNextFunction, ArkosRequestHandler };

/**
 * Main entry point for the Arkos module.
 *
 * @module arkos
 */
export default arkos;

// export * from "./services";
// export * from "./utils";
// export * from "./validation";
// export * from "./error-handler";
