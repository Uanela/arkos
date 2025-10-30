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
<<<<<<< HEAD
import { generateOpenAPIFromApp } from "../../utils/arkos-router";
import express from "express";
=======
import getFileUploadJsonSchemaPaths from "./utils/helpers/get-file-upload-json-schema-paths";
>>>>>>> 84a6c14ce0aeb22f948b9fb116dd0544da588aab

const swaggerRouter = Router();

export async function getSwaggerRouter(
  arkosConfig: ArkosConfig,
  app: express.Express
): Promise<Router> {
  let defaultJsonSchemas = await getOpenAPIJsonSchemasByConfigMode(arkosConfig);
  const defaultModelsPaths = await generatePathsForModels(arkosConfig);
<<<<<<< HEAD
  const pathsFromCustomArkosRouters = generateOpenAPIFromApp(app);

=======
  const fileUploadDefaultPaths = getFileUploadJsonSchemaPaths(arkosConfig);
>>>>>>> 84a6c14ce0aeb22f948b9fb116dd0544da588aab
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
    (await getSwaggerDefaultConfig(
<<<<<<< HEAD
      { ...defaultModelsPaths, ...pathsFromCustomArkosRouters },
=======
      {
        ...defaultModelsPaths,
        ...fileUploadDefaultPaths,
      },
>>>>>>> 84a6c14ce0aeb22f948b9fb116dd0544da588aab
      defaultJsonSchemas
    )) || {},
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
