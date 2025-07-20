---
sidebar_position: 7
---

# The Auth Service Object

The `authService` object provides comprehensive authentication functionality for your Arkos application. While Arkos handles authentication automatically behind the scenes, you may need direct access to the authentication methods in your business logic.

## Accessing the Auth Service

The `authService` is automatically available in your Arkos application and can be imported directly:

```ts
import { authService } from "arkos/services";
```

:::warning
On the following section you will various examples on how you can use the authService, you ain't restricted to those but also in the same time bear in mind that **Arkos** handles many of auth relate scenarios, such as authentication, authorization, password hashing, password checks and many others.
:::

Before proceed reading this guide is highly encouragend to read the guide about how **Arkos** uses this under the hood so that you do not miss anything and try to reivent the wheel yourself, [Arkos Authentication Flow Guide](/docs/guide/authentication-system/guide/authentication-system-flow).

## API Reference

### JWT Token Management

#### `signJwtToken(id, expiresIn?, secret?)`

Signs a JWT token for a user.

**Parameters:**

- `id` (number | string): The unique identifier of the user
- `expiresIn` (optional): The expiration time for the token (defaults to JWT_EXPIRES_IN from environment)
- `secret` (optional): The secret key for signing (defaults to JWT_SECRET from environment)

**Returns:**

- A signed JWT token string

**Example:**

```ts
// In a custom middleware
export const beforeCreateOne = catchAsync(async (req, res, next) => {
  // Generate a token with custom expiration for special access
  const temporaryToken = authService.signJwtToken(req.user.id, "4h");
  req.body.temporaryAccessToken = temporaryToken;
  next();
});
```

#### `verifyJwtToken(token, secret?)`

Verifies the authenticity of a JWT token.

**Parameters:**

- `token` (string): The JWT token to verify
- `secret` (optional): The secret key to use for verification

**Returns:**

- Promise resolving to the decoded JWT payload (AuthJwtPayload)

**Throws:**

- Error if the token is invalid or expired

**Example:**

```ts
// A custom middleware for API key validation
export const validateApiKey = catchAsync(async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"] as string;
    const decoded = await authService.verifyJwtToken(apiKey);

    // Add custom authorization flags
    req.isApiRequest = true;
    req.apiClientId = decoded.id;
    next();
  } catch (err) {
    next(new AppError("Invalid API key", 401));
  }
});
```

### Password Management

#### `isCorrectPassword(candidatePassword, userPassword)`

Compares a candidate password with the stored user password.

**Parameters:**

- `candidatePassword` (string): The password provided during login attempt
- `userPassword` (string): The hashed password stored in the database

**Returns:**

- Promise resolving to boolean (true if passwords match)

**Example:**

```ts
// Custom password validation for sensitive operations
export const beforeCreateOne = catchAsync(async (req, res, next) => {
  // Require password confirmation for critical operations
  if (!req.body.confirmPassword) {
    return next(new AppError("Please confirm your password", 400));
  }

  const isValid = await authService.isCorrectPassword(
    req.body.confirmPassword,
    req.user.password
  );

  if (!isValid) {
    return next(new AppError("Password confirmation failed", 401));
  }

  // Remove password from request body to prevent accidental exposure
  delete req.body.confirmPassword;
  next();
});
```

#### `hashPassword(password)`

Hashes a plain text password using bcrypt.

**Parameters:**

- `password` (string): The plain text password to hash

**Returns:**

- Promise resolving to the hashed password string

**Example:**

```ts
// In a custom user invitation flow
export const beforeCreateOne = catchAsync(async (req, res, next) => {
  // Generate a secure one-time password for invited users
  if (req.body.isInvitedUser) {
    const tempPassword = generateSecureRandomPassword();
    req.body.password = await authService.hashPassword(tempPassword);
    req.body.passwordResetRequired = true;

    // Store the plain password temporarily for email sending
    req.tempPassword = tempPassword;
  }

  next();
});
```

#### `isPasswordStrong(password)`

Checks if a password meets strength requirements.

**Parameters:**

- `password` (string): The password to check

**Returns:**

- boolean (true if the password meets strength criteria)

**Example:**

```ts
// Add custom password policies beyond default requirements
export const beforeUpdatePassword = catchAsync(async (req, res, next) => {
  const { newPassword } = req.body;

  // Or can use built-in validation through DTO or Schema
  if (!authService.isPasswordStrong(newPassword)) {
    return next(
      new AppError("Password doesn't meet security requirements", 400)
    );
  }

  // Add additional custom password policy checks
  if (newPassword.includes(req.user.username)) {
    return next(new AppError("Password cannot contain your username", 400));
  }

  next();
});
```

