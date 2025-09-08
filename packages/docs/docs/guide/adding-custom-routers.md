---
sidebar_position: 5
---

# Adding Custom Routers

Arkos provides a powerful routing system with two main approaches:

1. **Custom Routers**: For creating entirely new endpoints separate from your Prisma models
2. **Customizing Prisma Model Routers**: For extending or modifying the auto-generated endpoints for your Prisma models

This guide covers both approaches and explains how they work together in your Arkos application.

## 1. Working With Custom Routers

Custom routers allow you to define specialized API endpoints that may not fit into the auto-generated model endpoints pattern.

### When to Use Custom Routers

Custom routers are perfect for:

- Complex business logic operations that span multiple models
- Custom authentication flows or specialized API endpoints
- Feature-based endpoints that don't directly map to a single Prisma model
- Any API functionality not covered by the auto-generated Prisma model routers

### Basic Custom Router

Let's start with a simple custom router:

```typescript
// src/routers/product-stats.router.ts
import { Router } from "express";
import productStatsController from "../controllers/product-stats.controller";

// Create a new router instance
const productStatsRouter = Router();

// Define routes
productStatsRouter.get(
    "/api/products-stats",
    productStatsController.getProductStats
);
productStatsRouter.get(
    "/api/admin/top-sellers",
    productStatsController.getTopSellingProducts
);

// Export the router
export default productStatsRouter;
```

:::danger
Custom routers are not prefixed with `/api` automatically. You must include this prefix in your route paths if you want to maintain consistency with Arkos's auto-generated routes.
:::

### Registering Custom Routers

Add your custom router to Arkos by including it in the `additional` array when initializing your application:

```typescript
// src/app.ts
import arkos from "arkos";
import productStatsRouter from "./routers/product-stats.router";
import adminRouter from "./routers/admin.router";

arkos.init({
    routers: {
        // Add your custom routers here
        additional: [productStatsRouter, adminRouter],
    },
    // other configs
});
```

**Important:** Custom routers specified in the `additional` array are added after all built-in Arkos routers in the middleware stack. They will not overwrite any built-in routes.

## 2. Customizing Prisma Model Routers

While custom routers create entirely new endpoints, you often need to extend or modify the auto-generated endpoints for your Prisma models. Arkos provides a special customization mechanism for this purpose.

### When to Use Prisma Model Router Customization

Use this approach when you want to:

- Add new endpoints to an existing Prisma model's API
- Override specific auto-generated endpoints with custom implementation
- Disable certain auto-generated endpoints
- Create nested routes for related models

### Adding Custom Endpoints to Model Routers

To add custom endpoints to an existing Prisma model router (such as adding a `/share` endpoint to the auto-generated `/api/posts` routes):

```typescript
// src/modules/post/post.router.ts

import { Router } from "express";
import { RouterConfig } from "arkos";
import postController from "./post.controller";

// Export configuration for the auto-generated endpoints
export const config: RouterConfig = {
    // Configuration options here (can be empty or non-existing if you're just adding endpoints)
};

// Create a router for custom endpoints
const router = Router();

// Add a custom "share" endpoint to the posts model
// This will be accessible at /api/posts/share
router.post("/share", postController.sharePost);

// Add a custom "featured" endpoint
// This will be accessible at /api/posts/featured
router.get("/featured", postController.getFeaturedPosts);

// Export the router as default
export default router;
```

:::tip Path resolution
When customizing a Prisma model router, you don't need to include the full path like `/api/posts/share`. Arkos automatically prefixes your paths with the model's base path (`/api/posts` in this example). Just specify the part after the model name (`/share`).
:::

:::danger Important naming conventions
The router configuration **must** be exported as `config` (lowercase) and your custom router **must** be exported as the default export. If these naming conventions aren't followed, Arkos won't recognize your customizations.
:::

### Disabling Auto-Generated Endpoints

You can selectively disable specific auto-generated endpoints:

```typescript
// src/modules/post/post.router.ts
import { Router } from "express";
import { RouterConfig } from "arkos";

export const config: RouterConfig = {
    // Disable all endpoints for this model
    disable: true,

    // Or Disable specific endpoints
    disable: {
        createMany: true,
        deleteMany: true,
    },
};

// Add custom endpoints if needed
const router = Router();

export default router;
```

