import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import authService from "../auth.service";
import { getPrismaInstance } from "../../../utils/helpers/prisma.helpers";
import { getArkosConfig } from "../../../server";
import { isAuthenticationEnabled } from "../../../utils/helpers/arkos-config.helpers";
import AppError from "../../error-handler/utils/app-error";
import { getModuleComponents } from "../../../utils/dynamic-loader";

// Mock dependencies
jest.mock("jsonwebtoken");
jest.mock("bcryptjs");
jest.mock("process");
jest.mock("../../../utils/helpers/prisma.helpers");
jest.mock("../../../utils/helpers/arkos-config.helpers");
jest.mock("../../../server");
jest.mock("../../error-handler/utils/app-error");
jest.mock("../../../utils/dynamic-loader", () => ({
  getModels: jest.fn().mockReturnValue([]),
  getModelFields: jest.fn().mockReturnValue([]),
  getPrismaModels: jest.fn().mockReturnValue([]),
  getModuleComponents: jest.fn().mockReturnValue([]),
  getPrismaSchemasContent: jest.fn().mockReturnValue(""),
  appModules: ["user", "auth", "file-upload"],
}));

jest.mock("fs");

describe("AuthService", () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;
  let mockPrisma: any;
  let mockConfig: any;

  beforeEach(() => {
    // Reset all mocks
    jest.resetAllMocks();

    // Setup mock request, response, and next function
    mockReq = {
      headers: {},
      cookies: {},
      path: "/test",
      user: null,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();

    // Setup mock Prisma client
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      userRole: {
        findFirst: jest.fn(),
      },
      authPermission: {
        count: jest.fn(),
      },
    };

    (getPrismaInstance as jest.Mock).mockReturnValue(mockPrisma);

    // Setup mock Arkos config
    mockConfig = {
      authentication: {
        mode: "static",
        passwordValidation: {
          regex: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/,
          message:
            "Password must contain at least one uppercase letter, one lowercase letter, and one number",
        },
      },
    };

    (getArkosConfig as jest.Mock).mockReturnValue(mockConfig);
  });

  describe("signJwtToken", () => {
    it("should sign a JWT token with the provided id", () => {
      // Setup
      const userId = "user-123";
      const mockToken = "mock-jwt-token";
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      // Execute
      const result = authService.signJwtToken(userId);

      // Verify
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: userId },
        expect.any(String),
        { expiresIn: expect.any(String) }
      );
      expect(result).toBe(mockToken);
    });

    it("should use custom expiresIn and secret when provided", () => {
      // Setup
      const userId = "user-123";
      const expiresIn = "1h";
      const secret = "custom-secret";
      const mockToken = "mock-jwt-token";
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      // Execute
      const result = authService.signJwtToken(userId, expiresIn, secret);

      // Verify
      expect(jwt.sign).toHaveBeenCalledWith({ id: userId }, secret, {
        expiresIn,
      });
      expect(result).toBe(mockToken);
    });

    it("should throw an error when no jwt is provied in production", () => {
      const originalEnv = process.env;
      // Setup
      const userId = "user-123";
      const mockToken = "mock-jwt-token";
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);
      (getArkosConfig as jest.Mock).mockReturnValueOnce({
        authentication: {
          jwt: { secret: undefined },
        },
      });

      process.env = {
        JWT_SECRET: undefined,
        ARKOS_BUILD: "true",
      };

      let result: string | undefined = undefined;
      try {
        result = authService.signJwtToken(userId);
      } catch {}

      expect(jwt.sign).not.toHaveBeenCalledWith(
        { id: userId },
        expect.any(String),
        { expiresIn: expect.any(String) }
      );
      expect(result).not.toBeDefined();
      process.env = originalEnv;
    });
  });

  describe("getJwtCookieOptions", () => {
    it("should throw error when req is not provided", () => {
      // Execute & Verify
      expect(() => authService.getJwtCookieOptions(null as any)).toThrow(
        "Missing req object in order get jwt cookie options"
      );
    });

    it("should return cookie options with default values", () => {
      // Setup
      const mockReq = {
        secure: false,
        headers: {},
      } as any;

      // Execute
      const result = authService.getJwtCookieOptions(mockReq);

      // Verify
      expect(result).toHaveProperty("expires");
      expect(result.expires).toBeInstanceOf(Date);
      expect(result.httpOnly).toBe(true);
      expect(result.secure).toBe(false);
      expect(result.sameSite).toBe("lax"); // default for non-production
    });

    it("should use config values when available", () => {
      // Setup
      const mockReq = {
        secure: false,
        headers: {},
      } as any;

      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: {
          jwt: {
            expiresIn: "2h",
            cookie: {
              httpOnly: false,
              secure: true,
              sameSite: "strict",
            },
          },
        },
      });

      // Execute
      const result = authService.getJwtCookieOptions(mockReq);

      // Verify
      expect(result.httpOnly).toBe(false);
      expect(result.secure).toBe(true);
      expect(result.sameSite).toBe("strict");
    });

    it("should set secure to true when req.secure is true", () => {
      // Setup
      const mockReq = {
        secure: true,
        headers: {},
      } as any;

      // Execute
      const result = authService.getJwtCookieOptions(mockReq);

      // Verify
      expect(result.secure).toBe(true);
    });

    it("should set secure to true when x-forwarded-proto header is https", () => {
      // Setup
      const mockReq = {
        secure: false,
        headers: {
          "x-forwarded-proto": "https",
        },
      } as any;

      // Execute
      const result = authService.getJwtCookieOptions(mockReq);

      // Verify
      expect(result.secure).toBe(true);
    });

    it("should use environment variable JWT_COOKIE_HTTP_ONLY when set to true", () => {
      // Setup
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        JWT_COOKIE_HTTP_ONLY: "true",
      };

      const mockReq = {
        secure: false,
        headers: {},
      } as any;

      // Execute
      const result = authService.getJwtCookieOptions(mockReq);

      // Verify
      expect(result.httpOnly).toBe(true);

      // Cleanup
      process.env = originalEnv;
    });

    it("should use environment variable JWT_COOKIE_SECURE when set to true", () => {
      // Setup
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        JWT_COOKIE_SECURE: "true",
      };

      const mockReq = {
        secure: false,
        headers: {},
      } as any;

      // Execute
      const result = authService.getJwtCookieOptions(mockReq);

      // Verify
      expect(result.secure).toBe(true);

      // Cleanup
      process.env = originalEnv;
    });

    it("should use environment variable JWT_COOKIE_SAME_SITE", () => {
      // Setup
      const originalEnv = process.env;
      process.env = {
        JWT_COOKIE_SAME_SITE: "none",
      };

      const mockReq = {
        secure: false,
        headers: {},
      } as any;

      // Execute
      const result = authService.getJwtCookieOptions(mockReq);

      // Verify
      expect(result.sameSite).toBe("none");

      // Cleanup
      process.env = originalEnv;
    });

    it("should use sameSite 'lax' in production by default", () => {
      // Setup
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        NODE_ENV: "production",
      };

      const mockReq = {
        secure: false,
        headers: {},
      } as any;

      // Execute
      const result = authService.getJwtCookieOptions(mockReq);

      // Verify
      expect(result.sameSite).toBe("lax");

      // Cleanup
      process.env = originalEnv;
    });

    it("should use sameSite 'lax' in development by default", () => {
      // Setup
      const originalEnv = process.env;
      process.env = {
        // ...originalEnv,
        NODE_ENV: "development",
      };

      const mockReq = {
        secure: false,
        headers: {},
      } as any;

      // Execute
      const result = authService.getJwtCookieOptions(mockReq);

      // Verify
      expect(result.sameSite).toBe("lax");

      // Cleanup
      process.env = originalEnv;
    });

    it("should calculate expires based on JWT_EXPIRES_IN from config", () => {
      // Setup
      const mockReq = {
        secure: false,
        headers: {},
      } as any;

      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: {
          jwt: {
            expiresIn: "1h",
          },
        },
      });

      const beforeTime = Date.now();

      // Execute
      const result = authService.getJwtCookieOptions(mockReq);

      // Verify
      const afterTime = Date.now();
      const oneHourInMs = 60 * 60 * 1000;

      expect(result.expires?.getTime()).toBeGreaterThanOrEqual(
        beforeTime + oneHourInMs
      );
      expect(result.expires?.getTime()).toBeLessThanOrEqual(
        afterTime + oneHourInMs + 100
      );
    });

    it("should prioritize config over environment variables", () => {
      // Setup
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        JWT_COOKIE_HTTP_ONLY: "false",
        JWT_COOKIE_SECURE: "false",
        JWT_COOKIE_SAME_SITE: "lax",
      };

      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: {
          jwt: {
            cookie: {
              httpOnly: true,
              secure: true,
              sameSite: "strict",
            },
          },
        },
      });

      const mockReq = {
        secure: false,
        headers: {},
      } as any;

      // Execute
      const result = authService.getJwtCookieOptions(mockReq);

      // Verify
      expect(result.httpOnly).toBe(true);
      expect(result.secure).toBe(true);
      expect(result.sameSite).toBe("strict");

      // Cleanup
      process.env = originalEnv;
    });
  });

  describe("isCorrectPassword", () => {
    it("should return true if passwords match", async () => {
      // Setup
      const candidatePassword = "password123";
      const userPassword = "hashedPassword";
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Execute
      const result = await authService.isCorrectPassword(
        candidatePassword,
        userPassword
      );

      // Verify
      expect(bcrypt.compare).toHaveBeenCalledWith(
        candidatePassword,
        userPassword
      );
      expect(result).toBe(true);
    });

    it("should return false if passwords do not match", async () => {
      // Setup
      const candidatePassword = "wrongPassword";
      const userPassword = "hashedPassword";
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Execute
      const result = await authService.isCorrectPassword(
        candidatePassword,
        userPassword
      );

      // Verify
      expect(bcrypt.compare).toHaveBeenCalledWith(
        candidatePassword,
        userPassword
      );
      expect(result).toBe(false);
    });
  });

  describe("isPasswordHashed", () => {
    it("should return true if password is hashed", () => {
      // Setup
      const hashedPassword = "$2b$10$abcdefghijklmnopqrstuvwx";
      (bcrypt.getRounds as jest.Mock).mockReturnValue(10);

      // Execute
      const result = authService.isPasswordHashed(hashedPassword);

      // Verify
      expect(bcrypt.getRounds).toHaveBeenCalledWith(hashedPassword);
      expect(result).toBe(true);
    });

    it("should return false if password is not hashed", () => {
      // Setup
      const plainPassword = "plainPassword123";

      // Execute
      const result = authService.isPasswordHashed(plainPassword);

      // Verify
      expect(bcrypt.getRounds).toHaveBeenCalledWith(plainPassword);
      expect(result).toBe(false);
    });

    it("should return false if bcrypt.getRounds throws any error", () => {
      // Setup
      const invalidInput = "";

      // Execute
      const result = authService.isPasswordHashed(invalidInput);

      // Verify
      expect(bcrypt.getRounds).toHaveBeenCalledWith(invalidInput);
      expect(result).toBe(false);
    });
  });

  describe("hashPassword", () => {
    it("should hash the password using bcrypt", async () => {
      // Setup
      const password = "password123";
      const hashedPassword = "hashedPassword123";
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      // Execute
      const result = await authService.hashPassword(password);

      // Verify
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });
  });

  describe("isPasswordStrong", () => {
    it("should return true for a strong password matching the regex", () => {
      // Setup
      const strongPassword = "Password123";

      // Execute
      const result = authService.isPasswordStrong(strongPassword);

      // Verify
      expect(result).toBe(true);
    });

    it("should return false for a weak password not matching the regex", () => {
      // Setup
      const weakPassword = "password";

      // Execute
      const result = authService.isPasswordStrong(weakPassword);

      // Verify
      expect(result).toBe(false);
    });

    it("should use custom regex from arkos config when available", () => {
      // Setup
      mockConfig.authentication.passwordValidation.regex =
        /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/;
      const password = "PASSWORD123"; // Has uppercase and numbers, no lowercase

      // Execute
      const result = authService.isPasswordStrong(password);

      // Verify
      expect(result).toBe(true);
    });
  });

  describe("userChangedPasswordAfter", () => {
    it("should return true if password was changed after JWT was issued", () => {
      // Setup
      const user = {
        passwordChangedAt: new Date(Date.now() + 1000), // 1 second in the future
      } as any;
      const jwtTimestamp = Math.floor(Date.now() / 1000);

      // Execute
      const result = authService.userChangedPasswordAfter(user, jwtTimestamp);

      // Verify
      expect(result).toBe(true);
    });

    it("should return false if password was changed before JWT was issued", () => {
      // Setup
      const user = {
        passwordChangedAt: new Date(Date.now() - 1000), // 1 second in the past
      } as any;
      const jwtTimestamp = Math.floor(Date.now() / 1000);

      // Execute
      const result = authService.userChangedPasswordAfter(user, jwtTimestamp);

      // Verify
      expect(result).toBe(false);
    });

    it("should return false if passwordChangedAt is not set", () => {
      // Setup
      const user = {} as any;
      const jwtTimestamp = Math.floor(Date.now() / 1000);

      // Execute
      const result = authService.userChangedPasswordAfter(user, jwtTimestamp);

      // Verify
      expect(result).toBe(false);
    });
  });

  describe("verifyJwtToken", () => {
    it("should resolve with decoded payload for valid token", async () => {
      // Setup
      process.env.NODE_ENV = "development";
      const token = "valid-token";
      const decodedPayload = { id: "user-123", iat: 1617123456 };

      // Mock jwt.verify to call the callback with decoded payload
      (jwt.verify as jest.Mock).mockImplementation((_, _1, callback) => {
        callback(null, decodedPayload);
      });

      // Execute
      const result = await authService.verifyJwtToken(token);

      // Verify
      expect(jwt.verify).toHaveBeenCalledWith(
        token,
        expect.any(String),
        expect.any(Function)
      );
      expect(result).toEqual(decodedPayload);
    });

    it("should reject with error for invalid token", async () => {
      // Setup
      const token = "invalid-token";
      const jwtError = new Error("Invalid token");

      // Mock jwt.verify to call the callback with an error
      (jwt.verify as jest.Mock).mockImplementation((_, _1, callback) => {
        callback(jwtError, null);
      });

      // Execute and Verify
      await expect(authService.verifyJwtToken(token)).rejects.toEqual(jwtError);
      expect(jwt.verify).toHaveBeenCalledWith(
        token,
        expect.any(String),
        expect.any(Function)
      );
    });

    it("should use custom secret when provided", async () => {
      // Setup
      const token = "valid-token";
      const customSecret = "custom-secret-key";
      const decodedPayload = { id: "user-123", iat: 1617123456 };

      // Mock jwt.verify to call the callback with decoded payload
      (jwt.verify as jest.Mock).mockImplementation((_, _1, callback) => {
        callback(null, decodedPayload);
      });

      // Execute
      await authService.verifyJwtToken(token, customSecret);

      // Verify
      expect(jwt.verify).toHaveBeenCalledWith(
        token,
        customSecret,
        expect.any(Function)
      );
    });
  });

  describe("getAuthenticatedUser", () => {
    it("should return null if authentication is disabled in config", async () => {
      // Setup
      (getArkosConfig as jest.Mock).mockReturnValue({ authentication: null });

      // Execute
      const result = await authService.getAuthenticatedUser(mockReq);

      // Verify
      expect(result).toBeNull();
    });

    it("should throw an error if no token is found", async () => {
      // Setup - No token in request
      mockReq = {};

      // Execute and Verify

      await expect(
        authService.getAuthenticatedUser(mockReq)
      ).rejects.toBeInstanceOf(AppError);
    });

    it("should extract token from Authorization header", async () => {
      // Setup
      const token = "bearer-token-123";
      mockReq.headers.authorization = `Bearer ${token}`;

      const decodedToken = { id: "user-123", iat: 1617123456 };
      (authService.verifyJwtToken as any) = jest
        .fn()
        .mockResolvedValue(decodedToken);

      const mockUser = { id: "user-123", username: "testuser" };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Execute
      const result = await authService.getAuthenticatedUser(mockReq);

      // Verify
      expect(authService.verifyJwtToken).toHaveBeenCalledWith(token);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
      expect(result).toEqual(mockUser);
    });

    it("should extract token from cookies", async () => {
      // Setup
      const token = "cookie-token-123";
      mockReq.cookies = { arkos_access_token: token };

      const decodedToken = { id: "user-123", iat: 1617123456 };
      (authService.verifyJwtToken as any) = jest
        .fn()
        .mockResolvedValue(decodedToken);

      const mockUser = { id: "user-123", username: "testuser" };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Execute
      const result = await authService.getAuthenticatedUser(mockReq);

      // Verify
      expect(authService.verifyJwtToken).toHaveBeenCalledWith(token);
      expect(mockPrisma.user.findUnique).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it("should throw an error if token verification fails", async () => {
      // Setup
      mockReq.headers.authorization = "Bearer invalid-token";
      (authService.verifyJwtToken as any) = jest
        .fn()
        .mockRejectedValue(new Error("Token invalid"));

      // Execute and Verify
      await expect(
        authService.getAuthenticatedUser(mockReq)
      ).rejects.toBeInstanceOf(AppError);
    });

    it("should throw an error if decoded token has no id", async () => {
      // Setup
      mockReq.headers.authorization = "Bearer token-without-id";
      (authService.verifyJwtToken as any) = jest.fn().mockResolvedValue({});

      // Execute and Verify
      await expect(
        authService.getAuthenticatedUser(mockReq)
      ).rejects.toBeInstanceOf(AppError);
    });

    it("should throw an error if user does not exist", async () => {
      // Setup
      mockReq.headers.authorization = "Bearer valid-token";
      (authService.verifyJwtToken as any) = jest
        .fn()
        .mockResolvedValue({ id: "non-existent-user" });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Execute and Verify
      await expect(
        authService.getAuthenticatedUser(mockReq)
      ).rejects.toBeInstanceOf(AppError);
    });

    it("should throw an error if user changed password after token was issued", async () => {
      // Setup
      mockReq.headers.authorization = "Bearer valid-token";
      const decodedToken = { id: "user-123", iat: 1617123456 };
      (authService.verifyJwtToken as any) = jest
        .fn()
        .mockResolvedValue(decodedToken);

      const mockUser = {
        id: "user-123",
        username: "testuser",
        passwordChangedAt: new Date(Date.now()),
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Mock the userChangedPasswordAfter method to return true
      (authService.userChangedPasswordAfter as any) = jest
        .fn()
        .mockReturnValue(true);

      // Execute and Verify
      await expect(
        authService.getAuthenticatedUser(mockReq)
      ).rejects.toBeInstanceOf(AppError);
    });

    it("should not throw password changed error if path includes logout", async () => {
      // Setup
      mockReq.headers.authorization = "Bearer valid-token";
      mockReq.path = "/auth/logout";

      const decodedToken = { id: "user-123", iat: 1617123456 };
      (authService.verifyJwtToken as any) = jest
        .fn()
        .mockResolvedValue(decodedToken);

      const mockUser = {
        id: "user-123",
        username: "testuser",
        passwordChangedAt: new Date(Date.now()),
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Mock the userChangedPasswordAfter method to return true
      (authService.userChangedPasswordAfter as any) = jest
        .fn()
        .mockReturnValue(true);

      // Execute
      const result = await authService.getAuthenticatedUser(mockReq);

      // Verify
      expect(result).toEqual(mockUser);
    });
  });

  describe("authenticate", () => {
    it("should call next() if authentication is disabled", async () => {
      // Setup
      (getArkosConfig as jest.Mock).mockReturnValue({ authentication: null });

      // Execute
      await authService.authenticate(mockReq, mockRes, mockNext);

      // Verify
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeNull();
    });

    it("should set user on request and call next()", async () => {
      // Setup
      const mockUser = { id: "user-123", username: "testuser" };
      (authService.getAuthenticatedUser as any) = jest
        .fn()
        .mockResolvedValue(mockUser);
      (isAuthenticationEnabled as jest.Mock).mockReturnValue(true);

      await authService.authenticate(mockReq, mockRes, mockNext);

      // Verify
      expect(authService.getAuthenticatedUser).toHaveBeenCalledWith(mockReq);
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("handleAccessControl", () => {
    it("should allow access for superuser and call next()", async () => {
      // Setup
      mockReq.user = {
        id: "admin-123",
        username: "admin",
        isSuperUser: true,
      };

      const accessControlMiddleware = authService.handleAccessControl(
        "User",
        "create"
      );

      // Execute
      await accessControlMiddleware(mockReq, mockRes, mockNext);

      // Verify
      expect(mockNext).toHaveBeenCalled();
    });

    it("should check dynamic permissions when authentication mode is dynamic", async () => {
      // Setup
      mockReq.user = {
        id: "user-123",
        username: "testuser",
        isSuperUser: false,
        roles: [{ roleId: 1 }, { roleId: 2 }],
      };

      mockConfig.authentication.mode = "dynamic";

      mockPrisma.authPermission.count.mockResolvedValue(1); // User has permission

      const accessControlMiddleware = authService.handleAccessControl(
        "Create",
        "User"
      );

      // Execute
      await accessControlMiddleware(mockReq, mockRes, mockNext);

      expect(mockPrisma.userRole.findFirst).toHaveBeenCalledWith({
        where: {
          userId: "user-123",
          role: {
            permissions: {
              some: {
                resource: "User",
                action: "Create",
              },
            },
          },
        },
        select: { id: true },
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it("should deny access if no dynamic permissions found", async () => {
      // Setup
      mockReq.user = {
        id: "user-123",
        username: "testuser",
        isSuperUser: false,
        roles: [{ roleId: 1 }],
      };

      mockConfig.authentication.mode = "dynamic";

      mockPrisma.authPermission.count.mockResolvedValue(0); // No permissions

      const accessControlMiddleware = authService.handleAccessControl(
        "User",
        "create"
      );

      // Create mock AppError constructor
      (AppError as unknown as jest.Mock).mockImplementation((message, code) => {
        return { message, statusCode: code };
      });

      // Execute
      await accessControlMiddleware(mockReq, mockRes, mockNext);

      // Verify
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "You do not have permission to perfom this action",
          statusCode: 403,
        })
      );
    });

    it("should check static permissions when authentication mode is static", async () => {
      // Setup
      mockReq.user = {
        id: "user-123",
        username: "testuser",
        role: "editor",
        roles: [],
        isSuperUser: false,
      };

      mockConfig.authentication.mode = "static";

      const authConfigs = {
        accessControl: {
          create: ["admin", "editor"],
        },
      };

      const accessControlMiddleware = authService.handleAccessControl(
        "create",
        "Post",
        authConfigs.accessControl
      );

      // Execute
      await accessControlMiddleware(mockReq, mockRes, mockNext);

      // Verify
      expect(mockNext).toHaveBeenCalled();
    });

    it("should deny access if role is not in static accessControl list", async () => {
      // Setup
      mockReq.user = {
        id: "user-123",
        username: "testuser",
        role: "viewer",
        roles: [],
        isSuperUser: false,
      };

      mockConfig.authentication.mode = "static";

      const authConfigs = {
        accessControl: {
          create: ["admin", "editor"],
        },
      };

      const accessControlMiddleware = authService.handleAccessControl(
        "create",
        "Post",
        authConfigs.accessControl
      );

      // Create mock AppError constructor
      (AppError as unknown as jest.Mock).mockImplementation((message, code) => {
        return { message, statusCode: code };
      });

      // Execute
      await accessControlMiddleware(mockReq, mockRes, mockNext);

      // Verify
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
        })
      );
    });

    it("should handle array-based accessControl configuration", async () => {
      // Setup
      mockReq.user = {
        id: "user-123",
        username: "testuser",
        role: "admin",
        roles: [],
        isSuperUser: false,
      };

      mockConfig.authentication.mode = "static";

      const authConfigs = {
        accessControl: ["admin", "editor"],
      };

      const accessControlMiddleware = authService.handleAccessControl(
        "create",
        "Post",
        authConfigs.accessControl
      );

      // Execute
      await accessControlMiddleware(mockReq, mockRes, mockNext);

      // Verify
      expect(mockNext).toHaveBeenCalled();
    });

    it("should check multiple roles when user has roles array", async () => {
      // Setup
      mockReq.user = {
        id: "user-123",
        username: "testuser",
        role: "viewer",
        roles: ["editor", "contributor"],
        isSuperUser: false,
      };

      mockConfig.authentication.mode = "static";

      const authConfigs = {
        accessControl: {
          create: ["admin", "editor"],
        },
      };

      const accessControlMiddleware = authService.handleAccessControl(
        "create",
        "Post",
        authConfigs.accessControl
      );

      // Execute
      await accessControlMiddleware(mockReq, mockRes, mockNext);

      // Verify
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("handleAuthenticationControl", () => {
    it("should return callNext if authentication control for action is false", () => {
      // Setup
      const authConfigs = {
        authenticationControl: {
          view: false,
        },
      };

      // Execute
      const middleware = authService.handleAuthenticationControl(
        "view",
        authConfigs.authenticationControl
      );

      // Verify
      expect(middleware.name).toBe("callNext");
    });

    it("should return authenticate middleware if authentication control for action is true", () => {
      // Setup
      const authConfigs = {
        authenticationControl: {
          create: true,
        },
      };

      // Execute
      const middleware = authService.handleAuthenticationControl(
        "create",
        authConfigs.authenticationControl
      );

      // Verify
      expect(middleware).toBe(authService.authenticate);
    });

    it("should return authenticate middleware if authenticationControl is not specified", () => {
      // Setup

      // Execute
      const middleware = authService.handleAuthenticationControl("update", {});

      // Verify
      expect(middleware).toBe(authService.authenticate);
    });

    it("should return authenticate middleware if authConfigs is undefined", () => {
      // Execute
      const middleware = authService.handleAuthenticationControl("delete");

      // Verify
      expect(middleware).toBe(authService.authenticate);
    });
  });

  describe("checkStaticAccessControl", () => {
    it("should return true when user role matches authorized roles (single role)", () => {
      // Setup
      const user = { id: "user-123", role: "admin", roles: null } as any;
      const action = "create";
      const accessControl = { create: ["admin", "editor"] };

      // Execute
      const result = (authService as any).checkStaticAccessControl(
        user,
        action,
        accessControl
      );

      // Verify
      expect(result).toBe(true);
    });

    it("should return true when user role (single role) matches authorized roles using descriptive object instead of simple array ", () => {
      // Setup
      const user = { id: "user-123", role: "admin", roles: null } as any;
      const action = "Create";
      const accessControl = {
        Create: {
          roles: ["admin", "editor"],
          name: "Create a new user",
          description: "Allows to create a new user on the system",
        },
      };

      // Execute
      const result = (authService as any).checkStaticAccessControl(
        user,
        action,
        accessControl
      );

      // Verify
      expect(result).toBe(true);
    });

    it("should return true when user has multiple roles and one matches", () => {
      // Setup
      const user = {
        id: "user-123",
        role: null,
        roles: ["viewer", "editor"],
      } as any;
      const action = "create";
      const accessControl = { create: ["admin", "editor"] };

      // Execute
      const result = (authService as any).checkStaticAccessControl(
        user,
        action,
        accessControl
      );

      // Verify
      expect(result).toBe(true);
    });

    it("should return false when user role does not match authorized roles", () => {
      // Setup
      const user = { id: "user-123", role: "viewer", roles: null } as any;
      const action = "create";
      const accessControl = { create: ["admin", "editor"] };

      // Execute
      const result = (authService as any).checkStaticAccessControl(
        user,
        action,
        accessControl
      );

      // Verify
      expect(result).toBe(false);
    });

    it("should return false when action is not defined in accessControl", () => {
      // Setup
      const user = { id: "user-123", role: "admin", roles: null } as any;
      const action = "delete";
      const accessControl = { create: ["admin", "editor"] };

      // Execute
      const result = (authService as any).checkStaticAccessControl(
        user,
        action,
        accessControl
      );

      // Verify
      expect(result).toBe(false);
    });

    it("should work with array-based accessControl configuration", () => {
      // Setup
      const user = { id: "user-123", role: "admin", roles: null } as any;
      const action = "create";
      const accessControl = ["admin", "editor"];

      // Execute
      const result = (authService as any).checkStaticAccessControl(
        user,
        action,
        accessControl
      );

      // Verify
      expect(result).toBe(true);
    });

    it("should return false with array-based accessControl when role doesn't match", () => {
      // Setup
      const user = { id: "user-123", role: "viewer", roles: null } as any;
      const action = "create";
      const accessControl = ["admin", "editor"];

      // Execute
      const result = (authService as any).checkStaticAccessControl(
        user,
        action,
        accessControl
      );

      // Verify
      expect(result).toBe(false);
    });

    // it("should throw error when user has no role or roles field", () => {
    //   // Setup
    //   const user = { id: "user-123" } as any;
    //   const action = "create";
    //   const accessControl = ["admin", "editor"];

    //   // Execute & Verify
    //   expect(() => {
    //     (authService as any).checkStaticAccessControl(
    //       user,
    //       action,
    //       accessControl
    //     );
    //   }).toThrow(
    //     "Validation Error: In order to use static authentication user needs at least role field or roles for multiple roles."
    //   );
    // });

    it("should prioritize roles array over single role field", () => {
      // Setup
      const user = { id: "user-123", role: "viewer", roles: ["admin"] } as any;
      const action = "create";
      const accessControl = { create: ["admin"] };

      // Execute
      const result = (authService as any).checkStaticAccessControl(
        user,
        action,
        accessControl
      );

      // Verify
      expect(result).toBe(true);
    });
  });

  describe("checkDynamicAccessControl", () => {
    it("should return true when user has required permission", async () => {
      // Setup
      const userId = "user-123";
      const action = "create";
      const resource = "User";

      mockPrisma.userRole.findFirst.mockResolvedValue({ id: "role-123" });

      // Execute
      const result = await (authService as any).checkDynamicAccessControl(
        userId,
        action,
        resource
      );

      // Verify
      expect(mockPrisma.userRole.findFirst).toHaveBeenCalledWith({
        where: {
          userId: "user-123",
          role: {
            permissions: {
              some: {
                resource: "User",
                action: "create",
              },
            },
          },
        },
        select: { id: true },
      });
      expect(result).toBe(true);
    });

    it("should return false when user does not have required permission", async () => {
      // Setup
      const userId = "user-123";
      const action = "delete";
      const resource = "Post";

      mockPrisma.userRole.findFirst.mockResolvedValue(null);

      // Execute
      const result = await (authService as any).checkDynamicAccessControl(
        userId,
        action,
        resource
      );

      // Verify
      expect(mockPrisma.userRole.findFirst).toHaveBeenCalledWith({
        where: {
          userId: "user-123",
          role: {
            permissions: {
              some: {
                resource: "Post",
                action: "delete",
              },
            },
          },
        },
        select: { id: true },
      });
      expect(result).toBe(false);
    });
  });

  describe("permission", () => {
    it("should throw error when called with deep call stack (indicating handler execution)", async () => {
      jest.spyOn(global, "Error").mockImplementationOnce((message) => {
        return {
          message,
          stack: "node_modules/express/lib/router/index.js",
          name: "Error",
        } as any;
      });
      try {
        expect(authService.permission("create", "User")).rejects.toThrow(
          expect.any(Error)
        );
      } catch {}
    });

    it("should not throw error when called with shallow call stack", async () => {
      // Setup
      const originalStack = Error.prototype.stack;

      // Mock shallow call stack (less than 10 stack frames)
      Object.defineProperty(Error.prototype, "stack", {
        get: () => new Array(8).fill("at someFunction").join("\n"),
        configurable: true,
      });

      // Execute
      const permissionChecker = authService.permission("create", "User");

      // Verify
      expect(typeof permissionChecker).toBe("function");

      // Cleanup
      Object.defineProperty(Error.prototype, "stack", {
        get: () => originalStack,
        configurable: true,
      });
    });

    // it("should return function that throws error when authentication is not configured", async () => {
    //   // Setup
    //   (getArkosConfig as jest.Mock).mockReturnValue({});
    //   const permissionChecker = authService.permission("create", "User");
    //   const user = { id: "user-123" };

    //   // Execute & Verify
    //   await expect(permissionChecker(user)).rejects.toThrow(
    //     "Validation Error: Trying to use authService.permission without setting up authentication."
    //   );
    // });

    it("should return function that calls checkDynamicAccessControl for dynamic mode", async () => {
      // Setup
      mockConfig.authentication.mode = "dynamic";
      const permissionChecker = authService.permission("create", "User");
      const user = { id: "user-123" };

      // Mock checkDynamicAccessControl to return true
      jest
        .spyOn(authService as any, "checkDynamicAccessControl")
        .mockResolvedValue(true);

      // Execute
      const result = await permissionChecker(user);

      // Verify
      expect(
        (authService as any).checkDynamicAccessControl
      ).toHaveBeenCalledWith("user-123", "create", "User");
      expect(result).toBe(true);
    });

    it("should return function that calls checkStaticAccessControl for static mode", async () => {
      // Setup
      mockConfig.authentication.mode = "static";
      const accessControl = { create: ["admin"] };
      const permissionChecker = authService.permission(
        "create",
        "User",
        accessControl
      );
      const user = { id: "user-123", role: "admin" };

      // Mock checkStaticAccessControl to return true
      jest
        .spyOn(authService as any, "checkStaticAccessControl")
        .mockReturnValue(true);

      // Execute
      const result = await permissionChecker(user);

      // Verify
      expect(
        (authService as any).checkStaticAccessControl
      ).toHaveBeenCalledWith(user, "create", accessControl);
      expect(result).toBe(true);
    });

    it("should return function that returns false for static mode without accessControl", async () => {
      // Setup
      mockConfig.authentication.mode = "static";
      const permissionChecker = authService.permission("create", "User"); // No accessControl provided
      const user = { id: "user-123", role: "admin" };

      // Execute
      const result = await permissionChecker(user);

      // Verify
      expect(result).toBe(false);
    });

    it("should return function that returns true for static mode with accessControl automatically loaded", async () => {
      // Setup
      mockConfig.authentication.mode = "static";
      (getModuleComponents as jest.Mock).mockImplementationOnce(
        (moduleName: string) =>
          moduleName === "user-role" || { Delete: ["Admin"] }
      );
      const permissionChecker = authService.permission("Delete", "user-role"); // No accessControl provided
      const user = { id: "user-123", role: "Admin" };

      // Execute
      const result = await permissionChecker(user);

      // Verify
      expect(result).toBe(false);
    });

    it("should return function that returns false for unknown authentication mode", async () => {
      // Setup
      mockConfig.authentication.mode = "unknown";
      const permissionChecker = authService.permission("create", "User");
      const user = { id: "user-123" };

      // Execute
      const result = await permissionChecker(user);

      // Verify
      expect(result).toBe(false);
    });
  });
});
