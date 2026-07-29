import rateLimit from "express-rate-limit";
import authService from "../../../../modules/auth/auth.service";
import { validateRequestInputs } from "../../../../modules/base/base.middlewares";
import { ArkosRouteConfig } from "../../types";
import express from "express";
import compression from "compression";
import { queryParser } from "../../../helpers/query-parser.helpers";
import uploadManager from "./upload-manager";
import multer from "multer";
import { catchAsync } from "../../../../exports/error-handler";
import { ArkosRouterOptions } from "../..";
import RouteConfigRegistry from "../../route-config-registry";

export function extractArkosRoutes(
  app: any,
  basePath = "",
  inheritedRouteOptions?: ArkosRouterOptions
) {
  if (
    inheritedRouteOptions &&
    Object.keys(inheritedRouteOptions).length === 0
  )
    inheritedRouteOptions = undefined;


  const routes: any[] = [];

  function extractFromStack(
    stack: any[],
    prefix = "",
    inheritedRouteOptions?: ArkosRouterOptions
  ) {
    if (!stack || !Array.isArray(stack)) return;

    for (const layer of stack) {
      if (layer.route) {
        const fullPath = joinPaths(prefix, layer.route.path);
        const methods = Object.keys(layer.route.methods || {});

        for (const method of methods) {
          const handlers = layer.route.stack || [];
          let routeConfig = null;
          let routeOptions = inheritedRouteOptions;

          for (const handler of handlers) {
            const registryConfig = RouteConfigRegistry.get(handler.handle);
            if (registryConfig) {
              routeConfig = registryConfig;
              routes.push({
                path: fullPath,
                method: method.toUpperCase(),
                routeOptions,
                config: routeConfig || {
                  method: method.toUpperCase(),
                  path: layer.route.path,
                },
              })
              break;
            }

            const arkosMeta = handler.handle?._arkos || handler._arkos;
            if (arkosMeta) {
              routeOptions = arkosMeta.options || routeOptions;
            }
          }
        }
      } else if (
        layer.name === "router" ||
        layer.name === "bound dispatch" ||
        layer.handle?.stack
      ) {
        let nestedPrefix = prefix;
        const arkosPrefix = layer.handle?._arkos?.options?.prefix;

        if (arkosPrefix) {
          nestedPrefix = joinPaths(prefix, arkosPrefix);
        } else if (layer.path) {
          nestedPrefix = joinPaths(prefix, layer.path);
        } else if (layer.regexp) {
          nestedPrefix = joinPaths(prefix, extractLayerPath(layer));
        }

        const routerStack = layer.handle?.stack || layer.handle?._router?.stack;
        if (routerStack) {
          const currentOptions =
            layer.handle?._arkos?.options?.openapi
              ? layer.handle._arkos.options
              : inheritedRouteOptions;

          extractFromStack(routerStack, nestedPrefix, currentOptions);
        }
      }
    }
  }

  const stack = app._router?.stack || app.router?.stack || app.stack;

  if (stack)
    extractFromStack(stack, basePath, app._arkos?.options);


  return routes;
}

function joinPaths(prefix: string, path: string | undefined): string {
  if (!path) return prefix || "";

  if (!prefix) {
    return path.startsWith("/") ? path : `/${path}`;
  }

  return `${prefix.replace(/\/$/, "")}/${path.replace(/^\//, "")}`.replace(
    /\/+/g,
    "/"
  );
}

