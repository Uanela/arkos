import {
  authControllerFactory,
  defaultExcludedUserFields,
} from "../auth.controller";
import authService, { AuthService } from "../auth.service";
import authActionService from "../utils/services/auth-action.service";
import { getArkosConfig } from "../../../server";

jest.mock("fs");
jest.mock("bcryptjs", () => ({
  default: {
    compare: jest.fn(),
    hash: jest.fn(),
  },
}));

jest.mock("../auth.service", () => {
  const actual = jest.requireActual("../auth.service");
  return {
    __esModule: true,
    AuthService: actual.AuthService,
    default: {
      getMe: jest.fn(),
      updateMe: jest.fn(),
      signup: jest.fn(),
      deleteMe: jest.fn(),
      login: jest.fn(),
      updatePassword: jest.fn(),
      logout: jest.fn(),
      getJwtCookieOptions: jest.fn(),
    },
  };
});

jest.mock("../utils/services/auth-action.service", () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
    getByResource: jest.fn(),
  },
}));

jest.mock("../../base/base.service", () => ({
  getBaseServices: jest.fn(),
  BaseService: jest.fn(),
}));

jest.mock("../../../utils/helpers/prisma.helpers", () => ({
  getPrismaInstance: jest.fn(),
}));

jest.mock("../../../utils/dynamic-loader", () => ({
  getModuleComponents: jest.fn(),
  getPrismaModelRelations: jest.fn(),
  getModels: jest.fn(() => []),
  getModelUniqueFields: jest.fn(() => []),
  models: [],
  prismaModelRelationFields: {},
}));

jest.mock("../../../server", () => ({
  getArkosConfig: jest.fn(),
  close: jest.fn(),
}));

const mockedAuthService = authService as unknown as Record<string, jest.Mock>;
const mockedActionService = authActionService as unknown as Record<
  string,
  jest.Mock
>;

