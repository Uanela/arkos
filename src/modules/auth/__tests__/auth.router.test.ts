import { Router } from "express";
import { getAuthRouter } from "../auth.router";
import { authControllerFactory } from "../auth.controller";
import authService from "../auth.service";
import rateLimit from "express-rate-limit";
import { importPrismaModelModules } from "../../../utils/helpers/models.helpers";
import {
  sendResponse,
  addPrismaQueryOptionsToRequest,
  handleRequestBodyValidationAndTransformation,
} from "../../base/base.middlewares";
import deepmerge from "../../../utils/helpers/deepmerge.helper";
import { getArkosConfig } from "../../../server";
import catchAsync from "../../error-handler/utils/catch-async";

// Mock dependencies
jest.mock("../../error-handler/utils/catch-async");
jest.mock("fs");
jest.mock("express", () => {
  const mockRouter = {
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    patch: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    use: jest.fn().mockReturnThis(),
  };

  // Create a mock express function
  const mockExpress: any = jest.fn(() => ({
    use: jest.fn().mockReturnThis(),
    listen: jest.fn().mockReturnThis(),
    // Add any other express app methods you need
  }));

  // Add Router as a property to the function
  mockExpress.Router = jest.fn(() => mockRouter);

  // Setup for ES modules
  mockExpress.default = mockExpress;

  // Add other express exports you might need
  mockExpress.json = jest.fn();
  mockExpress.urlencoded = jest.fn();
  mockExpress.static = jest.fn();

  return mockExpress;
});
jest.mock("../auth.controller");
jest.mock("../auth.service", () => ({
  ...jest.requireActual("../auth.controller"),
  authenticate: jest.fn(),
}));
jest.mock("express-rate-limit");
jest.mock("../../../utils/helpers/models.helpers");
jest.mock("../../../utils/helpers/deepmerge.helper");
jest.mock("../../../server");
jest.mock("../../base/base.middlewares", () => ({
  ...jest.requireActual("../../base/base.middlewares"),
  handleRequestBodyValidationAndTransformation: jest.fn(() => {
    return () => {};
  }),
  addPrismaQueryOptionsToRequest: jest.fn(() => {
    return () => {};
  }),
  sendResponse: jest.fn(),
}));

