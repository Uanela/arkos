---
sidebar_position: 5
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<!-- import SmallTag from "../components/small-tag" -->

# Adding Custom Routers

Arkos provides a flexible routing system that lets you create custom API endpoints alongside the auto-generated Prisma model routes. Whether you need standalone endpoints for complex business logic or want to extend your model APIs with custom functionality, Arkos has you covered.

**New in v1.4.0-beta**: ArkosRouter brings batteries-included features like validation, authentication, rate limiting, and OpenAPI documentation through declarative configuration. While Express Router still works for backward compatibility, we highly recommend using ArkosRouter.

## Quick Start

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```typescript
// src/routers/analytics.router.ts
import { ArkosRouter } from "arkos";
import analyticsController from "../controllers/analytics.controller";

const analyticsRouter = ArkosRouter();

analyticsRouter.get(
  {
    route: "/api/analytics/dashboard",
    authentication: {
      action: "View",
      resource: "dashboard",
      rule: ["Admin", "Coordinator"],
    },
    rateLimit: { windowMs: 60000, max: 100 },
  },
  analyticsController.getDashboard
);

export default analyticsRouter;
```

```typescript
// src/app.ts
import arkos from "arkos";
import analyticsRouter from "./routers/analytics.router";

arkos.init({
  use: [analyticsRouter], // Register your routers
});
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// src/routers/analytics.router.ts
import { Router } from "express";
import { authService } from "arkos/services";
import analyticsController from "../controllers/analytics.controller";

const analyticsRouter = Router();

analyticsRouter.get(
  "/api/analytics/dashboard",
  authService.authenticate,
  authService.handleAccessControl("View", "dasboard", {
    View: ["Admin", "Coordinator"],
  }),
  analyticsController.getDashboard
);

export default analyticsRouter;
```

```typescript
// src/app.ts
import arkos from "arkos";
import analyticsRouter from "./routers/analytics.router";

arkos.init({
  routers: {
    additional: [analyticsRouter],
  },
});
```

</TabItem>
</Tabs>

## Understanding Your Options

Arkos offers two approaches for custom routing:

### 1. Custom Routers

**Use when**: Creating standalone endpoints that don't relate to a specific Prisma model

**Examples**:

- Analytics dashboards
- Complex operations spanning multiple models
- Custom authentication flows
- Feature-based APIs (search, exports, webhooks)

**Location**: Anywhere (typically `src/routers/`)

### 2. Customizing Prisma Model Routers

**Use when**: Extending or modifying auto-generated model endpoints

**Examples**:

- Adding a "share" action to posts
- Custom search for products
- Disabling bulk operations
- Overriding default behavior

**Location**: `src/modules/{model-name}/{model-name}.router.ts`

:::tip Decision Flow
**Does your endpoint directly relate to a single Prisma model?**

- **Yes** → Customize the Prisma Model Router
- **No** → Create a Custom Router
  :::

## Custom Routers

Custom routers let you define entirely new API endpoints separate from your Prisma models.

### Creating a Custom Router

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+" default>

```typescript
// src/routers/reports.router.ts
import { ArkosRouter } from "arkos";
import z from "zod";
import reportsController from "../controllers/reports.controller";

const reportsRouter = ArkosRouter();

reportsRouter.get(
  { route: "/api/reports/summary" },
  reportsController.getSummary
);

const GenerateReportSchema = z.object({
  type: z.enum(["sales", "inventory", "customers"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

reportsRouter.post(
  {
    route: "/api/reports/generate",
    authentication: {
      resource: "report",
      action: "Generate",
      rule: ["Admin", "Manager"],
    },
    validation: { body: GenerateReportSchema },
    rateLimit: { windowMs: 60000, max: 10 },
  },
  reportsController.generateReport
);

export default reportsRouter;
```

:::tip Configuration Object
Notice the configuration object as the first argument. This declarative approach gives you access to validation, authentication, rate limiting, and more. See [ArkosRouter API Reference](/docs/api/arkos-router-config) for all options.
:::

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// src/routers/reports.router.ts
import { Router } from "express";
import { authService } from "arkos/services";
import { handleRequestBodyValidationAndTransformation } from "arkos/middlewares";
import { GenerateReportSchema } from "../schemas/reports.schema";
import reportsController from "../controllers/reports.controller";

