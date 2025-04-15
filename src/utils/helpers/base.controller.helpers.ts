import deepmerge from "../../utils/helpers/deepmerge.helper";
import { getArkosConfig } from "../../server";
import {
  ArkosNextFunction,
  ArkosRequest,
  ArkosRequestHandler,
  ArkosResponse,
} from "../../types";
import validateDto from "../validate-dto";
import { kebabCase } from "./change-case.helpers";
import { getModelModules } from "./models.helpers";
import validateSchema from "../validate-schema";
import { catchAsync } from "../../exports/error-handler";

type AuthActions = "signup" | "login" | "updateMe" | "updatePassword";
type DefaultActions = "create" | "update";

// Overload for 'auth'
export function handleRequestBodyValidationAndTransformation(
  modelName: "auth",
  action: AuthActions
): ArkosRequestHandler;

// Overload for other models
export function handleRequestBodyValidationAndTransformation(
  modelName: Exclude<string, "auth">,
  action: DefaultActions
): ArkosRequestHandler;

// Implementation
export function handleRequestBodyValidationAndTransformation(
  modelName: string,
  action: string
) {
  return catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
      const modelModules = getModelModules(kebabCase(modelName));
      const validationConfigs = getArkosConfig()?.validation;
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