describe("Auth Router", () => {
  let mockRouter: any;
  let mockAuthController: any;
  let mockArkosConfig: any;
  let mockPrismaQueryOptions: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mocks
    mockRouter = Router();
    mockAuthController = {
      getMe: jest.fn(),
      updateMe: jest.fn(),
      deleteMe: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      signup: jest.fn(),
      updatePassword: jest.fn(),
    };

    (catchAsync as jest.Mock).mockImplementation((fn) => fn);

    mockPrismaQueryOptions = {
      getMe: { include: { profile: true } },
      updateMe: { include: { profile: true } },
      deleteMe: { where: { active: true } },
      login: { where: { active: true } },
      signup: { include: { profile: true } },
      updatePassword: { where: { active: true } },
    };

    (authControllerFactory as jest.Mock).mockResolvedValue(mockAuthController);
    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: {},
      prismaQueryOptions: mockPrismaQueryOptions,
    });
    (rateLimit as jest.Mock).mockReturnValue(jest.fn());
    (deepmerge as any as jest.Mock).mockImplementation((obj1, obj2) => ({
      ...obj1,
      ...obj2,
    }));
    (getArkosConfig as jest.Mock).mockReturnValue({});

    mockArkosConfig = {
      authentication: {
        requestRateLimitOptions: {
          windowMs: 10000,
          limit: 5,
        },
      },
    };
  });

  test("should create router with default middleware configuration when no custom middlewares", async () => {
    // Act
    await getAuthRouter(mockArkosConfig);

    // Assert
    expect(Router).toHaveBeenCalled();
    expect(importPrismaModelModules).toHaveBeenCalledWith("auth");
    expect(authControllerFactory).toHaveBeenCalled();

    // Check routes are defined with the new middleware
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/users/me",
      authService.authenticate,
      expect.any(Function), // addPrismaQueryOptionsToRequest middleware
      mockAuthController.getMe,
      sendResponse,
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Function), // handleRequestBodyValidationAndTransformation middleware
      expect.any(Function), // addPrismaQueryOptionsToRequest middleware
      mockAuthController.login,
      sendResponse,
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/signup",
      expect.any(Function), // handleRequestBodyValidationAndTransformation middleware
      expect.any(Function), // addPrismaQueryOptionsToRequest middleware
      mockAuthController.signup,
      sendResponse,
      sendResponse,
      sendResponse
    );

    // Verify rate limiting is applied with merged config
    expect(deepmerge).toHaveBeenCalledWith(
      {
        windowMs: 5000,
        limit: 10,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        handler: expect.any(Function),
      },
      mockArkosConfig.authentication.requestRateLimitOptions
    );
    expect(rateLimit).toHaveBeenCalled();
    expect(mockRouter.use).toHaveBeenCalled();
  });

  test("should call addPrismaQueryOptionsToRequest with correct parameters for each route", async () => {
    // Act
    await getAuthRouter(mockArkosConfig);

    // Assert
    // Check that the middleware was called with correct parameters for each route
    expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
      mockPrismaQueryOptions,
      "getMe"
    );

    expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
      mockPrismaQueryOptions,
      "updateMe"
    );

    expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
      mockPrismaQueryOptions,
      "deleteMe"
    );

    expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
      mockPrismaQueryOptions,
      "login"
    );

    expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
      mockPrismaQueryOptions,
      "signup"
    );

    expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
      mockPrismaQueryOptions,
      "updatePassword"
    );
  });

  test("should create router with custom middleware configuration", async () => {
    // Arrange
    const customMiddlewares = {
      beforeGetMe: jest.fn(),
      afterGetMe: jest.fn(),
      beforeLogin: jest.fn(),
      afterLogin: jest.fn(),
      beforeSignup: jest.fn(),
      afterSignup: jest.fn(),
      beforeLogout: jest.fn(),
      afterLogout: jest.fn(),
      beforeUpdatePassword: jest.fn(),
      afterUpdatePassword: jest.fn(),
    };

    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: customMiddlewares,
      prismaQueryOptions: mockPrismaQueryOptions,
    });

    // Act
    await getAuthRouter(mockArkosConfig);

    // Assert
    // Check routes have custom middleware chains with addPrismaQueryOptionsToRequest
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/users/me",
      authService.authenticate,
      expect.any(Function), // addPrismaQueryOptionsToRequest middleware
      customMiddlewares.beforeGetMe,
      mockAuthController.getMe,
      customMiddlewares.afterGetMe,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Function), // handleRequestBodyValidationAndTransformation middleware
      expect.any(Function), // addPrismaQueryOptionsToRequest middleware
      customMiddlewares.beforeLogin,
      mockAuthController.login,
      customMiddlewares.afterLogin,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/signup",
      expect.any(Function), // handleRequestBodyValidationAndTransformation middleware
      expect.any(Function), // addPrismaQueryOptionsToRequest middleware
      customMiddlewares.beforeSignup,
      mockAuthController.signup,
      customMiddlewares.afterSignup,
      sendResponse
    );
  });

  test("should pass correct DTOs or schemas to handleRequestBodyValidationAndTransformation based on config", async () => {
    // Arrange
    const mockDtos = {
      updateMe: "UpdateMeDto",
      login: "LoginDto",
      signup: "SignupDto",
      updatePassword: "UpdatePasswordDto",
    };

    const mockSchemas = {
      updateMe: "updateMeSchema",
      login: "loginSchema",
      signup: "signupSchema",
      updatePassword: "updatePasswordSchema",
    };

    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: {},
      dtos: mockDtos,
      schemas: mockSchemas,
      prismaQueryOptions: mockPrismaQueryOptions,
    });

    // Test with class-validator configuration
    const classValidatorConfig = {
      validation: { resolver: "class-validator" },
      authentication: { mode: "static" },
    };

    // Act
    await getAuthRouter(classValidatorConfig as any);

    // Assert - check that DTOs were passed
    expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
      mockDtos.updateMe
    );
    expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
      mockDtos.login
    );
    expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
      mockDtos.signup
    );
    expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
      mockDtos.updatePassword
    );

    // Reset for next test
    jest.clearAllMocks();
    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: {},
      dtos: mockDtos,
      schemas: mockSchemas,
      prismaQueryOptions: mockPrismaQueryOptions,
    });

    // Test with zod configuration
    const zodConfig = {
      validation: { resolver: "zod" },
      authentication: { mode: "dynamic" },
    };

    // Act
    await getAuthRouter(zodConfig as any);

    // Assert - check that schemas were passed
    expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
      mockSchemas.updateMe
    );
    expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
      mockSchemas.login
    );
    expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
      mockSchemas.signup
    );
    expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
      mockSchemas.updatePassword
    );
  });

  test("should create all required routes with no middlewares passed", async () => {
    // Act
    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: undefined,
      prismaQueryOptions: mockPrismaQueryOptions,
    });

    await getAuthRouter({});

    // Assert
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse,
      sendResponse
    );

    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse,
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse,
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/auth/logout",
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/signup",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/update-password",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse,
      sendResponse
    );
  });

  test("should create all required routes with after middlewares passed to all routes", async () => {
    // Act
    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: {
        afterGetMe: jest.fn(),
        afterUpdateMe: jest.fn(),
        afterDeleteMe: jest.fn(),
        afterLogin: jest.fn(),
        afterLogout: jest.fn(),
        afterSignup: jest.fn(),
        afterUpdatePassword: jest.fn(),
      },
      prismaQueryOptions: mockPrismaQueryOptions,
    });
    await getAuthRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function), // authenticate
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // getMe
      expect.any(Function), // afterGetMe
      sendResponse,
      sendResponse
    );

    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function), // authenticate
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // updateMe
      expect.any(Function), // afterUpdateMe
      sendResponse,
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function), // authenticate
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // deleteMe
      expect.any(Function), // afterDeleteMe
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // login
      expect.any(Function), // afterLogin
      sendResponse,
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/auth/logout",
      expect.any(Function), // authenticate
      expect.any(Function), // logout
      expect.any(Function), // afterLogout
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/signup",
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // signup
      expect.any(Function), // afterSignup
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/update-password",
      expect.any(Function), // authenticate
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // updatePassword
      expect.any(Function), // afterUpdatePassword
      sendResponse,
      sendResponse
    );
  });

  test("should create all required routes with before middlewares passed to all routes", async () => {
    // Act
    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: {
        beforeGetMe: jest.fn(),
        beforeUpdateMe: jest.fn(),
        beforeDeleteMe: jest.fn(),
        beforeLogin: jest.fn(),
        beforeLogout: jest.fn(),
        beforeSignup: jest.fn(),
        beforeUpdatePassword: jest.fn(),
      },
      prismaQueryOptions: mockPrismaQueryOptions,
    });
    await getAuthRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function), // authenticate
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeGetMe
      expect.any(Function), // getMe
      sendResponse,
      sendResponse
    );

    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function), // authenticate
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeUpdateMe
      expect.any(Function), // updateMe
      sendResponse,
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function), // authenticate
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeDeleteMe
      expect.any(Function), // deleteMe
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeLogin
      expect.any(Function), // login
      sendResponse,
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/auth/logout",
      expect.any(Function), // authenticate
      expect.any(Function), // beforeLogout
      expect.any(Function), // logout
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/signup",
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeSignup
      expect.any(Function), // signup
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/update-password",
      expect.any(Function), // authenticate
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeUpdatePassword
      expect.any(Function), // updatePassword
      sendResponse,
      sendResponse
    );
  });

  test("should create all required routes with before and after middlewares passed to all routes", async () => {
    // Act
    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: {
        beforeGetMe: jest.fn(),
        afterGetMe: jest.fn(),
        beforeUpdateMe: jest.fn(),
        afterUpdateMe: jest.fn(),
        beforeDeleteMe: jest.fn(),
        afterDeleteMe: jest.fn(),
        beforeLogin: jest.fn(),
        afterLogin: jest.fn(),
        beforeLogout: jest.fn(),
        afterLogout: jest.fn(),
        beforeSignup: jest.fn(),
        afterSignup: jest.fn(),
        beforeUpdatePassword: jest.fn(),
        afterUpdatePassword: jest.fn(),
      },
      prismaQueryOptions: mockPrismaQueryOptions,
    });
    await getAuthRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function), // authenticate
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeGetMe
      expect.any(Function), // getMe
      expect.any(Function), // afterGetMe
      sendResponse
    );

    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function), // authenticate
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeUpdateMe
      expect.any(Function), // updateMe
      expect.any(Function), // afterUpdateMe
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function), // authenticate
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeDeleteMe
      expect.any(Function), // deleteMe
      expect.any(Function), // afterDeleteMe
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeLogin
      expect.any(Function), // login
      expect.any(Function), // afterLogin
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/auth/logout",
      expect.any(Function), // authenticate
      expect.any(Function), // beforeLogout
      expect.any(Function), // logout
      expect.any(Function), // afterLogout
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/signup",
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeSignup
      expect.any(Function), // signup
      expect.any(Function), // afterSignup
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/update-password",
      expect.any(Function), // authenticate
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeUpdatePassword
      expect.any(Function), // updatePassword
      expect.any(Function), // afterUpdatePassword
      sendResponse
    );
  });
});

