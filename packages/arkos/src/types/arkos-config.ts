import http from "http";
import express from "express";
import { IArkosRouter } from "../utils/arkos-router/types";
import { ArkosErrorRequestHandler, ArkosRequestHandler } from ".";

/**
 * Defines the initial configs of the api to be loaded at startup when arkos.init() is called.
 */
export type ArkosInitConfig = {
  /**
   * Allows to add an array of custom express routers/middlewares into the default middleware/routers stack.
   *
   * **Tip**: If you would like to acess the express app before everthing use `configureApp` and pass a function.
   *
   * **Where will these be placed?**: see [www.arkosjs.com/docs/advanced-guide/replace-or-disable-built-in-middlewares#middleware-execution-order](https://www.arkosjs.com/docs/advanced-guide/replace-or-disable-built-in-middlewares#middleware-execution-order)
   *
   * **Note**: If you want to use custom global error handler middleware use `middlewares.replace.globalErrorHandler`.
   *
   * Read more about The Arkos Middleware Stack at [www.arkosjs.com/docs/the-middleware-stack](https://www.arkosjs.com/docs/the-middleware-stack) for in-depth details.
   */
  use?: IArkosRouter[] | ArkosRequestHandler[] | ArkosErrorRequestHandler[];
  /**
   * Gives acess to the underlying express app so that you can add custom configurations beyong **Arkos** customization capabilities
   *
   * **Note**: In the end **Arkos** will call `app.listen` for you.
   *
   * If you want to call `app.listen` by yourself pass port as `undefined` and then use the return app from `arkos.init()`.
   *
   * See how to call `app.listen` correctly [www.arkosjs.com/docs/guide/accessing-the-express-app#calling-applisten-by-yourself](https://www.arkosjs.com/docs/guide/accessing-the-express-app#calling-applisten-by-yourself)
   *
   * See [www.arkosjs.com/docs/guide/accessing-the-express-app](https://www.arkosjs.com/docs/guide/accessing-the-express-app) for further details on the method configureApp.
   *
   * @param {express.Express} app
   * @returns {any}
   */
  configureApp?: (app: express.Express) => Promise<any> | any;
  /**
   * Gives access to the underlying HTTP server so that you can add custom configurations beyond **Arkos** customization capabilities
   *
   * **Note**: In the end **Arkos** will call `server.listen` for you.
   *
   * If you want to call `server.listen` by yourself pass port as `undefined` and then use the return server from `arkos.init()`.
   *
   * See how to call `server.listen` correctly [www.arkosjs.com/docs/guide/accessing-the-express-app#creating-your-own-http-server](https://www.arkosjs.com/docs/guide/accessing-the-express-app#creating-your-own-http-server)
   *
   * See [www.arkosjs.com/docs/guide/accessing-the-express-app#accessing-the-http-server](https://www.arkosjs.com/docs/guide/accessing-the-express-app#accessing-the-http-server) for further details on the method configureServer.
   *
   * @param {http.Server} server - The HTTP server instance
   * @returns {any}
   */
  configureServer?: (server: http.Server) => Promise<any> | any;
};