const reportsRouter = Router();

const authConfigs = {
  accessControl: {
    Generate: ["Admin", "Manager"],
  },
};

reportsRouter.get("/api/reports/summary", reportsController.getSummary);

reportsRouter.post(
  "/api/reports/generate",
  authService.authenticate,
  authService.handleAccessControl(
    "Generate",
    "report",
    authConfigs.accessControl
  ),
  handleRequestBodyValidationAndTransformation(GenerateReportSchema),
  reportsController.generateReport
);

export default reportsRouter;
```

</TabItem>
</Tabs>

:::danger Path Prefix
Custom routers are NOT automatically prefixed with `/api`. You must include the full path in your route definitions to maintain consistency with Arkos's auto-generated routes.
:::

### Registering Custom Routers

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+" default>

Add your router to the `use` array in your Arkos initialization:

```typescript
// src/app.ts
import arkos from "arkos";
import reportsRouter from "./routers/reports.router";
import webhooksRouter from "./routers/webhooks.router";

arkos.init({
  use: [reportsRouter, webhooksRouter],
});
```

:::info Middleware Stack
Custom routers in the `use` array are added **after** all built-in Arkos routers. They will not overwrite any built-in routes.
:::

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

Add your router to the `routers.additional` array:

```typescript
// src/app.ts
import arkos from "arkos";
import reportsRouter from "./routers/reports.router";
import webhooksRouter from "./routers/webhooks.router";

arkos.init({
  routers: {
    additional: [reportsRouter, webhooksRouter],
  },
});
```

</TabItem>
</Tabs>

### Adding Features to Routes

ArkosRouter supports declarative configuration for common needs:

#### Authentication

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+" default>

```typescript
// Simple authentication
router.get(
  {
    route: "/api/admin/dashboard",
    authentication: true,
  },
  controller.getDashboard
);

// With role-based access control
router.post(
  {
    route: "/api/admin/settings",
    authentication: {
      resource: "settings",
      action: "Update",
      rule: ["Admin"],
    },
  },
  controller.updateSettings
);
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
import { authService } from "arkos/services";

const authConfigs = {
  accessControl: {
    Update: ["Admin"],
  },
};

router.post(
  "/api/admin/settings",
  authService.authenticate,
  authService.handleAccessControl(
    "Update",
    "settings",
    authConfigs.accessControl
  ),
  controller.updateSettings
);
```

</TabItem>
</Tabs>

Learn more: [Authentication System](/docs/core-concepts/authentication-system)

#### Validation

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+" default>

```typescript
import z from "zod";

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(["User", "Admin"]),
});

router.post(
  {
    route: "/api/users",
    validation: {
      body: CreateUserSchema,
    },
  },
  controller.createUser
);
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
import { handleRequestBodyValidationAndTransformation } from "arkos/middlewares";
import { CreateUserSchema } from "../schemas/user.schema";

router.post(
  "/api/users",
  handleRequestBodyValidationAndTransformation(CreateUserSchema),
  controller.createUser
);
```

</TabItem>
</Tabs>

Learn more: [Request Data Validation](/docs/core-concepts/request-data-validation)

#### Rate Limiting

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+" default>

```typescript
router.post(
  {
    route: "/api/reports/generate",
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 requests per window
      message: "Too many report requests, try again later",
    },
  },
  controller.generateReport
);
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
import rateLimit from "express-rate-limit";

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many report requests, try again later",
});

router.post("/api/reports/generate", reportLimiter, controller.generateReport);
```

</TabItem>
</Tabs>

#### File Uploads

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+" default>

```typescript
router.post(
  {
    route: "/api/upload/avatar",
    authentication: true,
    experimental: {
      uploads: {
        type: "single",
        field: "avatar",
        uploadDir: "avatars",
        maxSize: 1024 * 1024 * 5, // 5MB
        allowedFileTypes: [".jpg", ".png"],
      },
    },
  },
  controller.uploadAvatar
);
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
import multer from "multer";