// import { Router } from "express";
// import { getAuthRouter } from "../auth.router";
// import { authControllerFactory } from "../auth.controller";
// import authService from "../auth.service";
// import rateLimit from "express-rate-limit";
// import { importPrismaModelModules } from "../../../utils/helpers/models.helpers";
// import {
//   sendResponse,
//   addPrismaQueryOptionsToRequest,
//   handleRequestBodyValidationAndTransformation,
// } from "../../base/base.middlewares";
// import deepmerge from "../../../utils/helpers/deepmerge.helper";
// import { getArkosConfig } from "../../../server";
// import catchAsync from "../../error-handler/utils/catch-async";

// // Mock dependencies
// jest.mock("fs");
// jest.mock("express", () => {
//   const mockRouter = {
//     get: jest.fn().mockReturnThis(),
//     post: jest.fn().mockReturnThis(),
//     patch: jest.fn().mockReturnThis(),
//     delete: jest.fn().mockReturnThis(),
//     use: jest.fn().mockReturnThis(),
//   };

//   // Create a mock express function
//   const mockExpress: any = jest.fn(() => ({
//     use: jest.fn().mockReturnThis(),
//     listen: jest.fn().mockReturnThis(),
//     // Add any other express app methods you need
//   }));

//   // Add Router as a property to the function
//   mockExpress.Router = jest.fn(() => mockRouter);

//   // Setup for ES modules
//   mockExpress.default = mockExpress;

//   // Add other express exports you might need
//   mockExpress.json = jest.fn();
//   mockExpress.urlencoded = jest.fn();
//   mockExpress.static = jest.fn();

