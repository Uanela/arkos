import { InitConfigsAuthenticationOptions } from "../../../../app";
import { getInitConfigs } from "../../../../server";
import { ArkosRequest } from "../../../../types";

/**
 * Determines the username field to use for authentication
 * Priority: 1. req.query.usernameField 2. config setting 3. default "username"
 *
 * @param req - The request object
 * @returns The field name to use for username identification
 */
export const determineUsernameField = (req: ArkosRequest): string => {
  if (req.query?.usernameField && typeof req.query?.usernameField === "string")
    return req.query.usernameField;

  const initAuthConfigs = getInitConfigs()
    ?.authentication as InitConfigsAuthenticationOptions;
  return initAuthConfigs?.usernameField || "username";
};
