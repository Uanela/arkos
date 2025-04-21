import fs from "fs";
import { handleRequestBodyValidationAndTransformation } from "../../../modules/base/base.middlewares";
import * as modelsHelpers from "../../../utils/helpers/models.helpers";
import * as serverConfig from "../../../server";
import * as validateDtoModule from "../../validate-dto";
import * as validateSchemaModule from "../../validate-schema";
import { ArkosRequest, ArkosResponse } from "../../../types";

jest.mock("../../../utils/helpers/models.helpers");
jest.mock("../../../server");
jest.mock("../../validate-dto");
jest.mock("../../validate-schema");
jest.mock("fs");

(fs.readdirSync as jest.Mock).mockReturnValue(["schema.prisma", "migrations"]);
(fs.statSync as jest.Mock).mockImplementation((path) => ({
  isDirectory: () => path?.includes?.("migrations"),
  isFile: () => path.endsWith(".prisma"),
}));
(fs.readFileSync as jest.Mock).mockReturnValue(`
      model User {
        id        String   @id @default(uuid())
        email     String   @unique
        posts     Post[]
        profile   Profile?
      }

      model Post {
        id        String   @id @default(uuid())
        title     String
        author    User     @relation(fields: [authorId], references: [id])
        authorId  String
      }

      model Profile {
        id        String   @id @default(uuid())
        bio       String?
        user      User     @relation(fields: [userId], references: [id])
        userId    String   @unique
      }
    `);

// Recreate the schema parsing logic for testing
const getAllPrismaFilesSpy = jest.spyOn(fs, "readdirSync");

describe("handleRequestBodyValidationAndTransformation", () => {
  let req: Partial<ArkosRequest>;
  let res: Partial<ArkosResponse>;
  let next: jest.Mock;

  beforeEach(() => {
    req = { body: { name: "test" } };
    res = {};
    next = jest.fn();

    jest.clearAllMocks();
  });

  it("should call validateDto when validation resolver is class-validator", async () => {
    // Arrange
    const modelName = "TestModel";
    const action = "create";
    const transformedBody = { name: "transformed test" };

    (modelsHelpers.getModelModules as jest.Mock).mockReturnValue({
      dtos: { create: class CreateDto {} },
      schemas: {},
    });

    (serverConfig.getArkosConfig as jest.Mock).mockReturnValue({
      validation: {
        resolver: "class-validator",
        validationOptions: { forbidNonWhitelisted: true },
      },
    });

    (validateDtoModule.default as jest.Mock).mockResolvedValue(transformedBody);

    const middleware = handleRequestBodyValidationAndTransformation(
      modelName,
      action
    );

    // Act
    await middleware(req as ArkosRequest, res as ArkosResponse, next);

    // Assert
    expect(validateDtoModule.default).toHaveBeenCalledTimes(1);
    expect(validateDtoModule.default).toHaveBeenCalledWith(
      modelsHelpers.getModelModules("user").dtos.create,
      { name: "test" },
      {
        whitelist: true,
        forbidNonWhitelisted: true,
      }
    );
    expect(req.body).toEqual(transformedBody);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should call validateSchema when validation resolver is zod", async () => {
    // Arrange
    const modelName = "TestModel";
    const action = "update";
    const transformedBody = { name: "transformed test" };

    (modelsHelpers.getModelModules as jest.Mock).mockReturnValue({
      dtos: {},
      schemas: { update: { parse: () => {} } },
    });

    (serverConfig.getArkosConfig as jest.Mock).mockReturnValue({
      validation: {
        resolver: "zod",
      },
    });

    (validateSchemaModule.default as jest.Mock).mockResolvedValue(
      transformedBody
    );

    const middleware = handleRequestBodyValidationAndTransformation(
      modelName,
      action
    );

    // Act
    await middleware(req as ArkosRequest, res as ArkosResponse, next);

    // Assert
    expect(validateSchemaModule.default).toHaveBeenCalledTimes(1);
    expect(validateSchemaModule.default).toHaveBeenCalledWith(
      modelsHelpers.getModelModules("user").schemas.update,
      { name: "test" }
    );
    expect(req.body).toEqual(transformedBody);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should not validate when no validation resolver is configured", async () => {
    // Arrange
    const modelName = "TestModel";
    const action = "create";
    const originalBody = { name: "test" };

    (modelsHelpers.getModelModules as jest.Mock).mockReturnValue({
      dtos: { create: class CreateDto {} },
      schemas: { create: { parse: () => {} } },
    });

    (serverConfig.getArkosConfig as jest.Mock).mockReturnValue({});

    const middleware = handleRequestBodyValidationAndTransformation(
      modelName,
      action
    );

    // Act
    await middleware(req as ArkosRequest, res as ArkosResponse, next);

    // Assert
    expect(validateDtoModule.default).not.toHaveBeenCalled();
    expect(validateSchemaModule.default).not.toHaveBeenCalled();
    expect(req.body).toEqual(originalBody);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should not validate when validator is configured but no schema/dto exists", async () => {
    // Arrange
    const modelName = "TestModel";
    const action = "create";
    const originalBody = { name: "test" };

    (modelsHelpers.getModelModules as jest.Mock).mockReturnValue({
      dtos: {},
      schemas: {},
    });

    (serverConfig.getArkosConfig as jest.Mock).mockReturnValue({
      validation: {
        resolver: "class-validator",
      },
    });

    const middleware = handleRequestBodyValidationAndTransformation(
      modelName,
      action
    );

    // Act
    await middleware(req as ArkosRequest, res as ArkosResponse, next);

    // Assert
    expect(validateDtoModule.default).not.toHaveBeenCalled();
    expect(validateSchemaModule.default).not.toHaveBeenCalled();
    expect(req.body).toEqual(originalBody);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should convert model name to kebab case when getting model modules", async () => {
    // Arrange
    const modelName = "TestModel";
    const action = "create";

    (modelsHelpers.getModelModules as jest.Mock).mockReturnValue({
      dtos: {},
      schemas: {},
    });

    (serverConfig.getArkosConfig as jest.Mock).mockReturnValue({});

    const middleware = handleRequestBodyValidationAndTransformation(
      modelName,
      action
    );

    // Act
    await middleware(req as ArkosRequest, res as ArkosResponse, next);

    // Assert
    expect(modelsHelpers.getModelModules).toHaveBeenCalledWith("test-model");
  });
});
