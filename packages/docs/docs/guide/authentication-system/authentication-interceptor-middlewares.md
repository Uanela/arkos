---
sidebar_position: 3
title: Authentication Interceptor Middlewares
---

# Authentication Interceptor Middlewares

**Arkos** provides a comprehensive Built-in Auth System with pre-defined routes and a powerful middleware interceptor mechanism that allows for extensive customization of authentication processes.

## Authentication Routes Overview

### User Profile Management

| Route           | Method | Description                     | Authentication Required |
| --------------- | ------ | ------------------------------- | ----------------------- |
| `/api/users/me` | GET    | Retrieve current user's profile | Yes                     |
| `/api/users/me` | PATCH  | Update current user's profile   | Yes                     |
| `/api/users/me` | DELETE | Delete current user's account   | Yes                     |

:::tip
When a user calls DELETE `/users/me`, the actual data won't be deleted on the database records **Arkos** will only set `deletedSelfAccountAt` to the current date of request and he will no longer be able to make login nor any other `authenticated` endpoint. In order do actually delete the record you may use `afterDeleteMe` to do it.
:::

### Authentication Endpoints

| Route                       | Method | Description          | Authentication Required |
| --------------------------- | ------ | -------------------- | ----------------------- |
| `/api/auth/login`           | POST   | User authentication  | No                      |
| `/api/auth/logout`          | DELETE | End user session     | Yes                     |
| `/api/auth/signup`          | POST   | User registration    | No                      |
| `/api/auth/update-password` | POST   | Change user password | Yes                     |

## Interceptor Middlewares

### What are Interceptor Middlewares?

Interceptor middlewares provide hooks to customize the authentication flow. They allow you to:

- Add custom logic before or after authentication operations
- Modify request or response data
- Implement additional security checks
- Log authentication events
- Perform side operations during authentication processes

### Types of Interceptor Middlewares

For each authentication route, you can create two types of middlewares:

1. **Before Middlewares**: Execute before the main handler
2. **After Middlewares**: Execute after the main handler

### Available Interceptor Middleware Types

The following interceptors are available for intercept authentication related requests:

| Route                       | Middlewares                                                                                       | Description              |
| --------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------ |
| `/api/users/me`             | `beforeGetMe`, `afterGetMe`, `beforeUpdateMe`, `afterUpdateMe`, `beforeDeleteMe`, `afterDeleteMe` | User profile management  |
| `/api/auth/login`           | `beforeLogin`, `afterLogin`                                                                       | User authentication      |
| `/api/auth/logout`          | `beforeLogout`, `afterLogout`                                                                     | User session termination |
| `/api/auth/signup`          | `beforeSignup`, `afterSignup`                                                                     | User registration        |
| `/api/auth/update-password` | `beforeUpdatePassword`, `afterUpdatePassword`                                                     | Password change          |

### Middleware Execution Flow

The **Arkos** auth router implements a sophisticated conditional middleware execution flow:

1. Before anything incoming data is validated through DTO's or schemas according to you configs, see [Authentication Data Validation Guide](/docs/guide/authentication-system/authentication-data-validation) to understand.
2. Arkos checks if a `before` middleware exists:
    - If it exists, it runs before the controller action
    - If not, the controller action runs immediately
3. After the controller action:
    - If both `before` and `after` middlewares exist, the `after` middleware runs
    - If only the `before` middleware exists, the response is sent directly
    - If only the `after` middleware exists, it runs after the controller
    - If no middlewares exist, the response is sent directly
4. Finally, the `sendResponse` middleware sends the prepared response

This flow ensures that interceptors can work independently or together as needed.

## Creating Interceptor Middlewares

### Middleware Structure

```typescript
// src/modules/auth/auth.middlewares.ts
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { catchAsync, AppError } from "arkos/error-handler";

// Before Middleware Example
export const beforeLogin = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        // Custom pre-login logic
        console.log("Login attempt:", req.body.username || req.body.email);

        // Example: Add rate limiting by IP or additional validation
        if (someCondition) {
            throw new AppError("Custom login validation failed", 400);
        }

        // Always call next() to proceed to the controller
        next();
    }
);

// After Middleware Example
export const afterLogin = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        // The controller has already run at this point
        // req.responseData contains the data that will be sent to the client
        // req.responseStatus contains the status code

        // Example: Add additional data to the response
        // This one is already done behind the scenes
        req.responseData.lastLogin = new Date();

        // Example: Log successful logins
        await logSuccessfulLogin(req.responseData);
        // Avoid awaiting something that will not affect the responseData
        // Or the user does not need to wait it finish to procced
        // Try to always use then().catch() for better UX.

        // Always call next() to proceed to sendResponse
        // or send the response by yourself
        next();
    }
);
```

