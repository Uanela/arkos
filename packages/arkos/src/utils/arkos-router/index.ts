import { Router, RouterOptions } from "express";
import { IArkosRouter } from "./types";
import { OpenAPIV3 } from "openapi-types";
import { extractArkosRoutes, extractPathParams } from "./utils/helpers";
import { getArkosConfig } from "../../exports";
import zodToJsonSchema from "zod-to-json-schema";
import classValidatorToJsonSchema from "../../modules/swagger/utils/helpers/class-validator-to-json-schema";
import openApiSchemaConverter from "../../modules/swagger/utils/helpers/openapi-schema-converter";
import arkosRouterOpenApiManager from "./arkos-router-openapi-manager";
import { applyArkosRouterProxy } from "./utils/helpers/apply-arkos-router-proxy";
import { Arkos } from "../../types/arkos";
import { ArkosRouterBaseUploadConfig } from "./types/upload-config";

export type ArkosRouterOptions = {
  /**
   * Prefix to apply to all routes in this router.
   * Nested routers inherit and concatenate prefixes from parent routers.
   *
   * @since 1.5.0-beta
   * @example
   * // All routes in this router will be prefixed with "/api"
   * prefix: "/api"
   */
  prefix?: string | RegExp | Array<string | RegExp>;
  /**
   * OpenAPI metadata to apply to all routes in this router.
   * Nested routers inherit from parent routers unless explicitly overridden.
   * Route-level openapi config fully replaces inherited values when defined.
   *
   * @since 1.6.0-beta
   * @example
   * openapi: {
   *   tags: ["Users"],
   *   security: [{ bearerAuth: [] }]
   * }
   */
  openapi?: {
    /**
     * Tags to apply to all routes in this router, used to group them in OpenAPI documentation.
     * Route-level tags fully replaces this value when defined.
     *
     * @since 1.6.0-beta
     * @example
     * // Group all routes in this router under "Users"
     * tags: ["Users"]
     */
    tags?: string[];
    /**
     * Security requirements to apply to all routes in this router.
     * Route-level security fully replaces this value when defined.
     *
     * @since 1.6.2-canary.1
     * @example
     * // Require bearer auth for all routes in this router
     * security: [{ bearerAuth: [] }]
     *
     * // Explicitly make all routes public (overridable per route)
     * security: []
     */
    security?: OpenAPIV3.SecurityRequirementObject[];

    /**
     * Server definitions to apply to all routes in this router.
     * Follows the OpenAPI 3.0 Server Object specification.
     * Route-level servers fully replaces this value when defined.
     *
     * @since 1.6.2-canary.1
     * @example
     * servers: [{ url: "https://api.example.com/v2", description: "V2 API" }]
     */
    servers?: OpenAPIV3.ServerObject[];
    /**
     * External documentation to apply to all routes in this router.
     * Route-level externalDocs fully replaces this value when defined.
     *
     * @since 1.6.2-canary.1
     * @example
     * externalDocs: {
     *   description: "Find more information here",
     *   url: "https://docs.example.com/users"
     * }
     */
    externalDocs?: OpenAPIV3.ExternalDocumentationObject;
  };
  /**
   * Allow customizing uploads on route level
   *
   * @since 1.7.0-canary.39
   */
  uploads?: ArkosRouterBaseUploadConfig;
};

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
 * @see {@link https://www.arkosjs.com/docs/reference/arkos-router} for configuration options
 * @since 1.4.0-beta
 */
export default function ArkosRouter(
  options?: RouterOptions & ArkosRouterOptions
): IArkosRouter {
  const router = Router(options);
  return applyArkosRouterProxy(router, options) as IArkosRouter;
}

const hasDuplicatedPath = (path: string) => /^(\/.+)\1/.test(path);

export function generateOpenAPIFromApp(app: Arkos) {
  const routes = extractArkosRoutes(app);
  const arkosConfig = getArkosConfig();

  let paths: Record<
    string,
    Record<string, Partial<OpenAPIV3.OperationObject>>
  > = {};

  routes.forEach(({ path, method, config, routeOptions }) => {
    if (config?.experimental?.openapi === false || hasDuplicatedPath(path))
      return;
    const originalPath = path;

    const pathParatemersFromRoutePath = extractPathParams(path);
    for (const parameter of pathParatemersFromRoutePath) {
      path = path.replaceAll(
        `:${parameter}`,
        parameter.endsWith("?") ? `{${parameter}}?` : `{${parameter}}`
      );
    }

    let wildcardCount = (path.match(/\*/g) || []).length;
    let wildcardIndex = 0;
    path = path.replace(/\*/g, () => {
      wildcardIndex++;
      return wildcardCount === 1 ? "{path}" : `{path${wildcardIndex}}`;
    });

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

    let parameters: {
      in: string;
      name: string;
      required: boolean;
      schema: any;
    }[] = [];
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
        param.in === "path" &&
        param.name !== "*"
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
      ...convertedOpenAPI,
      summary: openapi?.summary || `${path}`,
      description: openapi?.description || `${method} ${path}`,
      servers: openapi?.servers || routeOptions?.openapi?.servers || undefined,
      security:
        openapi?.security || routeOptions?.openapi?.security || undefined,
      externalDocs:
        openapi?.externalDocs ||
        routeOptions?.openapi?.externalDocs ||
        undefined,
      tags: openapi?.tags || routeOptions?.openapi?.tags || ["Defaults"],
      operationId: openapi.operationId || `${method.toLowerCase()}:${path}`,
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
                ...convertedOpenAPI?.requestBody?.content,
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
      ...(!multipartFormSchema &&
        !(config as any)?.validation?.body &&
        hasUploadFields && {
          requestBody: {
            content: (() => {
              const schema =
                convertedOpenAPI?.requestBody?.content?.["application/json"]
                  ?.schema || {};

              return {
                "multipart/form-data": {
                  schema: openApiSchemaConverter.flattenSchema(
                    arkosRouterOpenApiManager.addUploadFields(
                      config?.experimental?.uploads! || {},
                      schema
                    )
                  ),
                },
                ...convertedOpenAPI?.requestBody?.content,
              };
            })(),
          },
        }),
    } as OpenAPIV3.PathItemObject;
  });

  return paths;
}