const upload = multer({
  dest: "uploads/avatars",
  limits: { fileSize: 1024 * 1024 * 5 },
});

router.post(
  "/api/upload/avatar",
  authService.authenticate,
  upload.single("avatar"),
  controller.uploadAvatar
);
```

</TabItem>
</Tabs>

Learn more: [File Upload Guide](/docs/guide/file-uploads)

#### OpenAPI Documentation

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+" default>

```typescript
router.post(
  {
    route: "/api/reports/generate",
    validation: {
      body: GenerateReportSchema,
    },
    experimental: {
      openapi: {
        summary: "Generate custom report",
        description: "Creates a report based on the provided parameters",
        tags: ["Reports"],
        responses: {
          200: { description: "Report generated successfully" },
          400: { description: "Invalid parameters" },
        },
      },
    },
  },
  controller.generateReport
);
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

OpenAPI documentation requires manual configuration. See the [OpenAPI Guide](/docs/guide/openapi-swagger) for v1.3 setup.

</TabItem>
</Tabs>

Learn more: [OpenAPI/Swagger Guide](/docs/guide/openapi-swagger)

### Other ArkosRouter Features

ArkosRouter supports many more features through declarative configuration:

- **Query Parsing**: Automatic type conversion for query parameters
- **Compression**: Per-route response compression
- **Custom Body Parsers**: For webhooks and special content types
- **Error Handling**: Automatic async error catching

See the complete [ArkosRouter API Reference](/docs/api/arkos-router-config) for all available options.

## Customizing Prisma Model Routers

Prisma model routers are auto-generated from your schema, but you can extend them with custom endpoints or modify their behavior.

### Adding Custom Endpoints

To add custom endpoints to an existing model's API:

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+" default>

```typescript
// src/modules/post/post.router.ts
import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";
import z from "zod";
import postController from "./post.controller";

// Configuration for auto-generated endpoints
export const config: RouterConfig = {
  // Leave empty if you're just adding endpoints
};

// Create router for custom endpoints
const router = ArkosRouter();

// Add custom "share" endpoint → /api/posts/:id/share
const SharePostSchema = z.object({
  recipients: z.array(z.string().email()),
  message: z.string().max(500).optional(),
});

router.post(
  {
    route: "/:id/share",
    authentication: {
      resource: "post",
      action: "Share",
      rule: ["User", "Admin"],
    },
    validation: {
      body: SharePostSchema,
      params: z.object({ id: z.string() }),
    },
  },
  postController.sharePost
);

// Add custom "featured" endpoint → /api/posts/featured
router.get(
  {
    route: "/featured",
    rateLimit: { windowMs: 60000, max: 50 },
  },
  postController.getFeaturedPosts
);

export default router;
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// src/modules/post/post.router.ts
import { Router } from "express";
import { RouterConfig } from "arkos";
import { authService } from "arkos/services";
import { handleRequestBodyValidationAndTransformation } from "arkos/middlewares";
import { SharePostSchema } from "./schemas/share-post.schema";
import postController from "./post.controller";

export const config: RouterConfig = {};

const router = Router();

const authConfigs = {
  accessControl: {
    Share: ["User", "Admin"],
  },
};

// /api/posts/:id/share
router.post(
  "/:id/share",
  authService.authenticate,
  authService.handleAccessControl("Share", "post", authConfigs.accessControl),
  handleRequestBodyValidationAndTransformation(SharePostSchema),
  postController.sharePost
);

// /api/posts/featured
router.get("/featured", postController.getFeaturedPosts);

export default router;
```

</TabItem>
</Tabs>

:::tip Path Resolution
Paths are automatically prefixed with the model's base path (`/api/posts`). Just specify the part after the model name (`/:id/share`, not `/api/posts/:id/share`).
:::

:::danger Naming Conventions

- Export configuration as `config` (lowercase)
- Export router as the default export

If these conventions aren't followed, Arkos won't recognize your customizations.
:::

### Configuring Auto-Generated Endpoints

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+" default>

You can configure individual auto-generated endpoints with all ArkosRouter features:

