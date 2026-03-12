import { Router } from "express";
import { isEndpointDisabled } from "../base.router.helpers"; // Adjust the import path
import * as importHelpers from "../../../../../utils/dynamic-loader";
import { BaseController } from "../../../base.controller";
import pluralize from "pluralize";
import catchAsync from "../../../../error-handler/utils/catch-async";
import routerValidator from "../../router-validator";
import prismaSchemaParser from "../../../../../utils/prisma/prisma-schema-parser";
import { getArkosConfig } from "../../../../../server";
import z from "zod";

jest.mock("../../../../../utils/helpers/exit-error", () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock("../../../../error-handler/utils/catch-async");
jest.mock("../../../../../server");
jest.mock("fs");
jest.mock("express", () => {
  const mockRouter = {
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    patch: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    route: jest.fn().mockReturnThis(),
    use: jest.fn().mockReturnThis(),
  };

  // Create a mock express function
  const mockExpress: any = jest.fn(() => ({
    use: jest.fn().mockReturnThis(),
    listen: jest.fn().mockReturnThis(),
  }));

  mockExpress.Router = jest.fn(() => mockRouter);
  mockExpress.default = mockExpress;
  mockExpress.json = jest.fn();
  mockExpress.urlencoded = jest.fn();
  mockExpress.static = jest.fn();

  return mockExpress;
});
jest.mock("../../../../../utils/dynamic-loader");
jest.mock("../../../../auth/auth.service", () => ({
  authenticate: jest.fn(() => jest.fn()),
  handleAccessControl: jest.fn(() => jest.fn()),
}));

jest.mock("../../../base.middlewares", () => ({
  addPrismaQueryOptionsToRequest: jest.fn(() => jest.fn()),
  sendResponse: jest.fn(),
  validateRequestInputs: jest.fn(),
  handleRequestBodyValidationAndTransformation: jest.fn(() => jest.fn()),
}));

jest.mock("../../../base.controller");
jest.mock("pluralize", () => ({
  ...jest.requireActual("pluralize"),
  plural: jest.fn((str) => `${str}s`),
}));

jest.mock("../../../../../exports/utils", () => ({
  kebabCase: jest.fn((str) => str.toLowerCase()),
}));

jest.mock("fs");

jest.mock("../../router-validator", () => ({
  __esModule: true,
  default: {
    isExpressRouter: jest.fn(() => true),
  },
}));

jest
  .spyOn(prismaSchemaParser, "getModelsAsArrayOfStrings")
  .mockReturnValue(["User"]);
