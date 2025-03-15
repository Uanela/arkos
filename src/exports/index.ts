import { initApp } from "../server";

/**
 * Initializes the Arkos application.
 *
 * @module arkos
 * @property {Function} init - Function to initialize the app.
 */
const arkos = {
  init: initApp,
};

/**
 * Main entry point for the Arkos module.
 *
 * @module arkos
 */
// export * from "./services";
// export * from "./utils";
// export * from "./validation";
// export * from "./error-handler";

export default arkos;
