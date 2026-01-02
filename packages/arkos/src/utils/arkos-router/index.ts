import { Router } from "express";
import { IArkosRouter, ArkosRouteConfig } from "./types";
import { OpenAPIV3 } from "openapi-types";
import RouteConfigValidator from "./route-config-validator";
import RouteConfigRegistry from "./route-config-registry";
import {
  extractArkosRoutes,
  extractPathParams,
  getMiddlewareStack,
} from "./utils/helpers";
import { getArkosConfig } from "../../exports";
import { catchAsync } from "../../exports/error-handler";
import { ArkosErrorRequestHandler, ArkosRequestHandler } from "../../types";
import zodToJsonSchema from "zod-to-json-schema";
import classValidatorToJsonSchema from "../../modules/swagger/utils/helpers/class-validator-to-json-schema";
import openApiSchemaConverter from "../../modules/swagger/utils/helpers/openapi-schema-converter";
import uploadManager from "./utils/helpers/upload-manager";
import { getUserFileExtension } from "../helpers/fs.helpers";

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
 *     path: "/users/:id",
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
export default function ArkosRouter(): IArkosRouter {
  const router = Router();

  return new Proxy(router, {
    get(target, prop, receiver) {
      const originalMethod = Reflect.get(target, prop, receiver);

      const httpMethods = [
        "get",
        "post",
        "put",
        "patch",
        "delete",
        "all",
        "head",
        "trace",
        "options",
      ];

      type ArkosAnyRequestHandler =
        | ArkosRequestHandler
        | ArkosErrorRequestHandler;

      if (httpMethods.includes(prop as string)) {
        return function (
          config: ArkosRouteConfig,
          ...handlers: ArkosAnyRequestHandler[]
        ) {
          if (config.disabled) return;

          const path = config.path;

          if (!RouteConfigValidator.isArkosRouteConfig(config))
            throw Error(
              `First argument of ArkosRouter().${prop as string}() must be a valid ArkosRouteConfig object with path field, but recevied ${typeof config === "object" ? JSON.stringify(config, null, 2) : config}`
            );

          if ([null, undefined].includes(path as any))
            throw Error(
              "Please pass valid value for path field to use in your route"
            );

          const method = prop as string;

          if (handlers.length > 0) {
            handlers = handlers.map(
              (handler: ArkosAnyRequestHandler | ArkosAnyRequestHandler[]) => {
                return typeof handler === "function"
                  ? catchAsync(handler, {
                      type: handler.length > 3 ? "error" : "normal",
                    })
                  : handler.map((nesteHandler: any) =>
                      catchAsync(nesteHandler, {
                        type: handler.length > 3 ? "error" : "normal",
                      })
                    );
              }
            );

            const finalHandler = handlers[handlers.length - 1];
            RouteConfigRegistry.register(finalHandler, config, method);
          }

          const arkosConfig = getArkosConfig();
          const validationConfig = arkosConfig.validation;
          const authenticationConfig = arkosConfig.authentication;
          const strictValidation = validationConfig?.strict;
          const route = `${method.toUpperCase()} ${path}`;

          if (
            strictValidation &&
            (!("validation" in config) ||
              ("validation" in config &&
                !config.validation &&
                config.validation !== undefined))
          )
            throw Error(
              "When using strict validation you must either pass { validation: false } in order to explicitly tell that no input will be received, or pass `undefined` for each input type e.g { validation: { query: undefined } } in order to deny the input of given request input."
            );

          if (!validationConfig?.resolver && config.validation)
            throw Error(
              `Trying to pass validators into route ${route} config validation option without choosing a validation resolver under arkos.init({ validation: { resolver: '' } })`
            );

          if (config.authentication && !authenticationConfig?.mode)
            throw Error(
              `Trying to authenticate route ${route} without choosing an authentication mode under arkos.config.${getUserFileExtension()}

For further help see https://www.arkosjs.com/docs/core-concepts/authentication-system.`
            );

          handlers = [...getMiddlewareStack(config), ...handlers];

          if (
            config.experimental?.uploads &&
            config.experimental.uploads.deleteOnError !== false
          )
            handlers.push(
              catchAsync(
                uploadManager.handleFileCleanup(config.experimental.uploads),
                { type: "error" }
              )
            );

          return originalMethod.call(target, path, ...handlers);
        };
      }
      // }
      return originalMethod;
    },
  }) as IArkosRouter;
}