### User Authentication

#### `userChangedPasswordAfter(user, JWTTimestamp)`

Checks if a user changed their password after a JWT was issued.

**Parameters:**

- `user` (User): The user object containing the passwordChangedAt field
- `JWTTimestamp` (number): The timestamp when the JWT was issued

**Returns:**

- boolean (true if password was changed after JWT issuance)

**Example:**

```ts
//  A custom middleware for API integrations
export const validateLongTermToken = catchAsync(async (req, res, next) => {
  const integrationToken = req.headers["x-integration-token"];
  if (!integrationToken) return next();

  const decoded = await authService.verifyJwtToken(integrationToken);
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });

  if (!user) {
    return next(new AppError("Integration user not found", 401));
  }

  // Check if password was changed, invalidating all tokens
  if (authService.userChangedPasswordAfter(user, decoded.iat)) {
    return next(
      new AppError("Integration token expired due to password change", 401)
    );
  }

  req.integrationUser = user;
  next();
});
```

#### `getAuthenticatedUser(req)`

Retrieves the authenticated user from a request.

**Parameters:**

- `req` (ArkosRequest): The request object

**Returns:**

- Promise resolving to the authenticated User object or null

**Throws:**

- AppError if token is invalid or user not found

**Example:**

```ts
// Custom conditional authentication based on route context
export const optionalAuthentication = catchAsync(async (req, res, next) => {
  try {
    // Try to authenticate but don't require it
    const user = await authService.getAuthenticatedUser(req);

    if (user) {
      req.user = user;
      req.isAuthenticated = true;
    } else {
      req.isAuthenticated = false;
    }

    // Content filtering logic based on authentication status
    if (!req.isAuthenticated) {
      req.query.isPublic = true;
    }

    next();
  } catch (err) {
    // Continue as unauthenticated rather than failing
    req.isAuthenticated = false;
    req.query.isPublic = true;
    next();
  }
});
```

#### `authenticate`

Middleware function to authenticate the user based on the JWT token.

**Example:**

```ts
// A custom router with specialized access control
import { Router } from "express";
import { authService } from "arkos/services";
import { catchAsync } from "arkos/error-handler";

const router = Router();

// Only allow access during business hours
const businessHoursOnly = catchAsync(async (req, res, next) => {
  const now = new Date();
  const hour = now.getHours();

  if (hour < 9 || hour >= 17) {
    return next(
      new AppError("This API is only available during business hours", 403)
    );
  }

  next();
});

// Route with custom authentication chain
router.get(
  "/api/business-data",
  authService.authenticate,
  businessHoursOnly,
  (req, res) => {
    res.status(200).json({
      status: "success",
      data: {
        message: "Welcome to the business API",
        user: req.user,
      },
    });
  }
);

export default router;
```

### Access Control Handlers

#### `handleAccessControl(action, modelName, accessControlConfig)`

Middleware function to handle access control based on user roles and permissions.

**Parameters:**

- `action` (AccessAction): The action being performed (e.g., Create, Update, Delete, View or custom actions)
- `modelName` (string): The model name that the action is being performed on
- `accessControlConfig` (AccessControlConfig): The configuration object for authentication and access control

**Returns:**

- Middleware function that checks if the user has permission

**Example:**

```ts
// Implementing department-specific access control
import { authService } from "arkos/services";
import { catchAsync } from "arkos/error-handler";

const generateDepartmentReport = catchAsync(async (req, res, next) => {
  // Report generation logic
  const report = await generateReport(req.params.departmentId);
  res.status(200).json({ status: "success", data: report });
});

// Apply contextual access control with department check
const protectedReportAccess = [
  authService.authenticate,
  authService.handleAccessControl(
    "View", // action
    "report", // resource name
    ["Admin", "DepartmentHead"]
    // restricts only to those roles in static rbac
  ),
  // Additional custom department ownership check
  catchAsync(async (req, res, next) => {
    if (
      req.user.role !== "Admin" &&
      req.user.departmentId !== parseInt(req.params.departmentId)
    ) {
      return next(
        new AppError("You can only access your own department reports", 403)
      );
    }
    next();
  }),
  generateDepartmentReport,
];

export { protectedReportAccess };
```

#### `handleAuthenticationControl(action, authenticationControlConfig)`

Handles authentication control by checking the configuration.

**Parameters:**

- `action` (AccessAction): The action being performed
- `authenticationControlConfig` (AuthenticationControlConfig | undefined): The authentication configuration object

