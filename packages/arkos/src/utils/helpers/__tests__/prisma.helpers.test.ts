import * as dbUtils from "../prisma.helpers";
import { getArkosConfig } from "../arkos-config.helpers";
import sheu from "../../sheu";
import prismaSchemaParser from "../../prisma/prisma-schema-parser";

jest.mock("../arkos-config.helpers", () => ({
  getArkosConfig: jest.fn(),
}));

jest.mock("../../sheu", () => ({
  debug: jest.fn(),
  warn: jest.fn(),
}));

jest.mock("../../prisma/prisma-schema-parser", () => ({
  __esModule: true,
  default: {
    getModelsAsArrayOfStrings: jest.fn().mockReturnValue(["User", "Post"]),
  },
}));

describe("prisma.helpers", () => {
  let mockTarget: any;
  let mockReceiver: any;
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTarget = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
        someProperty: "test value",
      },
      post: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $connect: jest.fn(),
    };

    mockReceiver = {};

    mockConfig = {
      debugging: { requests: { level: 3 } },
      prisma: { instance: mockTarget },
    };

    (getArkosConfig as jest.Mock).mockReturnValue(mockConfig);

    it("should log prisma not passed warning when prisma module not passed in config", async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({});

      dbUtils.loadPrismaModule();

      // Assert that the function throws an AppError
      expect(sheu.warn).toHaveBeenCalledWith(
        "Prisma client instance not passed to arkos.config.ts, see https://www.arkosjs.com/docs/core-concepts/prisma-orm/setup",
        { timestamp: true }
      );
    });
  });

  describe("getPrismaInstance", () => {
    it("should return a proxy wrapping the prisma instance from config", () => {
      const result = dbUtils.getPrismaInstance();
      expect(result).toBeDefined();
    });

    it("should return empty object proxy when no prisma instance in config", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({});
      const result = dbUtils.getPrismaInstance();
      expect(result).toBeDefined();
    });

    it("should allow calling model methods through the proxy", async () => {
      const prisma = dbUtils.getPrismaInstance();
      await prisma.user.findMany({ where: { id: 1 } });
      expect(mockTarget.user.findMany).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe("handlePrismaGet", () => {
    it("should return original property for non-model properties", () => {
      const result = dbUtils.handlePrismaGet(
        mockTarget,
        "$connect",
        mockReceiver
      );
      expect(result).toBe(mockTarget.$connect);
      expect(prismaSchemaParser.getModelsAsArrayOfStrings).toHaveBeenCalled();
    });

    it("should return proxied model for valid model names", () => {
      const result = dbUtils.handlePrismaGet(mockTarget, "user", mockReceiver);
      expect(result).not.toBe(mockTarget.user);
      expect(prismaSchemaParser.getModelsAsArrayOfStrings).toHaveBeenCalled();
    });

    it("should handle case-insensitive model name matching", () => {
      const result = dbUtils.handlePrismaGet(mockTarget, "USER", mockReceiver);
      expect(result).not.toBe(mockTarget.user);
    });

    it("should log query args when debug level is 3 or higher", async () => {
      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );
      const queryArgs = { where: { id: 1 } };

      await proxiedModel.findMany(queryArgs);

      expect(sheu.debug).toHaveBeenCalledWith(
        `Final Prisma Args\n${JSON.stringify(queryArgs, null, 2)}`,
        { timestamp: true }
      );
      expect(mockTarget.user.findMany).toHaveBeenCalledWith(queryArgs);
    });

    it("should log empty args when query args are empty object", async () => {
      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );

      await proxiedModel.findMany({});

      expect(sheu.debug).toHaveBeenCalledWith("Final Prisma Args - Empty", {
        timestamp: true,
      });
    });

    it("should log empty args when no args are passed", async () => {
      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );

      await proxiedModel.findMany();

      expect(sheu.debug).toHaveBeenCalledWith("Final Prisma Args - Empty", {
        timestamp: true,
      });
    });

    it("should not log when debug level is less than 3", async () => {
      mockConfig.debugging.requests.level = 2;
      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );

      await proxiedModel.findMany({ where: { id: 1 } });

      expect(sheu.debug).not.toHaveBeenCalled();
    });

    it("should default to debug level 0 when config is missing debugging", async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({});
      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );

      await proxiedModel.findMany({ where: { id: 1 } });

      expect(sheu.debug).not.toHaveBeenCalled();
    });

    it("should call original method with all arguments", async () => {
      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );
      const arg1 = { where: { id: 1 } };
      const arg2 = { include: { posts: true } };

      await proxiedModel.findUnique(arg1, arg2);

      expect(mockTarget.user.findUnique).toHaveBeenCalledWith(arg1, arg2);
    });

    it("should return the result from the original method", async () => {
      const expected = [{ id: 1, name: "Test" }];
      mockTarget.user.findMany.mockResolvedValue(expected);
      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );

      const result = await proxiedModel.findMany({ where: { id: 1 } });

      expect(result).toBe(expected);
    });

    it("should preserve method context when calling original method", async () => {
      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );

      await proxiedModel.findMany();

      expect(mockTarget.user.findMany.mock.instances[0]).toBe(mockTarget.user);
    });

    it("should return non-function properties unchanged", () => {
      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );
      expect(proxiedModel.someProperty).toBe("test value");
    });

    it("should handle multiple different models", async () => {
      const proxiedUser = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );
      const proxiedPost = dbUtils.handlePrismaGet(
        mockTarget,
        "post",
        mockReceiver
      );

      await proxiedUser.findMany({ where: { id: 1 } });
      await proxiedPost.findMany({ where: { title: "Test" } });

      expect(mockTarget.user.findMany).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockTarget.post.findMany).toHaveBeenCalledWith({
        where: { title: "Test" },
      });
      expect(sheu.debug).toHaveBeenCalledTimes(2);
    });

    it("should handle complex nested query args", async () => {
      const complexArgs = {
        where: { AND: [{ id: { gt: 1 } }, { name: { contains: "test" } }] },
        include: { posts: { where: { published: true } } },
        orderBy: { createdAt: "desc" },
      };

      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );
      await proxiedModel.findMany(complexArgs);

      expect(sheu.debug).toHaveBeenCalledWith(
        `Final Prisma Args\n${JSON.stringify(complexArgs, null, 2)}`,
        { timestamp: true }
      );
    });
  });
});