//   return mockExpress;
// });
// jest.mock("../auth.controller");
// jest.mock("../auth.service");
// jest.mock("express-rate-limit");
// jest.mock("../../../utils/helpers/models.helpers");
// jest.mock("../../../utils/helpers/deepmerge.helper");
// jest.mock("../../../server");
// jest.mock("../../error-handler/utils/catch-async");
// jest.mock("../../base/base.middlewares", () => ({
//   ...jest.requireActual("../../base/base.middlewares"),
//   handleRequestBodyValidationAndTransformation: jest.fn(() => {
//     return () => {};
//   }),
//   addPrismaQueryOptionsToRequest: jest.fn(() => {
//     return () => {};
//   }),
//   sendResponse: jest.fn(),
// }));

// describe("Auth Router", () => {
//   let mockRouter: any;
//   let mockAuthController: any;
//   let mockArkosConfig: any;
//   let mockPrismaQueryOptions: any;
//   let mockCatchAsync: jest.Mock;

//   beforeEach(() => {
//     // Reset mocks
//     jest.clearAllMocks();

//     // Setup mocks
//     mockRouter = Router();
//     mockAuthController = {
//       getMe: jest.fn(),
//       updateMe: jest.fn(),
//       deleteMe: jest.fn(),
//       login: jest.fn(),
//       logout: jest.fn(),
//       signup: jest.fn(),
//       updatePassword: jest.fn(),
//     };

//     mockPrismaQueryOptions = {
//       getMe: { include: { profile: true } },
//       updateMe: { include: { profile: true } },
//       deleteMe: { where: { active: true } },
//       login: { where: { active: true } },
//       signup: { include: { profile: true } },
//       updatePassword: { where: { active: true } },
//     };

//     // Mock catchAsync to return a wrapped function
//     mockCatchAsync = catchAsync as jest.Mock;
//     mockCatchAsync.mockImplementation((fn) => {
//       if (!fn) return undefined;
//       const wrappedFn = jest.fn();
//       // wrappedFn.originalFunction = fn;
//       return fn;
//     });

//     (authControllerFactory as jest.Mock).mockResolvedValue(mockAuthController);
//     (importPrismaModelModules as jest.Mock).mockResolvedValue({
//       middlewares: {},
//       prismaQueryOptions: mockPrismaQueryOptions,
//     });
//     (rateLimit as jest.Mock).mockReturnValue(jest.fn());
//     (deepmerge as any as jest.Mock).mockImplementation((obj1, obj2) => ({
//       ...obj1,
//       ...obj2,
//     }));
//     (getArkosConfig as jest.Mock).mockReturnValue({});

//     mockArkosConfig = {
//       authentication: {
//         requestRateLimitOptions: {
//           windowMs: 10000,
//           limit: 5,
//         },
//       },
//     };
//   });

//   test("should create router with default middleware configuration when no custom middlewares", async () => {
//     // Act
//     await getAuthRouter(mockArkosConfig);

//     // Assert
//     expect(Router).toHaveBeenCalled();
//     expect(importPrismaModelModules).toHaveBeenCalledWith("auth");
//     expect(authControllerFactory).toHaveBeenCalled();

//     // Check routes are defined with the correct middleware
//     expect(mockRouter.get).toHaveBeenCalledWith(
//       "/users/me",
//       authService.authenticate,
//       expect.any(Function), // addPrismaQueryOptionsToRequest middleware
//       mockAuthController.getMe,
//       sendResponse
//     );

//     expect(mockRouter.post).toHaveBeenCalledWith(
//       "/auth/login",
//       expect.any(Function), // handleRequestBodyValidationAndTransformation middleware
//       expect.any(Function), // addPrismaQueryOptionsToRequest middleware
//       mockAuthController.login,
//       sendResponse
//     );

//     expect(mockRouter.post).toHaveBeenCalledWith(
//       "/auth/signup",
//       expect.any(Function), // handleRequestBodyValidationAndTransformation middleware
//       expect.any(Function), // addPrismaQueryOptionsToRequest middleware
//       mockAuthController.signup,
//       sendResponse
//     );

//     // Verify rate limiting is applied with merged config
//     expect(deepmerge).toHaveBeenCalledWith(
//       {
//         windowMs: 5000,
//         limit: 10,
//         standardHeaders: "draft-7",
//         legacyHeaders: false,
//         handler: expect.any(Function),
//       },
//       mockArkosConfig.authentication.requestRateLimitOptions
//     );
//     expect(rateLimit).toHaveBeenCalled();
//     expect(mockRouter.use).toHaveBeenCalled();
//   });

//   test("should call addPrismaQueryOptionsToRequest with correct parameters for each route", async () => {
//     // Act
//     await getAuthRouter(mockArkosConfig);

//     // Assert
//     // Check that the middleware was called with correct parameters for each route
//     expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
//       mockPrismaQueryOptions,
//       "getMe"
//     );

//     expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
//       mockPrismaQueryOptions,
//       "updateMe"
//     );

//     expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
//       mockPrismaQueryOptions,
//       "deleteMe"
//     );

//     expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
//       mockPrismaQueryOptions,
//       "login"
//     );

//     expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
//       mockPrismaQueryOptions,
//       "signup"
//     );

