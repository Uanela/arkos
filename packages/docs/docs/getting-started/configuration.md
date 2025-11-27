---
sidebar_position: 3
title: Configuration
---

# Configuration

Arkos.js provides a comprehensive configuration system that allows you to customize every aspect of your application. Starting from v1.4.0+, configuration is split between static settings in `arkos.config.ts` and runtime setup in `arkos.init()`.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

## Configuration Overview

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

In v1.4.0+, Arkos uses a two-file configuration approach:

**`arkos.config.ts`** - Static configuration (CORS, validation, authentication, etc.)

```typescript
import { ArkosConfig } from "arkos";

const arkosConfig: ArkosConfig = {
  middlewares: {
    cors: {
      allowedOrigins: "*",
    },
  },
  authentication: {
    mode: "static",
  },
  validation: {
    resolver: "zod",
  },
  // ... other static configs
};

export default arkosConfig;
```

**`src/app.ts`** - Runtime setup (custom routers, app/server configuration)

```typescript
import arkos from "arkos";
import analyticsRouter from "./routers/analytics.router";

arkos.init({
  use: [analyticsRouter],
  configureApp: (app) => {
    app.set("trust proxy", 1);
  },
  configureServer: (server) => {
    server.setTimeout(30000);
  },
});
```

:::info Why the Split?
Static configurations are loaded once at startup and benefit from better type checking and validation. Runtime setup allows dynamic registration of routers and middlewares during initialization.
:::

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

All configuration is done in `src/app.ts` through the `arkos.init()` method:

```typescript
// src/app.ts
import arkos from "arkos";

arkos.init({
  cors: { allowedOrigins: "*" },
  authentication: { mode: "static" },
  validation: { resolver: "zod" },
  routers: { additional: [customRouter] },
  middlewares: { additional: [customMiddleware] },
  // ... all configuration options
});
```

</TabItem>
</Tabs>

:::tip Full API Reference
For detailed information on all configuration options, see the [Arkos Configuration API Reference](/docs/api-reference/arkos-configuration).
:::

## Configuration Categories

### 1. Basic Application Settings

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```typescript
// arkos.config.ts
import { ArkosConfig } from "arkos";

const arkosConfig: ArkosConfig = {
  welcomeMessage: "Welcome to My API",
  port: 8000,
  host: "localhost",
};

export default arkosConfig;
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// src/app.ts
arkos.init({
  welcomeMessage: "Welcome to My API",
  port: 8000,
  host: "localhost",
});
```

</TabItem>
</Tabs>

### 2. Authentication

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```typescript
// arkos.config.ts
import { ArkosConfig } from "arkos";

const arkosConfig: ArkosConfig = {
  authentication: {
    mode: "static", // or "dynamic" for permission-based RBAC
    login: {
      allowedUsernames: ["email", "username", "profile.nickname"],
      sendAccessTokenThrough: "both", // "cookie", "body", or "both"
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: "30d",
      cookie: {
        secure: true,
        httpOnly: true,
        sameSite: "lax",
      },
    },
  },
};

export default arkosConfig;
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// src/app.ts
arkos.init({
  authentication: {
    mode: "static",
    login: {
      allowedUsernames: ["email", "username", "profile.nickname"],
      sendAccessTokenThrough: "both",
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: "30d",
      cookie: {
        secure: true,
        httpOnly: true,
        sameSite: "lax",
      },
    },
  },
});
```

</TabItem>
</Tabs>

### 3. Validation

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```typescript
// arkos.config.ts
import { ArkosConfig } from "arkos";

const arkosConfig: ArkosConfig = {
  validation: {
    resolver: "zod", // or "class-validator"
    // Only for class-validator
    validationOptions: {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    },
  },
};

export default arkosConfig;
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// src/app.ts
arkos.init({
  validation: {
    resolver: "class-validator",
    validationOptions: {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    },
  },
});
```

</TabItem>
</Tabs>