When `disable: true` is set, Arkos will not generate any of the following endpoints:

- `POST /api/posts`
- `GET /api/posts/:id`
- `PATCH /api/posts/:id`
- `DELETE /api/posts/:id`
- `POST /api/posts/many`
- `GET /api/posts`
- `PATCH /api/posts/many`
- `DELETE /api/posts/many`

You can also specify which nested endpoints to be generated:

```typescript
// src/modules/post/post.router.ts
import { Router } from "express";
import { RouterConfig } from "arkos";

export const config: RouterConfig = {
    parent: {
        model: "author",
        foreignKeyField: "authorId", // Default is parent model name + Id
        // Only generate these specific nested endpoints
        endpoints: ["findMany", "findOne", "createOne"],
    },
};

export default Router();
```

### Overriding Auto-Generated Endpoints

You can completely replace an auto-generated endpoint with your own implementation:

```typescript
// src/modules/post/post.router.ts
import { Router } from "express";
import { RouterConfig } from "arkos";
import { prisma } from "../../utils/prisma";

export const config: RouterConfig = {
    disable: {
        findMany: true, // you must disable the routes you area implementing yourself
    },
};

const router = Router();

// Override the default GET /api/posts endpoint
// No need to specify the full path - just use "/"
router.get("/", async (req, res) => {
    // Custom implementation for listing posts
    const publishedPosts = await prisma.post.findMany({
        where: { published: true },
    });

    res.json(publishedPosts);
});

export default router;
```

:::warning Important
When overriding auto-generated endpoints, you lose built-in features like authentication, access control, and interceptor middlewares. You'll need to add these manually if needed.
:::

## Comparing the Two Approaches

| Feature               | Custom Routers                      | Customizing Prisma Model Routers                         |
| --------------------- | ----------------------------------- | -------------------------------------------------------- |
| **Purpose**           | Create entirely new endpoints       | Extend or modify existing model endpoints                |
| **Path Base**         | You define the full path            | Based on the model name (e.g., `/api/posts`)             |
| **Registration**      | Added to `routers.additional` array | Auto-detected based on file location                     |
| **File Location**     | Anywhere (typically `src/routers`)  | Must be in `src/modules/model-name/model-name.router.ts` |
| **Built-in Features** | None (add manually)                 | Preserved for auto-generated endpoints unless overridden |

## Adding Authentication in Custom Routers

Both custom routers and customized Prisma model router endpoints often need authentication and validation. Here's how to add it:

### Static RBAC Authentication

```typescript
// For either custom routers or customized Prisma model routers
import { Router } from "express";
import { authService } from "arkos/services";

const router = Router();

// Define authentication configs for Static RBAC
const authConfigs = {
    accessControl: {
        View: ["Admin", "Manager"],
        Create: ["Admin"],
        Update: ["Admin"],
        Delete: ["Admin"],
    },
};

// Protected route with access control
router.get(
    "/dashboard", // or "/share" for a customized model router
    authService.authenticate,
    authService.handleAccessControl(
        "View",
        "admin-dashboard", // resource name
        authConfigs.accessControl
    ),
    myController.handleRequest
);

export default router;
```

:::danger
When using `authService.handleAccessControl`, always call `authService.authenticate` first to populate `req.user`.
:::

### Dynamic RBAC Authentication

```typescript
// For either custom routers or customized Prisma model routers
import { Router } from "express";
import { authService } from "arkos/services";

const router = Router();

// Protected route with access control
router.get(
    "/dashboard", // or "/share" for a customized model router
    authService.authenticate,
    authService.handleAccessControl(
        "View",
        "admin-dashboard" // resource name
        // No need for acess control object as it managed on database
    ),
    myController.handleRequest
);

export default router;
```

## Full Example: Custom Endpoint on a Prisma Model Router

Let's add a "share post" feature to our auto-generated Posts API:

