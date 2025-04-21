import { NextFunction, Request, Response } from "express";
import {
  PrismaQueryOptions,
  ArkosNextFunction,
  ArkosRequest,
  ArkosRequestHandler,
  ArkosResponse,
} from "../../types";
import { getArkosConfig } from "../../server";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { catchAsync } from "../../exports/error-handler";
import { getModelModules } from "../../utils/helpers/models.helpers";
import { kebabCase } from "../../exports/utils";
import validateDto from "../../utils/validate-dto";
import validateSchema from "../../utils/validate-schema";

export function callNext(req: Request, res: Response, next: NextFunction) {
  next();
}

export function sendResponse(req: Request, res: Response, next: NextFunction) {
  if ((req as any).responseData && (req as any).responseStatus)
    res.status((req as any).responseStatus).json((req as any).responseData);
  else if ((req as any).responseStatus && !(req as any).responseData)
    res.status((req as any).responseStatus).send();
  else
    res
      .status(500)
      .json({ message: "No status or data attached to the response" });
}

export function addRouteMiddlwaresAndConfigs() {}

/**
 * Middleware to add Prisma query options to the request's query parameters.
 *
 * @template T - The type of the Prisma model.
 * @param {PrismaQueryOptions<T>} prismaQueryOptions - The Prisma query options to attach.
 * @param {ControllerActions} action - The controller action to apply.
 * @returns A middleware function that attaches the query options to the request.
 */
export function addPrismaQueryOptionsToRequestQuery<T>(
  prismaQueryOptions: PrismaQueryOptions<T>,
  action: keyof PrismaQueryOptions<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const configs = getArkosConfig();

    req.query.prismaQueryOptions = JSON.stringify({
      ...JSON.parse(
        (configs?.request?.parameters?.allowDangerousPrismaQueryOptions &&
          (req.query.prismaQueryOptions as string)) ||
          "{}"
      ),
      ...prismaQueryOptions?.queryOptions,
      ...(prismaQueryOptions?.[action] || {}),
    });
    next();
  };
}

/**
 * Logs request events with colored text such as errors, requests responses.
 *
 */
export function handleRequestLogs(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // if (process.env.NODE_ENV === "production") return next()
  const startTime = Date.now(); // Capture the start time

  // Define colors for each HTTP method
  const methodColors = {
    GET: "\x1b[36m", // Cyan
    POST: "\x1b[32m", // Green
    PUT: "\x1b[33m", // Orange/Yellow
    PATCH: "\x1b[33m", // Orange/Yellow
    DELETE: "\x1b[31m", // Red
    HEAD: "\x1b[34m", // Blue
    OPTIONS: "\x1b[34m", // Blue
  };

  // Function to determine status code color
  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return "\x1b[32m"; // Green
    if (statusCode >= 300 && statusCode < 400) return "\x1b[33m"; // Orange/Yellow
    if (statusCode >= 400 && statusCode < 500) return "\x1b[33m"; // Red
    if (statusCode >= 500) return "\x1b[31m"; // White on Red background
    return "\x1b[0m"; // Default (no color)
  };

  res.on("finish", () => {
    const duration = Date.now() - startTime; // Calculate the time taken to process the request

    // Get the current date and time
    const now = new Date();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayName = dayNames[now.getDay()];
    const dayOfMonth = now.getDate();
    const time = now.toTimeString().split(" ")[0]; // Format as HH:MM:SS

    const methodColor =
      methodColors[req.method as keyof typeof methodColors] || "\x1b[0m"; // Default to no color
    const statusColor = getStatusColor(res.statusCode); // Get the color for the status code

    console.info(
      `[\x1b[36mINFO\x1b[0m] \x1b[90m${time}\x1b[0m ${methodColor}${
        req.method
      }\x1b[0m ${decodeURIComponent(req.originalUrl)} ${statusColor}${
        res.statusCode
      }\x1b[0m \x1b[35m${duration}ms\x1b[0m`
    );
    // Keep the commented-out example as it is
    // console.info(
    //   `[\x1b[36mINFO\x1b[0m] ${dayName} ${dayOfMonth} ${time} ${methodColor}${req.method}\x1b[0m ${req.originalUrl} \x1b[32m${res.statusCode}\x1b[0m \x1b[35m${duration}ms\x1b[0m`
    // );
  });

  next(); // Pass control to the next middleware or route handler
}

type AuthActions = "signup" | "login" | "updateMe" | "updatePassword";
type DefaultActions = "create" | "update";

// Overload for 'auth'
export function handleRequestBodyValidationAndTransformation(
  resourceName: "auth",
  action: AuthActions
): ArkosRequestHandler;

// Overload for other models
export function handleRequestBodyValidationAndTransformation(
  resourceName: Exclude<string, "auth">,
  action: DefaultActions
): ArkosRequestHandler;

// Implementation
export function handleRequestBodyValidationAndTransformation(
  resourceName: string,
  action: string
) {
  return catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
      const modelModules = getModelModules(kebabCase(resourceName));
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
