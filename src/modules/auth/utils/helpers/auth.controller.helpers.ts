import { getArkosConfig } from "../../../../server";
import { ArkosRequest } from "../../../../types";
import AppError from "../../../error-handler/utils/app-error";

/**
 * Determines the username field to use for authentication and supports nested paths
 * Priority:
 * 1. req.query.usernameField
 * 2. config setting
 * 3. default "username"
 *
 * Supports dot notation for nested fields and array queries (e.g., "profile.nickname", "phones.some.number")
 *
 * @param req - The request object
 * @returns The field name to use for username identification
 */
export const determineUsernameField = (req: ArkosRequest): string => {
  const authConfigs = getArkosConfig()?.authentication;

  if (
    req.query?.usernameField &&
    typeof req.query?.usernameField === "string" &&
    authConfigs?.login?.allowedUsernames?.includes(req.query.usernameField)
  )
    return req.query.usernameField;
  else if (req.query?.usernameField)
    throw new AppError(
      "Invalid usernameField parameter, it is not allowed!",
      400
    );

  return authConfigs?.login?.allowedUsernames?.[0] || "username";
};

/**
 * Creates a Prisma-compatible where clause from a path using dot notation
 * Handles nested objects and array queries with "some" operator
 * Example: createPrismaWhereClause("profile.nickname", "john") or createPrismaWhereClause("phones.some.number", "1234567890")
 *
 * @param path - The dot notation path (e.g., "profile.nickname" or "phones.some.number")
 * @param value - The value to search for
 * @returns A nested object suitable for Prisma's where clause
 */
export const createPrismaWhereClause = (
  path: string,
  value: any
): Record<string, any> => {
  if (!path) return {};

  const parts = path.split(".");
  const whereClause: Record<string, any> = {};

  // Handle simple field case
  if (parts.length === 1) {
    whereClause[parts[0]] = value;
    return whereClause;
  }

  // Handle nested fields
  let current = whereClause;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    current[part] = {};
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;

  return whereClause;
};

/**
 * Access a value from a simple object based on a dot notation path
 * The object will only contain a single property that matches the last part of the path
 * Example: getNestedValue({nickname: "john"}, "profile.nickname") => "john"
 *
 * @param obj - The object containing the value (simple key-value pair)
 * @param path - The dot notation path (only the last part is used to access the object)
 * @returns The value from the object if the key matches the last part of the path, or undefined
 */
export const getNestedValue = (obj: any, path: string): any => {
  if (!obj || !path) return undefined;

  const properties = path.split(".");
  const lastProperty = properties[properties.length - 1];

  // If the last property exists in the object, return its value
  if (lastProperty in obj) {
    return obj[lastProperty];
  }

  return undefined;
};

/**
 * MsDuration type allows specific units for durations
 *
 * **For example**: 90d, 10ms, 50s.
 *
 * **Available metrics**: ms, s, m, h, d, w, y.
 * */
export type MsDuration =
  | number
  | `${number}`
  | `${number}${"ms" | "s" | "m" | "h" | "d" | "w" | "y"}`; // Short format (e.g., "1y")

// Normalize function to convert long units to short ones
function normalizeDuration(input: string): string {
  return input
    .toLowerCase()
    .replace(/years?|yr|year/g, "y")
    .replace(/minutes?|min/g, "m")
    .replace(/seconds?|sec|secs/g, "s")
    .replace(/hours?|hr/g, "h")
    .replace(/days?/g, "d")
    .replace(/weeks?/g, "w")
    .replace(/milliseconds?/g, "ms");
}

export function toMs(input: number | MsDuration): number {
  if (typeof input === "number") return input * 1000; // If it's a number, assume it's in seconds

  // Normalize the string input
  const normalizedInput = normalizeDuration(input.trim());

  // Type assertion: we assert that normalizedInput will now match the MsDuration format
  const regex = /^(\d+(?:\.\d+)?)(ms|s|m|h|d|w|y)$/i;
  const match = normalizedInput.match(regex);

  if (!match) throw new Error(`Invalid time format: ${input}`);

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase() as
    | "ms"
    | "s"
    | "m"
    | "h"
    | "d"
    | "w"
    | "y";

  const multipliers: Record<"ms" | "s" | "m" | "h" | "d" | "w" | "y", number> =
    {
      ms: 1,
      s: 1000,
      m: 60000,
      h: 3600000,
      d: 86400000,
      w: 604800000,
      y: 31557600000, // 365.25 days in ms
    };

  return value * multipliers[unit];
}