//     expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
//       mockPrismaQueryOptions,
//       "updatePassword"
//     );
//   });

//   test("should create router with custom middleware configuration and wrap them with catchAsync", async () => {
//     // Arrange
//     const customMiddlewares = {
//       beforeGetMe: jest.fn(),
//       afterGetMe: jest.fn(),
//       beforeLogin: jest.fn(),
//       afterLogin: jest.fn(),
//       beforeSignup: jest.fn(),
//       afterSignup: jest.fn(),
//       beforeLogout: jest.fn(),
//       afterLogout: jest.fn(),
//       beforeUpdatePassword: jest.fn(),
//       afterUpdatePassword: jest.fn(),
//     };

//     (importPrismaModelModules as jest.Mock).mockResolvedValue({
//       middlewares: customMiddlewares,
//       prismaQueryOptions: mockPrismaQueryOptions,
//     });

//     // Act
//     await getAuthRouter(mockArkosConfig);

//     // Assert
//     // Verify catchAsync was called for each custom middleware
//     expect(mockCatchAsync).toHaveBeenCalledWith(customMiddlewares.beforeGetMe);
//     expect(mockCatchAsync).toHaveBeenCalledWith(customMiddlewares.afterGetMe);
//     expect(mockCatchAsync).toHaveBeenCalledWith(customMiddlewares.beforeLogin);
//     expect(mockCatchAsync).toHaveBeenCalledWith(customMiddlewares.afterLogin);
//     expect(mockCatchAsync).toHaveBeenCalledWith(customMiddlewares.beforeSignup);
//     expect(mockCatchAsync).toHaveBeenCalledWith(customMiddlewares.afterSignup);
//     expect(mockCatchAsync).toHaveBeenCalledWith(customMiddlewares.beforeLogout);
//     expect(mockCatchAsync).toHaveBeenCalledWith(customMiddlewares.afterLogout);
//     expect(mockCatchAsync).toHaveBeenCalledWith(
//       customMiddlewares.beforeUpdatePassword
//     );
//     expect(mockCatchAsync).toHaveBeenCalledWith(
//       customMiddlewares.afterUpdatePassword
//     );

//     // Check routes have custom middleware chains with wrapped middlewares
//     expect(mockRouter.get).toHaveBeenCalledWith(
//       "/users/me",
//       authService.authenticate,
//       expect.any(Function), // addPrismaQueryOptionsToRequest middleware
//       expect.any(Function), // wrapped beforeGetMe
//       mockAuthController.getMe,
//       expect.any(Function), // wrapped afterGetMe
//       sendResponse
//     );

//     expect(mockRouter.post).toHaveBeenCalledWith(
//       "/auth/login",
//       expect.any(Function), // handleRequestBodyValidationAndTransformation middleware
//       expect.any(Function), // addPrismaQueryOptionsToRequest middleware
//       expect.any(Function), // wrapped beforeLogin
//       mockAuthController.login,
//       expect.any(Function), // wrapped afterLogin
//       sendResponse
//     );

//     expect(mockRouter.post).toHaveBeenCalledWith(
//       "/auth/signup",
//       expect.any(Function), // handleRequestBodyValidationAndTransformation middleware
//       expect.any(Function), // addPrismaQueryOptionsToRequest middleware
//       expect.any(Function), // wrapped beforeSignup
//       mockAuthController.signup,
//       expect.any(Function), // wrapped afterSignup
//       sendResponse
//     );
//   });

//   test("should pass correct DTOs or schemas to handleRequestBodyValidationAndTransformation based on config", async () => {
//     // Arrange
//     const mockDtos = {
//       updateMe: "UpdateMeDto",
//       login: "LoginDto",
//       signup: "SignupDto",
//       updatePassword: "UpdatePasswordDto",
//     };

//     const mockSchemas = {
//       updateMe: "updateMeSchema",
//       login: "loginSchema",
//       signup: "signupSchema",
//       updatePassword: "updatePasswordSchema",
//     };

//     (importPrismaModelModules as jest.Mock).mockResolvedValue({
//       middlewares: {},
//       dtos: mockDtos,
//       schemas: mockSchemas,
//       prismaQueryOptions: mockPrismaQueryOptions,
//     });

//     // Test with class-validator configuration
//     const classValidatorConfig = {
//       validation: { resolver: "class-validator" },
//       authentication: { mode: "static" },
//     };

//     // Act
//     await getAuthRouter(classValidatorConfig as any);

//     // Assert - check that DTOs were passed
//     expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
//       mockDtos.updateMe
//     );
//     expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
//       mockDtos.login
//     );
//     expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
//       mockDtos.signup
//     );
//     expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
//       mockDtos.updatePassword
//     );

//     // Reset for next test
//     jest.clearAllMocks();
//     (importPrismaModelModules as jest.Mock).mockResolvedValue({
//       middlewares: {},
//       dtos: mockDtos,
//       schemas: mockSchemas,
//       prismaQueryOptions: mockPrismaQueryOptions,
//     });

//     // Test with zod configuration
//     const zodConfig = {
//       validation: { resolver: "zod" },
//       authentication: { mode: "dynamic" },
//     };