### 4. File Upload

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```typescript
// arkos.config.ts
import { ArkosConfig } from "arkos";

const arkosConfig: ArkosConfig = {
  fileUpload: {
    baseUploadDir: "./uploads",
    baseRoute: "/api/files",
    restrictions: {
      images: {
        maxCount: 10,
        maxSize: 5 * 1024 * 1024, // 5MB
        supportedFilesRegex: /\.(jpg|jpeg|png|gif)$/i,
      },
      documents: {
        maxCount: 5,
        maxSize: 10 * 1024 * 1024, // 10MB
        supportedFilesRegex: /\.(pdf|doc|docx)$/i,
      },
    },
  },
};

export default arkosConfig;
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// src/app.ts
arkos.init({
  fileUpload: {
    baseUploadDir: "./uploads",
    baseRoute: "/api/files",
    restrictions: {
      images: {
        maxCount: 10,
        maxSize: 5 * 1024 * 1024,
        supportedFilesRegex: /\.(jpg|jpeg|png|gif)$/i,
      },
    },
  },
});
```

</TabItem>
</Tabs>

### 5. Security

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```typescript
// arkos.config.ts
import { ArkosConfig } from "arkos";

const arkosConfig: ArkosConfig = {
  middlewares: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      limit: 100, // Limit each IP to 100 requests per window
      message: "Too many requests, please try again later",
    },
    cors: {
      allowedOrigins: ["https://example.com", "https://api.example.com"],
      options: {
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      },
    },
  },
};

export default arkosConfig;
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// src/app.ts
arkos.init({
  globalRequestRateLimitOptions: {
    windowMs: 15 * 60 * 1000,
    limit: 100,
  },
  cors: {
    allowedOrigins: ["https://example.com", "https://api.example.com"],
    options: {
      credentials: true,
    },
  },
});
```

</TabItem>
</Tabs>

### 6. Middleware

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```typescript
// arkos.config.ts
import { ArkosConfig } from "arkos";

const arkosConfig: ArkosConfig = {
  middlewares: {
    compression: false, // Disable compression
    requestLogger: false, // Disable request logger
    errorHandler: customErrorHandler, // Replace with custom handler
  },
};

export default arkosConfig;

// src/app.ts - Register custom middlewares at runtime
import arkos from "arkos";
import customMiddleware1 from "./middlewares/custom1";
import customMiddleware2 from "./middlewares/custom2";

arkos.init({
  use: [customMiddleware1, customMiddleware2],
});
```

:::info Middleware Registration
Custom middlewares are now registered via the `use` array in `arkos.init()` rather than `middlewares.additional`. This provides a cleaner API aligned with Express conventions.
:::

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// src/app.ts
arkos.init({
  middlewares: {
    additional: [customMiddleware1, customMiddleware2],
    disable: ["request-logger"],
    replace: {
      globalErrorHandler: customErrorHandler,
    },
  },
});
```

</TabItem>
</Tabs>

### 7. Routers

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```typescript
// arkos.config.ts
import { ArkosConfig } from "arkos";

const arkosConfig: ArkosConfig = {
  routers: {
    strict: true, // Enable strict mode for enhanced security
    welcomeRoute: false, // Disable welcome endpoint
  },
};

export default arkosConfig;

// src/app.ts - Register custom routers at runtime
import arkos from "arkos";
import analyticsRouter from "./routers/analytics.router";
import reportsRouter from "./routers/reports.router";

arkos.init({
  use: [analyticsRouter, reportsRouter],
});
```

:::info Router Registration
Custom routers are now registered via the `use` array in `arkos.init()` rather than `routers.additional`. This provides better separation between static configuration and dynamic registration.
:::

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// src/app.ts
arkos.init({
  routers: {
    strict: true,
    additional: [customRouter],
    disable: ["welcome-endpoint"],
    replace: {
      authRouter: customAuthRouter,
    },
  },
});
```

</TabItem>
</Tabs>

