import { Express } from "express";
import { Server } from "http";

export interface Arkos extends Omit<Express, "listen"> {
  /**
   * Applies all loaded items to the app by adding them as middleware,
   * routers, or handlers at the end of the stack.
   *
   * This ensures that Arkos internals always run after user middleware/routes.
   * Automatically called before listen() if not called manually.
   */
  build(): Promise<this>;
  /**
   * Starts the server using Arkos-managed port and host configuration.
   * Automatically calls build() if not called manually.
   *
   * @param callback Optional callback invoked once server starts
   */
  listen(callback?: (error?: Error) => void): Promise<Server>;
  /**
   * Starts the server using Arkos-managed port and host configuration.
   * app.build() must be called before this.
   *
   * @param server {Server} - Optional callback invoked once server starts
   * @param callback Optional callback invoked once server starts
   */
  listen(server: Server, callback?: (error?: Error) => void): Promise<Server>;

  /**
   * Returns the server configuration [port, host, callback?]
   * Can be used with http.createServer(app).listen(...args)
   */
  getServerConfig(
    cb?: (err?: Error) => void
  ): [number, string, ((err?: Error) => void)?];
}
