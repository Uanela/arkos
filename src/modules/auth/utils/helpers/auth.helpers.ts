import { getArkosConfig } from "../../../../server";
import { ArkosRequest } from "../../../../types";
import { ArkosConfigAuthenticationOptions } from "../../../../types/arkos-config";
import AppError from "../../../error-handler/utils/app-error";

/**
 * Determines the username field to use for authentication
 * Priority:
 * 1. req.query.usernameField
 * 2. config setting
 * 3. default "username"
 *
 * @param req - The request object
 * @returns The field name to use for username identification
 */
export const determineUsernameField = (req: ArkosRequest): string => {
  if (req.query?.usernameField && typeof req.query?.usernameField === "string")
    return req.query.usernameField;
  else if (req.query?.usernameField)
    throw new AppError(
      "Invalid usernameField parameter, it must be a string",
      400
    );

  const initAuthConfigs = getArkosConfig()
    ?.authentication as ArkosConfigAuthenticationOptions;
  return initAuthConfigs?.usernameField || "username";
};
