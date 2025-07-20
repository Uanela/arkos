---
sidebar_position: 11
---

# Modifying Built-in Middlewares

**Arkos** provides a flexible middleware system that allows you to customize how HTTP requests are processed. This guide explains how to replace or disable any of the built-in middlewares to tailor the framework to your specific requirements.

## Understanding Middleware Configuration

Arkos's middleware configuration is managed through the `middlewares` property in the `ArkosConfig` object when initializing your application:

```typescript
import arkos from "arkos";

arkos.init({
  middlewares: {
    // Middleware configuration options
    disable: [], // Array of middlewares to disable
    replace: {}, // Object of middlewares to replace
    additional: [], // Array of additional middlewares to add
  },
  // other configs
});
```

## Disabling Built-in Middlewares

You can completely disable any built-in middleware by adding its identifier to the `middlewares.disable` array:

```typescript
arkos.init({
  middlewares: {
    disable: [
      "compression",
      "cors",
      "request-logger",
      // Add any other middlewares you want to disable
    ],
  },
});
```

### Available Middleware Identifiers

The following middleware identifiers can be disabled:

- `"compression"` - HTTP response compression
- `"global-rate-limit"` - Global request rate limiting
- `"auth-rate-limit"` - Authentication endpoints rate limiting
- `"cors"` - Cross-Origin Resource Sharing
- `"express-json"` - JSON body parser
- `"cookie-parser"` - Cookie parser
- `"query-parser"` - Query string parser
- `"database-connection"` - Database connectivity validation
- `"request-logger"` - Request logging
- `"global-error-handler"` - Global error handling

:::info
More built-in middlewares may be added on future releases, if you wish to have a given middleware added as built-in head down to our [Github](https://github.com/uanela/arkos).
:::

## Replacing Built-in Middlewares

If you want to keep a middleware's functionality but customize its behavior, you can replace it with your own implementation:

```ts
import express from "express";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

arkos.init({
  middlewares: {
    replace: {
      // Replace the default request logger with Morgan
      requestLogger: morgan("combined"),

      // Custom rate limiting implementation
      globalRateLimit: rateLimit({
        windowMs: 5000, // 15 minutes
        limit: 100, // 500 requests per windowMs
        message: "Too many requests, please try again later.",
      }),

      // Custom error handler
      globalErrorHandler: (err, req, res, next) => {
        console.error(err);
        res.status(500).json({
          error: "Custom error handler",
          message: err.message,
        });
      },
    },
  },
});
```

### Available Replaceable Middlewares

The following middlewares can be replaced with custom implementations:

- `compression` - HTTP response compression
- `globalRateLimit` - Global rate limiting
- `authRateLimit` - Authentication endpoints rate limiting
- `cors` - CORS configuration
- `expressJson` - JSON body parser
- `cookieParser` - Cookie parser
- `queryParser` - Query string parser
- `databaseConnection` - Database connection check
- `requestLogger` - Request logging
- `globalErrorHandler` - Global error handling

## Adding Custom Middlewares

In addition to replacing or disabling built-in middlewares, you can add your own custom middlewares to the stack:

```typescript
import helmet from "helmet";
import xss from "xss-clean";

arkos.init({
  middlewares: {
    additional: [
      helmet(), // Add security headers
      xss(), // Prevent XSS attacks
      (req, res, next) => {
        // Custom middleware logic
        req.customProperty = "some value";
        next();
      },
    ],
  },
});
```

### Middleware Execution Order

The execution order of middlewares in Arkos is:

1. Built-in middlewares (that aren't disabled or replaced)
2. Replaced middlewares (in the same position as the ones they replace)
3. Additional middlewares (added to the end of the middleware stack)

## Accessing Express App Before Middleware Configuration

If you need to access the Express app instance before any Arkos middleware is applied, use the `configureApp` function:

```typescript
arkos.init({
  configureApp: async (app) => {
    // Access Express app before any Arkos middleware is applied
    app.use(someEarlyMiddleware);
    app.set("trust proxy", true);
    // Other Express app configurations
  },
  // Regular middleware configuration
  middlewares: {
    // ...
  },
});
```

## Common Use Cases

### Implementing a Custom Logger

```typescript
import winston from "winston";
import expressWinston from "express-winston";

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

arkos.init({
  middlewares: {
    replace: {
      requestLogger: expressWinston.logger({
        winstonInstance: logger,
        meta: true,
        msg: "HTTP {{req.method}} {{req.url}}",
        expressFormat: true,
        colorize: true,
      }),
    },
  },
});
```

### Implementing Custom CORS Settings

```typescript
import cors from "cors";

arkos.init({
  middlewares: {
    replace: {
      cors: cors({
        origin: ["https://example.com", "https://subdomain.example.com"],
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
        maxAge: 86400, // 24 hours
      }),
    },
  },
});
```

### Implementing Custom Error Handling

```typescript
arkos.init({
  middlewares: {
    replace: {
      globalErrorHandler: (err, req, res, next) => {
        // Log error to monitoring service
        if (process.env.NODE_ENV === "production") {
          sendToMonitoringService(err);
        } else {
          console.error(err);
        }

        // Handle different types of errors
        if (err.name === "ValidationError") {
          return res.status(400).json({
            status: "error",
            type: "validation",
            message: "Validation failed",
            details: err.details,
          });
        }

        if (err.name === "UnauthorizedError") {
          return res.status(401).json({
            status: "error",
            type: "auth",
            message: "Authentication required",
          });
        }

        // Default error response
        res.status(err.statusCode || 500).json({
          status: "error",
          message: err.message || "Internal server error",
          ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
        });
      },
    },
  },
});
```

## Best Practices

1. **Be Cautious**: Disabling or replacing core middlewares like `express-json`, `database-connection` or `global-error-handler` can break your application if not implemented correctly.

2. **Test Thoroughly**: Always test your custom middleware implementations thoroughly before deploying to production.

3. **Consider Security**: When replacing security-related middlewares (like CORS or rate limiting), ensure your custom implementation maintains or improves the security posture.

4. **Logging**: Maintain proper logging when replacing the request logger middleware to ensure you can still effectively debug issues.

5. **Performance**: Be mindful of performance implications when adding additional middlewares, especially those that perform heavy operations.

## Conclusion

Arkos provides a flexible middleware system that allows you to customize how HTTP requests are processed. By understanding how to disable, replace, or add middlewares, you can tailor the framework to your specific requirements while maintaining the core functionality that makes Arkos powerful.

For additional information on built-in middlewares, refer to the [Built-in Middlewares Guide](/docs/guide/built-in-middlewares) in detail.