//     // Act
//     await getAuthRouter(zodConfig as any);

//     // Assert - check that schemas were passed
//     expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
//       mockSchemas.updateMe
//     );
//     expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
//       mockSchemas.login
//     );
//     expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
//       mockSchemas.signup
//     );
//     expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
//       mockSchemas.updatePassword
//     );
//   });

//   test("should create all required routes with no middlewares passed", async () => {
//     // Act
//     (importPrismaModelModules as jest.Mock).mockResolvedValue({
//       middlewares: undefined,
//       prismaQueryOptions: mockPrismaQueryOptions,
//     });

//     await getAuthRouter({});

//     // Assert
//     expect(mockRouter.get).toHaveBeenCalledWith(
//       "/users/me",
//       expect.any(Function),
//       expect.any(Function),
//       expect.any(Function),
//       sendResponse
//     );

//     expect(mockRouter.patch).toHaveBeenCalledWith(
//       "/users/me",
//       expect.any(Function),
//       expect.any(Function),
//       expect.any(Function),
//       expect.any(Function),
//       sendResponse
//     );

//     expect(mockRouter.delete).toHaveBeenCalledWith(
//       "/users/me",
//       expect.any(Function),
//       expect.any(Function),
//       expect.any(Function),
//       sendResponse
//     );

//     expect(mockRouter.post).toHaveBeenCalledWith(
//       "/auth/login",
//       expect.any(Function),
//       expect.any(Function),
//       expect.any(Function),
//       sendResponse
//     );

//     expect(mockRouter.delete).toHaveBeenCalledWith(
//       "/auth/logout",
//       expect.any(Function),
//       expect.any(Function),
//       sendResponse
//     );

//     expect(mockRouter.post).toHaveBeenCalledWith(
//       "/auth/signup",
//       expect.any(Function),
//       expect.any(Function),
//       expect.any(Function),
//       sendResponse
//     );

//     expect(mockRouter.post).toHaveBeenCalledWith(
//       "/auth/update-password",
//       expect.any(Function),
//       expect.any(Function),
//       expect.any(Function),
//       expect.any(Function),
//       sendResponse
//     );
//   });

//   test("should create all required routes with after middlewares passed to all routes", async () => {
//     // Arrange
//     const afterMiddlewares = {
//       afterGetMe: jest.fn(),
//       afterUpdateMe: jest.fn(),
//       afterDeleteMe: jest.fn(),
//       afterLogin: jest.fn(),
//       afterLogout: jest.fn(),
//       afterSignup: jest.fn(),
//       afterUpdatePassword: jest.fn(),
//     };

//     (importPrismaModelModules as jest.Mock).mockResolvedValue({
//       middlewares: afterMiddlewares,
//       prismaQueryOptions: mockPrismaQueryOptions,
//     });

//     // Act
//     await getAuthRouter(mockArkosConfig);

//     // Assert
//     // Verify catchAsync was called for after middlewares
//     expect(mockCatchAsync).toHaveBeenCalledWith(afterMiddlewares.afterGetMe);
//     expect(mockCatchAsync).toHaveBeenCalledWith(afterMiddlewares.afterUpdateMe);
//     expect(mockCatchAsync).toHaveBeenCalledWith(afterMiddlewares.afterDeleteMe);
//     expect(mockCatchAsync).toHaveBeenCalledWith(afterMiddlewares.afterLogin);
//     expect(mockCatchAsync).toHaveBeenCalledWith(afterMiddlewares.afterLogout);
//     expect(mockCatchAsync).toHaveBeenCalledWith(afterMiddlewares.afterSignup);
//     expect(mockCatchAsync).toHaveBeenCalledWith(
//       afterMiddlewares.afterUpdatePassword
//     );

//     expect(mockRouter.get).toHaveBeenCalledWith(
//       "/users/me",
//       expect.any(Function), // authenticate
//       expect.any(Function), // addPrismaQueryOptionsToRequest
//       expect.any(Function), // getMe
//       expect.any(Function), // wrapped afterGetMe
//       sendResponse
//     );

//     expect(mockRouter.patch).toHaveBeenCalledWith(
//       "/users/me",
//       expect.any(Function), // authenticate
//       expect.any(Function), // handleRequestBodyValidationAndTransformation
//       expect.any(Function), // addPrismaQueryOptionsToRequest
//       expect.any(Function), // updateMe
//       expect.any(Function), // wrapped afterUpdateMe
//       sendResponse
//     );

//     expect(mockRouter.delete).toHaveBeenCalledWith(
//       "/users/me",
//       expect.any(Function), // authenticate
//       expect.any(Function), // addPrismaQueryOptionsToRequest
//       expect.any(Function), // deleteMe
//       expect.any(Function), // wrapped afterDeleteMe
//       sendResponse
//     );

//     expect(mockRouter.post).toHaveBeenCalledWith(
//       "/auth/login",
//       expect.any(Function), // handleRequestBodyValidationAndTransformation
//       expect.any(Function), // addPrismaQueryOptionsToRequest
//       expect.any(Function), // login
//       expect.any(Function), // wrapped afterLogin
//       sendResponse
//     );

