---
sidebar_position: 3
title: Configuration (new)
---

import SmallTag from "../components/small-tag"

# Configuration <SmallTag>New</SmallTag>

Arkos.js provides a comprehensive configuration system that allows you to customize every aspect of your application. The configuration is passed to the `arkos.init()` method in your application entry point.

## Structure

```typescript
// src/app.ts
import arkos from "arkos";

arkos.init({
    // Configuration options go here
});
```

## Key Categories

### 1. Basic Application Settings

```typescript
{
  welcomeMessage: "Welcome to My API", // Custom welcome message
}
```

### 2. Authentication

```typescript
{
  authentication: {
    mode: "static" | "dynamic", // RBAC mode
    login: {
      allowedUsernames: ["email", "username", "profile.nickame"], // Fields to use as username
      sendAccessTokenThrough: "both" // How to return tokens
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: "30d",
      cookie: {
        secure: true,
        httpOnly: true,
        sameSite: "lax"
      }
    }
  }
}
```

### 3. Validation

```typescript
{
  validation: {
    resolver: "class-validator", // or "zod"

    // only for class-validator
    validationOptions: {
      whitelist: true,
      forbidNonWhitelisted: true
    }
  }
}
```

### 4. File Upload

```typescript
{
  fileUpload: {
    baseUploadDir: "./uploads",
    baseRoute: "/api/files",
    restrictions: {
      images: {
        maxCount: 10,
        maxSize: 5 * 1024 * 1024, // 5MB
        supportedFilesRegex: /\.(jpg|jpeg|png|gif)$/i
      }
    }
  }
}
```

### 5. Security

```typescript
{
  globalRequestRateLimitOptions: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100 // Limit each IP to 100 requests per window
  },
  cors: {
    allowedOrigins: ["https://example.com", "https://api.example.com"],
    options: {
      credentials: true
    }
  }
}
```

### 6. Middleware

```typescript
{
  middlewares: {
    additional: [customMiddleware1, customMiddleware2],
    disable: ["request-logger"], // Disable specific built-in middlewares
    replace: {
      globalErrorHandler: customErrorHandler
    }
  }
}
```

### 7. Routers

```typescript
{
  routers: {
    strict: true, // Enable strict mode for enhanced security
    additional: [customRouter],
    disable: ["welcome-endpoint"], // Disable specific routers
    replace: {
      authRouter: customAuthRouter
    }
  }
}
```

### 8. Advanced Configuration

```typescript
{
  configureApp: (app) => {
    // Custom express app configuration
    app.set('trust proxy', 1);
  },
  configureServer: (server) => {
    // Custom HTTP server configuration
    server.timeout = 10000;
  }
}
```

## Environment-Based Configuration

Arkos.js also supports environment-specific configuration through environment variables, below you've some examples:

```bash
# Database connection (required)
DATABASE_URL=postgresql://username:password@localhost:5432/dbname

# JWT authentication (required in production if using auth)
JWT_SECRET="your-super-secret-jwt-key"

# Optional JWT configurations
JWT_EXPIRES_IN=30d
JWT_COOKIE_SECURE=true
JWT_COOKIE_HTTP_ONLY=true
JWT_COOKIE_SAME_SITE=lax

# Optional Server configuration
PORT=8000
NODE_ENV=development
HOST=localhost
```

## Configuration Precedence

Configuration values are loaded in this order (highest priority first):

1. Values passed directly to `arkos.init()`
2. Environment variables
3. Default values provided by Arkos.js

## Upcoming Changes in Arkos `v1.4-beta`

In version `v1.4-beta`, configuration will be split between:

- **Static configurations** (cors, validation, etc.) in `arkos.config.ts`
- **Dynamic configurations** (middleware, routers, etc) in `arkos.init()`

