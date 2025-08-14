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

const swaggerRouter = Router();

export async function getSwaggerRouter(
  arkosConfig: ArkosConfig
): Promise<Router> {
  let defaultJsonSchemas = await getOpenAPIJsonSchemasByConfigMode(arkosConfig);
  const defaultModelsPaths = await generatePathsForModels(arkosConfig);

  defaultJsonSchemas = {
    ...defaultJsonSchemas,
    ...(await missingJsonSchemaGenerator.generateMissingJsonSchemas(
      defaultModelsPaths,
      defaultJsonSchemas,
      arkosConfig
    )),
  };

  // Merge default config with user config
  const swaggerConfigs = deepmerge(
    (await getSwaggerDefaultConfig(defaultModelsPaths, defaultJsonSchemas)) ||
      {},
    arkosConfig.swagger || {}
  ) as ArkosConfig["swagger"];

  const { definition, ...options } = swaggerConfigs?.options!;

  // Generate OpenAPI specification using swagger-jsdoc
  const swaggerSpecification = swaggerJsdoc({
    definition: definition as swaggerJsdoc.SwaggerDefinition,
    ...options,
  });

  const scalar = await importEsmPreventingTsTransformation(
    "@scalar/express-api-reference"
  );
  // Serve Scalar API documentation
  swaggerRouter.use(
    swaggerConfigs!.endpoint!,
    scalar.apiReference({
      content: swaggerSpecification,
      ...swaggerConfigs?.scalarApiReferenceConfiguration,
    })
  );

  return swaggerRouter;
}