//     expect(mockRouter.delete).toHaveBeenCalledWith(
//       "/auth/logout",
//       expect.any(Function), // authenticate
//       expect.any(Function), // logout
//       expect.any(Function), // wrapped afterLogout
//       sendResponse
//     );

//     expect(mockRouter.post).toHaveBeenCalledWith(
//       "/auth/signup",
//       expect.any(Function), // handleRequestBodyValidationAndTransformation
//       expect.any(Function), // addPrismaQueryOptionsToRequest
//       expect.any(Function), // signup
//       expect.any(Function), // wrapped afterSignup
//       sendResponse
//     );

//     expect(mockRouter.post).toHaveBeenCalledWith(
//       "/auth/update-password",
//       expect.any(Function), // authenticate
//       expect.any(Function), // handleRequestBodyValidationAndTransformation
//       expect.any(Function), // addPrismaQueryOptionsToRequest
//       expect.any(Function), // updatePassword
//       expect.any(Function), // wrapped afterUpdatePassword
//       sendResponse
//     );
//   });

//   test("should create all required routes with before middlewares passed to all routes", async () => {
//     // Arrange
//     const beforeMiddlewares = {
//       beforeGetMe: jest.fn(),
//       beforeUpdateMe: jest.fn(),
//       beforeDeleteMe: jest.fn(),
//       beforeLogin: jest.fn(),
//       beforeLogout: jest.fn(),
//       beforeSignup: jest.fn(),
//       beforeUpdatePassword: jest.fn(),
//     };

//     (importPrismaModelModules as jest.Mock).mockResolvedValue({
//       middlewares: beforeMiddlewares,
//       prismaQueryOptions: mockPrismaQueryOptions,
//     });

//     // Act
//     await getAuthRouter(mockArkosConfig);

//     // Assert
//     // Verify catchAsync was called for before middlewares
//     expect(mockCatchAsync).toHaveBeenCalledWith(beforeMiddlewares.beforeGetMe);
//     expect(mockCatchAsync).toHaveBeenCalledWith(
//       beforeMiddlewares.beforeUpdateMe
//     );
//     expect(mockCatchAsync).toHaveBeenCalledWith(
//       beforeMiddlewares.beforeDeleteMe
//     );
//     expect(mockCatchAsync).toHaveBeenCalledWith(beforeMiddlewares.beforeLogin);
//     expect(mockCatchAsync).toHaveBeenCalledWith(beforeMiddlewares.beforeLogout);
//     expect(mockCatchAsync).toHaveBeenCalledWith(beforeMiddlewares.beforeSignup);
//     expect(mockCatchAsync).toHaveBeenCalledWith(
//       beforeMiddlewares.beforeUpdatePassword
//     );

//     expect(mockRouter.get).toHaveBeenCalledWith(
//       "/users/me",
//       expect.any(Function), // authenticate
//       expect.any(Function), // addPrismaQueryOptionsToRequest
//       expect.any(Function), // wrapped beforeGetMe
//       expect.any(Function), // getMe
//       sendResponse
//     );

//     expect(mockRouter.patch).toHaveBeenCalledWith(
//       "/users/me",
//       expect.any(Function), // authenticate
//       expect.any(Function), // handleRequestBodyValidationAndTransformation
//       expect.any(Function), // addPrismaQueryOptionsToRequest
//       expect.any(Function), // wrapped beforeUpdateMe
//       expect.any(Function), // updateMe
//       sendResponse
//     );

//     expect(mockRouter.delete).toHaveBeenCalledWith(
//       "/users/me",
//       expect.any(Function), // authenticate
//       expect.any(Function), // addPrismaQueryOptionsToRequest
//       expect.any(Function), // wrapped beforeDeleteMe
//       expect.any(Function), // deleteMe
//       sendResponse
//     );

//     expect(mockRouter.post).toHaveBeenCalledWith(
//       "/auth/login",
//       expect.any(Function), // handleRequestBodyValidationAndTransformation
//       expect.any(Function), // addPrismaQueryOptionsToRequest
//       expect.any(Function), // wrapped beforeLogin
//       expect.any(Function), // login
//       sendResponse
//     );

//     expect(mockRouter.delete).toHaveBeenCalledWith(
//       "/auth/logout",
//       expect.any(Function), // authenticate
//       expect.any(Function), // wrapped beforeLogout
//       expect.any(Function), // logout
//       sendResponse
//     );

//     expect(mockRouter.post).toHaveBeenCalledWith(
//       "/auth/signup",
//       expect.any(Function), // handleRequestBodyValidationAndTransformation
//       expect.any(Function), // addPrismaQueryOptionsToRequest
//       expect.any(Function), // wrapped beforeSignup
//       expect.any(Function), // signup
//       sendResponse
//     );

//     expect(mockRouter.post).toHaveBeenCalledWith(
//       "/auth/update-password",
//       expect.any(Function), // authenticate
//       expect.any(Function), // handleRequestBodyValidationAndTransformation
//       expect.any(Function), // addPrismaQueryOptionsToRequest
//       expect.any(Function), // wrapped beforeUpdatePassword
//       expect.any(Function), // updatePassword
//       sendResponse
//     );
//   });