```ts
// src/modules/post/post.router.ts

import { Router } from "express";
import { RouterConfig } from "arkos";
import { authService } from "arkos/services";
import { handleRequestBodyValidationAndTransformation } from "arkos/middlewares";
import { SharePostSchema } from "./dtos/share-post.schema"; // using zod
import postService from "./post.service";

// Configuration for auto-generated endpoints
export const config: RouterConfig = {
    // Keep all auto-generated endpoints
};

const router = Router();

// Auth config for our custom endpoint
const authConfigs = {
    accessControl: {
        SharePost: ["User", "Admin"], // Custom action
    },
};

// Add custom share endpoint
// This will be accessible at /api/posts/:id/share
router.post(
    "/:id/share",
    authService.authenticate,
    authService.handleAccessControl(
        "SharePost",
        "post",
        authConfigs.accessControl
    ),
    handleRequestBodyValidationAndTransformation(SharePostSchema),
    async (req, res) => {
        const { id } = req.params;
        const { recipients, message } = req.body;

        try {
            await postService.sharePost(id, recipients, message, req.user);
            res.json({ success: true, message: "Post shared successfully" });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
);

export default router;
```

## Full Example: Standalone Custom Router

For features not directly tied to a Prisma model:

```typescript
// src/routers/analytics.router.ts
import { Router } from "express";
import { authService } from "arkos/services";
import { handleRequestBodyValidationAndTransformation } from "arkos/middlewares";
import analyticsController from "../controllers/analytics.controller";
import { GenerateReportSchema } from "../schemas/analytics.schema";

const analyticsRouter = Router();

// Static RBAC configs
const authConfigs = {
    accessControl: {
        View: ["Analyst", "Admin"],
        ExportData: ["Admin"],
        GenerateReport: ["Analyst", "Admin"],
    },
};

// View analytics dashboard
analyticsRouter.get(
    "/api/analytics/dashboard",
    authService.authenticate,
    authService.handleAccessControl(
        "View",
        "analytics",
        authConfigs.accessControl
    ),
    analyticsController.getDashboard
);

// Generate custom report with validation
analyticsRouter.post(
    "/api/analytics/reports",
    authService.authenticate,
    authService.handleAccessControl(
        "GenerateReport",
        "analytics",
        authConfigs.accessControl
    ),
    handleRequestBodyValidationAndTransformation(GenerateReportSchema),
    analyticsController.generateReport
);

export default analyticsRouter;
```

Then register this router:

```typescript
// src/app.ts
import arkos from "arkos";
import analyticsRouter from "./routers/analytics.router";

arkos.init({
    routers: {
        additional: [analyticsRouter],
    },
    // other configs
});
```

## Configuration Type Reference

Here's the complete type definition for `RouterConfig`:

```typescript
export type RouterEndpoint =
    | "createOne"
    | "findOne"
    | "updateOne"
    | "deleteOne"
    | "findMany"
    | "createMany"
    | "updateMany"
    | "deleteMany";

export type RouterConfig = {
    parent?: {
        // Parent model name in kebab-case and singular
        model?: string;

        // Field that stores the parent ID relation (defaults to `${modelName}Id`)
        foreignKey?: string;

        // Which nested endpoints to generate
        endpoints?: "*" | RouterEndpoint[];
    };

    // Disable specific endpoints or all endpoints
    disable?:
        | boolean
        | {
              createOne?: boolean;
              findOne?: boolean;
              updateOne?: boolean;
              deleteOne?: boolean;
              createMany?: boolean;
              findMany?: boolean;
              updateMany?: boolean;
              deleteMany?: boolean;
          };
};
```

## Best Practices

1. **Choose the Right Approach**:
    - If the endpoint is closely related to a Prisma model, customize that model's router
    - If it's a standalone feature, create a custom router

2. **Consistent Path Structure**:
    - For model-related endpoints: `/api/model-name/operation`
    - For feature-based endpoints: `/api/feature/operation`

3. **Authentication & Validation**:
    - Always add proper authentication and request validation
    - Reuse middlewares for consistent security across endpoints

4. **Clear Module Organization**:
    - Group related custom endpoints in the same router
    - Keep your file structure clean and predictable

5. **Descriptive Naming**:
    - Use clear route and action names
    - Document complex endpoints with comments

## Next Steps

- Learn about [Built-in Middlewares](/docs/guide/built-in-middlewares)
- Explore the [Authentication System](/docs/core-concepts/authentication-system)
- Read about [Request Data Validation](/docs/core-concepts/request-data-validation)
- Discover [Static RBAC Authentication](/docs/core-concepts/authentication-system)
- Learn about [Dynamic RBAC Authentication](/docs/core-concepts/authentication-system#upgrading-to-dynamic-rbac)
