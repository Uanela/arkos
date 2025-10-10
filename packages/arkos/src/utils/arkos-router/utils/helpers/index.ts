import { authService } from "../../../../exports/services";
import { validateRequestInputs } from "../../../../modules/base/base.middlewares";
import RouteConfigRegistry from "../../route-config-registry";
import { ArkosRouteConfig } from "../../types";

export function extractArkosRoutes(
  app: any,
  basePath = ""
): Array<{
  path: string;
  method: string;
  config?: ArkosRouteConfig;
}> {
  const routes: Array<{
    path: string;
    method: string;
    config?: ArkosRouteConfig;
  }> = [];

  function extractFromStack(stack: any[], prefix = "") {
    stack.forEach((layer: any) => {
      if (layer.route) {
        const fullPath = prefix + layer.route.path;
        const methods = Object.keys(layer.route.methods);

        methods.forEach((method) => {
          const handlers = layer.route.stack || [];
          let config: ArkosRouteConfig | undefined;

          for (const handler of handlers) {
            const foundConfig = RouteConfigRegistry.get(handler.handle);
            console.log(foundConfig, method, layer.route);

            if (foundConfig) {
              config = foundConfig;
              routes.push({
                path: fullPath,
                method: method.toUpperCase(),
                config,
              });

              break;
            }
          }
        });
      } else if (layer.name === "router" && layer.handle?.stack) {
        let nestedPrefix = prefix;

        if (layer.regexp) {
          const match = layer.regexp
            .toString()
            .match(/\/\^?(\\\/[^?]+|\/[^?]+)/);
          if (match) {
            nestedPrefix = prefix + "/" + match[1].replace(/\\\//g, "/");
            nestedPrefix = nestedPrefix
              .replace(/\/\//g, "/")
              .replace(/\/$/, "");
          }
        }

        extractFromStack(layer.handle.stack, nestedPrefix);
      }
    });
  }

  const stack = app._router?.stack || app.stack;
  if (stack) extractFromStack(stack, basePath);

  return routes;
}

export function getMiddlewareStack(config: ArkosRouteConfig) {
  const middlewares = [];
  if (config.authentication) middlewares.push(authService.authenticate);
  if (
    typeof config.authentication === "object" &&
    config.authentication.action &&
    config.authentication.resource
  )
    middlewares.push(
      authService.handleAccessControl(
        config.authentication.action,
        config.authentication.resource,
        {
          [config.authentication.action]: config.authentication?.rule,
        }
      )
    );

  middlewares.push(validateRequestInputs(config));

  return middlewares;
}
