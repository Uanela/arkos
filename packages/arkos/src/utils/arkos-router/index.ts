import { Router, RouterOptions } from "express";
import { IArkosRouter, ArkosRouteConfig } from "./types";
import { OpenAPIV3 } from "openapi-types";
import { extractArkosRoutes, extractPathParams } from "./utils/helpers";
import { getArkosConfig } from "../../exports";
import zodToJsonSchema from "zod-to-json-schema";
import classValidatorToJsonSchema from "../../modules/swagger/utils/helpers/class-validator-to-json-schema";
import openApiSchemaConverter from "../../modules/swagger/utils/helpers/openapi-schema-converter";
import arkosRouterOpenApiManager from "./arkos-router-openapi-manager";
import { applyArkosRouterProxy } from "./utils/helpers/apply-arkos-router-proxy";

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
export default function ArkosRouter(
  options?: RouterOptions & {
    prefix?: string | RegExp | Array<string | RegExp>;
    openapi?: { tags?: string[] };
  }
): IArkosRouter {
  const router = Router(options);
  return applyArkosRouterProxy(router, options) as IArkosRouter;
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
          const params = openApiSchemaConverter.jsonSchemaToOpenApiParameters(
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
        !pathParatemersFromRoutePath.includes(`${param.name}?`) &&
        param.in === "path"
      )
        throw new Error(
          `ValidationError: Trying to define path parameter '${param.name}' but it is not present in your pathname ${originalPath}`
        );
    }

    delete convertedOpenAPI.parameters;
    const hasUploadFields =
      Object.keys(config?.experimental?.uploads || {}).length > 0;
    const multipartFormSchema =
      convertedOpenAPI?.requestBody?.content?.["multipart/form-data"];

    if (hasUploadFields && multipartFormSchema)
      arkosRouterOpenApiManager.validateMultipartFormDocs(
        multipartFormSchema,
        path,
        config?.experimental?.uploads
      );

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
            content: (() => {
              const schema = validatorToJsonSchema(
                config?.validation?.body as any
              );

              return {
                ...(hasUploadFields && {
                  "multipart/form-data": {
                    schema: openApiSchemaConverter.flattenSchema(
                      arkosRouterOpenApiManager.addUploadFields(
                        config.experimental?.uploads!,
                        schema
                      )
                    ),
                  },
                }),
                "application/json": {
                  schema,
                },
              };
            })(),
          },
        }),
      ...(convertedOpenAPI?.requestBody?.content?.["application/json"] &&
        !multipartFormSchema &&
        !(config as any)?.validation?.body &&
        hasUploadFields && {
          requestBody: {
            content: (() => {
              const schema =
                convertedOpenAPI?.requestBody?.content?.["application/json"];

              return {
                "multipart/form-data": {
                  schema: openApiSchemaConverter.flattenSchema(
                    arkosRouterOpenApiManager.addUploadFields(
                      config?.experimental?.uploads! || {},
                      schema
                    )
                  ),
                },
                ...convertedOpenAPI?.requestBody,
              };
            })(),
          },
        }),
      ...convertedOpenAPI,
    };
  });

  return paths;
}