describe("Auth Controller Factory", () => {
  let req: any;
  let res: any;
  let next: any;
  let authController: any;

  const publicUser = {
    id: "user-id-123",
    username: "testuser",
    email: "test@example.com",
  };

  beforeEach(() => {
    jest.resetAllMocks();

    mockedAuthService.getJwtCookieOptions.mockReturnValue({});

    req = {
      user: { ...publicUser, password: "hashedPassword" },
      accessToken: "jwt-token",
      body: {},
      query: {},
      params: {},
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

    authController = authControllerFactory();
  });

  describe("defaultExcludedUserFields", () => {
    it("should exclude the password field", () => {
      expect(defaultExcludedUserFields).toEqual({ password: false });
    });
  });

  describe("custom service", () => {
    it("should throw when service is not an AuthService instance", () => {
      expect(() => authControllerFactory({}, {} as any)).toThrow(
        "The `service` exported on the auth route hook must be an instance of a class that extends AuthService.",
      );
    });

    it("should call the custom service instead of the default one", async () => {
      const custom = Object.assign(new AuthService(), {
        getMe: jest.fn().mockResolvedValue(publicUser),
      });
      const controller = authControllerFactory({}, custom);
      req.prismaQueryOptions = { include: { profile: true } };

      await controller.getMe(req, res, next);

      expect(custom.getMe).toHaveBeenCalledWith("user-id-123", {
        include: { profile: true },
      });
      expect(mockedAuthService.getMe).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ data: publicUser });
    });

    it("should use the custom login result", async () => {
      const custom = Object.assign(new AuthService(), {
        login: jest
          .fn()
          .mockResolvedValue({ user: publicUser, accessToken: "custom-token" }),
      });
      const controller = authControllerFactory({}, custom);
      req.body = { username: "testuser", password: "Password123" };

      await controller.login(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ accessToken: "custom-token" });
      expect(mockedAuthService.login).not.toHaveBeenCalled();
    });

    it("should call the custom logout service and clear the cookie", async () => {
      const custom = Object.assign(new AuthService(), {
        logout: jest.fn().mockResolvedValue(undefined),
      });
      const controller = authControllerFactory({}, custom);

      await controller.logout(req, res, next);

      expect(custom.logout).toHaveBeenCalledWith("user-id-123", "jwt-token");
      expect(res.cookie).toHaveBeenCalledWith(
        "arkos_access_token",
        "no-token",
        expect.objectContaining({ httpOnly: true }),
      );
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it.each([
      ["getMe"],
      ["updateMe"],
      ["signup"],
      ["deleteMe"],
      ["login"],
      ["updatePassword"],
    ] as const)(
      "should forward an error when custom %s returns no required data",
      async (method) => {
        const custom = Object.assign(new AuthService(), {
          [method]: jest.fn().mockResolvedValue(null),
        });
        const controller = authControllerFactory({}, custom);
        req.body = { username: "testuser", password: "Password123" };

        await (controller as any)[method](req, res, next);

        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            message: `Custom auth service method ${method} didn't return the required data`,
          }),
        );
        expect(res.json).not.toHaveBeenCalled();
      },
    );

    it("should reject a custom login result without an access token", async () => {
      const custom = Object.assign(new AuthService(), {
        login: jest.fn().mockResolvedValue({ user: publicUser }),
      });
      const controller = authControllerFactory({}, custom);
      req.body = { username: "testuser", password: "Password123" };

      await controller.login(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("login"),
        }),
      );
    });

    it("should reject a custom updatePassword result without an access token", async () => {
      const custom = Object.assign(new AuthService(), {
        updatePassword: jest.fn().mockResolvedValue({}),
      });
      const controller = authControllerFactory({}, custom);

      await controller.updatePassword(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("updatePassword"),
        }),
      );
    });
  });

  describe("getMe", () => {
    it("should call the service with the user id and query options and return the user", async () => {
      mockedAuthService.getMe.mockResolvedValueOnce(publicUser);
      req.prismaQueryOptions = { select: { id: true } };

      await authController.getMe(req, res, next);

      expect(mockedAuthService.getMe).toHaveBeenCalledWith("user-id-123", {
        select: { id: true },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: publicUser });
    });

    it("should set the interceptor state and call next when afterGetMe is provided", async () => {
      mockedAuthService.getMe.mockResolvedValueOnce(publicUser);
      const controller = authControllerFactory({ afterGetMe: true });

      await controller.getMe(req, res, next);

      expect(req.responseData).toEqual({ data: publicUser });
      expect(res.locals.data).toEqual({ data: publicUser });
      expect(res.originalData).toEqual({ data: publicUser });
      expect(req.responseStatus).toBe(200);
      expect(res.locals.status).toBe(200);
      expect(res.originalStatus).toBe(200);
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should forward service errors to next", async () => {
      const error = new Error("boom");
      mockedAuthService.getMe.mockRejectedValueOnce(error);

      await authController.getMe(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("logout", () => {
    it("should clear the access token cookie and return 204", async () => {
      await authController.logout(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith(
        "arkos_access_token",
        "no-token",
        expect.objectContaining({ httpOnly: true }),
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.json).toHaveBeenCalled();
    });

    it("should call the service with the user id and access token", async () => {
      await authController.logout(req, res, next);

      expect(mockedAuthService.logout).toHaveBeenCalledWith(
        "user-id-123",
        "jwt-token",
      );
    });

    it("should forward an error when the user or access token is missing", async () => {
      req.user = undefined;
      req.accessToken = undefined;

      await authController.logout(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Logout requires an authenticated user and an access token",
        }),
      );
      expect(mockedAuthService.logout).not.toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
    });

    it("should call next middleware when afterLogout is provided", async () => {
      const controller = authControllerFactory({ afterLogout: true });

      await controller.logout(req, res, next);

      expect(req.responseData).toBeNull();
      expect(req.responseStatus).toBe(204);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    beforeEach(() => {
      req.body = { username: "testuser", password: "Password123" };
      mockedAuthService.login.mockResolvedValue({
        user: publicUser,
        accessToken: "jwt-token-123",
      });
    });

    it("should call the service with the body and the default username field", async () => {
      req.prismaQueryOptions = { include: { profile: true } };

      await authController.login(req, res, next);

      expect(mockedAuthService.login).toHaveBeenCalledWith(
        {
          username: "testuser",
          password: "Password123",
          usernameField: "username",
        },
        { include: { profile: true } },
      );
    });

    it("should use the username field from the query parameter when allowed", async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: { login: { allowedUsernames: ["email"] } },
      });
      req = {
        body: { email: "test@arkosjs.com", password: "Password123" },
        query: { usernameField: "email" },
        headers: {},
        secure: false,
      };

      await authController.login(req, res, next);

      expect(mockedAuthService.login).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "test@arkosjs.com",
          usernameField: "email",
        }),
        undefined,
      );
    });

    it("should send token in cookie and response by default", async () => {
      await authController.login(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith(
        "arkos_access_token",
        "jwt-token-123",
        {},
      );
      expect(mockedAuthService.getJwtCookieOptions).toHaveBeenCalledWith(req);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ accessToken: "jwt-token-123" });
      expect(req.accessToken).toBe("jwt-token-123");
    });

    it('should set cookie and return token in response when config is "both"', async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: { login: { sendAccessTokenThrough: "both" } },
      });

      await authController.login(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith(
        "arkos_access_token",
        "jwt-token-123",
        expect.any(Object),
      );
      expect(res.json).toHaveBeenCalledWith({ accessToken: "jwt-token-123" });
    });

    it('should only set cookie when config is "cookie-only"', async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: { login: { sendAccessTokenThrough: "cookie-only" } },
      });

      await authController.login(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith(
        "arkos_access_token",
        "jwt-token-123",
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should only return token in response when config is "response-only"', async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: { login: { sendAccessTokenThrough: "response-only" } },
      });

      await authController.login(req, res, next);

      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ accessToken: "jwt-token-123" });
    });

    it("should call next with response data and user when afterLogin is provided", async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: { login: { sendAccessTokenThrough: "both" } },
      });
      const controller = authControllerFactory({ afterLogin: true });

      await controller.login(req, res, next);

      expect(req.responseData).toEqual({ accessToken: "jwt-token-123" });
      expect(res.locals.data).toEqual({ accessToken: "jwt-token-123" });
      expect(res.originalData).toEqual({ accessToken: "jwt-token-123" });
      expect(req.additionalData).toEqual({ user: publicUser });
      expect(res.locals.additional).toEqual({ user: publicUser });
      expect(req.responseStatus).toBe(200);
      expect(res.locals.status).toBe(200);
      expect(res.originalStatus).toBe(200);
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should not expose the token in response data when afterLogin is provided with cookie-only", async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: { login: { sendAccessTokenThrough: "cookie-only" } },
      });
      const controller = authControllerFactory({ afterLogin: true });

      await controller.login(req, res, next);

      expect(req.responseData).toBeUndefined();
      expect(res.cookie).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it("should forward service errors to next", async () => {
      const error = new Error("Incorrect username or password");
      mockedAuthService.login.mockRejectedValueOnce(error);

      await authController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe("signup", () => {
    beforeEach(() => {
      req.body = {
        username: "newuser",
        email: "newuser@example.com",
        password: "Password123",
      };
    });

    it("should call the service and return 201", async () => {
      const created = { id: "new-user-id", username: "newuser" };
      mockedAuthService.signup.mockResolvedValueOnce(created);
      req.prismaQueryOptions = { include: { profile: true } };

      await authController.signup(req, res, next);

      expect(mockedAuthService.signup).toHaveBeenCalledWith(req.body, {
        include: { profile: true },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ data: created });
    });

    it("should call next middleware when afterSignup is provided", async () => {
      const created = { id: "new-user-id", username: "newuser" };
      mockedAuthService.signup.mockResolvedValueOnce(created);
      const controller = authControllerFactory({ afterSignup: true });

      await controller.signup(req, res, next);

      expect(req.responseData).toEqual({ data: created });
      expect(req.responseStatus).toBe(201);
      expect(res.locals.status).toBe(201);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should forward service errors to next", async () => {
      const error = new Error("boom");
      mockedAuthService.signup.mockRejectedValueOnce(error);

      await authController.signup(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("updateMe", () => {
    beforeEach(() => {
      req.body = { username: "updateduser", email: "updated@example.com" };
    });

    it("should call the service with id, body and query options and return 200", async () => {
      const updated = { id: "user-id-123", ...req.body };
      mockedAuthService.updateMe.mockResolvedValueOnce(updated);
      req.prismaQueryOptions = { include: { profile: true } };

      await authController.updateMe(req, res, next);

      expect(mockedAuthService.updateMe).toHaveBeenCalledWith(
        "user-id-123",
        req.body,
        { include: { profile: true } },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: updated });
    });

    it("should call next middleware when afterUpdateMe is provided", async () => {
      const updated = { id: "user-id-123", ...req.body };
      mockedAuthService.updateMe.mockResolvedValueOnce(updated);
      const controller = authControllerFactory({ afterUpdateMe: true });

      await controller.updateMe(req, res, next);

      expect(req.responseData).toEqual({ data: updated });
      expect(req.responseStatus).toBe(200);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should forward service errors to next", async () => {
      const error = new Error(
        "In order to update password use the update-password endpoint.",
      );
      mockedAuthService.updateMe.mockRejectedValueOnce(error);

      await authController.updateMe(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("updatePassword", () => {
    beforeEach(() => {
      req.body = {
        currentPassword: "CurrentPassword123",
        newPassword: "NewPassword123",
      };
      mockedAuthService.updatePassword.mockResolvedValue({
        accessToken: "new-jwt-token",
      });
    });

    it("should call the service with the user id and body", async () => {
      await authController.updatePassword(req, res, next);

      expect(mockedAuthService.updatePassword).toHaveBeenCalledWith(
        "user-id-123",
        req.body,
      );
    });

    it("should set cookie and return token by default", async () => {
      await authController.updatePassword(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith(
        "arkos_access_token",
        "new-jwt-token",
        {},
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Password updated successfully!",
        accessToken: "new-jwt-token",
      });
      expect(req.accessToken).toBe("new-jwt-token");
    });

    it('should only set cookie when config is "cookie-only"', async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: { login: { sendAccessTokenThrough: "cookie-only" } },
      });

      await authController.updatePassword(req, res, next);

      expect(res.cookie).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Password updated successfully!",
      });
    });

    it('should only return token in response when config is "response-only"', async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: { login: { sendAccessTokenThrough: "response-only" } },
      });

      await authController.updatePassword(req, res, next);

      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Password updated successfully!",
        accessToken: "new-jwt-token",
      });
    });

    it("should call next middleware when afterUpdatePassword is provided", async () => {
      const controller = authControllerFactory({ afterUpdatePassword: true });

      await controller.updatePassword(req, res, next);

      expect(req.responseData).toEqual({
        status: "success",
        message: "Password updated successfully!",
        accessToken: "new-jwt-token",
      });
      expect(req.responseStatus).toBe(200);
      expect(req.additionalData).toEqual({ user: req.user });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should forward service errors to next", async () => {
      const error = new Error("Current password is incorrect");
      mockedAuthService.updatePassword.mockRejectedValueOnce(error);

      await authController.updatePassword(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe("deleteMe", () => {
    it("should call the service and return the success message", async () => {
      mockedAuthService.deleteMe.mockResolvedValueOnce({
        ...publicUser,
        deletedSelfAccountAt: new Date().toISOString(),
      });
      req.prismaQueryOptions = { select: { id: true } };

      await authController.deleteMe(req, res, next);

      expect(mockedAuthService.deleteMe).toHaveBeenCalledWith("user-id-123", {
        select: { id: true },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Account deleted successfully",
      });
    });

    it("should call next middleware when afterDeleteMe is provided", async () => {
      const deleted = {
        ...publicUser,
        deletedSelfAccountAt: new Date().toISOString(),
      };
      mockedAuthService.deleteMe.mockResolvedValueOnce(deleted);
      const controller = authControllerFactory({ afterDeleteMe: true });

      await controller.deleteMe(req, res, next);

      expect(req.responseData).toEqual({ data: deleted });
      expect(req.responseStatus).toBe(200);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should forward service errors to next", async () => {
      const error = new Error("boom");
      mockedAuthService.deleteMe.mockRejectedValueOnce(error);

      await authController.deleteMe(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("findManyAuthAction", () => {
    it("should return all auth actions", async () => {
      mockedActionService.getAll.mockReturnValueOnce([
        { action: "View", resource: "user", roles: ["admin"] },
        { action: "Create", resource: "user", roles: ["admin"] },
      ]);
      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: { mode: "static" },
      });

      await authController.findManyAuthAction(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        total: 2,
        results: 2,
        data: [
          { action: "View", resource: "user", roles: ["admin"] },
          { action: "Create", resource: "user", roles: ["admin"] },
        ],
      });
    });

    it("should strip roles in dynamic mode", async () => {
      mockedActionService.getAll.mockReturnValueOnce([
        { action: "View", resource: "user", roles: ["admin"] },
      ]);
      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: { mode: "dynamic" },
      });

      await authController.findManyAuthAction(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        total: 1,
        results: 1,
        data: [{ action: "View", resource: "user" }],
      });
    });
  });

  describe("findOneAuthAction", () => {
    it("should return 400 when resourceName is missing", async () => {
      req.params = {};

      await authController.findOneAuthAction(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: "Please provide a resoureName",
        }),
      );
    });

    it("should return 404 when no auth actions exist for the resource", async () => {
      req.params = { resourceName: "unknown" };
      mockedActionService.getByResource.mockReturnValueOnce(undefined);

      await authController.findOneAuthAction(req, res, next);

      expect(mockedActionService.getByResource).toHaveBeenCalledWith("unknown");
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: "No auth action with resource name unknown",
        }),
      );
    });

    it("should return the auth actions of the resource", async () => {
      req.params = { resourceName: "user" };
      mockedActionService.getByResource.mockReturnValueOnce([
        { action: "View", resource: "user", roles: ["admin"] },
      ]);
      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: { mode: "static" },
      });

      await authController.findOneAuthAction(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        total: 1,
        results: 1,
        data: [{ action: "View", resource: "user", roles: ["admin"] }],
      });
    });

    it("should strip roles in dynamic mode", async () => {
      req.params = { resourceName: "user" };
      mockedActionService.getByResource.mockReturnValueOnce([
        { action: "View", resource: "user", roles: ["admin"] },
      ]);
      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: { mode: "dynamic" },
      });

      await authController.findOneAuthAction(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        total: 1,
        results: 1,
        data: [{ action: "View", resource: "user" }],
      });
    });
  });
});

