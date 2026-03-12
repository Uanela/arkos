import { AuthController, defaultExcludedUserFields } from "../auth.controller";
import authService from "../auth.service";
import { getPrismaInstance } from "../../../utils/helpers/prisma.helpers";
import { getArkosConfig } from "../../../server";
import { BaseService } from "../../base/base.service";
import { routeHookReader } from "../../../components/arkos-route-hook/reader";

jest.mock("fs");
jest.mock("bcryptjs", () => ({
  default: {
    compare: jest.fn(),
    hash: jest.fn(),
  },
}));

jest.mock("../auth.service", () => ({
  ...jest.requireActual("../auth.service"),
  isCorrectPassword: jest.fn(),
  signJwtToken: jest.fn(),
  isPasswordStrong: jest.fn(),
  hashPassword: jest.fn(),
  authenticate: jest.fn(),
  handleAuthenticationControl: jest.fn(),
  handleAccessControl: jest.fn(),
  getJwtCookieOptions: jest.fn(),
}));

jest.mock("../../base/base.service", () => ({
  getBaseServices: jest.fn(),
  BaseService: jest.fn(),
}));

const MockedBaseService = BaseService as jest.MockedClass<typeof BaseService>;

jest.mock("../../../utils/helpers/prisma.helpers", () => ({
  getPrismaInstance: jest.fn(),
}));

jest.mock("../../../components/arkos-route-hook/reader", () => ({
  routeHookReader: {
    getHooks: jest.fn(),
  },
}));

jest.mock("../../../server", () => ({
  getArkosConfig: jest.fn(),
  close: jest.fn(),
}));

const mockGetHooks = routeHookReader.getHooks as jest.Mock;

