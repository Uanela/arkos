import { ArkosRouteConfig } from "./types";
import { isClass, isZodSchema } from "../dynamic-loader";
import { getArkosConfig } from "../../exports";
import { OpenAPIV3 } from "openapi-types";
import ExitError from "../helpers/exit-error";

export default class RouteConfigValidator {
  static isArkosRouteConfig(arg: any): arg is ArkosRouteConfig {
    return typeof arg === "object" && arg !== null && "path" in arg;
  }

  static validate(config: ArkosRouteConfig) {
    const arkosConfig = getArkosConfig();
    const swaggerMode = arkosConfig?.swagger?.mode;

    if (config.validation) {
      const validators = [
        { key: "query", schema: config.validation?.query },
        { key: "body", schema: config.validation?.body },
        { key: "params", schema: config.validation?.params },
      ];

      for (const { key, schema } of validators) {
        if (!schema) continue;

        const isZod = isZodSchema(schema);
        const isClassValidator = isClass(schema);

        if (isZod && swaggerMode !== "zod") {
          throw ExitError(
            `Zod schema used in validation.${key} but Swagger mode is '${swaggerMode}'. ` +
              `Zod schemas are only supported when swagger.mode is 'zod'.`
          );
        }

        if (isClassValidator && swaggerMode !== "class-validator") {
          throw ExitError(
            `Class validator used in validation.${key} but Swagger mode is '${swaggerMode}'. ` +
              `Class validators are only supported when swagger.mode is 'class-validator'.`
          );
        }
      }
    }

    if (config.validation && typeof config.experimental?.openapi === "object") {
      const openapi = config.experimental
        .openapi as Partial<OpenAPIV3.OperationObject>;

      if (
        config.validation.query &&
        openapi.parameters?.some((p: any) => p.in === "query")
      ) {
        throw ExitError(
          "Duplicate query validation definitions. " +
            "When using validation.query, do not define query parameters in openapi.parameters. " +
            "They will be automatically migrated to OpenAPI specification."
        );
      }

      if (
        config.validation.params &&
        openapi.parameters?.some((p: any) => p.in === "params")
      ) {
        throw ExitError(
          "Duplicate path parameter validation definitions. " +
            "When using validation.params, do not define path parameters in openapi.parameters. " +
            "They will be automatically migrated to OpenAPI specification."
        );
      }

      if (config.validation.body && openapi.requestBody) {
        throw ExitError(
          "Duplicate request body validation definitions. " +
            "When using validation.body, do not define openapi.requestBody in openapi. " +
            "It will be automatically migrated to OpenAPI specification."
        );
      }
    }
  }
}
