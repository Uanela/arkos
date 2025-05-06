import { BaseService } from "../base.service";
import { getPrismaInstance } from "../../../utils/helpers/prisma.helpers";
import AppError from "../../error-handler/utils/app-error";
import authService from "../../auth/auth.service";
import { handleRelationFieldsInBody } from "../utils/helpers/base.service.helpers";
import { getPrismaModelRelations } from "../../../utils/helpers/models.helpers";

// Mock dependencies
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  readdirSync: jest.fn(),
}));
jest.mock("../../../utils/helpers/prisma.helpers");
jest.mock("../../auth/auth.service");
jest.mock("../utils/helpers/base.router.helpers");
jest.mock("../utils/helpers/base.service.helpers");
jest.mock("../../../utils/helpers/models.helpers", () => ({
  ...jest.requireActual("../../../utils/helpers/models.helpers"),
  getPrismaModelRelations: jest.fn(),
  getModels: jest.fn(),
  getModelModules: jest.fn(),
  getAllPrismaFiles: jest.fn(),
}));
jest.mock("../../../utils/helpers/change-case.helpers", () => ({
  camelCase: jest.fn((str) => str.toLowerCase()),
  kebabCase: jest.fn((str) => str.toLowerCase()),
  pascalCase: jest.fn(
    (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  ),
}));
jest.mock("../../../utils/validate-dto", () => jest.fn((dto, data) => data));
jest.mock("../../../server", () => ({
  getArkosConfig: jest.fn(() => ({ validation: true })),
}));

describe("BaseService", () => {
  let baseService: BaseService;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    (getPrismaModelRelations as jest.Mock).mockReturnValue({
      singular: [{ name: "category" }],
      list: [{ name: "tags" }],
    });

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
        update: jest.fn(),
      },
    };

    (getPrismaInstance as jest.Mock).mockReturnValue(mockPrisma);
    (handleRelationFieldsInBody as jest.Mock).mockImplementation(
      (body) => body
    );

    // Create instance for testing
    baseService = new BaseService("Post");
  });

  // describe("constructor", () => {
  //   it("should initialize service with correct model name and relations", () => {
  //     expect(baseService.modelName).toBe("post");
  //     expect(baseService.relationFields).toEqual({
  //       singular: [{ name: "category" }],
  //       list: [{ name: "tags" }],
  //     });
  //     expect(baseService.singularRelationFieldToInclude).toEqual({
  //       category: true,
  //     });
  //     expect(baseService.listRelationFieldToInclude).toEqual({ tags: true });
  //   });
  // });

  describe("createOne", () => {
    it("should create a record and return it", async () => {
      const body = { title: "Test Post", content: "Test Content" };
      const expectedResult = { id: "1", ...body };

      mockPrisma.post.create.mockResolvedValue(expectedResult);

      // (getPrismaModelRelations as jest.Mock).mockReturnValue({
      //   singular: [{ name: "category" }],
      //   list: [{ name: "tags" }],
      // });

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
          // include: expect.objectContaining({
          //   category: true,
          //   tags: true,
          // }),
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

  // describe("createMany", () => {
  //   it("should create multiple records and return count", async () => {
  //     const body = [{ title: "Post 1" }, { title: "Post 2" }];

  //     mockPrisma.post.createMany.mockResolvedValue({ count: 2 });
  //     mockPrisma.post.count.mockResolvedValue(5);

  //     const result = await baseService.createMany(body);

  //     expect(mockPrisma.post.count).toHaveBeenCalledWith({
  //       data: body,
  //     });
  //     expect(mockPrisma.post.count).toHaveBeenCalled();
  //     expect(result).toEqual({ total: 5, data: { count: 2 } });
  //   });

  //   it("should throw error if body is not an array", async () => {
  //     await expect(baseService.createMany({} as any)).rejects.toThrow(AppError);
  //     await expect(baseService.createMany([] as any)).rejects.toThrow(AppError);
  //   });
  // });

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
            // category: true,
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
          // include: expect.objectContaining({
          //   category: true,
          //   tags: true,
          // }),
        })
      );
      expect(result).toEqual(expectedData);
    });

    // it("should throw error if record not found", async () => {
    //   mockPrisma.post.findFirst.mockResolvedValue(null);

    //   await expect(baseService.findOne({ id: "999" })).rejects.toThrow(
    //     AppError
    //   );
    // });

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
            // category: true,
            // tags: true,
          }),
        })
      );
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
          // include: expect.objectContaining({
          //   category: true,
          //   tags: true,
          // }),
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

    // it("should throw error if record not found", async () => {
    //   mockPrisma.post.update.mockResolvedValue(null);

    //   await expect(
    //     baseService.updateOne({ id: "999" }, { title: "Test" })
    //   ).rejects.toThrow(AppError);
    // });
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

  describe("getBaseServices", () => {
    // Importing the function for testing
    const { getBaseServices } = require("../base.service");

    it("should return base services for all models", () => {
      const getModelsMock = jest.requireMock(
        "../../../utils/helpers/models.helpers"
      ).getModels;
      getModelsMock.mockReturnValue(["Post", "User", "Comment"]);

      const services = getBaseServices();

      expect(Object.keys(services)).toEqual(["post", "user", "comment"]);
      expect(services.post).toBeInstanceOf(BaseService);
      expect(services.user).toBeInstanceOf(BaseService);
      expect(services.comment).toBeInstanceOf(BaseService);
    });
  });
});
