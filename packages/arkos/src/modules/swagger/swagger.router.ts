import { Router } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import { ArkosConfig } from "../../types/arkos-config";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import {
  generatePathsForModels,
  getOpenAPIJsonSchemasByConfigMode,
} from "./utils/helpers/swagger.router.helpers";
import missingJsonSchemaGenerator from "./utils/helpers/missing-json-schemas-generator";
import getSwaggerDefaultConfig from "./utils/helpers/get-swagger-default-configs";
import { importEsmPreventingTsTransformation } from "../../utils/helpers/global.helpers";
import generateSystemJsonSchemas from "./utils/helpers/json-schema-generators/generate-system-json-schemas";

const swaggerRouter = Router();

export async function getSwaggerRouter(
  arkosConfig: ArkosConfig
): Promise<Router> {
  let defaultJsonSchemas = await getOpenAPIJsonSchemasByConfigMode(arkosConfig);
  const defaultModelsPaths = await generatePathsForModels(arkosConfig);
  const missingJsonSchemas =
    await missingJsonSchemaGenerator.generateMissingJsonSchemas(
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
    (await getSwaggerDefaultConfig(defaultModelsPaths, defaultJsonSchemas)) ||
      {},
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

  swaggerRouter.use(
    swaggerConfigs!.endpoint!,
    scalar.apiReference({
      content: swaggerSpecification,
      ...swaggerConfigs?.scalarApiReferenceConfiguration,
    })
  );

  return swaggerRouter;
}