//   test("should create all required routes with before and after middlewares passed to all routes", async () => {
//     // Arrange
//     const allMiddlewares = {
//       beforeGetMe: jest.fn(),
//       afterGetMe: jest.fn(),
//       beforeUpdateMe: jest.fn(),
//       afterUpdateMe: jest.fn(),
//       beforeDeleteMe: jest.fn(),
//       afterDeleteMe: jest.fn(),
//       beforeLogin: jest.fn(),
//       afterLogin: jest.fn(),
//       beforeLogout: jest.fn(),
//       afterLogout: jest.fn(),
//       beforeSignup: jest.fn(),
//       afterSignup: jest.fn(),
//       beforeUpdatePassword: jest.fn(),
//       afterUpdatePassword: jest.fn(),
//     };

//     (importPrismaModelModules as jest.Mock).mockResolvedValue({
//       middlewares: allMiddlewares,
//       prismaQueryOptions: mockPrismaQueryOptions,
//     });

//     // Act
//     await getAuthRouter(mockArkosConfig);

//     // Assert
//     // Verify catchAsync was called for all middlewares
//     Object.values(allMiddlewares).forEach((middleware) => {
//       expect(mockCatchAsync).toHaveBeenCalledWith(middleware);
//     });

//     expect(mockRouter.get).toHaveBeenCalledWith(
//       "/users/me",
//       expect.any(Function), // authenticate
//       expect.any(Function), // addPrismaQueryOptionsToRequest
//       expect.any(Function), // wrapped beforeGetMe
//       expect.any(Function), // getMe
//       expect.any(Function), // wrapped afterGetMe
//       sendResponse
//     );

//     expect(mockRouter.patch).toHaveBeenCalledWith(
//       "/users/me",
//       expect.any(Function), // authenticate
//       expect.any(Function), // handleRequestBodyValidationAndTransformation
//       expect.any(Function), // addPrismaQueryOptionsToRequest
//       expect.any(Function), // wrapped beforeUpdateMe
//       expect.any(Function), // updateMe
//       expect.any(Function), // wrapped afterUpdateMe
//       sendResponse
//     );

//     expect(mockRouter.delete).toHaveBeenCalledWith(
//       "/users/me",
//       expect.any(Function), // authenticate
//       expect.any(Function), // addPrismaQueryOptionsToRequest
//       expect.any(Function), // wrapped beforeDeleteMe
//       expect.any(Function), // deleteMe
//       expect.any(Function), // wrapped afterDeleteMe
//       sendResponse
//     );

//     expect(mockRouter.post).toHaveBeenCalledWith(
//       "/auth/login",
//       expect.any(Function), // handleRequestBodyValidationAndTransformation
//       expect.any(Function), // addPrismaQueryOptionsToRequest
//       expect.any(Function), // wrapped beforeLogin
//       expect.any(Function), // login
//       expect.any(Function), // wrapped afterLogin
//       sendResponse
//     );

//     expect(mockRouter.delete).toHaveBeenCalledWith(
//       "/auth/logout",
//       expect.any(Function), // authenticate
//       expect.any(Function), // wrapped beforeLogout
//       expect.any(Function), // logout
//       expect.any(Function), // wrapped afterLogout
//       sendResponse
//     );

//     expect(mockRouter.post).toHaveBeenCalledWith(
//       "/auth/signup",
//       expect.any(Function), // handleRequestBodyValidationAndTransformation
//       expect.any(Function), // addPrismaQueryOptionsToRequest
//       expect.any(Function), // wrapped beforeSignup
//       expect.any(Function), // signup
//       expect.any(Function), // wrapped afterSignup
//       sendResponse
//     );

//     expect(mockRouter.post).toHaveBeenCalledWith(
//       "/auth/update-password",
//       expect.any(Function), // authenticate
//       expect.any(Function), // handleRequestBodyValidationAndTransformation
//       expect.any(Function), // addPrismaQueryOptionsToRequest
//       expect.any(Function), // wrapped beforeUpdatePassword
//       expect.any(Function), // updatePassword
//       expect.any(Function), // wrapped afterUpdatePassword
//       sendResponse
//     );
//   });

//   test("should handle undefined middlewares gracefully with safeCatchAsync", async () => {
//     // Arrange
//     (importPrismaModelModules as jest.Mock).mockResolvedValue({
//       middlewares: {
//         beforeGetMe: undefined,
//         afterGetMe: undefined,
//         beforeUpdateMe: jest.fn(),
//         afterUpdateMe: undefined,
//       },
//       prismaQueryOptions: mockPrismaQueryOptions,
//     });

//     // Act
//     await getAuthRouter(mockArkosConfig);

//     // Assert
//     // Verify catchAsync was called with undefined and returned undefined
//     expect(mockCatchAsync).toHaveBeenCalledWith(undefined);
//     expect(mockCatchAsync).toHaveBeenCalledWith(expect.any(Function));

//     // The route should still work with mixed undefined and defined middlewares
//     expect(mockRouter.get).toHaveBeenCalled();
//     expect(mockRouter.patch).toHaveBeenCalled();
//   });
// });
