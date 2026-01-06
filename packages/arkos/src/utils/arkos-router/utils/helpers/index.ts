import rateLimit from "express-rate-limit";
import authService from "../../../../modules/auth/auth.service";
import { validateRequestInputs } from "../../../../modules/base/base.middlewares";
import RouteConfigRegistry from "../../route-config-registry";
import { ArkosRouteConfig } from "../../types";
import express from "express";
import compression from "compression";
import { queryParser } from "../../../helpers/query-parser.helpers";
import uploadManager from "./upload-manager";
import multer from "multer";
import { catchAsync } from "../../../../exports/error-handler";

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
        { [config.authentication.action]: config.authentication?.rule }
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
    middlewares.push(uploadManager.handleUpload(config.experimental.uploads));

    middlewares.push(validateRequestInputs(config));

    middlewares.push(
      uploadManager.handlePostUpload(config.experimental.uploads)
    );
  } else middlewares.push(validateRequestInputs(config));

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
