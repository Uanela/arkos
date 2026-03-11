import { Express } from "express";
import { IncomingMessage, Server, ServerResponse } from "http";

export interface Arkos extends Omit<Express, "listen"> {
  (req: IncomingMessage, res: ServerResponse): void;
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
}