### 8. Advanced Configuration

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```typescript
// src/app.ts
import arkos from "arkos";

arkos.init({
  /**
   * Configure the Express app before Arkos sets up its middleware stack
   * Useful for setting Express-specific options
   */
  configureApp: (app) => {
    // Custom express app configuration
    app.set("trust proxy", 1);
    app.set("view engine", "ejs");
    app.disable("x-powered-by");
  },

  /**
   * Configure the HTTP server after it's created
   * Useful for setting timeouts, WebSocket servers, etc.
   */
  configureServer: (server) => {
    // Custom HTTP server configuration
    server.timeout = 10000;
    server.keepAliveTimeout = 65000;
  },
});
```

:::tip When to Use

- **`configureApp`**: Use when you need to configure Express-specific settings before Arkos middleware stack is loaded
- **`configureServer`**: Use when you need to configure the HTTP server (timeouts, WebSocket integration, etc.)
  :::

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// src/app.ts
arkos.init({
  configureApp: (app) => {
    // Custom express app configuration
    app.set("trust proxy", 1);
  },
  configureServer: (server) => {
    // Custom HTTP server configuration
    server.timeout = 10000;
  },
});
```

</TabItem>
</Tabs>

## Environment-Based Configuration

Arkos.js supports environment-specific configuration through environment variables. These work across all versions:

```bash
# Database connection (required)
DATABASE_URL=postgresql://username:password@localhost:5432/dbname

# JWT authentication (required if using auth)
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

# File upload configuration
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads
```

### Environment Variable Files

Arkos loads environment variables in this order (highest priority first):

1. **Process environment variables** (system-level)
2. **`.env`** - Main environment file
3. **`.env.local`** - Local overrides (not committed)
4. **`.env.[NODE_ENV].local`** - Environment-specific local overrides
5. **`.env.[NODE_ENV]`** - Environment-specific variables
6. **`.env.defaults`** - Default values (lowest priority)

## Configuration Precedence

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

Configuration values are loaded in this order (highest priority first):

1. Values passed directly to `arkos.init()` (runtime setup)
2. Values in `arkos.config.ts` (static configuration)
3. Environment variables
4. Default values provided by Arkos.js

**Example precedence:**

```typescript
// arkos.config.ts
const arkosConfig: ArkosConfig = {
  port: 3000, // This will be used...
};

export default arkosConfig;

// .env
PORT = 8000; // ...unless this is set

// Or system environment
// PORT=9000 npm start // This takes highest priority
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

Configuration values are loaded in this order (highest priority first):

1. Values passed directly to `arkos.init()`
2. Environment variables
3. Default values provided by Arkos.js

</TabItem>
</Tabs>

## Migration from v1.3.0 to v1.4.0+

If you're upgrading from v1.3.0, here's how to migrate your configuration:

### Step 1: Create `arkos.config.ts`

Create a new `arkos.config.ts` file in your project root and move static configurations:

```typescript
// arkos.config.ts
import { ArkosConfig } from "arkos";

const arkosConfig: ArkosConfig = {
  // Move these from arkos.init():
  port: 3000,
  authentication: { mode: "static" },
  validation: { resolver: "zod" },
  fileUpload: { baseUploadDir: "./uploads" },
  middlewares: {
    cors: { allowedOrigins: ["https://example.com"] },
    rateLimit: { windowMs: 60000, limit: 100 },
  },
  routers: { strict: false },
};

export default arkosConfig;
```

### Step 2: Update `src/app.ts`

Keep only runtime configurations in `arkos.init()`:

```typescript
// src/app.ts
import arkos from "arkos";
import customRouter from "./routers/custom.router";

arkos.init({
  // Replace routers.additional with use array
  use: [customRouter],

  // Keep configureApp and configureServer
  configureApp: (app) => {
    app.set("trust proxy", 1);
  },
  configureServer: (server) => {
    server.timeout = 30000;
  },
});
```

### Step 3: Update Middleware/Router Registration

**Before (v1.3.0):**

```typescript
arkos.init({
  middlewares: {
    additional: [customMiddleware],
  },
  routers: {
    additional: [customRouter],
  },
});
```

