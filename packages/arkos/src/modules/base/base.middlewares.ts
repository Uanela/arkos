import { NextFunction, Request, Response } from "express";
import {
  PrismaQueryOptions,
  ArkosNextFunction,
  ArkosRequest,
  ArkosRequestHandler,
  ArkosResponse,
  AuthPrismaQueryOptions,
} from "../../types";
import { getArkosConfig } from "../../server";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { catchAsync } from "../../exports/error-handler";
import validateDto from "../../utils/validate-dto";
import validateSchema from "../../utils/validate-schema";
import { ZodSchema } from "zod";
import { ClassConstructor } from "class-transformer";
import { ValidatorOptions } from "class-validator";
import { resolvePrismaQueryOptions } from "./utils/helpers/base.middlewares.helpers";

export function callNext(_: Request, _1: Response, next: NextFunction) {
  next();
}

export function sendResponse(req: ArkosRequest, res: ArkosResponse) {
  if (Number(req?.responseStatus) === 204)
    res.status(Number(req?.responseStatus)).send();
  else if (req.responseData && req?.responseStatus)
    res.status(Number(req?.responseStatus)).json(req.responseData);
  else if (Number(req?.responseStatus) && !req.responseData)
    res.status(Number(req?.responseStatus)).send();
  else
    res
      .status(500)
      .json({ message: "No status or data attached to the response" });
}

export function addRouteMiddlwaresAndConfigs() {}

/**
 * Type representing all possible actions that can be performed on a controller
 * Combines both standard CRUD operations and auth-specific operations
 */
export type ControllerActions =
  | keyof PrismaQueryOptions<any>
  | keyof Omit<AuthPrismaQueryOptions<any>, keyof PrismaQueryOptions<any>>;

/**
 * Middleware to add Prisma query options to the request's query parameters.
 *
 * @template T - The type of the Prisma model.
 * @param {PrismaQueryOptions<T> | AuthPrismaQueryOptions<T>} prismaQueryOptions - The Prisma query options to attach.
 * @param {ControllerActions} action - The controller action to apply.
 * @returns A middleware function that attaches the query options to the request.
 */
export function addPrismaQueryOptionsToRequest<T extends Record<string, any>>(
  prismaQueryOptions: PrismaQueryOptions<T> | AuthPrismaQueryOptions<T>,
  action: ControllerActions
) {
  return (req: ArkosRequest, _: ArkosResponse, next: NextFunction) => {
    const configs = getArkosConfig();

    const resolvedOptions = resolvePrismaQueryOptions(
      prismaQueryOptions,
      action
    );

    const requestQueryOptions = configs?.request?.parameters
      ?.allowDangerousPrismaQueryOptions
      ? JSON.parse((req.query?.prismaQueryOptions as string) || "{}")
      : {};

    req.prismaQueryOptions = deepmerge(resolvedOptions, requestQueryOptions);

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
    const time = now.toTimeString().split(" ")[0]; // Format as HH:MM:SS

    const methodColor =
      methodColors[req.method as keyof typeof methodColors] || "\x1b[0m"; // Default to no color
    const statusColor = getStatusColor(res.statusCode); // Get the color for the status code

    console.info(
      `[\x1b[36mInfo\x1b[0m] \x1b[90m${time}\x1b[0m ${methodColor}${
        req.method
      }\x1b[0m ${decodeURIComponent(req.originalUrl)} ${statusColor}${
        res.statusCode
      }\x1b[0m \x1b[35m${duration}ms\x1b[0m`
    );
  });

  next(); // Pass control to the next middleware or route handler
}

export function handleRequestBodyValidationAndTransformation<T extends object>(
  schemaOrDtoClass?: ClassConstructor<T>,
  classValidatorValidationOptions?: ValidatorOptions
): ArkosRequestHandler;
export function handleRequestBodyValidationAndTransformation<T extends object>(
  schemaOrDtoClass?: ZodSchema<T>
): ArkosRequestHandler;
export function handleRequestBodyValidationAndTransformation<T extends object>(
  schemaOrDtoClass?: ZodSchema<T> | ClassConstructor<T>,
  classValidatorValidationOptions?: ValidatorOptions
) {
  return catchAsync(
    async (req: ArkosRequest, _: ArkosResponse, next: ArkosNextFunction) => {
      const validationConfigs = getArkosConfig()?.validation;
      let body = req.body;

      if (validationConfigs?.resolver === "class-validator" && schemaOrDtoClass)
        req.body = await validateDto(
          schemaOrDtoClass as ClassConstructor<T>,
          body,
          deepmerge(
            {
              whitelist: true,
              ...classValidatorValidationOptions,
            },
            validationConfigs?.validationOptions || {}
          )
        );
      else if (validationConfigs?.resolver === "zod" && schemaOrDtoClass)
        req.body = await validateSchema(schemaOrDtoClass as ZodSchema<T>, body);

      next();
    }
  );
}
