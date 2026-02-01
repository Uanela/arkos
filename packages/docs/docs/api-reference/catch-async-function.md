---
sidebar_position: 4
title: Catch Async
---

# Catch Async Function

The `catchAsync` function is a utility function in the **Arkos** that wraps asynchronous request handlers and middleware to automatically catch errors and forward them to Express's error handling mechanism. This eliminates the need for repetitive try-catch blocks in every route handler, creating cleaner code and ensuring consistent error handling.

:::tip
You can use the function even to catch non async errors by simply letting the function throw it.
:::

## Purpose

The `catchAsync` function serves several important purposes:

1. **Error Propagation**: Automatically forwards errors to Arkos's global error handler (built on top of Express global erro handler).
2. **Code Cleanliness**: Eliminates repetitive try-catch blocks in route handlers
3. **Preventing Unhandled Rejections**: Ensures all Promise rejections are properly caught
4. **Centralized Error Handling**: Works with `AppError` to create a cohesive error management system, [read more about AppError](/docs/api-reference/the-app-error-class).
5. **Developer Experience**: Reduces boilerplate code and potential for human error

As you are reading about the `catchAsync` maybe you may want to also read about the **Arkos Global Error Handler** [clicking here](/docs/core-concepts/global-error-handler).

## Function Signature

```ts
const catchAsync =
    (fn: ArkosRequestHandler) =>
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        try {
            await fn(req, res, next);
        } catch (err) {
            next(err);
        }
    };
```

## Parameters

| Parameter | Type                  | Description                                                                |
| --------- | --------------------- | -------------------------------------------------------------------------- |
| `fn`      | `ArkosRequestHandler` | The async Express/Arkos route handler or middleware function to be wrapped |

## Return Value

Returns a new async function that:

1. Takes the ArkosRequest, ArkosResponse and ArkosNextFunction extended from Express parameters (`req`, `res`, `next`)
2. Calls the original function within a try-catch block
3. Forwards any caught errors to Arkos's error handling middleware using `next(err)`

## Usage Examples

### Basic Route Handler

```ts
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { catchAsync } from "arkos/error-handler";
import { prisma } from "../../utils/prisma";

// Without try-catch boilerplate
export const getAllUsers = catchAsync(async (req, res, next) => {
    const users = await prisma.user.findMany();

    res.status(200).json({
        status: "success",
        results: users.length,
        data: { users },
    });
});
```

As shown below you do not need a try-catch block when using catchAsync, neither forwarding the error to global handler nor even about throwing errors sometimes (Just if you would like a specific message), why??? because **Arkos** handles it for you by providing a set of meaningfull error messages and status code. [read more about](/docs/core-concepts/global-error-handler.md)

### With Custom Error Throwing

```ts
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { catchAsync } from "arkos/error-handler";
import { prisma } from "../../utils/prisma";

export const getUserById = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        const user = await prisma.user.findOne({
            where: { id: req.params.id },
        });

        if (!user) {
            throw new AppError("User not found", 404, {
                userId: req.params.id,
            });
        }

        res.status(200).json({
            status: "success",
            data: { user },
        });
    }
);
```

### In Middleware

```ts
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { AppError, catchAsync } from "arkos/error-handler";

export const protectRoute = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        // Get token from request headers
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            throw new AppError("Not authenticated. Please log in.", 401);
        }

        // Verify token
        const decoded = await verifyToken(token);

        // Add user to request object
        req.user = decoded;

        // Continue to next middleware/handler
        next();
    }
);
```

:::info
Rember that many of the examples mentioned above are alreday handled my **Arkos** behind the scenes for these are basic errors, this way you can focus on what really matters.
:::

## Error Handling Flow

When using `catchAsync`, the error handling flow works like this:

1. Your route handler or middleware executes inside the try block
2. If an error occurs (throw or Promise rejection), it's caught automatically
3. The error is passed to Express's `next` function
4. Express forwards the error to your global error handling middleware
5. The global error handler processes the error (ideally checking for `AppError` instances)

## Benefits

### Why Use catchAsync?

1. **DRY Principle**: Eliminates repetitive try-catch blocks across your codebase
2. **Reliability**: Ensures no async errors are missed or unhandled
3. **Consistency**: All errors are channeled through the same error handling process
4. **Readability**: Makes route handlers cleaner and focused on business logic
5. **Maintainability**: Centralizes error handling logic in one place

## Integration with AppError

`catchAsync` works best when paired with the `AppError` class, [read more](/docs/api-reference/the-app-error-class) about the `AppError` class:

```typescript
import { AppError, catchAsync } from "arkos/error-handler";
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";

// Controller function
export const updateUser = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        // Validation
        if (!req.body.name && !req.body.email) {
            throw new AppError("Please provide name or email to update", 400);
        }

        // Business logic
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true,
            }
        );

        // Resource check
        if (!updatedUser) {
            throw new AppError("User not found", 404, {
                userId: req.params.id,
            });
        }

        // Response
        res.status(200).json({
            status: "success",
            data: { user: updatedUser },
        });
    }
);
```

## Best Practices

1. **Wrap All Async Handlers**: Use `catchAsync` for all async route handlers and middleware
2. **Paired with AppError**: Throw `AppError` instances inside your wrapped functions
3. **Express Setup**: Make sure you have a global error handler middleware registered
4. **Error Specificity**: Throw specific errors with appropriate status codes
5. **Clean Architecture**: Consider creating service layers wrapped with their own error handling
