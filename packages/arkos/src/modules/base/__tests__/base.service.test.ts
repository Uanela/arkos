import { BaseService } from "../base.service";
import { getPrismaInstance } from "../../../utils/helpers/prisma.helpers";
import authService from "../../auth/auth.service";
import * as baseServiceHelpers from "../utils/helpers/base.service.helpers";
import prismaSchemaParser from "../../../utils/prisma/prisma-schema-parser";
import { PrismaField } from "../../../utils/prisma/types";
import serviceHooksManager from "../utils/service-hooks-manager";
import loadableRegistry from "../../../components/arkos-loadable-registry";
import { serviceHookReader } from "../../../components/arkos-service-hook/reader";

jest.mock("../base.service", () => jest.requireActual("../base.service"));
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
}));
jest.mock("../../../utils/helpers/prisma.helpers");
jest.mock("../../auth/auth.service");
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
jest.mock("../utils/service-hooks-manager", () => ({
  handleHook: jest.fn((hook: any, data) => {
    if (Array.isArray(hook)) {
      for (const hookItem of hook) {
        hookItem(data);
      }
    } else hook(data);
  }),
}));
jest.mock("../../../components/arkos-loadable-registry", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
  },
}));
jest.mock("../../../components/arkos-service-hook/reader", () => ({
  serviceHookReader: {
    getHooks: jest.fn(),
  },
}));

const mockGetItem = loadableRegistry.getItem as jest.Mock;
const mockGetHooks = serviceHookReader.getHooks as jest.Mock;

const handleRelationFieldsInBody = jest.spyOn(
  baseServiceHelpers,
  "handleRelationFieldsInBody"
);

