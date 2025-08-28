import { BaseService } from "../base.service";
import { getPrismaInstance } from "../../../utils/helpers/prisma.helpers";
import authService from "../../auth/auth.service";
import { handleRelationFieldsInBody } from "../utils/helpers/base.service.helpers";
import {
  getModuleComponents,
  getPrismaModelRelations,
} from "../../../utils//dynamic-loader";
import prismaSchemaParser from "../../../utils/prisma/prisma-schema-parser";
import { PrismaField } from "../../../utils/prisma/types";

// Mock dependencies
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
}));
jest.mock("../../../utils/helpers/prisma.helpers");
jest.mock("../../auth/auth.service");
jest.mock("../utils/helpers/base.router.helpers");
jest.mock("../utils/helpers/base.service.helpers");
jest.mock("../../../utils//dynamic-loader", () => ({
  ...jest.requireActual("../../../utils//dynamic-loader"),
  getPrismaModelRelations: jest.fn(),
  getModels: jest.fn(),
  getModuleComponents: jest.fn(),
  getAllPrismaFiles: jest.fn(),
}));
jest.mock("../../../utils/helpers/change-case.helpers", () => ({
  camelCase: jest.fn((str) => str.toLowerCase()),
  kebabCase: jest.fn((str) => str.toLowerCase()),
  pascalCase: jest.fn(
    (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  ),
}));
jest.mock("../../../utils/validate-dto", () => jest.fn((_, data) => data));
jest.mock("../../../server", () => ({
  getArkosConfig: jest.fn(() => ({ validation: true })),
}));

describe("BaseService", () => {
  let baseService: BaseService<any>;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    jest.spyOn(prismaSchemaParser, "getModelRelations").mockReturnValue([
      { name: "category", connectionField: "categoryId", isArray: false },
      { name: "tags", isArray: true, isRelation: true },
    ] as PrismaField[]);

    mockPrisma = {
      post: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      user: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
    };

    (getPrismaInstance as jest.Mock).mockReturnValue(mockPrisma);
    (handleRelationFieldsInBody as jest.Mock).mockImplementation(
      (body) => body
    );

    // Create instance for testing
    baseService = new BaseService("Post");
  });

  describe("constructor", () => {
    it("should initialize service with correct model name and relations", () => {
      expect(baseService.modelName).toBe("post");
      expect(baseService.relationFields).toEqual({
        singular: [
          { name: "category", connectionField: "categoryId", isArray: false },
        ],
        list: [{ name: "tags", isArray: true, isRelation: true }],
      });
    });
  });

  describe("createOne", () => {
    it("should create a record and return it", async () => {
      const body = { title: "Test Post", content: "Test Content" };
      const expectedResult = { id: "1", ...body };

      mockPrisma.post.create.mockResolvedValue(expectedResult);

      const result = await baseService.createOne(body);

      expect(getPrismaInstance).toHaveBeenCalled();
      expect(handleRelationFieldsInBody).toHaveBeenCalledWith(
        body,
        baseService.relationFields,
        ["delete", "disconnect", "update"]
      );

      expect(mockPrisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: body,
        })
      );
      expect(result).toEqual(expectedResult);
    });

    it("should hash password when creating a user", async () => {
      baseService = new BaseService("User");
      const body = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      };
      const hashedPassword = "hashed_password";

      (authService.hashPassword as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrisma.user.create.mockResolvedValue({
        id: "1",
        ...body,
        password: hashedPassword,
      });

      await baseService.createOne(body);

      expect(authService.hashPassword).toHaveBeenCalledWith("password123");
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { ...body, password: hashedPassword },
        })
      );
    });

    it("should use provided query options", async () => {
      const body = { title: "Test Post" };
      const queryOptions = {
        select: { title: true, id: true },
      };

      await baseService.createOne(body, queryOptions);

      expect(mockPrisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({ title: true, id: true }),
        })
      );
    });
  });

  describe("createMany", () => {
    it("should create many records and return it", async () => {
      const body = [{ title: "Test Post", content: "Test Content" }];
      const expectedResult = { id: "1", ...body };

      mockPrisma.post.createMany.mockResolvedValue(expectedResult);

      const result = await baseService.createMany(body);

      expect(getPrismaInstance).toHaveBeenCalled();
      expect(handleRelationFieldsInBody).toHaveBeenCalledWith(
        body[0],
        baseService.relationFields,
        ["delete", "disconnect", "update"]
      );

      expect(mockPrisma.post.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: body,
        })
      );
      expect(result).toEqual(expectedResult);
    });

    it("should hash password when creating many users", async () => {
      baseService = new BaseService("user");
      const body = [
        {
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        },
      ];
      const hashedPassword = "hashed_password";

      (authService.isPasswordHashed as jest.Mock).mockReturnValue(false);
      (authService.hashPassword as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrisma.user.createMany.mockResolvedValue({
        id: "1",
        ...body,
        password: hashedPassword,
      });

      await baseService.createMany(body);

      expect(authService.hashPassword).toHaveBeenCalledWith("password123");
      expect(mockPrisma.user.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [{ ...body[0], password: hashedPassword }],
        })
      );
    });

    it("should use provided query options", async () => {
      const body = [{ title: "Test Post" }];
      const queryOptions = {
        select: { title: true, id: true },
      };

      await baseService.createMany(body, queryOptions);

      expect(mockPrisma.post.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({ title: true, id: true }),
        })
      );
    });
  });

  describe("findMany", () => {
    it("should find records based on filters", async () => {
      const filters = { where: { published: true } };
      const expectedData = [{ id: "1", title: "Test" }];

      mockPrisma.post.findMany.mockResolvedValue(expectedData);
      mockPrisma.post.count.mockResolvedValue(1);

      const result = await baseService.findMany(filters.where);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { published: true },
          // include: expect.objectContaining({
          //   category: true,
          // }),
        })
      );
      // expect(mockPrisma.post.count).toHaveBeenCalledWith({
      //   where: filters.where,
      // });
      expect(result).toEqual(expectedData);
    });

    it("should use select if provided in filters", async () => {
      const { where, ...rest } = {
        where: { published: true },
        select: { title: true },
      };

      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);

      await baseService.findMany(where, rest);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { published: true },
          select: expect.objectContaining({
            title: true,
          }),
        })
      );
    });
  });

  describe("findOne", () => {
    it("should find a record by id", async () => {
      const filters = { id: "1" };
      const expectedData = { id: "1", title: "Test Post" };

      mockPrisma.post.findUnique.mockResolvedValue(expectedData);

      const result = await baseService.findOne(filters);

      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ...filters, id: "1" },
        })
      );
      expect(result).toEqual(expectedData);
    });

    it("should find a record by non id field", async () => {
      const filters = { title: "Test Post" };
      const expectedData = { id: "1", title: "Test Post" };

      mockPrisma.post.findFirst.mockResolvedValue(expectedData);

      const result = await baseService.findOne(filters);

      expect(mockPrisma.post.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ...filters },
        })
      );
      expect(result).toEqual(expectedData);
    });

    it("should use select if provided in query options", async () => {
      const filters = { id: "1" };
      const queryOptions = {
        select: { title: true },
      };

      mockPrisma.post.findFirst.mockResolvedValue({ id: "1", title: "Test" });

      await baseService.findOne(filters, queryOptions);

      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            title: true,
          }),
        })
      );
    });
  });

  describe("findById", () => {
    it("should find a record by id", async () => {
      const id = "1";
      const expectedData = { id: "1", title: "Test Post" };

      mockPrisma.post.findUnique.mockResolvedValue(expectedData);

      const result = await baseService.findById(id);

      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "1" },
        })
      );
      expect(result).toEqual(expectedData);
    });

    it("should use select if provided in query options", async () => {
      const id = "1";
      const queryOptions = {
        select: { title: true },
      };

      mockPrisma.post.findUnique.mockResolvedValue({ id: "1", title: "Test" });

      await baseService.findById(id, queryOptions);

      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "1" },
          select: expect.objectContaining({
            title: true,
          }),
        })
      );
    });

    it("should handle numeric id", async () => {
      const id = 1;
      const expectedData = { id: 1, title: "Test Post" };

      mockPrisma.post.findUnique.mockResolvedValue(expectedData);

      const result = await baseService.findById(id);

      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
        })
      );
      expect(result).toEqual(expectedData);
    });
  });

  describe("updateOne", () => {
    it("should update a record and return it", async () => {
      const filters = { id: "1" };
      const body = { title: "Updated Title" };
      const expectedData = { id: "1", ...body };

      mockPrisma.post.update.mockResolvedValue(expectedData);

      const result = await baseService.updateOne(filters, body);

      expect(handleRelationFieldsInBody).toHaveBeenCalledWith(
        body,
        baseService.relationFields
      );
      expect(mockPrisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ...filters, id: "1" },
          data: body,
        })
      );
      expect(result).toEqual(expectedData);
    });

    it("should hash password when updating a user", async () => {
      baseService = new BaseService("User");
      const filters = { id: "1" };
      const body = { name: "Updated User", password: "newpassword" };
      const hashedPassword = "new_hashed_password";

      (authService.hashPassword as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrisma.user.update.mockResolvedValue({
        id: "1",
        ...body,
        password: hashedPassword,
      });

      await baseService.updateOne(filters, body);

      expect(authService.hashPassword).toHaveBeenCalledWith("newpassword");
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { ...body, password: hashedPassword },
        })
      );
    });

    it("should return null if record not found", async () => {
      mockPrisma.post.update.mockResolvedValue(null);
      const result = await baseService.updateOne(
        { id: "999" },
        { title: "Test" }
      );

      expect(result).toBeNull();
    });
  });

  describe("updateMany", () => {
    it("should update multiple records and return count", async () => {
      const filters = { published: false };
      const body = { published: true };

      mockPrisma.post.updateMany.mockResolvedValue({ count: 3 });
      mockPrisma.post.count.mockResolvedValue(5);

      const result = await baseService.updateMany(filters, body);

      expect(mockPrisma.post.updateMany).toHaveBeenCalledWith({
        where: filters,
        data: body,
      });
      expect(result).toEqual({ count: 3 });
    });

    // it("should throw error if no records match filters", async () => {
    //   mockPrisma.post.updateMany.mockResolvedValue({ count: 0 });

    //   await expect(
    //     baseService.updateMany({ where: { id: "999" } }, { title: "Test" })
    //   ).rejects.toThrow(AppError);
    // });

    // it("should throw error if filters are invalid", async () => {
    //   await expect(
    //     baseService.updateMany(null as any, { title: "Test" })
    //   ).rejects.toThrow(AppError);
    // });
  });

  describe("deleteOne", () => {
    it("should delete a record by id", async () => {
      const params = { id: "1" };
      const expectedData = { id: "1", title: "Deleted Post" };

      mockPrisma.post.delete.mockResolvedValue(expectedData);

      const result = await baseService.deleteOne(params);

      expect(mockPrisma.post.delete).toHaveBeenCalledWith({
        where: { ...params, id: "1" },
      });
      expect(result).toEqual(expectedData);
    });
  });

  describe("deleteMany", () => {
    it("should delete multiple records and return count", async () => {
      const filters = { where: { published: false } };

      mockPrisma.post.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.post.count.mockResolvedValue(3);

      const result = await baseService.deleteMany(filters.where);

      expect(mockPrisma.post.deleteMany).toHaveBeenCalledWith(filters);
      expect(result).toEqual({ count: 2 });
    });

    // it("should throw error if no records match filters", async () => {
    //   mockPrisma.post.deleteMany.mockResolvedValue({ count: 0 });

    //   await expect(
    //     baseService.deleteMany({ where: { id: "999" } })
    //   ).rejects.toThrow(AppError);
    // });

    // it("should throw error if filters are invalid", async () => {
    //   await expect(baseService.deleteMany(null as any)).rejects.toThrow(
    //     AppError
    //   );
    // });
  });

  describe("count", () => {
    it("should return the count when to filters are passed", async () => {
      const expectedCount = 7;
      mockPrisma.post.count.mockResolvedValue(expectedCount);
      const result = await baseService.count({});

      expect(mockPrisma.post.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual(expectedCount);
    });
  });

  describe("Context handling", () => {
    it("should pass context to beforeCreateOne hook", async () => {
      const mockContext = {
        user: { id: 1, role: "admin" },
        accessToken: "token123",
      };
      const body = { title: "Test Post" };
      const mockHook = jest.fn();

      (getModuleComponents as jest.Mock).mockReturnValue({
        hooks: {
          beforeCreateOne: mockHook,
        },
      });

      await baseService.createOne(body, {}, mockContext as any);

      expect(getModuleComponents).toHaveBeenCalledWith("post");
      expect(mockHook).toHaveBeenCalledWith(
        expect.objectContaining({
          data: body,
          context: mockContext,
        })
      );
    });

    it("should pass context to afterCreateOne hook with result", async () => {
      const mockContext = { user: { id: 1, role: "admin" } };
      const body = { title: "Test Post" };
      const createdRecord = { id: "1", ...body };
      const mockHook = jest.fn();

      mockPrisma.post.create.mockResolvedValue(createdRecord);
      (getModuleComponents as jest.Mock).mockReturnValue({
        hooks: {
          afterCreateOne: mockHook,
        },
      });

      await baseService.createOne(body, {}, mockContext as any);

      expect(mockHook).toHaveBeenCalledWith(
        expect.objectContaining({
          result: createdRecord,
          data: body,
          context: mockContext,
        })
      );
    });

    it("should pass context to findMany hooks", async () => {
      const mockContext = { accessToken: "find-token" };
      const filters = { published: true };
      const mockBeforeHook = jest.fn();
      const mockAfterHook = jest.fn();

      mockPrisma.post.findMany.mockResolvedValue([]);
      (getModuleComponents as jest.Mock).mockReturnValue({
        hooks: {
          beforeFindMany: mockBeforeHook,
          afterFindMany: mockAfterHook,
        },
      });

      await baseService.findMany(filters, {}, mockContext);

      expect(mockBeforeHook).toHaveBeenCalledWith(
        expect.objectContaining({
          filters,
          context: mockContext,
        })
      );
      expect(mockAfterHook).toHaveBeenCalledWith(
        expect.objectContaining({
          result: [],
          filters,
          context: mockContext,
        })
      );
    });
  });

  describe("Hook execution", () => {
    it("should execute beforeCreateOne and afterCreateOne hooks", async () => {
      const mockBeforeHook = jest.fn();
      const mockAfterHook = jest.fn();

      (getModuleComponents as jest.Mock).mockReturnValue({
        hooks: {
          beforeCreateOne: mockBeforeHook,
          afterCreateOne: mockAfterHook,
        },
      });

      const body = { title: "Test" };
      const result = { id: "1", ...body };
      mockPrisma.post.create.mockResolvedValue(result);

      await baseService.createOne(body);

      expect(mockBeforeHook).toHaveBeenCalled();
      expect(mockAfterHook).toHaveBeenCalledWith(
        expect.objectContaining({
          result,
          data: body,
        })
      );
    });

    it("should handle hook errors appropriately", async () => {
      // Only mock the error for THIS specific test
      (getModuleComponents as jest.Mock).mockReturnValue({
        hooks: {
          beforeCreateOne: jest
            .fn()
            .mockRejectedValue(new Error("Hook failed")),
        },
      });

      await expect(baseService.createOne({ title: "Test" })).rejects.toThrow(
        "Hook failed"
      );
    });
  });

  describe("Relation field handling", () => {
    it("should handle relation fields in createOne", async () => {
      (getModuleComponents as jest.Mock).mockReturnValue({ hooks: {} });

      const bodyWithRelations = {
        title: "Test",
        category: { connect: { id: 1 } },
        tags: { set: [{ id: 1 }, { id: 2 }] },
      };

      await baseService.createOne(bodyWithRelations);

      expect(handleRelationFieldsInBody).toHaveBeenCalledWith(
        bodyWithRelations,
        baseService.relationFields,
        ["delete", "disconnect", "update"]
      );
    });

    it("should handle relation fields in updateOne", async () => {
      const bodyWithRelations = {
        title: "Updated",
        category: { disconnect: true },
      };

      await baseService.updateOne({ id: "1" }, bodyWithRelations);

      expect(handleRelationFieldsInBody).toHaveBeenCalledWith(
        bodyWithRelations,
        baseService.relationFields
      );
    });
  });

  describe("Password hashing", () => {
    it("should not hash already hashed passwords for users", async () => {
      baseService = new BaseService("User");
      const hashedPassword = "$2b$10$alreadyHashedPassword";
      const body = { email: "test@example.com", password: hashedPassword };

      (authService.isPasswordHashed as jest.Mock).mockReturnValue(true);

      await baseService.createOne(body);

      expect(authService.hashPassword).not.toHaveBeenCalled();
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: body, // Password should remain unchanged
        })
      );
    });

    it("should handle password hashing for updateMany with users", async () => {
      baseService = new BaseService("User");
      const body = { password: "plaintext" };

      (authService.isPasswordHashed as jest.Mock).mockReturnValue(false);
      (authService.hashPassword as jest.Mock).mockResolvedValue("hashed");

      await baseService.updateMany({}, body);

      expect(authService.hashPassword).toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty array for createMany without throwing", async () => {
      mockPrisma.post.createMany.mockResolvedValue({ count: 0 });

      const result = await baseService.createMany([]);

      expect(result).toEqual({ count: 0 });
      expect(mockPrisma.post.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: [] })
      );
    });

    it("should handle undefined filters in findMany by passing undefined where clause", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);

      await baseService.findMany(undefined);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined })
      );
    });

    it("should handle null context without throwing errors in createOne", async () => {
      const body = { title: "Test Post" };
      mockPrisma.post.create.mockResolvedValue({ id: "1", ...body });

      await expect(
        baseService.createOne(body, {}, null as any)
      ).resolves.not.toThrow();

      expect(mockPrisma.post.create).toHaveBeenCalled();
    });

    it("should handle empty object filters in deleteMany", async () => {
      mockPrisma.post.deleteMany.mockResolvedValue({ count: 5 });

      const result = await baseService.deleteMany({});

      expect(result).toEqual({ count: 5 });
      expect(mockPrisma.post.deleteMany).toHaveBeenCalledWith({
        where: {},
      });
    });

    it("should handle numeric string ID in findById", async () => {
      const numericStringId = "123";
      const expectedRecord = { id: 123, title: "Test" };

      mockPrisma.post.findUnique.mockResolvedValue(expectedRecord);

      const result = await baseService.findById(numericStringId);

      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "123" } })
      );
      expect(result).toEqual(expectedRecord);
    });
  });

  describe("Method integration", () => {
    it("should support complete CRUD flow with proper data flow", async () => {
      // Setup mock data
      const createData = { title: "Test Post", content: "Test Content" };
      const createdRecord = { id: "123", ...createData };
      const updateData = { title: "Updated Post" };
      const updatedRecord = { ...createdRecord, ...updateData };

      // Mock all Prisma methods
      mockPrisma.post.create.mockResolvedValue(createdRecord);
      mockPrisma.post.findUnique.mockResolvedValue(createdRecord);
      mockPrisma.post.update.mockResolvedValue(updatedRecord);
      mockPrisma.post.delete.mockResolvedValue(updatedRecord);

      // Execute CRUD flow
      const created = await baseService.createOne(createData);
      const found = await baseService.findById(created.id);
      const updated = await baseService.updateOne(
        { id: created.id },
        updateData
      );
      const deleted = await baseService.deleteOne({ id: created.id });

      // Verify create was called correctly
      expect(mockPrisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: createData })
      );

      // Verify find was called with correct ID
      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "123" } })
      );

      // Verify update was called with correct data
      expect(mockPrisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "123" },
          data: updateData,
        })
      );

      // Verify delete was called with correct ID
      expect(mockPrisma.post.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "123" } })
      );

      // Verify data integrity through the flow
      expect(created).toEqual(createdRecord);
      expect(found).toEqual(createdRecord);
      expect(updated).toEqual(updatedRecord);
      expect(deleted).toEqual(updatedRecord);
    });
  });
});