**After (v1.4.0+):**

```typescript
arkos.init({
  use: [customMiddleware, customRouter],
});
```

### Step 4: Update Middleware Configuration

**Before (v1.3.0):**

```typescript
arkos.init({
  globalRequestRateLimitOptions: { windowMs: 60000, limit: 100 },
  jsonBodyParserOptions: { limit: "10mb" },
  compressionOptions: { level: 6 },
});
```

**After (v1.4.0+):**

```typescript
// arkos.config.ts
const arkosConfig: ArkosConfig = {
  middlewares: {
    rateLimit: { windowMs: 60000, limit: 100 },
    expressJson: { limit: "10mb" },
    compression: { level: 6 },
  },
};
```

## Complete Configuration Examples

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```typescript
// arkos.config.ts
import { ArkosConfig } from "arkos";

const arkosConfig: ArkosConfig = {
  port: 3000,
  host: "0.0.0.0",
  welcomeMessage: "Welcome to Our API",

  authentication: {
    enabled: true,
    mode: "static",
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: "7d",
    },
  },

  validation: {
    resolver: "zod",
    strict: false,
  },

  fileUpload: {
    baseUploadDir: "/uploads",
    restrictions: {
      images: {
        maxCount: 5,
        maxSize: 5 * 1024 * 1024,
      },
    },
  },

  middlewares: {
    cors: {
      allowedOrigins: ["https://myapp.com"],
    },
    rateLimit: {
      windowMs: 60000,
      limit: 500,
    },
    compression: {
      level: 6,
    },
  },

  routers: {
    strict: "no-bulk",
  },

  email: {
    host: process.env.EMAIL_HOST,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  },

  swagger: {
    mode: "zod",
    enableAfterBuild: false,
  },
};

export default arkosConfig;
```

```typescript
// src/app.ts
import arkos from "arkos";
import analyticsRouter from "./routers/analytics.router";
import customMiddleware from "./middlewares/custom";

arkos.init({
  use: [analyticsRouter, customMiddleware],
  configureApp: (app) => {
    app.set("trust proxy", 1);
  },
  configureServer: (server) => {
    server.setTimeout(30000);
  },
});
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// src/app.ts
import arkos from "arkos";
import analyticsRouter from "./routers/analytics.router";
import customMiddleware from "./middlewares/custom";

arkos.init({
  port: 3000,
  host: "0.0.0.0",
  welcomeMessage: "Welcome to Our API",

  authentication: {
    mode: "static",
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: "7d",
    },
  },

  validation: {
    resolver: "zod",
  },

  fileUpload: {
    baseUploadDir: "/uploads",
    restrictions: {
      images: {
        maxCount: 5,
        maxSize: 5 * 1024 * 1024,
      },
    },
  },

  globalRequestRateLimitOptions: {
    windowMs: 60000,
    limit: 500,
  },

  cors: {
    allowedOrigins: ["https://myapp.com"],
  },

  routers: {
    strict: "no-bulk",
    additional: [analyticsRouter],
  },

  middlewares: {
    additional: [customMiddleware],
  },

  email: {
    host: process.env.EMAIL_HOST,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  },

  swagger: {
    mode: "zod",
    enableAfterBuild: false,
  },

  configureApp: (app) => {
    app.set("trust proxy", 1);
  },

  configureServer: (server) => {
    server.setTimeout(30000);
  },
});
```

</TabItem>
</Tabs>

## Related Documentation

- **[Arkos Configuration API Reference](/docs/api-reference/arkos-configuration)** - Complete configuration options reference
- **[Authentication System](/docs/core-concepts/authentication-system)** - Learn about authentication configuration
- **[Request Data Validation](/docs/core-concepts/request-data-validation)** - Configure validation options
- **[File Upload Guide](/docs/core-concepts/file-uploads)** - File upload configuration details
- **[Middleware Stack](/docs/advanced-guide/middleware-stack)** - Understanding middleware execution order
