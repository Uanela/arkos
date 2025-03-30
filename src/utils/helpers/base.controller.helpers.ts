import deepmerge from "../../utils/helpers/deepmerge.helper";
import { getInitConfigs } from "../../server";
import { ArkosNextFunction, ArkosRequest, ArkosResponse } from "../../types";
import validateDto from "../validate-dto";
import { kebabCase } from "./change-case.helpers";
import { getModelModules } from "./models.helpers";
import validateSchema from "../validate-schema";
import { catchAsync } from "../../exports/error-handler";

export function handleRequestBodyValidationAndTransformation(
  modelName: string,
  action: "create" | "update"
) {
  return catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
      const modelModules = getModelModules(kebabCase(modelName));
      const validationConfigs = getInitConfigs()?.validation;
      let body = req.body;

      if (
        validationConfigs?.resolver === "class-validator" &&
        modelModules.dtos[action]
      )
        req.body = await validateDto(
          modelModules.dtos[action],
          body,
          deepmerge(
            {
              whitelist: true,
            },
            validationConfigs?.validationOptions || {}
          )
        );
      else if (
        validationConfigs?.resolver === "zod" &&
        modelModules.schemas[action]
      )
        req.body = await validateSchema(modelModules.schemas[action], body);

      next();
    }
  );
}