export function extractLayerPath(layer: any): string {
  if (layer.path && typeof layer.path === "string") return layer.path;

  if (layer.path) {
    const source = layer.path;

    if (source === "^\\/?(?=\\/|$)")
      return "";


    let cleaned = source
      .replace(/^\^\\?\//, "/")
      .replace(/^\^/, "")
      .replace(/\\\/\?\(\?=\\\/\|\$\)/g, "")
      .replace(/\(\?=\\\/\|\$\)/g, "")
      .replace(/\\\//g, "/")
      .replace(/\(\?:\\\/\?\)?/g, "")
      .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ":param")
      .replace(/\/\?\$?$/, "")
      .replace(/\$$/, "")
      .replace(/\/+\/+/g, "/");

    if (cleaned && !cleaned.startsWith("/"))
      cleaned = "/" + cleaned;


    if (cleaned.includes("?") || cleaned.includes("(") || cleaned.includes(")")) {
      return typeof layer.path === "string" ? layer.path : "";
    }

    return cleaned;
  }

  return "";
}

export function getMiddlewareStack(
  config: ArkosRouteConfig | Omit<ArkosRouteConfig, "path">
) {
  const middlewares = [];

  if (config.authentication) middlewares.push(authService.authenticate);

  if (
    typeof config.authentication === "object" &&
    config.authentication.action &&
    config.authentication.resource
  )
    middlewares.push(
      authService.authorize(
        config.authentication.action,
        config.authentication.resource,
        config.authentication?.rule
      )
    );

  if (config.rateLimit) middlewares.push(rateLimit(config.rateLimit));
  if (config.compression) middlewares.push(compression(config.compression));
  if (config.queryParser) middlewares.push(queryParser(config.queryParser));

  if (config?.bodyParser) {
    const parsers = Array.isArray(config.bodyParser)
      ? config.bodyParser
      : [config.bodyParser];

    parsers.forEach((parser) => {
      if (typeof parser === "object" && parser.parser)
        if (parser.parser !== "multipart")
          middlewares.push(catchAsync(express[parser.parser](parser.options)));
        else if (parser.parser === "multipart")
          middlewares.push(
            catchAsync(multer({ limits: parser.options }).none())
          );
    });
  }

  if (config.experimental?.uploads) {
    const uploadConfig = config.experimental.uploads;
    middlewares.push(uploadManager.handleUpload(uploadConfig));
    middlewares.push(uploadManager.validateRequiredFiles(uploadConfig));

    middlewares.push(validateRequestInputs(config as ArkosRouteConfig));

    middlewares.push(
      uploadManager.handlePostUpload(config.experimental.uploads)
    );
  } else middlewares.push(validateRequestInputs(config as ArkosRouteConfig));

  return middlewares;
}

/**
 * Extracts path parameters from an Express route path
 *
 * @param path - Express route path with :param syntax
 * @returns Array of parameter names
 *
 * @example
 * extractPathParams('/api/users/:userId/posts/:postId')
 * // => ['userId', 'postId']
 *
 */
export function extractPathParams(path: string): string[] {
  const params: string[] = [];

  const segments = path.split("/");

  for (const segment of segments) {
    if (segment.startsWith(":")) {
      params.push(segment.substring(1).replace(/\(.*\)$/, ""));
    }

    if (segment.startsWith("{*") && segment.endsWith("}")) {
      params.push(segment.slice(2, -1));
    }

    if (segment.startsWith("*")) {
      params.push(segment.substring(1));
    }
  }

  return params;
}
type PathLike = string | RegExp;
type PathInput = PathLike | PathLike[];

export function applyPrefix(
  prefix: PathInput = "",
  path: PathInput
): PathInput {
  if (!prefix) return path;

  const prefixArr = Array.isArray(prefix) ? prefix : [prefix];
  const pathArr = Array.isArray(path) ? path : [path];

  const result: PathLike[] = [];

  for (const pfx of prefixArr) {
    for (const pth of pathArr) {
      result.push(applySinglePrefix(pfx, pth));
    }
  }

  return result.length === 1 ? result[0] : result;
}

function applySinglePrefix(prefix: PathLike, path: PathLike): PathLike {
  const isPrefixRegex = prefix instanceof RegExp;
  const isPathRegex = path instanceof RegExp;

  if (typeof prefix === "string" && typeof path === "string") {
    const normalizedPrefix = prefix.endsWith("/")
      ? prefix.slice(0, -1)
      : prefix;

    return `${normalizedPrefix}${path.startsWith("/") ? "" : "/"}${path}`;
  }

  if (typeof prefix === "string" && isPathRegex) {
    const escapedPrefix = prefix
      .replace(/\/$/, "")
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const source = path.source.startsWith("^")
      ? path.source.slice(1)
      : path.source;

    return new RegExp(`^${escapedPrefix}${source}`, path.flags);
  }

  if (isPrefixRegex && typeof path === "string") {
    const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const prefixSource = prefix.source.endsWith("$")
      ? prefix.source.slice(0, -1)
      : prefix.source;

    return new RegExp(`^${prefixSource}${escapedPath}`, prefix.flags);
  }

  if (isPrefixRegex && isPathRegex) {
    const prefixSource = prefix.source.endsWith("$")
      ? prefix.source.slice(0, -1)
      : prefix.source;

    const pathSource = path.source.startsWith("^")
      ? path.source.slice(1)
      : path.source;

    const flags = Array.from(new Set([...prefix.flags, ...path.flags])).join(
      ""
    );

    return new RegExp(`^${prefixSource}${pathSource}`, flags);
  }

  throw new TypeError("Invalid prefix or path");
}
