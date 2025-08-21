import { getExpressApp } from "../../../../server";
import { ArkosRequest } from "../../../../types";

export const getAppRoutes = () => {
  const app = getExpressApp();
  const routes: { method: string; path: string }[] = [];

  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      // Direct routes on the app
      Object.keys(middleware.route.methods).forEach((method) => {
        routes.push({
          method: method.toUpperCase(),
          path: middleware.route.path,
        });
      });
    } else if (middleware.handle && middleware.handle.stack) {
      // Extract the base path from the middleware's regexp pattern
      let basePath = "";
      if (middleware.regexp) {
        // Handle pattern like /^\/api\/?(?=\/|$)/i
        const regexpStr = middleware.regexp.toString();

        // More robust pattern matching
        if (regexpStr.includes?.("/?(?=")) {
          // Extract everything between the start and the '/?(?=' pattern
          const match = regexpStr.match(/\/\^(\\\/[^?]+)/);
          if (match) {
            // Clean up the extracted path
            basePath = match[1].replace(/\\\//g, "/");
          }
        } else {
          // Handle other regexp patterns
          const simpleMatch = regexpStr.match(/\/\^(\\\/[^\\]+)/);
          if (simpleMatch) {
            basePath = simpleMatch[1].replace(/\\\//g, "/");
          }
        }
      }

      // Process routes in the middleware's router
      middleware.handle.stack.forEach((routerMiddleware: any) => {
        if (routerMiddleware.route) {
          Object.keys(routerMiddleware.route.methods).forEach((method) => {
            let routePath = routerMiddleware.route.path;
            let fullPath;

            // Check if routePath already contains regex artifacts
            if (routePath.includes?.("/?(?=")) {
              // Extract the actual path from the regex pattern
              const pathMatch = routePath.match(/\/\^?(\\\/[^?]+|\/[^?]+)/);
              if (pathMatch) {
                const cleanPath = pathMatch[1].replace(/\\\//g, "/");
                fullPath = basePath ? basePath + cleanPath : cleanPath;
              } else {
                // If we can't clean it, at least extract what's after '/?(?='
                const fallbackMatch = routePath.match(/\?\(\?=([^)]+)/);
                if (fallbackMatch) {
                  fullPath = fallbackMatch[1];
                } else {
                  fullPath = routePath; // Use as is if no pattern matches
                }
              }
            } else {
              // Normal path joining
              fullPath = basePath
                ? basePath.replace(/\/$/, "") +
                  (routePath.startsWith("/") ? routePath : "/" + routePath)
                : routePath;
            }

            // Clean up any remaining regex artifacts
            fullPath = fullPath
              .replace(/\\\//g, "/")
              .replace(/\^/g, "")
              .replace(/\$/g, "");

            // Remove any "/?(?=" patterns that might remain
            if (fullPath.includes?.("/?(?=")) {
              fullPath = fullPath.replace(/\/\?\(\?=[^)]*\)/g, "");
            }

            routes.push({
              method: method.toUpperCase(),
              path: fullPath,
            });
          });
        }
      });
    }
  });

  return routes;
};
