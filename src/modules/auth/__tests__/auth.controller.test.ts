import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  authControllerFactory,
  defaultExcludedUserFields,
} from "../auth.controller";
import authService from "../auth.service";
import { getBaseServices } from "../../base/base.service";
import { getPrismaInstance } from "../../../utils/helpers/prisma.helpers";
import { importPrismaModelModules } from "../../../utils/helpers/models.helpers";
import { getArkosConfig } from "../../../server";

vi.mock("bcrypt", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

// Mock dependencies
vi.mock("../auth.service", () => ({
  default: {
    isCorrectPassword: vi.fn(),
    signJwtToken: vi.fn(),
    isPasswordStrong: vi.fn(),
    hashPassword: vi.fn(),
    authenticate: vi.fn(),
    handleAuthenticationControl: vi.fn(),
    handleActionAccessControl: vi.fn(),
  },
}));

vi.mock("../../base/base.service", () => ({
  getBaseServices: vi.fn(),
}));

vi.mock("../../../utils/helpers/prisma.helpers", () => ({
  getPrismaInstance: vi.fn(),
}));

// In your auth.controller.test.ts file, update your mock for models.helpers.ts

vi.mock("../../../utils/helpers/models.helpers", () => ({
  importPrismaModelModules: vi.fn(),
  getPrismaModelRelations: vi.fn(),
  getModels: vi.fn(() => []),
  getModelUniqueFields: vi.fn(() => []),
  models: [],
  prismaModelRelationFields: {},
}));

vi.mock("../../../server", () => ({
  getArkosConfig: vi.fn(),
  close: vi.fn(),
}));

describe("Auth Controller Factory", () => {
  let req: any;
  let res: any;
  let next: any;
  let mockPrisma: any;
  let authController: any;
  let userService: any;

  beforeEach(async () => {
    // Reset mocks
    vi.resetAllMocks();

    // Setup mocks
    userService = {
      findOne: vi.fn(),
      createOne: vi.fn(),
    };

    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    // Setup mock implementations
    (getBaseServices as any).mockReturnValue({
      user: userService,
    });

    (getPrismaInstance as any).mockReturnValue(mockPrisma);
    (importPrismaModelModules as any).mockResolvedValue({
      prismaQueryOptions: {
        queryOptions: {},
        findOne: {},
      },
    });

    (getArkosConfig as any).mockReturnValue({
      authentication: {
        usernameField: "username",
        login: {
          sendAccessTokenThrough: "both",
        },
      },
    });

    // Create request, response, and next function mocks
    req = {
      user: {
        id: "user-id-123",
        username: "testuser",
        password: "hashedPassword",
        isVerified: true,
        active: true,
      },
      body: {},
      query: {},
      secure: false,
      headers: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      cookie: vi.fn(),
      send: vi.fn(),
    };

    next = vi.fn();

    // Create the auth controller
    authController = await authControllerFactory();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getMe", () => {
    it("should get the current user and return it", async () => {
      // Setup
      userService.findOne.mockResolvedValueOnce({
        id: "user-id-123",
        username: "testuser",
        email: "test@example.com",
      });

      // Execute
      await authController.getMe(req, res, next);

      // Verify
      expect(userService.findOne).toHaveBeenCalledWith(
        { id: "user-id-123" },
        expect.any(String)
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(req.user);
    });

    it("should remove excluded fields from the user object", async () => {
      // Setup
      const fullUser = {
        id: "user-id-123",
        username: "testuser",
        email: "test@example.com",
        password: "hashedPassword",
        passwordChangedAt: new Date(),
        active: true,
      };

      req.user = { ...fullUser };
      userService.findOne.mockResolvedValueOnce(fullUser);

      // Execute
      await authController.getMe(req, res, next);

      // Verify
      Object.keys(defaultExcludedUserFields).forEach((field) => {
        expect(req.user[field]).toBeUndefined();
      });
    });

    it("should call next middleware when afterGetMe is provided", async () => {
      // Setup
      const controllerWithMiddleware = await authControllerFactory({
        afterGetMe: true,
      });

      userService.findOne.mockResolvedValueOnce({
        id: "user-id-123",
        username: "testuser",
        email: "test@example.com",
      });

      // Execute
      await controllerWithMiddleware.getMe(req, res, next);

      // Verify
      expect(req.responseData).toBeDefined();
      expect(req.responseStatus).toBe(200);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    it("should clear the access token cookie and return 204", async () => {
      // Execute
      await authController.logout(req, res, next);

      // Verify
      expect(res.cookie).toHaveBeenCalledWith(
        "arkos_access_token",
        "no-token",
        expect.objectContaining({
          httpOnly: true,
        })
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.json).toHaveBeenCalled();
    });

    it("should call next middleware when afterLogout is provided", async () => {
      // Setup
      const controllerWithMiddleware = await authControllerFactory({
        afterLogout: true,
      });

      // Execute
      await controllerWithMiddleware.logout(req, res, next);

      // Verify
      expect(req.responseData).toBeNull();
      expect(req.responseStatus).toBe(204);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("should return 400 if username or password is missing", async () => {
      // Setup
      req.body = { username: "testuser" }; // Missing password

      // Execute
      await authController.login(req, res, next);

      // Verify
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining("username and password"),
        })
      );
    });

    it("should use default username field from config when not specified in query", async () => {
      // Setup
      req.body = { username: "testuser", password: "Password123" };

      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-id-123",
        username: "testuser",
        password: "hashedPassword",
      });

      (authService.isCorrectPassword as any).mockResolvedValueOnce(true);
      (authService.signJwtToken as any).mockReturnValue("jwt-token-123");

      // Execute
      await authController.login(req, res, next);

      // Verify
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: "testuser" },
      });
    });

    it("should use username field from query parameter when provided", async () => {
      // Setup
      req.query.usernameField = "email";
      req.body = { email: "test@example.com", password: "Password123" };

      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-id-123",
        email: "test@example.com",
        password: "hashedPassword",
      });

      (authService.isCorrectPassword as any).mockResolvedValueOnce(true);
      (authService.signJwtToken as any).mockReturnValue("jwt-token-123");

      // Execute
      await authController.login(req, res, next);

      // Verify
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    });

    it("should return 401 if user is not found", async () => {
      // Setup
      req.body = { username: "nonexistentuser", password: "Password123" };
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      // Execute
      await authController.login(req, res, next);

      // Verify
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: expect.stringContaining("Incorrect username or password"),
        })
      );
    });

    it("should return 401 if password is incorrect", async () => {
      // Setup
      req.body = { username: "testuser", password: "WrongPassword123" };

      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-id-123",
        username: "testuser",
        password: "hashedPassword",
      });

      (authService.isCorrectPassword as any).mockResolvedValueOnce(false);

      // Execute
      await authController.login(req, res, next);

      // Verify
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: expect.stringContaining("Incorrect username or password"),
        })
      );
    });

    it('should set cookie and return token in response when config is "both"', async () => {
      // Setup
      req.body = { username: "testuser", password: "Password123" };

      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-id-123",
        username: "testuser",
        password: "hashedPassword",
      });

      (authService.isCorrectPassword as any).mockResolvedValueOnce(true);
      (authService.signJwtToken as any).mockReturnValue("jwt-token-123");

      (getArkosConfig as any).mockReturnValue({
        authentication: {
          usernameField: "username",
          login: {
            sendAccessTokenThrough: "both",
          },
        },
      });

      // Execute
      await authController.login(req, res, next);

      // Verify
      expect(res.cookie).toHaveBeenCalledWith(
        "arkos_access_token",
        "jwt-token-123",
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        accessToken: "jwt-token-123",
      });
    });

    it('should only set cookie when config is "cookie-only"', async () => {
      // Setup
      req.body = { username: "testuser", password: "Password123" };

      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-id-123",
        username: "testuser",
        password: "hashedPassword",
      });

      (authService.isCorrectPassword as any).mockResolvedValueOnce(true);
      (authService.signJwtToken as any).mockReturnValue("jwt-token-123");

      (getArkosConfig as any).mockReturnValue({
        authentication: {
          usernameField: "username",
          login: {
            sendAccessTokenThrough: "cookie-only",
          },
        },
      });

      // Execute
      await authController.login(req, res, next);

      // Verify
      expect(res.cookie).toHaveBeenCalledWith(
        "arkos_access_token",
        "jwt-token-123",
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should only return token in response when config is "response-only"', async () => {
      // Setup
      req.body = { username: "testuser", password: "Password123" };

      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-id-123",
        username: "testuser",
        password: "hashedPassword",
      });

      (authService.isCorrectPassword as any).mockResolvedValueOnce(true);
      (authService.signJwtToken as any).mockReturnValue("jwt-token-123");

      (getArkosConfig as any).mockReturnValue({
        authentication: {
          usernameField: "username",
          login: {
            sendAccessTokenThrough: "response-only",
          },
        },
      });

      // Execute
      await authController.login(req, res, next);

      // Verify
      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        accessToken: "jwt-token-123",
      });
    });

    it("should call next middleware when afterLogin is provided", async () => {
      // Setup
      const controllerWithMiddleware = await authControllerFactory({
        afterLogin: true,
      });

      req.body = { username: "testuser", password: "Password123" };

      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-id-123",
        username: "testuser",
        password: "hashedPassword",
      });

      (authService.isCorrectPassword as any).mockResolvedValueOnce(true);
      (authService.signJwtToken as any).mockReturnValue("jwt-token-123");

      // Execute
      await controllerWithMiddleware.login(req, res, next);

      // Verify
      expect(req.responseData).toEqual({ accessToken: "jwt-token-123" });
      expect(req.responseStatus).toBe(200);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("signup", () => {
    it("should create a new user and return 201", async () => {
      // Setup
      req.body = {
        username: "newuser",
        email: "newuser@example.com",
        password: "Password123",
      };

      const createdUser = {
        id: "new-user-id",
        username: "newuser",
        email: "newuser@example.com",
        password: "hashedPassword",
        active: true,
      };

      userService.createOne.mockResolvedValueOnce({ ...createdUser });

      // Execute
      await authController.signup(req, res, next);

      // Verify
      expect(userService.createOne).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);

      // Check that excluded fields are removed
      const responseUser = res.json.mock.calls[0][0].data;
      Object.keys(defaultExcludedUserFields).forEach((field) => {
        expect(responseUser[field]).toBeUndefined();
      });
    });

    it("should call next middleware when afterSignup is provided", async () => {
      // Setup
      const controllerWithMiddleware = await authControllerFactory({
        afterSignup: true,
      });

      req.body = {
        username: "newuser",
        email: "newuser@example.com",
        password: "Password123",
      };

      const createdUser = {
        id: "new-user-id",
        username: "newuser",
        email: "newuser@example.com",
        password: "hashedPassword",
      };

      userService.createOne.mockResolvedValueOnce({ ...createdUser });

      // Execute
      await controllerWithMiddleware.signup(req, res, next);

      // Verify
      expect(req.responseData).toEqual({ data: createdUser });
      expect(req.responseStatus).toBe(201);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("updatePassword", () => {
    it("should return 400 if currentPassword or newPassword is missing", async () => {
      // Setup - missing newPassword
      req.body = { currentPassword: "CurrentPassword123" };

      // Execute
      await authController.updatePassword(req, res, next);

      // Verify
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining(
            "currentPassword and newPassword are required"
          ),
        })
      );
    });

    it("should return 404 if user is not found or inactive", async () => {
      // Setup
      req.user = null;
      req.body = {
        currentPassword: "CurrentPassword123",
        newPassword: "NewPassword123",
      };

      // Execute
      await authController.updatePassword(req, res, next);

      // Verify
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: expect.stringContaining("User not found"),
        })
      );
    });

    it("should return 423 if user is not verified", async () => {
      // Setup
      req.user = {
        id: "user-id-123",
        username: "testuser",
        password: "hashedPassword",
        isVerified: false,
      };

      req.body = {
        currentPassword: "CurrentPassword123",
        newPassword: "NewPassword123",
      };

      // Execute
      await authController.updatePassword(req, res, next);

      // Verify
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 423,
          message: expect.stringContaining("verify your account"),
        })
      );
    });

    it("should return 400 if current password is incorrect", async () => {
      // Setup
      req.user = {
        id: "user-id-123",
        username: "testuser",
        password: "hashedPassword",
        isVerified: true,
      };

      req.body = {
        currentPassword: "WrongPassword123",
        newPassword: "NewPassword123",
      };

      (authService.isCorrectPassword as any).mockResolvedValueOnce(false);

      // Execute
      await authController.updatePassword(req, res, next);

      // Verify
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining("Current password is incorrect"),
        })
      );
    });

    it("should return 400 if new password is not strong enough", async () => {
      // Setup
      req.user = {
        id: "user-id-123",
        username: "testuser",
        password: "hashedPassword",
        isVerified: true,
      };

      req.body = {
        currentPassword: "CurrentPassword123",
        newPassword: "weakpassword",
      };

      (authService.isCorrectPassword as any).mockResolvedValueOnce(true);
      (authService.isPasswordStrong as any).mockReturnValue(false);

      // Execute
      await authController.updatePassword(req, res, next);

      // Verify
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining("Password must contain"),
        })
      );
    });

    it("should update password and return 200 on success", async () => {
      // Setup
      req.user = {
        id: "user-id-123",
        username: "testuser",
        password: "hashedPassword",
        isVerified: true,
      };

      req.body = {
        currentPassword: "CurrentPassword123",
        newPassword: "NewPassword123",
      };

      (authService.isCorrectPassword as any).mockResolvedValueOnce(true);
      (authService.isPasswordStrong as any).mockReturnValue(true);
      (authService.hashPassword as any).mockResolvedValueOnce(
        "newHashedPassword"
      );

      // Execute
      await authController.updatePassword(req, res, next);

      // Verify
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-id-123" },
        data: {
          password: "newHashedPassword",
          passwordChangedAt: expect.any(Date),
        },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Password updated successfully!",
      });
    });

    it("should call next middleware when afterUpdatePassword is provided", async () => {
      // Setup
      const controllerWithMiddleware = await authControllerFactory({
        afterUpdatePassword: true,
      });

      req.user = {
        id: "user-id-123",
        username: "testuser",
        password: "hashedPassword",
        isVerified: true,
      };

      req.body = {
        currentPassword: "CurrentPassword123",
        newPassword: "NewPassword123",
      };

      (authService.isCorrectPassword as any).mockResolvedValueOnce(true);
      (authService.isPasswordStrong as any).mockReturnValue(true);
      (authService.hashPassword as any).mockResolvedValueOnce(
        "newHashedPassword123"
      );

      // Execute
      await controllerWithMiddleware.updatePassword(req, res, next);

      // Verify
      expect(req.responseData).toEqual({
        status: "success",
        message: "Password updated successfully!",
      });
      expect(req.responseStatus).toBe(200);
      expect(req.additionalData).toEqual({
        user: req.user,
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
