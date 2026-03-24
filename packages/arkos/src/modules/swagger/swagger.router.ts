import { Router } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import getSwaggerDefaultConfig from "./utils/helpers/get-swagger-default-configs";
import { importEsmPreventingTsTransformation } from "../../utils/helpers/global.helpers";
import { generateOpenAPIFromApp } from "../../utils/arkos-router";
import express from "express";
import { ArkosConfig, ArkosRequest, ArkosResponse } from "../../exports";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { OpenAPIV3 } from "openapi-types";

const swaggerRouter = Router();

export async function getSwaggerRouter(
  arkosConfig: ArkosConfig,
  app: express.Express
): Promise<Router> {
  const pathsFromCustomArkosRouters = generateOpenAPIFromApp(app);

  const swaggerConfigs = deepmerge(
    getSwaggerDefaultConfig({
      ...pathsFromCustomArkosRouters,
      ...getSystemJsonSchemaPaths(),
    }) || {},
    arkosConfig.swagger || {}
  ) as ArkosConfig["swagger"];

  const { definition, ...options } = swaggerConfigs?.options!;

  const swaggerSpecification = swaggerJsdoc({
    definition: definition as swaggerJsdoc.SwaggerDefinition,
    ...options,
  });

  const scalar = await importEsmPreventingTsTransformation(
    "@scalar/express-api-reference"
  );

  const endpoint = swaggerConfigs!.endpoint!;

  swaggerRouter.get(
    `${endpoint}/openapi.json`,
    (_: ArkosRequest, res: ArkosResponse) => {
      res.json(swaggerSpecification);
    }
  );

  swaggerRouter.use(
    endpoint,
    scalar.apiReference({
      content: swaggerSpecification,
      ...swaggerConfigs?.scalarApiReferenceConfiguration,
    })
  );

  return swaggerRouter;
}

function getSystemJsonSchemaPaths() {
  const paths: OpenAPIV3.PathsObject = {};

  paths["/api/available-resources"] = {
    get: {
      tags: ["System"],
      summary: "Get available resources",
      description:
        "Returns a comprehensive list of all available API resource endpoints",
      operationId: "getAvailableResources",
      responses: {
        "200": {
          description: "List of available resources retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                    description: "Array of available resource endpoints",
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  return paths;
}