describe("BaseService", () => {
  let baseService: BaseService<any>;
  let userService: BaseService<any>;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: no service hook registered
    mockGetItem.mockReturnValue(null);
    mockGetHooks.mockReturnValue(null);

    jest.spyOn(prismaSchemaParser, "getModelRelations").mockReturnValue([
      {
        name: "category",
        foreignKeyField: "categoryId",
        isArray: false,
        isRelation: true,
      },
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
      $transaction: jest.fn(),
    };

    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    (getPrismaInstance as jest.Mock).mockReturnValue(mockPrisma);

    baseService = new BaseService("Post");
    userService = new BaseService("User");
  });

  // ─── Helper to set up hooks via reader ──────────────────────────────────────

  function setupHooks(
    operationType: string,
    hooks: {
      before?: jest.Mock | jest.Mock[];
      after?: jest.Mock | jest.Mock[];
      onError?: jest.Mock | jest.Mock[];
    }
  ) {
    mockGetItem.mockReturnValue({});
    mockGetHooks.mockImplementation((_modelName: string, op: string) => {
      if (op === operationType) {
        return {
          before: hooks.before
            ? Array.isArray(hooks.before)
              ? hooks.before
              : [hooks.before]
            : undefined,
          after: hooks.after
            ? Array.isArray(hooks.after)
              ? hooks.after
              : [hooks.after]
            : undefined,
          onError: hooks.onError
            ? Array.isArray(hooks.onError)
              ? hooks.onError
              : [hooks.onError]
            : undefined,
        };
      }
      return null;
    });
  }

  // ─── Constructor ────────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("should initialize service with correct model name and relations", () => {
      expect(baseService.modelName).toBe("post");
      expect(baseService.relationFields).toEqual({
        singular: [
          {
            name: "category",
            foreignKeyField: "categoryId",
            isRelation: true,
            isArray: false,
          },
        ],
        list: [{ name: "tags", isArray: true, isRelation: true }],
      });
    });

    it("should handle models with no relations", () => {
      jest.spyOn(prismaSchemaParser, "getModelRelations").mockReturnValue([]);
      const simpleService = new BaseService("SimpleModel");
      expect(simpleService.relationFields).toEqual({ singular: [], list: [] });
    });

    it("should filter relations correctly", () => {
      jest.spyOn(prismaSchemaParser, "getModelRelations").mockReturnValue([
        { name: "field1", isRelation: false, isArray: false },
        { name: "singleRel", isRelation: true, isArray: false },
        { name: "arrayRel", isRelation: true, isArray: true },
        { name: "field2", isRelation: false, isArray: true },
      ] as PrismaField[]);
      const testService = new BaseService("TestModel");
      expect(testService.relationFields.singular).toHaveLength(1);
      expect(testService.relationFields.list).toHaveLength(1);
    });
  });

  // ─── createOne ──────────────────────────────────────────────────────────────

  describe("createOne", () => {
    it("should create a record successfully", async () => {
      const data = { title: "Test Post", content: "Test Content" };
      const expectedResult = { id: "1", ...data };
      mockPrisma.post.create.mockResolvedValue(expectedResult);

      const result = await baseService.createOne(data);

      expect(handleRelationFieldsInBody).toHaveBeenCalledWith(
        data,
        baseService.relationFields,
        ["delete", "disconnect", "update"]
      );
      expect(mockPrisma.post.create).toHaveBeenCalledWith({ data });
      expect(result).toEqual(expectedResult);
    });

    it("should hash password for user model with plain password", async () => {
      const data = { email: "test@test.com", password: "plaintext" };
      const hashedPassword = "hashed_password";
      const mockBefore = jest.fn();
      const mockAfter = jest.fn();
      setupHooks("createOne", { before: mockBefore, after: mockAfter });

      (authService.isPasswordHashed as jest.Mock).mockReturnValue(false);
      (authService.hashPassword as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrisma.user.create.mockResolvedValue({
        id: "1",
        ...data,
        password: hashedPassword,
      });

      await userService.createOne(data);

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockBefore],
        expect.objectContaining({ data })
      );
      expect(authService.isPasswordHashed).toHaveBeenCalledWith("plaintext");
      expect(authService.hashPassword).toHaveBeenCalledWith("plaintext");
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: { ...data, password: hashedPassword },
      });
    });

    it("should not hash already hashed password for user model", async () => {
      const hashedPassword = "$2b$10$hashedpassword";
      const data = { email: "test@test.com", password: hashedPassword };

      (authService.isPasswordHashed as jest.Mock).mockReturnValue(true);
      mockPrisma.user.create.mockResolvedValue({ id: "1", ...data });

      await userService.createOne(data);

      expect(authService.isPasswordHashed).toHaveBeenCalledWith(hashedPassword);
      expect(authService.hashPassword).not.toHaveBeenCalled();
      expect(mockPrisma.user.create).toHaveBeenCalledWith({ data });
    });

    it("should execute beforeCreateOne hook with already handled relation fields", async () => {
      const mockHook = jest.fn();
      const data = {
        title: "Test",
        tags: [{ id: "123" }, { name: "hello", color: "#f00" }],
      };
      const transformedData = {
        tags: {
          connect: [{ id: "123" }],
          create: [{ color: "#f00", name: "hello" }],
        },
        title: "Test",
      };
      setupHooks("createOne", { before: mockHook });
      mockPrisma.post.create.mockResolvedValue({ id: "1", title: "Test" });

      await baseService.createOne(data);

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockHook],
        expect.objectContaining({ data: transformedData })
      );
    });

    it("should execute beforeCreateOne hook as array of functions", async () => {
      const mockHook = [jest.fn()];
      const data = { title: "Test" };
      setupHooks("createOne", { before: mockHook });
      mockPrisma.post.create.mockResolvedValue({ id: "1", ...data });

      await baseService.createOne(data);

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        mockHook,
        expect.objectContaining({ data })
      );
    });

    it("should execute afterCreateOne hook with result", async () => {
      const mockHook = jest.fn();
      const data = { title: "Test" };
      const result = { id: "1", ...data };
      setupHooks("createOne", { after: mockHook });
      mockPrisma.post.create.mockResolvedValue(result);

      await baseService.createOne(data);

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockHook],
        expect.objectContaining({ result, data })
      );
    });

    it("should execute afterCreateOne hook as array of functions", async () => {
      const mockHook = [jest.fn()];
      const data = { title: "Test" };
      setupHooks("createOne", { after: mockHook });
      mockPrisma.post.create.mockResolvedValue({ id: "1", ...data });

      await baseService.createOne(data);

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        mockHook,
        expect.objectContaining({ data })
      );
    });

    it("should execute onCreateOneError hook on error", async () => {
      const mockHook = jest.fn();
      const data = { title: "Test" };
      const error = new Error("Create failed");
      setupHooks("createOne", { onError: mockHook });
      mockPrisma.post.create.mockRejectedValue(error);

      await expect(baseService.createOne(data)).rejects.toThrow(
        "Create failed"
      );

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockHook],
        expect.objectContaining({ error, data })
      );
    });

    it("should skip before hooks based on context skip settings", async () => {
      const mockBefore = jest.fn();
      const mockAfter = jest.fn();
      const data = { title: "Test" };
      setupHooks("createOne", { before: mockBefore, after: mockAfter });
      mockPrisma.post.create.mockResolvedValue({ id: "1", ...data });

      await baseService.createOne(data, {}, { skip: "before" });

      expect(serviceHooksManager.handleHook).not.toHaveBeenCalledWith(
        [mockBefore],
        expect.anything()
      );
      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockAfter],
        expect.anything()
      );
    });

    it("should skip all hooks when context skip is 'all'", async () => {
      const mockBefore = jest.fn();
      const mockAfter = jest.fn();
      const data = { title: "Test" };
      setupHooks("createOne", { before: mockBefore, after: mockAfter });
      mockPrisma.post.create.mockResolvedValue({ id: "1", ...data });

      await baseService.createOne(data, {}, { skip: "all" });

      expect(serviceHooksManager.handleHook).not.toHaveBeenCalled();
    });

    it("should skip hooks when context skip is array containing hook type", async () => {
      const mockBefore = jest.fn();
      const mockAfter = jest.fn();
      const data = { title: "Test" };
      setupHooks("createOne", { before: mockBefore, after: mockAfter });
      mockPrisma.post.create.mockResolvedValue({ id: "1", ...data });

      await baseService.createOne(data, {}, { skip: ["before", "error"] });

      expect(serviceHooksManager.handleHook).not.toHaveBeenCalledWith(
        [mockBefore],
        expect.anything()
      );
      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockAfter],
        expect.anything()
      );
    });

    it("should return undefined when throwOnError is false and error occurs", async () => {
      const data = { title: "Test" };
      mockPrisma.post.create.mockRejectedValue(new Error("Create failed"));

      const result = await baseService.createOne(
        data,
        {},
        { throwOnError: false }
      );

      expect(result).toBeUndefined();
    });

    it("should merge queryOptions correctly", async () => {
      const data = { title: "Test" };
      const queryOptions = {
        select: { id: true, title: true },
        include: { comments: true },
      };
      mockPrisma.post.create.mockResolvedValue({ id: "1", title: "Test" });

      await baseService.createOne(data, queryOptions);

      expect(mockPrisma.post.create).toHaveBeenCalledWith({
        data,
        select: { id: true, title: true },
        include: { comments: true },
      });
    });
  });

  // ─── createMany ─────────────────────────────────────────────────────────────

  describe("createMany", () => {
    it("should create multiple records successfully", async () => {
      const data = [
        { title: "Post 1", content: "Content 1", tags: [{ id: "4321" }] },
        {
          title: "Post 2",
          content: "Content 2",
          tags: [{ name: "boss" }, { id: "1324" }],
        },
      ];
      const transformedData = [
        {
          content: "Content 1",
          tags: { connect: [{ id: "4321" }] },
          title: "Post 1",
        },
        {
          content: "Content 2",
          tags: { connect: [{ id: "1324" }], create: [{ name: "boss" }] },
          title: "Post 2",
        },
      ];
      mockPrisma.post.createMany.mockResolvedValue({ count: 2 });

      const result = await baseService.createMany(data);

      expect(handleRelationFieldsInBody).toHaveBeenCalledTimes(2);
      expect(mockPrisma.post.createMany).toHaveBeenCalledWith({
        data: transformedData,
      });
      expect(result).toEqual({ count: 2 });
    });

    it("should hash passwords for multiple users", async () => {
      const data = [
        { email: "user1@test.com", password: "pass1" },
        { email: "user2@test.com", password: "pass2" },
      ];
      (authService.isPasswordHashed as jest.Mock).mockReturnValue(false);
      (authService.hashPassword as jest.Mock)
        .mockResolvedValueOnce("hashed1")
        .mockResolvedValueOnce("hashed2");
      mockPrisma.user.createMany.mockResolvedValue({ count: 2 });

      await userService.createMany(data);

      expect(authService.hashPassword).toHaveBeenCalledWith("pass1");
      expect(authService.hashPassword).toHaveBeenCalledWith("pass2");
      expect(mockPrisma.user.createMany).toHaveBeenCalledWith({
        data: [
          { email: "user1@test.com", password: "hashed1" },
          { email: "user2@test.com", password: "hashed2" },
        ],
      });
    });

    it("should handle empty array", async () => {
      mockPrisma.post.createMany.mockResolvedValue({ count: 0 });

      const result = await baseService.createMany([]);

      expect(result).toEqual({ count: 0 });
      expect(handleRelationFieldsInBody).not.toHaveBeenCalled();
    });

    it("should execute beforeCreateMany and afterCreateMany hooks", async () => {
      const mockBefore = jest.fn();
      const mockAfter = jest.fn();
      const data = [{ title: "Test" }];
      setupHooks("createMany", { before: mockBefore, after: mockAfter });
      mockPrisma.post.createMany.mockResolvedValue({ count: 1 });

      await baseService.createMany(data);

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockBefore],
        expect.objectContaining({ data })
      );
      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockAfter],
        expect.objectContaining({ data, result: { count: 1 } })
      );
    });

    it("should execute onCreateManyError hook on error", async () => {
      const mockHook = jest.fn();
      const data = [{ title: "Test" }];
      const error = new Error("Create many failed");
      setupHooks("createMany", { onError: mockHook });
      mockPrisma.post.createMany.mockRejectedValue(error);

      await expect(baseService.createMany(data)).rejects.toThrow(
        "Create many failed"
      );

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockHook],
        expect.objectContaining({ error, data })
      );
    });

    it("should return undefined when throwOnError is false and error occurs", async () => {
      const data = [{ title: "Test" }];
      mockPrisma.post.createMany.mockRejectedValue(
        new Error("Create many failed")
      );

      const result = await baseService.createMany(
        data,
        {},
        { throwOnError: false }
      );

      expect(result).toBeUndefined();
    });
  });

  // ─── count ──────────────────────────────────────────────────────────────────

  describe("count", () => {
    it("should count records with filters", async () => {
      const filters = { published: true };
      mockPrisma.post.count.mockResolvedValue(5);

      const result = await baseService.count(filters);

      expect(mockPrisma.post.count).toHaveBeenCalledWith({ where: filters });
      expect(result).toBe(5);
    });

    it("should count all records when no filters provided", async () => {
      mockPrisma.post.count.mockResolvedValue(10);

      const result = await baseService.count();

      expect(mockPrisma.post.count).toHaveBeenCalledWith({ where: undefined });
      expect(result).toBe(10);
    });

    it("should execute beforeCount and afterCount hooks", async () => {
      const mockBefore = jest.fn();
      const mockAfter = jest.fn();
      const filters = { published: true };
      setupHooks("count", { before: mockBefore, after: mockAfter });
      mockPrisma.post.count.mockResolvedValue(3);

      await baseService.count(filters);

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockBefore],
        expect.objectContaining({ filters })
      );
      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockAfter],
        expect.objectContaining({ filters, result: 3 })
      );
    });

    it("should execute onCountError hook on error", async () => {
      const mockHook = jest.fn();
      const filters = { published: true };
      const error = new Error("Count failed");
      setupHooks("count", { onError: mockHook });
      mockPrisma.post.count.mockRejectedValue(error);

      await expect(baseService.count(filters)).rejects.toThrow("Count failed");

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockHook],
        expect.objectContaining({ error, filters })
      );
    });

    it("should return 0 when throwOnError is false and error occurs", async () => {
      const filters = { published: true };
      mockPrisma.post.count.mockRejectedValue(new Error("Count failed"));

      const result = await baseService.count(filters, { throwOnError: false });

      expect(result).toBe(0);
    });
  });

  // ─── findMany ───────────────────────────────────────────────────────────────

  describe("findMany", () => {
    it("should find multiple records with filters", async () => {
      const filters = { published: true };
      const expectedData = [{ id: "1", title: "Test" }];
      mockPrisma.post.findMany.mockResolvedValue(expectedData);

      const result = await baseService.findMany(filters);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith({ where: filters });
      expect(result).toEqual(expectedData);
    });

    it("should apply query options", async () => {
      const filters = { published: true };
      const queryOptions = {
        select: { id: true, title: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      };
      mockPrisma.post.findMany.mockResolvedValue([]);

      await baseService.findMany(filters, queryOptions);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith({
        where: filters,
        select: { id: true, title: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
    });

    it("should execute beforeFindMany and afterFindMany hooks", async () => {
      const mockBefore = jest.fn();
      const mockAfter = jest.fn();
      const filters = { published: true };
      const result = [{ id: "1", title: "Test" }];
      setupHooks("findMany", { before: mockBefore, after: mockAfter });
      mockPrisma.post.findMany.mockResolvedValue(result);

      await baseService.findMany(filters);

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockBefore],
        expect.objectContaining({ filters })
      );
      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockAfter],
        expect.objectContaining({ filters, result })
      );
    });

    it("should execute onFindManyError hook on error", async () => {
      const mockHook = jest.fn();
      const filters = { published: true };
      const error = new Error("Find many failed");
      setupHooks("findMany", { onError: mockHook });
      mockPrisma.post.findMany.mockRejectedValue(error);

      await expect(baseService.findMany(filters)).rejects.toThrow(
        "Find many failed"
      );

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockHook],
        expect.objectContaining({ error, filters })
      );
    });

    it("should return empty array when throwOnError is false and error occurs", async () => {
      const filters = { published: true };
      mockPrisma.post.findMany.mockRejectedValue(new Error("Find many failed"));

      const result = await baseService.findMany(
        filters,
        {},
        { throwOnError: false }
      );

      expect(result).toEqual([]);
    });
  });

  // ─── findById ───────────────────────────────────────────────────────────────

  describe("findById", () => {
    it("should find record by string id", async () => {
      const id = "test-id";
      const expectedData = { id: "test-id", title: "Test Post" };
      mockPrisma.post.findUnique.mockResolvedValue(expectedData);

      const result = await baseService.findById(id);

      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
      expect(result).toEqual(expectedData);
    });

    it("should find record by numeric id", async () => {
      const id = 123;
      const expectedData = { id: 123, title: "Test Post" };
      mockPrisma.post.findUnique.mockResolvedValue(expectedData);

      const result = await baseService.findById(id);

      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
      expect(result).toEqual(expectedData);
    });

    it("should execute beforeFindById and afterFindById hooks", async () => {
      const mockBefore = jest.fn();
      const mockAfter = jest.fn();
      const id = "1";
      const result = { id: "1", title: "Test" };
      setupHooks("findById", { before: mockBefore, after: mockAfter });
      mockPrisma.post.findUnique.mockResolvedValue(result);

      await baseService.findById(id);

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockBefore],
        expect.objectContaining({ id })
      );
      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockAfter],
        expect.objectContaining({ id, result })
      );
    });

    it("should execute onFindByIdError hook on error", async () => {
      const mockHook = jest.fn();
      const id = "1";
      const error = new Error("Find by id failed");
      setupHooks("findById", { onError: mockHook });
      mockPrisma.post.findUnique.mockRejectedValue(error);

      await expect(baseService.findById(id)).rejects.toThrow(
        "Find by id failed"
      );

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockHook],
        expect.objectContaining({ error, id })
      );
    });

    it("should return undefined when throwOnError is false and error occurs", async () => {
      const id = "1";
      mockPrisma.post.findUnique.mockRejectedValue(
        new Error("Find by id failed")
      );

      const result = await baseService.findById(
        id,
        {},
        { throwOnError: false }
      );

      expect(result).toBeUndefined();
    });
  });

  // ─── findOne ────────────────────────────────────────────────────────────────

  describe("findOne", () => {
    it("should use findUnique when filter has only id and id is not 'me'", async () => {
      const filters = { id: "123" };
      const expectedData = { id: "123", title: "Test Post" };
      mockPrisma.post.findUnique.mockResolvedValue(expectedData);

      const result = await baseService.findOne(filters);

      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith({
        where: filters,
      });
      expect(mockPrisma.post.findFirst).not.toHaveBeenCalled();
      expect(result).toEqual(expectedData);
    });

    it("should use findFirst when filter has id = 'me'", async () => {
      const filters = { id: "me" };
      const expectedData = { id: "current-user", title: "Current User Post" };
      mockPrisma.post.findFirst.mockResolvedValue(expectedData);

      const result = await baseService.findOne(filters);

      expect(mockPrisma.post.findFirst).toHaveBeenCalledWith({
        where: filters,
      });
      expect(mockPrisma.post.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(expectedData);
    });

    it("should use findFirst when filter has multiple fields", async () => {
      const filters = { id: "123", published: true };
      const expectedData = { id: "123", title: "Test Post" };
      mockPrisma.post.findFirst.mockResolvedValue(expectedData);

      const result = await baseService.findOne(filters);

      expect(mockPrisma.post.findFirst).toHaveBeenCalledWith({
        where: filters,
      });
      expect(mockPrisma.post.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(expectedData);
    });

    it("should use findFirst when filter has non-id fields", async () => {
      const filters = { title: "Test Post" };
      const expectedData = { id: "1", title: "Test Post" };
      mockPrisma.post.findFirst.mockResolvedValue(expectedData);

      const result = await baseService.findOne(filters);

      expect(mockPrisma.post.findFirst).toHaveBeenCalledWith({
        where: filters,
      });
      expect(mockPrisma.post.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(expectedData);
    });

    it("should execute beforeFindOne and afterFindOne hooks", async () => {
      const mockBefore = jest.fn();
      const mockAfter = jest.fn();
      const filters = { title: "Test" };
      const result = { id: "1", title: "Test" };
      setupHooks("findOne", { before: mockBefore, after: mockAfter });
      mockPrisma.post.findFirst.mockResolvedValue(result);

      await baseService.findOne(filters);

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockBefore],
        expect.objectContaining({ filters })
      );
      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockAfter],
        expect.objectContaining({ filters, result })
      );
    });

    it("should execute onFindOneError hook on error", async () => {
      const mockHook = jest.fn();
      const filters = { title: "Test" };
      const error = new Error("Find one failed");
      setupHooks("findOne", { onError: mockHook });
      mockPrisma.post.findFirst.mockRejectedValue(error);

      await expect(baseService.findOne(filters)).rejects.toThrow(
        "Find one failed"
      );

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockHook],
        expect.objectContaining({ error, filters })
      );
    });

    it("should return undefined when throwOnError is false and error occurs", async () => {
      const filters = { title: "Test" };
      mockPrisma.post.findFirst.mockRejectedValue(new Error("Find one failed"));

      const result = await baseService.findOne(
        filters,
        {},
        { throwOnError: false }
      );

      expect(result).toBeUndefined();
    });
  });

  // ─── updateOne ──────────────────────────────────────────────────────────────

  describe("updateOne", () => {
    it("should update a record successfully", async () => {
      const filters = { id: "1" };
      const data = {
        title: "Updated Title",
        tags: [{ id: "1234", color: "#ff3" }],
      };
      const transformedData = {
        tags: {
          update: [{ data: { color: "#ff3" }, where: { id: "1234" } }],
        },
        title: "Updated Title",
      };
      const expectedResult = { id: "1", title: "Updated Title" };
      mockPrisma.post.update.mockResolvedValue(expectedResult);

      const result = await baseService.updateOne(filters, data);

      expect(handleRelationFieldsInBody).toHaveBeenCalledWith(
        data,
        baseService.relationFields,
        []
      );
      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: filters,
        data: transformedData,
      });
      expect(result).toEqual(expectedResult);
    });

    it("should hash password for user model update", async () => {
      const filters = { id: "1" };
      const data = { name: "Updated User", password: "newpassword" };
      const hashedPassword = "new_hashed_password";
      (authService.isPasswordHashed as jest.Mock).mockReturnValue(false);
      (authService.hashPassword as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrisma.user.update.mockResolvedValue({
        id: "1",
        name: "Updated User",
        password: hashedPassword,
      });

      await userService.updateOne(filters, data);

      expect(authService.isPasswordHashed).toHaveBeenCalledWith("newpassword");
      expect(authService.hashPassword).toHaveBeenCalledWith("newpassword");
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: filters,
        data: { ...data, password: hashedPassword },
      });
    });

    it("should not hash already hashed password for user model update", async () => {
      const filters = { id: "1" };
      const hashedPassword = "$2b$10$hashedpassword";
      const data = { name: "Updated User", password: hashedPassword };
      (authService.isPasswordHashed as jest.Mock).mockReturnValue(true);
      mockPrisma.user.update.mockResolvedValue({ id: "1", ...data });

      await userService.updateOne(filters, data);

      expect(authService.isPasswordHashed).toHaveBeenCalledWith(hashedPassword);
      expect(authService.hashPassword).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: filters,
        data,
      });
    });

    it("should execute beforeUpdateOne and afterUpdateOne hooks", async () => {
      const mockBefore = jest.fn();
      const mockAfter = jest.fn();
      const filters = { id: "1" };
      const data = { title: "Updated" };
      const result = { id: "1", title: "Updated" };
      setupHooks("updateOne", { before: mockBefore, after: mockAfter });
      mockPrisma.post.update.mockResolvedValue(result);

      await baseService.updateOne(filters, data);

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockBefore],
        expect.objectContaining({ filters, data })
      );
      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockAfter],
        expect.objectContaining({ filters, data, result })
      );
    });

    it("should execute onUpdateOneError hook on error", async () => {
      const mockHook = jest.fn();
      const filters = { id: "1" };
      const data = { title: "Updated" };
      const error = new Error("Update failed");
      setupHooks("updateOne", { onError: mockHook });
      mockPrisma.post.update.mockRejectedValue(error);

      await expect(baseService.updateOne(filters, data)).rejects.toThrow(
        "Update failed"
      );

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockHook],
        expect.objectContaining({ error, filters, data })
      );
    });

    it("should return undefined when throwOnError is false and error occurs", async () => {
      const filters = { id: "1" };
      const data = { title: "Updated" };
      mockPrisma.post.update.mockRejectedValue(new Error("Update failed"));

      const result = await baseService.updateOne(
        filters,
        data,
        {},
        { throwOnError: false }
      );

      expect(result).toBeUndefined();
    });
  });

  // ─── updateMany ─────────────────────────────────────────────────────────────

  describe("updateMany", () => {
    it("should update multiple records successfully", async () => {
      const filters = { published: false };
      const data = { published: true, tags: [{ name: "sheu", color: "pink" }] };
      const expectedResult = { count: 3 };
      mockPrisma.post.updateMany.mockResolvedValue(expectedResult);

      const result = await baseService.updateMany(filters, data);

      expect(mockPrisma.post.updateMany).toHaveBeenCalledWith({
        where: filters,
        data: {
          published: true,
          tags: { create: [{ color: "pink", name: "sheu" }] },
        },
      });
      expect(result).toEqual(expectedResult);
    });

    it("should hash password for user model updateMany", async () => {
      const filters = { role: "user" };
      const data = { password: "newpassword" };
      const hashedPassword = "new_hashed_password";
      (authService.isPasswordHashed as jest.Mock).mockReturnValue(false);
      (authService.hashPassword as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrisma.user.updateMany.mockResolvedValue({ count: 2 });

      await userService.updateMany(filters, data);

      expect(authService.isPasswordHashed).toHaveBeenCalledWith("newpassword");
      expect(authService.hashPassword).toHaveBeenCalledWith("newpassword");
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: filters,
        data: { password: hashedPassword },
      });
    });

    it("should apply query options correctly", async () => {
      const filters = { published: false };
      const data = { published: true };
      const queryOptions = { select: { id: true } };
      mockPrisma.post.updateMany.mockResolvedValue({ count: 2 });

      await baseService.updateMany(filters, data, queryOptions);

      expect(mockPrisma.post.updateMany).toHaveBeenCalledWith({
        where: filters,
        data,
        select: { id: true },
      });
    });

    it("should execute beforeUpdateMany and afterUpdateMany hooks", async () => {
      const mockBefore = jest.fn();
      const mockAfter = jest.fn();
      const filters = { published: false };
      const data = { published: true };
      const result = { count: 3 };
      setupHooks("updateMany", { before: mockBefore, after: mockAfter });
      mockPrisma.post.updateMany.mockResolvedValue(result);

      await baseService.updateMany(filters, data);

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockBefore],
        expect.objectContaining({ filters, data })
      );
      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockAfter],
        expect.objectContaining({ filters, data, result })
      );
    });

    it("should execute onUpdateManyError hook on error", async () => {
      const mockHook = jest.fn();
      const filters = { published: false };
      const data = { published: true };
      const error = new Error("Update many failed");
      setupHooks("updateMany", { onError: mockHook });
      mockPrisma.post.updateMany.mockRejectedValue(error);

      await expect(baseService.updateMany(filters, data)).rejects.toThrow(
        "Update many failed"
      );

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockHook],
        expect.objectContaining({ error, filters, data })
      );
    });

    it("should return undefined when throwOnError is false and error occurs", async () => {
      const filters = { published: false };
      const data = { published: true };
      mockPrisma.post.updateMany.mockRejectedValue(
        new Error("Update many failed")
      );

      const result = await baseService.updateMany(
        filters,
        data,
        {},
        { throwOnError: false }
      );

      expect(result).toBeUndefined();
    });
  });

  // ─── batchUpdate ────────────────────────────────────────────────────────────

  describe("batchUpdate", () => {
    beforeEach(() => {
      jest.spyOn(prismaSchemaParser, "getField").mockReturnValue({
        name: "posts",
        type: "Post",
        isArray: true,
        isRelation: true,
      } as PrismaField);
    });

    it("should batch update multiple records successfully", async () => {
      const dataArray = [
        { id: "1", title: "Updated Title 1" },
        { id: "2", title: "Updated Title 2" },
      ];
      mockPrisma.post.update
        .mockResolvedValueOnce({ id: "1", title: "Updated Title 1" })
        .mockResolvedValueOnce({ id: "2", title: "Updated Title 2" });

      const results = await baseService.batchUpdate(dataArray);

      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        data: { title: "Updated Title 1" },
        where: { id: "1" },
      });
      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        data: { title: "Updated Title 2" },
        where: { id: "2" },
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(results).toHaveLength(2);
    });

    it("should hash passwords for user model batch update", async () => {
      userService = new BaseService("User");
      const dataArray = [
        { id: "1", name: "User 1", password: "pass1" },
        { id: "2", name: "User 2", password: "pass2" },
      ];
      (authService.isPasswordHashed as jest.Mock).mockReturnValue(false);
      (authService.hashPassword as jest.Mock)
        .mockResolvedValueOnce("hashed1")
        .mockResolvedValueOnce("hashed2");
      mockPrisma.user.update
        .mockResolvedValueOnce({ id: "1", name: "User 1", password: "hashed1" })
        .mockResolvedValueOnce({
          id: "2",
          name: "User 2",
          password: "hashed2",
        });

      await userService.batchUpdate(dataArray);

      expect(authService.hashPassword).toHaveBeenCalledWith("pass1");
      expect(authService.hashPassword).toHaveBeenCalledWith("pass2");
    });

    // batchUpdate/batchDelete hooks are intentionally skipped in executeHooks (by design)
    it("should NOT execute hooks for batchUpdate (by design)", async () => {
      const mockBefore = jest.fn();
      setupHooks("batchUpdate", { before: mockBefore });
      mockPrisma.post.update.mockResolvedValue({ id: "1", title: "Updated" });

      await baseService.batchUpdate([{ id: "1", title: "Updated" }]);

      expect(serviceHooksManager.handleHook).not.toHaveBeenCalled();
    });

    it("should throw on transaction failure", async () => {
      const error = new Error("Batch update failed");
      mockPrisma.$transaction.mockRejectedValue(error);

      await expect(
        baseService.batchUpdate([{ id: "1", title: "Updated" }])
      ).rejects.toThrow("Batch update failed");
    });

    it("should return undefined when throwOnError is false and error occurs", async () => {
      mockPrisma.$transaction.mockRejectedValue(
        new Error("Batch update failed")
      );

      const result = await baseService.batchUpdate(
        [{ id: "1", title: "Updated" }],
        {},
        { throwOnError: false }
      );

      expect(result).toBeUndefined();
    });
  });

  // ─── deleteOne ──────────────────────────────────────────────────────────────

  describe("deleteOne", () => {
    it("should delete a record successfully", async () => {
      const filters = { id: "1" };
      const expectedResult = { id: "1", title: "Deleted Post" };
      mockPrisma.post.delete.mockResolvedValue(expectedResult);

      const result = await baseService.deleteOne(filters);

      expect(mockPrisma.post.delete).toHaveBeenCalledWith({ where: filters });
      expect(result).toEqual(expectedResult);
    });

    it("should execute beforeDeleteOne and afterDeleteOne hooks", async () => {
      const mockBefore = jest.fn();
      const mockAfter = jest.fn();
      const filters = { id: "1" };
      const result = { id: "1", title: "Deleted" };
      setupHooks("deleteOne", { before: mockBefore, after: mockAfter });
      mockPrisma.post.delete.mockResolvedValue(result);

      await baseService.deleteOne(filters);

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockBefore],
        expect.objectContaining({ filters })
      );
      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockAfter],
        expect.objectContaining({ filters, result })
      );
    });

    it("should execute onDeleteOneError hook on error", async () => {
      const mockHook = jest.fn();
      const filters = { id: "1" };
      const error = new Error("Delete failed");
      setupHooks("deleteOne", { onError: mockHook });
      mockPrisma.post.delete.mockRejectedValue(error);

      await expect(baseService.deleteOne(filters)).rejects.toThrow(
        "Delete failed"
      );

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockHook],
        expect.objectContaining({ error, filters })
      );
    });

    it("should return undefined when throwOnError is false and error occurs", async () => {
      const filters = { id: "1" };
      mockPrisma.post.delete.mockRejectedValue(new Error("Delete failed"));

      const result = await baseService.deleteOne(filters, {
        throwOnError: false,
      });

      expect(result).toBeUndefined();
    });
  });

  // ─── deleteMany ─────────────────────────────────────────────────────────────

  describe("deleteMany", () => {
    it("should delete multiple records successfully", async () => {
      const filters = { published: false };
      const expectedResult = { count: 3 };
      mockPrisma.post.deleteMany.mockResolvedValue(expectedResult);

      const result = await baseService.deleteMany(filters);

      expect(mockPrisma.post.deleteMany).toHaveBeenCalledWith({
        where: filters,
      });
      expect(result).toEqual(expectedResult);
    });

    it("should execute beforeDeleteMany and afterDeleteMany hooks", async () => {
      const mockBefore = jest.fn();
      const mockAfter = jest.fn();
      const filters = { published: false };
      const result = { count: 3 };
      setupHooks("deleteMany", { before: mockBefore, after: mockAfter });
      mockPrisma.post.deleteMany.mockResolvedValue(result);

      await baseService.deleteMany(filters);

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockBefore],
        expect.objectContaining({ filters })
      );
      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockAfter],
        expect.objectContaining({ filters, result })
      );
    });

    it("should execute onDeleteManyError hook on error", async () => {
      const mockHook = jest.fn();
      const filters = { published: false };
      const error = new Error("Delete many failed");
      setupHooks("deleteMany", { onError: mockHook });
      mockPrisma.post.deleteMany.mockRejectedValue(error);

      await expect(baseService.deleteMany(filters)).rejects.toThrow(
        "Delete many failed"
      );

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockHook],
        expect.objectContaining({ error, filters })
      );
    });

    it("should return undefined when throwOnError is false and error occurs", async () => {
      const filters = { published: false };
      mockPrisma.post.deleteMany.mockRejectedValue(
        new Error("Delete many failed")
      );

      const result = await baseService.deleteMany(filters, {
        throwOnError: false,
      });

      expect(result).toBeUndefined();
    });
  });

  // ─── batchDelete ────────────────────────────────────────────────────────────

  describe("batchDelete", () => {
    it("should batch delete multiple records successfully", async () => {
      const batchFilters = [{ id: "1" }, { id: "2" }, { id: "3" }];
      mockPrisma.post.delete
        .mockResolvedValueOnce({ id: "1", title: "Post 1" })
        .mockResolvedValueOnce({ id: "2", title: "Post 2" })
        .mockResolvedValueOnce({ id: "3", title: "Post 3" });

      const results = await baseService.batchDelete(batchFilters);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ id: "1", title: "Post 1" });
      expect(results[1]).toEqual({ id: "2", title: "Post 2" });
      expect(results[2]).toEqual({ id: "3", title: "Post 3" });
    });

    it("should handle relation fields in batch delete filters", async () => {
      const batchFilters = [
        { id: "1", category: { disconnect: true } },
        { id: "2", tags: { set: [] } },
      ];
      mockPrisma.post.delete
        .mockResolvedValueOnce({ id: "1" })
        .mockResolvedValueOnce({ id: "2" });

      await baseService.batchDelete(batchFilters);

      expect(handleRelationFieldsInBody).toHaveBeenCalledTimes(2);
      expect(handleRelationFieldsInBody).toHaveBeenCalledWith(
        batchFilters[0],
        baseService.relationFields
      );
      expect(handleRelationFieldsInBody).toHaveBeenCalledWith(
        batchFilters[1],
        baseService.relationFields
      );
    });

    // batchDelete hooks intentionally skipped by design
    it("should NOT execute hooks for batchDelete (by design)", async () => {
      const mockBefore = jest.fn();
      setupHooks("batchDelete", { before: mockBefore });
      mockPrisma.post.delete.mockResolvedValue({ id: "1", title: "Deleted" });

      await baseService.batchDelete([{ id: "1" }]);

      expect(serviceHooksManager.handleHook).not.toHaveBeenCalled();
    });

    it("should throw on transaction failure", async () => {
      const error = new Error("Batch delete failed");
      mockPrisma.$transaction.mockRejectedValue(error);

      await expect(baseService.batchDelete([{ id: "1" }])).rejects.toThrow(
        "Batch delete failed"
      );
    });

    it("should return undefined when throwOnError is false and error occurs", async () => {
      mockPrisma.$transaction.mockRejectedValue(
        new Error("Batch delete failed")
      );

      const result = await baseService.batchDelete([{ id: "1" }], {
        throwOnError: false,
      });

      expect(result).toBeUndefined();
    });
  });

  // ─── context skip functionality ─────────────────────────────────────────────

  describe("context skip functionality", () => {
    it("should skip after hooks when context skip is 'after'", async () => {
      const mockBefore = jest.fn();
      const mockAfter = jest.fn();
      setupHooks("createOne", { before: mockBefore, after: mockAfter });
      mockPrisma.post.create.mockResolvedValue({ id: "1", title: "Test" });

      await baseService.createOne({ title: "Test" }, {}, { skip: "after" });

      expect(serviceHooksManager.handleHook).toHaveBeenCalledWith(
        [mockBefore],
        expect.anything()
      );
      expect(serviceHooksManager.handleHook).not.toHaveBeenCalledWith(
        [mockAfter],
        expect.anything()
      );
    });

    it("should skip error hooks when context skip is 'error'", async () => {
      const mockError = jest.fn();
      setupHooks("createOne", { onError: mockError });
      mockPrisma.post.create.mockRejectedValue(new Error("Test error"));

      await expect(
        baseService.createOne({ title: "Test" }, {}, { skip: "error" })
      ).rejects.toThrow();

      expect(serviceHooksManager.handleHook).not.toHaveBeenCalledWith(
        [mockError],
        expect.anything()
      );
    });
  });

  // ─── processPasswordHashing ─────────────────────────────────────────────────

  describe("BaseService - processPasswordHashing method", () => {
    let localUserService: BaseService<any>;

    beforeEach(() => {
      jest.clearAllMocks();
      mockGetItem.mockReturnValue(null);
      mockGetHooks.mockReturnValue(null);
      localUserService = new BaseService("User");
    });

    it("should hash plain password for single object", async () => {
      const data = { email: "test@test.com", password: "plaintext" };
      const hashedPassword = "hashed_password";
      (authService.isPasswordHashed as jest.Mock).mockReturnValue(false);
      (authService.hashPassword as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await (localUserService as any).processPasswordHashing(
        data
      );

      expect(authService.isPasswordHashed).toHaveBeenCalledWith("plaintext");
      expect(authService.hashPassword).toHaveBeenCalledWith("plaintext");
      expect(result).toEqual({
        email: "test@test.com",
        password: hashedPassword,
      });
    });

    it("should not modify already hashed password", async () => {
      const hashedPassword = "$2b$10$hashedpassword";
      const data = { email: "test@test.com", password: hashedPassword };
      (authService.isPasswordHashed as jest.Mock).mockReturnValue(true);

      const result = await (localUserService as any).processPasswordHashing(
        data
      );

      expect(authService.isPasswordHashed).toHaveBeenCalledWith(hashedPassword);
      expect(authService.hashPassword).not.toHaveBeenCalled();
      expect(result).toEqual(data);
    });

    it("should return original data when no password field", async () => {
      const data = { email: "test@test.com", name: "Test User" };

      const result = await (localUserService as any).processPasswordHashing(
        data
      );

      expect(authService.isPasswordHashed).not.toHaveBeenCalled();
      expect(result).toEqual(data);
    });

    it("should hash passwords in array", async () => {
      const data = [
        { email: "user1@test.com", password: "pass1" },
        { email: "user2@test.com", password: "pass2" },
      ];
      (authService.isPasswordHashed as jest.Mock).mockReturnValue(false);
      (authService.hashPassword as jest.Mock)
        .mockResolvedValueOnce("hashed1")
        .mockResolvedValueOnce("hashed2");

      const result = await (localUserService as any).processPasswordHashing(
        data
      );

      expect(authService.hashPassword).toHaveBeenCalledWith("pass1");
      expect(authService.hashPassword).toHaveBeenCalledWith("pass2");
      expect(result).toEqual([
        { email: "user1@test.com", password: "hashed1" },
        { email: "user2@test.com", password: "hashed2" },
      ]);
    });

    it("should return original data when password is undefined", async () => {
      const data = { email: "test@test.com", password: undefined };

      const result = await (localUserService as any).processPasswordHashing(
        data
      );

      expect(result).toEqual(data);
      expect(authService.isPasswordHashed).not.toHaveBeenCalled();
    });
  });

  // ─── edge cases ─────────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("should handle password field that is undefined", async () => {
      const data = { email: "test@test.com", password: undefined };
      mockPrisma.user.create.mockResolvedValue({ id: "1", ...data });

      await userService.createOne(data);

      expect(authService.isPasswordHashed).not.toHaveBeenCalled();
      expect(authService.hashPassword).not.toHaveBeenCalled();
    });

    it("should handle missing hooks gracefully", async () => {
      mockGetItem.mockReturnValue(null);
      mockPrisma.post.create.mockResolvedValue({ id: "1", title: "Test" });

      const result = await baseService.createOne({ title: "Test" });

      expect(result).toEqual({ id: "1", title: "Test" });
      expect(serviceHooksManager.handleHook).not.toHaveBeenCalled();
    });

    it("should handle empty batch arrays", async () => {
      const results = await baseService.batchUpdate([]);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(results).toEqual([]);

      const deleteResults = await baseService.batchDelete([]);
      expect(deleteResults).toEqual([]);
    });
  });
});