**Returns:**

- Middleware function that checks if authentication is required

**Example:**

```ts
// Implementing tiered access for different content levels
import { authService } from "arkos/services";
import { catchAsync } from "arkos/error-handler";

const getContentData = catchAsync(async (req, res, next) => {
  let contentLevel = "basic";

  // If authenticated, provide premium content
  if (req.isAuthenticated) {
    contentLevel = "premium";
  }

  const data = await getContentByLevel(contentLevel);
  res.status(200).json({ status: "success", data });
});

// Apply optional authentication for tiered content
const tieredContentAccess = [
  authService.handleAuthenticationControl(
    "View",
    { View: false } // Not required but supported
  ),
  // Custom middleware to track authentication status
  catchAsync(async (req, res, next) => {
    req.isAuthenticated = !!req.user;
    next();
  }),
  getContentData,
];

export { tieredContentAccess };
```

## Custom Actions and Extended Authentication

The `AccessAction` type can be extended beyond the basic CRUD operations ("Create", "Update", "Delete", "View") to include custom actions specific to your application needs. This works in both static and dynamic authentication modes.

:::info
When defining custom actions, note that the standard base actions ("Create", "Update", "Delete", "View") must use Pascal case (capital first letter). Your custom actions can use any naming convention, though we recommend maintaining consistency in your codebase.
:::

**Example of custom actions:**

```ts
// Custom export functionality with specific access controls
router.get(
  "/api/reports/export",
  authService.authenticate,
  authService.handleAccessControl(
    "Export", // Custom action in Pascal case
    "report",
    ["Admin", "Analyst"] // accessControl
  ),
  exportReportController
);

// Custom bulk operation with specific permissions
router.post(
  "/api/users/bulk-invite",
  authService.authenticate,
  authService.handleAccessControl(
    "BulkInvite", // Custom action in Pascal case
    "user",
    ["Admin", "HR"] // accessControl
  ),
  bulkInviteController
);
```

:::tip
For more detailed information on implementing authentication in custom routers, see the guide on [Adding Authentication to Custom Routers](/docs/guide/adding-custom-routers#adding-authentication-to-custom-routers).
:::

## Type Reference

This section provides reference information for the TypeScript types used with the auth service.

### `AccessAction`

Represents the possible actions that can be performed by a controller, including standard CRUD operations and custom actions.

```ts
export type AccessAction = "Create" | "Update" | "Delete" | "View" | string;
```

### `AccessControlRules`

Defines access control rules for different controller actions. Each key maps to an array of role names that are allowed to perform the action.

```ts
export type AccessControlRules = {
  [key in AccessAction]: string[];
};
```

### `AuthenticationControlRules`

Specifies which actions require authentication.

```ts
export type AuthenticationControlRules = {
  [key in AccessAction]: boolean;
};
```

### `AuthenticationControlConfig`

Configuration for authentication control. Can be a boolean (applies to all actions) or specific rules per action.

```ts
export type AuthenticationControlConfig =
  | boolean
  | Partial<AuthenticationControlRules>;
```

### `AccessControlConfig`

Configuration for access control. Can be an array of roles (applies to all actions) or specific rules per action.

```ts
export type AccessControlConfig = string[] | Partial<AccessControlRules>;
```

### `AuthConfigs`

Configuration for authentication and access control.

```ts
export type AuthConfigs = {
  authenticationControl?: AuthenticationControlConfig;
  accessControl?: AccessControlConfig;
};
```

### `AuthJwtPayload`

Payload structure for JWT-based authentication, extending the standard `JwtPayload`.

```ts
export interface AuthJwtPayload extends JwtPayload {
  id?: number | string;
  [x: string]: any;
}
```

## Best Practices

1. **Use What Is Needed**: Try to avoid rewriting things that **Arkos** do behind the scenes unless you really now what you want to do.

2. **Custom Authentication Flows**: When implementing specialized authentication like SSO or multi-factor authentication, use the built-in authService methods as building blocks rather than reimplementing core logic.

3. **Security Context**: Always maintain the security context through the request pipeline. Avoid storing sensitive information in request objects that will be exposed to the client.

4. **Graceful Degradation**: When implementing optional authentication, ensure your application gracefully handles unauthenticated scenarios rather than failing completely.

5. **Role-Based Policies**: Use the access control handlers to create fine-grained permission policies based on roles and resource ownership rather than hardcoding permissions checks.

6. **Error Standardization**: Follow Arkos error handling patterns by using AppError with appropriate status codes to maintain consistent API responses for authentication failures.
