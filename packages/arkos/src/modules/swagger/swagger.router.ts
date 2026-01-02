import { Router } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import {
  generatePathsForModels,
  getOpenAPIJsonSchemasByConfigMode,
} from "./utils/helpers/swagger.router.helpers";
import missingJsonSchemaGenerator from "./utils/helpers/missing-json-schemas-generator";
import getSwaggerDefaultConfig from "./utils/helpers/get-swagger-default-configs";
import { importEsmPreventingTsTransformation } from "../../utils/helpers/global.helpers";
import generateSystemJsonSchemas from "./utils/helpers/json-schema-generators/generate-system-json-schemas";
import { generateOpenAPIFromApp } from "../../utils/arkos-router";
import express from "express";
import getFileUploadJsonSchemaPaths from "./utils/helpers/get-file-upload-json-schema-paths";
import { ArkosConfig, ArkosRequest, ArkosResponse } from "../../exports";
import deepmerge from "../../utils/helpers/deepmerge.helper";

const swaggerRouter = Router();

export async function getSwaggerRouter(
  arkosConfig: ArkosConfig,
  app: express.Express
): Promise<Router> {
  let defaultJsonSchemas = getOpenAPIJsonSchemasByConfigMode(arkosConfig);
  const pathsFromCustomArkosRouters = generateOpenAPIFromApp(app);
  const defaultModelsPaths = generatePathsForModels(
    arkosConfig,
    pathsFromCustomArkosRouters
  );

  const fileUploadDefaultPaths = getFileUploadJsonSchemaPaths(arkosConfig);

  const missingJsonSchemas =
    missingJsonSchemaGenerator.generateMissingJsonSchemas(
      defaultModelsPaths,
      defaultJsonSchemas,
      arkosConfig
    );

  defaultJsonSchemas = {
    ...defaultJsonSchemas,
    ...missingJsonSchemas,
    ...generateSystemJsonSchemas(arkosConfig),
  };

  const swaggerConfigs = deepmerge(
    getSwaggerDefaultConfig(
      {
        ...pathsFromCustomArkosRouters,
        ...defaultModelsPaths,
        ...fileUploadDefaultPaths,
      },
      defaultJsonSchemas
    ) || {},
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