```typescript
// src/modules/product/product.router.ts
import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";

export const config: RouterConfig = {
  // Configure the findMany endpoint
  findMany: {
    authentication: false, // Public
    rateLimit: {
      windowMs: 60000,
      max: 100,
    },
  },

  // Configure createOne endpoint
  createOne: {
    authentication: {
      resource: "product",
      action: "Create",
      rule: ["Admin", "Manager"],
    },
    rateLimit: {
      windowMs: 60000,
      max: 20,
    },
  },

  // Configure deleteOne endpoint
  deleteOne: {
    authentication: {
      resource: "product",
      action: "Delete",
      rule: ["Admin"],
    },
    rateLimit: {
      windowMs: 60000,
      max: 5,
    },
  },
};

export default ArkosRouter();
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

Configuration of auto-generated endpoints is not available in v1.3. You must override endpoints to add features. See [Overriding Endpoints](#overriding-auto-generated-endpoints).

</TabItem>
</Tabs>

### Disabling Auto-Generated Endpoints

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+" default>

```typescript
// src/modules/post/post.router.ts
import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";

export const config: RouterConfig = {
  // Disable specific endpoints
  createMany: {
    disabled: true,
  },
  deleteMany: {
    disabled: true,
  },
  updateMany: {
    disabled: true,
  },
};

export default ArkosRouter();
```

:::tip Preferred Syntax
While `disable: true` and `disable: { createMany: true }` still work for backward compatibility, we recommend the new syntax (`createMany: { disabled: true }`) for consistency.
:::

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// src/modules/post/post.router.ts
import { Router } from "express";
import { RouterConfig } from "arkos";

export const config: RouterConfig = {
  // Disable all endpoints
  disable: true,

  // Or disable specific endpoints
  disable: {
    createMany: true,
    deleteMany: true,
    updateMany: true,
  },
};

export default Router();
```

</TabItem>
</Tabs>

When all endpoints are disabled, Arkos will not generate:

- `POST /api/posts`
- `GET /api/posts/:id`
- `PATCH /api/posts/:id`
- `DELETE /api/posts/:id`
- `POST /api/posts/many`
- `GET /api/posts`
- `PATCH /api/posts/many`
- `DELETE /api/posts/many`

### Configuring Nested Routes

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+" default>

```typescript
// src/modules/post/post.router.ts
import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";

export const config: RouterConfig = {
  parent: {
    model: "author",
    foreignKeyField: "authorId",
    endpoints: ["findMany", "findOne", "createOne"],
  },

  // Configure parent endpoints
  findMany: {
    authentication: true,
    rateLimit: {
      windowMs: 60000,
      max: 50,
    },
  },
};

export default ArkosRouter();
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// src/modules/post/post.router.ts
import { Router } from "express";
import { RouterConfig } from "arkos";

export const config: RouterConfig = {
  parent: {
    model: "author",
    foreignKeyField: "authorId",
    endpoints: ["findMany", "findOne", "createOne"],
  },
};

export default Router();
```

</TabItem>
</Tabs>

### Overriding Auto-Generated Endpoints

To completely replace an auto-generated endpoint:

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+" default>

```typescript
// src/modules/post/post.router.ts
import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";
import z from "zod";
import { prisma } from "../../utils/prisma";

export const config: RouterConfig = {
  findMany: {
    disabled: true, // Disable the endpoint you're overriding
  },
};

const router = ArkosRouter();

const PostQuerySchema = z.object({
  published: z.boolean().optional(),
  authorId: z.string().optional(),
  tag: z.string().optional(),
});

// Override GET /api/posts
router.get(
  {
    route: "/",
    authentication: true,
    validation: {
      query: PostQuerySchema,
    },
    rateLimit: {
      windowMs: 60000,
      max: 100,
    },
  },
  async (req, res) => {
    const { published, authorId, tag } = req.query;

    const posts = await prisma.post.findMany({
      where: {
        ...(published !== undefined && { published }),
        ...(authorId && { authorId }),
        ...(tag && { tags: { has: tag } }),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(posts);
  }
);

export default router;
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// src/modules/post/post.router.ts
import { Router } from "express";
import { RouterConfig } from "arkos";
import { prisma } from "../../utils/prisma";

export const config: RouterConfig = {
  disable: {
    findMany: true,
  },
};

const router = Router();

router.get("/", async (req, res) => {
  const publishedPosts = await prisma.post.findMany({
    where: { published: true },
  });

  res.json(publishedPosts);
});

export default router;
```

