---
sidebar_position: 11
---

# Built-in Routers

Arkos provides several built-in routers that handle common API functionalities out of the box. This document outlines each router, its purpose, and how to configure it.

:::note
The following code snippets represent Arkos's behind-the-scenes implementation of each built-in router.
:::

## Welcome Endpoint Router

A simple welcome endpoint that responds with a configurable message.

```typescript
app.get("/api", (req, res) => {
  res.status(200).json({ message: arkosConfig.welcomeMessage });
});
```

**Configuration Options:**

- Customize the welcome message via `arkosConfig.welcomeMessage`

**Customization:**

- Can be disabled or replaced with your own implementation
- See [Modifying Built-in Routers Guide](/docs/api-reference/built-in-routers#modifying-built-in-routers)

## File Upload Router

Handles file uploads, serving static files, and file deletion operations.

**Key Endpoints:**

- `GET /api/uploads/:fileType/:fileName` - Serves uploaded files
- `POST /api/uploads/:fileType` - Uploads a file
- `DELETE /api/uploads/:fileType/:fileName` - Deletes a file

**Configuration Options:**

- Set base route via `fileUpload.baseRoute` (default: `/api/uploads`)
- Configure upload directory via `fileUpload.baseUploadDir` (default: `uploads`)
- Customize static file serving with `fileUpload.expressStaticOptions`

**Customization:**

- Can be disabled or replaced with your own implementation
- See [Modifying Built-in Routers Guide](/docs/api-reference/built-in-routers#modifying-built-in-routers)

**Learn More:**

- [File Upload Guide](/docs/core-concepts/file-uploads#basic-usage)

## Authentication Router

Provides authentication endpoints for user management.

**Key Endpoints:**

- `GET|PATCH|DELETE /api/users/me` - Get, update, or delete current user
- `POST /api/auth/login` - User login
- `DELETE /api/auth/logout` - User logout
- `POST /api/auth/signup` - User registration
- `POST /api/auth/update-password` - Update user password

**Configuration Options:**

- Rate limiting via `arkosConfig.authentication.requestRateLimitOptions`
- Only enabled when `arkosConfig.authentication` is provided

**Customization:**

- Can be disabled or replaced with your own implementation
- See [Modifying Built-in Routers Guide](/docs/api-reference/built-in-routers#modifying-built-in-routers)

**Learn More:**

- [Authentication Guide](/docs/guide/authentication-system/sending-authentication-requests#authentication-endpoints)

## Prisma Models Router

Automatically generates RESTful API endpoints for all your Prisma models.

**Generated Endpoints for Each Model:**

- `GET /api/[pluralized-model-name]` - List all resources
- `POST /api/[pluralized-model-name]` - Create a resource
- `GET /api/[pluralized-model-name]/:id` - Get a specific resource
- `PATCH /api/[pluralized-model-name]/:id` - Update a specific resource
- `DELETE /api/[pluralized-model-name]/:id` - Delete a specific resource
- `POST /api/[pluralized-model-name]/many` - Create multiple resources
- `PATCH /api/[pluralized-model-name]/many` - Update multiple resources
- `DELETE /api/[pluralized-model-name]/many` - Delete multiple resources

**Configuration Options:**

- Customize with model-specific middlewares and auth configs
- Configure Prisma query options for each operation

**Customization:**

- Can be disabled or replaced with your own implementation
- See [Customizing Prisma Models Routers Guide](/docs/guide/adding-custom-routers#2-customizing-prisma-model-routers)

**Learn More:**

- [Endpoints Auto-Generation](/docs/core-concepts/endpoints-auto-generation)
- [Sending Requests](/docs/guide/sending-requests)

## Available Resources & Routes Router

Provides endpoints to discover available API resources and routes.

**Key Endpoints:**

- `GET /api/available-routes` - Lists all available API routes
- `GET /api/available-resources` - Lists all available API resources

**Learn More:**

- [Checking Available Routes](/docs/core-concepts/endpoints-auto-generation#checking-availabe-routes)
- [Checking Available Resources](/docs/core-concepts/endpoints-auto-generation#checking-availabe-resources)

## Modifying Built-in Routers

To disable or replace built-in routers:

```ts
// src/app.ts
import arkos from "arkos";

arkos.init({
  routers: {
    // Disable specific routers
    disable: ["welcome-endpoint", "file-uploader"],

    // Replace routers with custom implementations
    replace: {
      authRouter: async (config) => {
        // Your custom auth router implementation
        return customAuthRouter;
      },
    },
  },
  // other configs
});
```

See [Customizing Prisma Models Routers](/docs/guide/adding-custom-routers#2-customizing-prisma-model-routers) to learn how to customize without disabling or replacing the prisma models routers.

## Adding Custom Routers

To add your own routers to the stack:

```ts
// src/app.ts
import arkos from "arkos";
import myCustomRouter from "./routers/my-custom.router";

arkos.init({
  routers: {
    additional: [myCustomRouter],
  },
  // other configs
});
```

see full guide about [Adding Custom Routers In Arkos](/docs/guide/adding-custom-routers)

## Recommended Readings

- [Customizing Prisma Models Routers](/docs/guide/adding-custom-routers#2-customizing-prisma-model-routers)
- [Built-in Middlewares](/docs/guide/built-in-middlewares)
- [Authentication System](/docs/core-concepts/built-in-authentication-system)
- [File Upload Guide](/docs/core-concepts/file-uploads)
