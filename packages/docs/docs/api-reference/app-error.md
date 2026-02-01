---
sidebar_position: 5
---

# App Error Guide

`AppError` is a specialized error class in the `Arkos` designed to standardize error handling across your application. It extends JavaScript's native `Error` class and adds properties that make it suitable for API and web application error management.

## Purpose

The `AppError` class serves several important purposes:

1. **Standardized Error Format**: Creates a consistent error structure throughout your application
2. **HTTP Integration**: Maps errors directly to appropriate HTTP status codes
3. **Operational vs Programming Errors**: Distinguishes between operational errors (expected problems like invalid input) and programming errors (bugs)
4. **Rich Error Information**: Provides context through metadata and error codes
5. **Client-Friendly Responses**: Facilitates creating meaningful error responses for API clients

## Class Properties

| Property        | Type                             | Description                                                                |
| --------------- | -------------------------------- | -------------------------------------------------------------------------- |
| `message`       | `string`                         | Human-readable error description                                           |
| `statusCode`    | `number`                         | HTTP status code (e.g., 400, 404, 500)                                     |
| `status`        | `string`                         | Status type derived from status code (`"fail"` for 4xx, `"error"` for 5xx) |
| `isOperational` | `boolean`                        | Indicates if error is operational (expected) vs programming error          |
| `code`          | `string` (optional)              | Custom error code for categorization and client reference                  |
| `meta`          | `Record<string, any>` (optional) | Additional contextual information about the error                          |
| `missing`       | `boolean`                        | Flag to indicate if a resource is missing (defaults to `false`)            |

## Usage Examples

### Basic Usage

```typescript
import { AppError } from "arkos/error-handler";

// In a route handler or service
if (!userId) {
    throw new AppError("User ID is required", 400);
}
```

### With Error Code and Metadata

```typescript
import { AppError } from "arkos/error-handler";

// Providing additional context
throw new AppError(
    "User not found",
    404,
    { userId: requestedId, requestTime: new Date() },
    "USER_NOT_FOUND"
);
```

:::tip Hint
If throwing an error while processing a request you may want to wrap your async or even normal function (that throws an error) inside `catchAsync` ([read more about](/docs/api-reference/the-catch-async-function)), so that you can harness the `Built-in Error Handler` ([read more about](/docs/core-concepts/error-handling)).

:::

### With Async Error Handling

```typescript
import { AppError, catchAsync } from "arkos/error-handler";
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";

export const getUserById = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        const user = await userService.findById(req.params.id);

        if (!user) {
            throw new AppError(
                "User not found",
                404,
                { userId: req.params.id },
                "USER_NOT_FOUND"
            );
        }

        res.status(200).json({
            status: "success",
            data: { user },
        });
    }
);
```

You can read more about the `catchAsync` function [here](/docs/api-reference/the-catch-async-function).

## Error Handling Workflow

1. **Throw AppError instances** in your controllers, services, or middleware
2. Use the `catchAsync` utility for async functions to automatically catch and forward errors
3. Implement a global error handler middleware that processes `AppError` instances
4. The error handler can distinguish between operational errors (`isOperational: true`) and programming errors

## Why Use AppError?

1. **Consistency**: Standardizes error handling across your entire application
2. **Readability**: Makes error causes clearer in logs and debugging
3. **Security**: Helps prevent leaking sensitive error details to clients
4. **Client Experience**: Enables generating user-friendly error messages
5. **Maintenance**: Makes error patterns easier to identify and fix
6. **API Design**: Follows REST best practices for error responses

## Best Practices

1. **Be Specific**: Use descriptive error messages that help identify the issue
2. **Use Proper Status Codes**: Match HTTP semantics (400 for bad requests, 404 for not found, etc.)
3. **Include Context**: Add relevant data in the `meta` object for debugging
4. **Consistent Codes**: Establish a system for your error codes (e.g., `RESOURCE_OPERATION_ISSUE`)
5. **Set Operational Flag**: Only set `isOperational: true` for expected errors (by default).