export function generateOpenAPIFromApp(app: any) {
  const routes = extractArkosRoutes(app);
  const arkosConfig = getArkosConfig();

  let paths: Record<
    string,
    Record<string, Partial<OpenAPIV3.OperationObject>>
  > = {};

  routes.forEach(({ path, method, config }) => {
    if (config?.experimental?.openapi === false) return;
    const originalPath = path;

    const pathParatemersFromRoutePath = extractPathParams(path);
    for (const parameter of pathParatemersFromRoutePath) {
      path = path.replaceAll(
        `:${parameter}`,
        parameter.endsWith("?") ? `{${parameter}}?` : `{${parameter}}`
      );
    }

    if (!paths[path]) paths[path] = {};

    if (typeof config?.experimental?.openapi === "boolean") {
      config = {
        ...config,
        experimental: {
          ...config.experimental,
          openapi: {},
        },
      };
    }

    const openapi =
      typeof config?.experimental?.openapi === "object" &&
      config.experimental.openapi !== null
        ? config.experimental.openapi
        : {};

    const validatorToJsonSchema =
      arkosConfig?.validation?.resolver === "zod"
        ? zodToJsonSchema
        : classValidatorToJsonSchema;

    let parameters = [];
    const validationToParameterMapping = {
      query: "query",
      params: "path",
      headers: "header",
      cookies: "cookie",
    };

    if (typeof config?.validation !== "boolean" && config?.validation) {
      for (const [key, val] of Object.entries(config?.validation)) {
        if (["body"].includes(key)) continue;
        if ((config?.validation as any)[key]) {
          const jsonSchema = validatorToJsonSchema(val as any);
          const params = openApiSchemaConverter.jsonSchemaToOpeApiParameters(
            (validationToParameterMapping as any)[key],
            jsonSchema
          );
          parameters.push(...params);
        }
      }
    }

    const convertedOpenAPI =
      openApiSchemaConverter.convertOpenAPIConfig(openapi);

    const allParameters: OpenAPIV3.ParameterObject[] = [
      ...(convertedOpenAPI.parameters || []),
      ...parameters,
    ];

    for (const parameter of pathParatemersFromRoutePath) {
      if (
        !allParameters.find(
          ({ name, in: paramIn }) =>
            name === parameter.replace("?", "") && paramIn === "path"
        )
      )
        allParameters.push({
          name: parameter,
          in: "path",
          required: !parameter.includes("?"),
          schema: { type: "string" },
        });
    }

    for (const param of allParameters) {
      if (
        !pathParatemersFromRoutePath.includes(param.name) &&
        !pathParatemersFromRoutePath.includes(`${param.name}?`)
      )
        throw new Error(
          `ValidationError: Trying to define path parameter '${param.name}' but it is not present in your pathname ${originalPath}`
        );
    }

    delete convertedOpenAPI.parameters;

    (paths as any)[path][method.toLowerCase()] = {
      summary: openapi?.summary || `${path}`,
      description: openapi?.description || `${method} ${path}`,
      tags: openapi?.tags || ["Defaults"],
      operationId: `${method.toLowerCase()}:${path}`,
      parameters: allParameters,
      ...(!convertedOpenAPI.requestBody &&
        config?.validation &&
        config?.validation?.body && {
          requestBody: {
            content: {
              "application/json": {
                schema: validatorToJsonSchema(config?.validation?.body as any),
              },
            },
          },
        }),
      ...convertedOpenAPI,
    };
  });

  return paths;
}