describe("Auth Controller", () => {
  let req: any;
  let res: any;
  let next: any;
  let mockPrisma: any;
  let authController: AuthController;
  let userService: any = {
    findOne: jest.fn(),
    updateOne: jest.fn(),
    createOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    (authService.getJwtCookieOptions as jest.Mock).mockReturnValue({});
    mockGetHooks.mockReturnValue(null);

    mockPrisma = {
      user: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    MockedBaseService.mockImplementation(() => userService);

    (getPrismaInstance as jest.Mock).mockReturnValue(mockPrisma);

    req = {
      user: {
        id: "user-id-123",
        username: "testuser",
        email: "test@example.com",
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
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      send: jest.fn(),
      locals: {},
    };

    next = jest.fn();

    authController = new AuthController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getMe", () => {
    it("should get the current user and return it", async () => {
      const user = {
        id: "user-id-123",
        username: "testuser",
        email: "test@example.com",
      };

      userService.findOne.mockResolvedValueOnce(user);
      MockedBaseService.mockImplementation(() => userService);

      await authController.getMe(req, res, next);

      expect(userService.findOne).toHaveBeenCalledWith(
        { id: "user-id-123" },
        {}
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: user });
    });

    it("should remove excluded fields from the user object", async () => {
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

      await authController.getMe(req, res, next);

      Object.keys(defaultExcludedUserFields).forEach((field) => {
        expect(fullUser[field as keyof typeof fullUser]).toBeUndefined();
      });
    });

    it("should call next middleware when afterGetMe hook is registered", async () => {
      mockGetHooks.mockImplementation((module: string, operation: string) => {
        if (module === "auth" && operation === "getMe")
          return { after: jest.fn() };
        return null;
      });

      userService.findOne.mockResolvedValueOnce({
        id: "user-id-123",
        username: "testuser",
        email: "test@example.com",
      });

      await authController.getMe(req, res, next);

      expect(req.responseData).toBeDefined();
      expect(req.responseStatus).toBe(200);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    it("should clear the access token cookie and return 204", async () => {
      await authController.logout(req, res, next);

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

    it("should call next middleware when afterLogout hook is registered", async () => {
      mockGetHooks.mockImplementation((module: string, operation: string) => {
        if (module === "auth" && operation === "logout")
          return { after: jest.fn() };
        return null;
      });

      await authController.logout(req, res, next);

      expect(req.responseData).toBeNull();
      expect(req.responseStatus).toBe(204);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("should return 400 if username or password is missing", async () => {
      req.body = { username: "testuser" };

      await authController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining("username and password"),
        })
      );
    });

    it("should use default username field from config when not specified in query", async () => {
      req.body = { username: "testuser", password: "Password123" };

      userService.findOne.mockResolvedValueOnce({
        id: "user-id-123",
        username: "testuser",
        password: "hashedPassword",
      });
      (authService.isCorrectPassword as jest.Mock).mockResolvedValueOnce(true);
      (authService.signJwtToken as jest.Mock).mockReturnValue("jwt-token-123");

      await authController.login(req, res, next);

      expect(userService.findOne).toHaveBeenCalledWith(
        { username: "testuser" },
        {}
      );
    });

    it("should use username field from query parameter when provided", async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: {
          login: {
            allowedUsernames: ["email"],
          },
        },
      });

      req = {
        body: { email: "test@arkosjs.com", password: "Password123" },
        query: { usernameField: "email" },
      };

      userService.findOne.mockResolvedValueOnce({
        id: "user-id-123",
        email: "test@arkosjs.com",
        password: "hashedPassword",
      });

      (authService.isCorrectPassword as jest.Mock).mockResolvedValueOnce(true);
      (authService.signJwtToken as jest.Mock).mockReturnValue("jwt-token-123");

      await authController.login(req, res, next);

      expect(userService.findOne).toHaveBeenCalledWith(
        { email: "test@arkosjs.com" },
        {}
      );
    });

    it("should return 401 if user is not found", async () => {
      req.body = { username: "nonexistentuser", password: "Password123" };
      userService.findOne.mockResolvedValueOnce(null);

      await authController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: expect.stringContaining("Incorrect username or password"),
        })
      );
    });

    it("should return 401 if password is incorrect", async () => {
      req.body = { username: "testuser", password: "WrongPassword123" };

      userService.findOne.mockResolvedValueOnce({
        id: "user-id-123",
        username: "testuser",
        password: "hashedPassword",
      });

      (authService.isCorrectPassword as jest.Mock).mockResolvedValueOnce(false);

      await authController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: expect.stringContaining("Incorrect username or password"),
        })
      );
    });

    it('should set cookie and return token in response when config is "both"', async () => {
      req.body = { username: "testuser", password: "Password123" };

      userService.findOne.mockResolvedValueOnce({
        id: "user-id-123",
        username: "testuser",
        password: "hashedPassword",
      });

      (authService.isCorrectPassword as jest.Mock).mockResolvedValueOnce(true);
      (authService.signJwtToken as jest.Mock).mockReturnValue("jwt-token-123");

      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: {
          login: {
            sendAccessTokenThrough: "both",
          },
        },
      });

      await authController.login(req, res, next);

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
      (getArkosConfig as jest.Mock).mockReturnValueOnce({
        authentication: {
          login: {
            sendAccessTokenThrough: "cookie-only",
          },
        },
      });

      req.body = { username: "testuser321", password: "Password123" };

      userService.findOne.mockResolvedValueOnce({
        id: "user-id-123",
        username: "testuser321",
        password: "hashedPassword",
      });

      (authService.isCorrectPassword as jest.Mock).mockResolvedValueOnce(true);
      (authService.signJwtToken as jest.Mock).mockReturnValue("jwt-token-123");

      await authController.login(req, res, next);

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
      req.body = { username: "testuser", password: "Password123" };

      userService.findOne.mockResolvedValueOnce({
        id: "user-id-123",
        username: "testuser",
        password: "hashedPassword",
      });

      (authService.isCorrectPassword as jest.Mock).mockResolvedValueOnce(true);
      (authService.signJwtToken as jest.Mock).mockReturnValue("jwt-token-123");

      (getArkosConfig as jest.Mock).mockReturnValueOnce({
        authentication: {
          login: {
            sendAccessTokenThrough: "response-only",
          },
        },
      });

      await authController.login(req, res, next);

      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        accessToken: "jwt-token-123",
      });
    });

    it("should call next middleware when afterLogin hook is registered and send cookies strategy response-only or both", async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: {
          login: {
            sendAccessTokenThrough: "both",
          },
        },
      });

      mockGetHooks.mockImplementation((module: string, operation: string) => {
        if (module === "auth" && operation === "login")
          return { after: jest.fn() };
        return null;
      });

      req.body = { username: "testuser", password: "Password123" };

      userService.findOne.mockResolvedValueOnce({
        id: "user-id-123",
        username: "testuser",
        password: "hashedPassword",
      });

      (authService.isCorrectPassword as jest.Mock).mockResolvedValueOnce(true);
      (authService.signJwtToken as jest.Mock).mockReturnValue("jwt-token-123");

      await authController.login(req, res, next);

      expect(req.responseData).toEqual({ accessToken: "jwt-token-123" });
      expect(req.responseStatus).toBe(200);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("signup", () => {
    it("should create a new user and return 201", async () => {
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

      await authController.signup(req, res, next);

      expect(userService.createOne).toHaveBeenCalledWith({ ...req.body }, {});
      expect(res.status).toHaveBeenCalledWith(201);

      const responseUser = res.json.mock.calls[0][0].data;
      Object.keys(defaultExcludedUserFields).forEach((field) => {
        expect(responseUser[field]).toBeUndefined();
      });
    });

    it("should call next middleware when afterSignup hook is registered", async () => {
      mockGetHooks.mockImplementation((module: string, operation: string) => {
        if (module === "auth" && operation === "signup")
          return { after: jest.fn() };
        return null;
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

      await authController.signup(req, res, next);

      expect(req.responseData).toEqual({ data: createdUser });
      expect(req.responseStatus).toBe(201);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("updateMe", () => {
    it("should return 400 if password field is included in request body", async () => {
      req.body = {
        username: "updateduser",
        password: "NewPassword123",
      };

      await authController.updateMe(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message:
            "In order to update password use the update-password endpoint.",
          code: "InvalidFieldPassword",
        })
      );
    });

    it("should update user data and return 200 on success", async () => {
      req.body = {
        username: "updateduser",
        email: "updated@example.com",
      };

      const updatedUser = {
        id: "user-id-123",
        username: "updateduser",
        email: "updated@example.com",
        password: "hashedPassword",
        passwordChangedAt: new Date(),
        active: true,
      };

      userService.updateOne.mockResolvedValueOnce({ ...updatedUser });

      await authController.updateMe(req, res, next);

      expect(userService.updateOne).toHaveBeenCalledWith(
        { id: "user-id-123" },
        req.body,
        {}
      );
      expect(res.status).toHaveBeenCalledWith(200);

      const responseUser = res.json.mock.calls[0][0].data;
      Object.keys(defaultExcludedUserFields).forEach((field) => {
        expect(responseUser[field]).toBeUndefined();
      });
    });

    it("should use prismaQueryOptions from request when available", async () => {
      req.body = { username: "updateduser" };
      req.prismaQueryOptions = { include: { profile: true } };

      const updatedUser = {
        id: "user-id-123",
        username: "updateduser",
        email: "test@example.com",
      };

      userService.updateOne.mockResolvedValueOnce(updatedUser);

      await authController.updateMe(req, res, next);

      expect(userService.updateOne).toHaveBeenCalledWith(
        { id: "user-id-123" },
        req.body,
        { include: { profile: true } }
      );
    });

    it("should call next middleware when afterUpdateMe hook is registered", async () => {
      mockGetHooks.mockImplementation((module: string, operation: string) => {
        if (module === "auth" && operation === "updateMe")
          return { after: jest.fn() };
        return null;
      });

      req.body = {
        username: "updateduser",
        email: "updated@example.com",
      };

      const updatedUser = {
        id: "user-id-123",
        username: "updateduser",
        email: "updated@example.com",
      };

      userService.updateOne.mockResolvedValueOnce({ ...updatedUser });

      await authController.updateMe(req, res, next);

      expect(req.responseData).toEqual({ data: updatedUser });
      expect(req.responseStatus).toBe(200);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should remove excluded fields from user object before responding", async () => {
      req.body = { username: "updateduser" };

      const updatedUserWithSensitiveData = {
        id: "user-id-123",
        username: "updateduser",
        email: "test@example.com",
        password: "hashedPassword",
        passwordChangedAt: new Date(),
        active: true,
      };

      userService.updateOne.mockResolvedValueOnce({
        ...updatedUserWithSensitiveData,
      });

      await authController.updateMe(req, res, next);

      const responseUser = res.json.mock.calls[0][0].data;
      expect(responseUser.password).toBeUndefined();
      expect(responseUser.username).toBe("updateduser");
      expect(responseUser.email).toBe("test@example.com");
      expect(responseUser.id).toBe("user-id-123");
    });
  });

  describe("updatePassword", () => {
    it("should return 400 if currentPassword or newPassword is missing", async () => {
      req.body = { currentPassword: "CurrentPassword123" };

      await authController.updatePassword(req, res, next);

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
      req.user = null;
      req.body = {
        currentPassword: "CurrentPassword123",
        newPassword: "NewPassword123",
      };

      await authController.updatePassword(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: expect.stringContaining("User not found"),
        })
      );
    });

    it("should return 400 if current password is incorrect", async () => {
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

      (authService.isCorrectPassword as jest.Mock).mockResolvedValueOnce(false);

      await authController.updatePassword(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining("Current password is incorrect"),
        })
      );
    });

    it("should return 400 if new password is not strong enough", async () => {
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

      (authService.isCorrectPassword as jest.Mock).mockResolvedValueOnce(true);
      (authService.isPasswordStrong as jest.Mock).mockReturnValue(false);

      await authController.updatePassword(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining("The new password must contain"),
        })
      );
    });

    it("should update password and return 200 on success", async () => {
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

      (authService.isCorrectPassword as jest.Mock).mockResolvedValueOnce(true);
      (authService.isPasswordStrong as jest.Mock).mockReturnValue(true);
      (authService.hashPassword as jest.Mock).mockResolvedValueOnce(
        "newHashedPassword"
      );

      await authController.updatePassword(req, res, next);

      expect(userService.updateOne).toHaveBeenCalledWith(
        { id: "user-id-123" },
        {
          password: "newHashedPassword",
          passwordChangedAt: expect.stringContaining(
            String(new Date().getFullYear())
          ),
        }
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Password updated successfully!",
      });
    });

    it("should call next middleware when afterUpdatePassword hook is registered", async () => {
      mockGetHooks.mockImplementation((module: string, operation: string) => {
        if (module === "auth" && operation === "updatePassword")
          return { after: jest.fn() };
        return null;
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

      (authService.isCorrectPassword as jest.Mock).mockResolvedValueOnce(true);
      (authService.isPasswordStrong as jest.Mock).mockReturnValue(true);
      (authService.hashPassword as jest.Mock).mockResolvedValueOnce(
        "newHashedPassword123"
      );

      await authController.updatePassword(req, res, next);

      expect(req.responseData).toEqual({
        status: "success",
        message: "Password updated successfully!",
      });
      expect(req.responseStatus).toBe(200);
      expect(req.additionalData).toEqual({ user: req.user });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("deleteMe", () => {
    it("should mark user account as deleted and return 200", async () => {
      const updatedUser = {
        id: "user-id-123",
        username: "testuser",
        email: "test@example.com",
        deletedSelfAccountAt: new Date().toISOString(),
      };

      userService.updateOne.mockResolvedValueOnce({ ...updatedUser });

      await authController.deleteMe(req, res, next);

      expect(userService.updateOne).toHaveBeenCalledWith(
        { id: "user-id-123" },
        { deletedSelfAccountAt: expect.any(String) },
        {}
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Account deleted successfully",
      });
    });

    it("should call next middleware when afterDeleteMe hook is registered", async () => {
      mockGetHooks.mockImplementation((module: string, operation: string) => {
        if (module === "auth" && operation === "deleteMe")
          return { after: jest.fn() };
        return null;
      });

      const updatedUser = {
        id: "user-id-123",
        username: "testuser",
        email: "test@example.com",
        deletedSelfAccountAt: new Date().toISOString(),
      };

      userService.updateOne.mockResolvedValueOnce({ ...updatedUser });

      await authController.deleteMe(req, res, next);

      expect(req.responseData).toEqual({ data: updatedUser });
      expect(req.responseStatus).toBe(200);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should remove excluded fields from user object", async () => {
      const updatedUserWithSensitiveData = {
        id: "user-id-123",
        username: "testuser",
        email: "test@example.com",
        password: "hashedPassword",
        deletedSelfAccountAt: new Date().toISOString(),
      };

      userService.updateOne.mockResolvedValueOnce({
        ...updatedUserWithSensitiveData,
      });

      await authController.deleteMe(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        message: "Account deleted successfully",
      });
    });
  });
});
