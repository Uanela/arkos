---
sidebar_position: 5
---

# Global Error Handler

**Arkos** includes a powerful global error handling system that automatically processes all errors thrown within your application, transforms them into consistent response formats, and manages environment-specific behavior. This centralized approach simplifies error management and ensures a consistent experience for API consumers.

## How It Works

The global error handler from **Arkos** is an Express middleware that captures all errors passed to the `next()` function throughout your application. It processes these errors differently depending on your environment (development vs. production), maps specific database and authentication errors to friendly messages, and sends appropriate responses to clients.

## Key Features

- **Environment-Aware Responses**: Detailed errors in development, sanitized errors in production
- **Prisma Error Mapping**: Converts complex Prisma database errors to understandable messages
- **JWT Error Handling**: Manages token-related authentication errors
- **Operational vs Programming Error Distinction**: Handles expected vs unexpected errors differently
- **Graceful Shutdown Handling**: Manages process termination appropriately by environment
- **Consistent API Response Format**: Standardizes error responses across your entire API

## Response Structure

### Development Environment

In development, responses provide detailed information to aid debugging:

```json
{
  "message": "User not found with id: 123",
  "error": {
    "statusCode": 404,
    "status": "fail",
    "isOperational": true,
    "code": "USER_NOT_FOUND",
    "meta": { "userId": "123" }
  },
  "stack": [
    "AppError: User not found with id: 123",
    "    at findOne (/src/modules/base/base.controller.ts:25:11)",
    "    at processTicksAndRejections (node:internal/process/task_queues:95:5)"
  ]
}
```

### Production Environment

In production, responses are sanitized to avoid exposing sensitive information:

```json
{
  "status": "fail",
  "message": "User not found with id: 123"
}
```

For non-operational errors in production, a generic message is returned:

```json
{
  "status": "error",
  "message": "Something went wrong!"
}
```

## Error Categories Handled

The global error handler intelligently processes different types of errors:

### Authentication Errors

- JWT validation failures
- Expired tokens
- Authorization issues

### Database Errors

- Connection issues
- Constraints violations
- Record not found scenarios
- Schema validation problems

### Prisma-Specific Errors

- Unique constraint violations
- Foreign key constraint failures
- Database connection errors
- Migration issues

### Network Errors

- Connection timeouts
- Server unreachable errors

## Integration with AppError and catchAsync

The error handler works seamlessly with the `AppError` class and `catchAsync` utility:

1. Your route handlers throw `AppError` instances when operational errors occur, [read more](/docs/api-reference/the-app-error-class).
2. `catchAsync` captures both expected and unexpected errors, [read more](/docs/api-reference/the-catch-async-function).
3. The global error handler processes these errors and formats appropriate responses

## Usage Example

The global error handler is automatically applied to your application when using Arkos. You don't need to manually set it up - it's included in the framework's middleware stack.

To take advantage of it, simply use the `AppError` class and `catchAsync` utility in your route handlers:

```typescript
import { AppError, catchAsync } from "arkos/error-handler";
import { prisma } from "../../utils/prisma";

export const getUserById = catchAsync(async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!user)
    throw new AppError(
      "User not found",
      404,
      { userId: req.params.id },
      "USER_NOT_FOUND"
    );

  res.status(200).json({
    status: "success",
    data: { user },
  });
});
```

## Configuration

The global error handler uses the `NODE_ENV` environment variable to determine whether to run in development or production mode:

- When `NODE_ENV !== "production"`, detailed error information is provided
- When `NODE_ENV === "production"`, sanitized error responses are sent

## Advanced: Graceful Shutdown

The error handler module also includes graceful shutdown logic for handling process termination:

1. In development: Process exits immediately on SIGTERM
2. In production/staging: Server closes gracefully with appropriate logging

This ensures that requests in process can complete before the application shuts down in production environments.

## Best Practices

1. **Always Use AppError**: Throw `AppError` instances with appropriate status codes
2. **Be Specific**: Include meaningful error messages and metadata
3. **Set isOperational**: Mark expected errors as operational (`isOperational: true`)
4. **Include Error Codes**: Use consistent error codes for client-side handling
5. **Mind Sensitive Data**: Don't include passwords or tokens in error metadata