### Handling Response Data

In `after` middlewares, you can access and modify the response data via:

- `req.responseData`: Contains the data prepared by the controller
- `req.responseStatus`: Contains the HTTP status code to be sent
- `req.additionalData`: Optional object for middleware communication (available in some handlers)

### Best Practices

- Always use `catchAsync` to handle async operations, [more guide](/docs/api-reference/the-catch-async-function)
- Use `AppError` for custom error handling [more guide](/docs/api-reference/the-app-error-class)
- Call `next()` to proceed to the next middleware, controller or send response on your own
- Keep middlewares focused and performant
- Avoid unnecessary heavy processing in middlewares

## Middleware Placement

Place your middleware files in the following structure:

```
my-arkos-project/
└── src/
    └── modules/
        └── auth/
            └── auth.middlewares.ts
```

Arkos automatically detects and loads these middlewares and uses on the built-in auth router. Is also worth mentioning that you can quickly generate authentication interceptor middlewares by using Arkos built-in cli commands:

```bash
npx arkos generate middlwares --model auth
```

**Shorthand**

```bash
npx arkos g m -m auth
```

> You can, if you wish read more about the built-in Arkos.js cli that was introduced at v1.2-beta at [Built-in Arkos Cli](/docs/cli/built-in-cli).

## Advanced Examples

### Custom Signup Flow with Email Verification

```ts
// src/modules/auth/auth.middlewares.ts
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { catchAsync, AppError } from "arkos/error-handler";
import { emailService } from "../email/email.services.ts";
// emailService extended from EmailService

// Before Signup: Validate and prepare data
export const beforeSignup = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        // Validate email format
        const { email } = req.body;
        if (!isValidEmail(email)) {
            throw new AppError("Invalid email format", 400);
        }

        // Generate verification token
        req.body.verificationToken = crypto.randomBytes(32).toString("hex");
        req.body.verificationTokenExpires = new Date(
            Date.now() + 24 * 60 * 60 * 1000
        ); // 24 hours

        next();
    }
);

// After Signup: Send verification email
export const afterSignup = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        const { email, verificationToken } = req.responseData.data;

        // Send verification email
        // The built-in emailService provides a `send()` method
        // You must implement the method `sendVerificationEmail`
        await emailService.sendVerificationEmail(email, verificationToken);

        // Modify response to hide sensitive data
        delete req.responseData.data.verificationToken;
        delete req.responseData.data.verificationTokenExpires;

        // Add message to response
        req.responseData.message =
            "Signup successful! Please check your email to verify your account.";

        next();
    }
);
```

### Enhanced Login Security

```ts
// Before Login: Track login attempts
export const beforeLogin = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        const { email, username } = req.body;
        const identifier = email || username;

        // Track login attempts in Redis or database
        const attempts = await incrementLoginAttempts(identifier, req.ip);

        // Block if too many failed attempts
        if (attempts > 5) {
            throw new AppError(
                "Too many failed login attempts. Try again later.",
                429
            );
        }

        next();
    }
);

// After Login: Reset login attempts and log activity
export const afterLogin = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        const user = req.responseData;

        // Reset failed login attempts
        await resetLoginAttempts(user.email);

        // Log successful login
        await createLoginAuditLog({
            userId: user.id,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
            timestamp: new Date(),
        });

        next();
    }
);
```

## Customization Capabilities

The interceptor middleware system allows you to:

- Create conditional authentication flows
- Implement multi-factor authentication
- Add custom validation and business rules
- Integrate with external authentication providers
- Implement logging and audit trails
- Customize response formats
- Add hooks for analytics or monitoring

:::tip
When creating custom authentication flows, always ensure that security best practices are followed. Interceptor middlewares are powerful but should be used carefully to avoid introducing security vulnerabilities.
:::

:::info
The response flow in Arkos is handled by the `sendResponse` middleware, which ensures that `req.responseData` and `req.responseStatus` are properly sent to the client. You don't need to call `res.json()` or `res.send()` in your interceptor middlewares unless you want to send something completly different.
:::