</TabItem>
</Tabs>

:::warning Important
When overriding endpoints, you must manually implement features like validation, authentication, and error handling. The example above shows how to do this using ArkosRouter's configuration options.
:::

## Comparison

| Feature                      | Custom Routers                                             | Customizing Prisma Model Routers                             |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| **Purpose**                  | Create entirely new endpoints                              | Extend or modify existing model endpoints                    |
| **Path Base**                | You define the full path                                   | Based on the model name (e.g., `/api/products`)              |
| **Registration**             | Added to `use` array (v1.4) or `routers.additional` (v1.3) | Auto-detected based on file location                         |
| **File Location**            | Anywhere (typically `src/routers`)                         | Must be in `src/modules/{model-name}/{model-name}.router.ts` |
| **Built-in Features**        | All ArkosRouter features available                         | All ArkosRouter features available                           |
| **Auto-generated Endpoints** | None                                                       | Can configure, disable, or override                          |
| **Configuration Export**     | Not required                                               | Must export `config` and default router                      |

## Common Patterns

### Pattern 1: Adding a Share Endpoint

```typescript
// src/modules/post/post.router.ts
router.post(
  {
    route: "/:id/share",
    authentication: {
      resource: "post",
      action: "Share",
      rule: ["User", "Admin"],
    },
    validation: {
      body: z.object({
        recipients: z.array(z.string().email()),
      }),
    },
  },
  postController.sharePost
);
```

### Pattern 2: Custom Search Endpoint

```typescript
// src/modules/product/product.router.ts
router.get(
  {
    route: "/search",
    validation: {
      query: z.object({
        q: z.string().min(2),
        category: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
      }),
    },
    rateLimit: {
      windowMs: 60000,
      max: 60,
    },
  },
  productController.search
);
```

### Pattern 3: Admin-Only Bulk Operation

```typescript
// src/routers/admin.router.ts
router.post(
  {
    route: "/api/admin/products/bulk-update",
    authentication: {
      resource: "product",
      action: "BulkUpdate",
      rule: ["Admin"],
    },
    validation: {
      body: z.object({
        productIds: z.array(z.string()).min(1).max(100),
        changes: z.object({
          price: z.number().positive().optional(),
          stock: z.number().int().optional(),
        }),
      }),
    },
    rateLimit: {
      windowMs: 60000,
      max: 5,
    },
  },
  adminController.bulkUpdateProducts
);
```

## Middleware Order

Understanding middleware execution order helps when debugging:

1. Built-in Arkos middlewares (body parser, CORS, etc.)
2. Auto-generated Prisma model routers
3. Custom routers from the `use` array (v1.4) or `routers.additional` (v1.3)
4. Route-specific middlewares (defined in ArkosRouter config or Express chains)

Custom routers cannot override built-in routes because they're registered later in the stack.

## Next Steps

Now that you understand custom routing, explore related topics:

- **[ArkosRouter API Reference](/docs/api/arkos-router-config)** - Complete configuration options
- **[Request Data Validation](/docs/core-concepts/request-data-validation)** - Zod and class-validator
- **[Authentication System](/docs/core-concepts/authentication-system)** - Static and Dynamic RBAC
- **[File Upload Guide](/docs/guide/file-uploads)** - Handle file uploads
- **[OpenAPI/Swagger Guide](/docs/guide/openapi-swagger)** - Auto-generate API docs
- **[Built-in Middlewares](/docs/guide/built-in-middlewares)** - Available middleware options

## Getting Help

If you encounter issues:

- Check the [GitHub Issues](https://github.com/your-org/arkos/issues)
- Join our [Discord Community](https://discord.gg/arkos)
- Read the [FAQ](/docs/faq)
