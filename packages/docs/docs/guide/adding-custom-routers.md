---
sidebar_position: 5
---

# Adding Custom Routers

Arkos provides a powerful routing system built on top of Express Router, enhanced with batteries-included features for modern API development. Think of it as Express Router on steroids - all the flexibility you know and love, with built-in validation, authentication, OpenAPI documentation, file uploads, and more.

**New in v1.4.0-beta**: ArkosRouter is now the preferred way to create routes in Arkos. While Express Router still works for backward compatibility, we highly recommend using ArkosRouter to take advantage of its enhanced features.

Arkos offers two main approaches for routing:

1. **Custom Routers**: For creating entirely new endpoints separate from your Prisma models
2. **Customizing Prisma Model Routers**: For extending or modifying the auto-generated endpoints for your Prisma models

This guide covers both approaches and explains how they work together in your Arkos application.

## Understanding ArkosRouter

ArkosRouter is a proxied Express Router that extends the standard Express routing capabilities with powerful features:

- **Smart Request Validation**: Zod schemas or class-validator DTOs
- **Built-in Authentication**: Integrate auth with a simple config option
- **OpenAPI Documentation**: Auto-generate API docs from your route configs
- **File Upload Handling**: Streamlined file upload management
- **Rate Limiting**: Per-route rate limiting configuration
- **Query Parsing**: Intelligent query parameter parsing (null, boolean, etc.)
- **Compression**: Per-route response compression
- **Error Handling**: Automatic async error catching

All of this is configured declaratively through a simple route configuration object.

## 1. Working With Custom Routers

Custom routers allow you to define specialized API endpoints that may not fit into the auto-generated model endpoints pattern.

### When to Use Custom Routers

Custom routers are perfect for:

- Complex business logic operations that span multiple models
- Custom authentication flows or specialized API endpoints
- Feature-based endpoints that don't directly map to a single Prisma model
- Any API functionality not covered by the auto-generated Prisma model routers

### Basic Custom Router

Let's start with a simple custom router using ArkosRouter:

```typescript
// src/routers/product-stats.router.ts
import { ArkosRouter } from "arkos";
import productStatsController from "../controllers/product-stats.controller";

const productStatsRouter = ArkosRouter();

productStatsRouter.get(
  {
    route: "/api/products-stats",
  },
  productStatsController.getProductStats
);

productStatsRouter.get(
  {
    route: "/api/admin/top-sellers",
  },
  productStatsController.getTopSellingProducts
);

export default productStatsRouter;
```

:::tip
Notice how we pass a configuration object as the first argument instead of just a path string. This is the ArkosRouter way - declarative configuration that unlocks powerful features.
:::

:::danger
Custom routers are not prefixed with `/api` automatically. You must include this prefix in your route paths if you want to maintain consistency with Arkos's auto-generated routes.
:::

### Registering Custom Routers

> From `v1.4.0-beta`

Add your custom router to Arkos by including it in the `use` array when initializing your application:

:::tip
Is important to notice that the `use` array was added on `v1.4.0-beta` to better align with Express `app.use` method, if you are using a version prior to `v1.4.0-beta` you can check previous documentations.
:::

```typescript
// src/app.ts
import arkos from "arkos";
import productStatsRouter from "./routers/product-stats.router";
import adminRouter from "./routers/admin.router";

arkos.init({
  use: [productStatsRouter, adminRouter], // register routers and middlewares
});
```

**Important:** Custom routers specified in the `use` array are added after all built-in Arkos routers in the middleware stack. They will not overwrite any built-in routes.

## Adding Request Validation

One of ArkosRouter's most powerful features is declarative request validation. Let's add validation using Zod:

```ts
// src/schemas/analytics/requests/analytics-metrics-query.schema.ts
const DateRangeQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  metric: z.enum(["sales", "visits", "conversions"]).optional(),
});
```

```ts
// src/schemas/analytics/requests/analytics-reports-body.schema.ts
const GenerateReportBodySchema = z.object({
  reportType: z.enum(["summary", "detailed", "export"]),
  format: z.enum(["pdf", "csv", "json"]),
  filters: z
    .object({
      category: z.string().optional(),
      minValue: z.number().optional(),
    })
    .optional(),
});
```

```typescript
// src/routers/analytics.router.ts
import { ArkosRouter } from "arkos";
import { z } from "zod";
import analyticsController from "../controllers/analytics.controller";

const analyticsRouter = ArkosRouter();

analyticsRouter.get(
  {
    route: "/api/analytics/metrics",
    validation: {
      query: DateRangeQuerySchema,
    },
  },
  analyticsController.getMetrics
);

// Route with body validation
analyticsRouter.post(
  {
    route: "/api/analytics/reports",
    validation: {
      body: GenerateReportSchema,
    },
  },
  analyticsController.generateReport
);

export default analyticsRouter;
```

You can also use class-validator DTOs if you prefer:

```typescript
// src/dtos/create-report.dto.ts
import { IsEnum, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class ReportFilters {
  @IsOptional()
  category?: string;

  @IsOptional()
  minValue?: number;
}

export class CreateReportDto {
  @IsEnum(["summary", "detailed", "export"])
  reportType: string;

  @IsEnum(["pdf", "csv", "json"])
  format: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReportFilters)
  filters?: ReportFilters;
}
```

```typescript
// Using the DTO in your router
import { CreateReportDto } from "../dtos/create-report.dto";

analyticsRouter.post(
  {
    route: "/api/analytics/reports",
    validation: {
      body: CreateReportDto,
    },
  },
  analyticsController.generateReport
);
```

:::info
Arkos automatically validates and transforms the request data before it reaches your controller. Invalid requests are rejected with detailed error messages. Learn more in the [Request Data Validation](/docs/core-concepts/request-data-validation) guide.
:::

### Adding Authentication

ArkosRouter makes authentication simple with built-in support for Arkos's authentication system:

```typescript
// src/routers/admin.router.ts
import { ArkosRouter } from "arkos";
import { z } from "zod";
import adminController from "../controllers/admin.controller";

const adminRouter = ArkosRouter();

const UpdateSettingsSchema = z.object({
  maintenanceMode: z.boolean(),
  allowRegistration: z.boolean(),
  maxUploadSize: z.number().positive(),
});

// Simple authentication - just require login
adminRouter.get(
  {
    route: "/api/admin/dashboard",
    authentication: true,
  },
  adminController.getDashboard
);

// Authentication with RBAC (Role-Based Access Control)
adminRouter.post(
  {
    route: "/api/admin/settings",
    authentication: {
      resource: "admin-settings",
      action: "Update",
      rule: ["Admin", "SuperAdmin"], // Only these roles can access
    },
    validation: {
      body: UpdateSettingsSchema,
    },
  },
  adminController.updateSettings
);

// Dynamic RBAC (rules stored in database)
adminRouter.delete(
  {
    route: "/api/admin/users/:id",
    authentication: {
      resource: "user",
      action: "Delete",
      // No rule array - will check database for permissions
    },
  },
  adminController.deleteUser
);

export default adminRouter;
```

:::info
Authentication requires proper configuration in your Arkos initialization. Learn more about [Static RBAC](/docs/core-concepts/authentication-system) and [Dynamic RBAC](/docs/core-concepts/authentication-system#upgrading-to-dynamic-rbac).
:::

### Other Enhanced Features

ArkosRouter provides many more features that can be configured per-route:

#### Rate Limiting

```typescript
productStatsRouter.get(
  {
    route: "/api/products-stats",
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per window
      message: "Too many requests, please try again later",
    },
  },
  productStatsController.getProductStats
);
```

#### Response Compression

```typescript
analyticsRouter.get(
  {
    route: "/api/analytics/large-dataset",
    compression: {
      level: 6, // Compression level (0-9)
      threshold: 1024, // Only compress responses larger than 1kb
    },
  },
  analyticsController.getLargeDataset
);
```

#### Query Parser Configuration

```typescript
productStatsRouter.get(
  {
    route: "/api/products",
    queryParser: {
      parseNull: true, // "null" string → null
      parseBoolean: true, // "true"/"false" → boolean
      parseNumber: true, // "123" → 123
      parseUndefined: true, // "undefined" string → undefined
    },
  },
  productStatsController.getProducts
);
```

#### Custom Body Parser

```typescript
webhookRouter.post(
  {
    route: "/api/webhooks/stripe",
    bodyParser: {
      parser: "raw",
      options: {
        type: "application/json",
      },
    },
  },
  webhookController.handleStripeWebhook
);
```

### Experimental Features

ArkosRouter includes powerful experimental features that have been heavily tested and are ready for production use. We're marking them as experimental to gather community feedback and iterate based on real-world usage.

#### OpenAPI Documentation (Experimental)

Automatically generate OpenAPI/Swagger documentation from your route configurations:

```typescript
analyticsRouter.post(
  {
    route: "/api/analytics/reports",
    validation: {
      body: GenerateReportSchema,
    },
    experimental: {
      openapi: {
        summary: "Generate analytics report",
        description: "Creates a custom analytics report based on filters",
        tags: ["Analytics"],
        responses: {
          200: {
            description: "Report generated successfully",
            content: {
              "application/json": {
                schema: ReportResponseSchema,
              },
            },
          },
          400: {
            description: "Invalid request parameters",
          },
        },
      },
    },
  },
  analyticsController.generateReport
);
```

:::info
Learn more about OpenAPI documentation in the [OpenAPI/Swagger Guide](/docs/guide/openapi-swagger).
:::

#### File Uploads (Experimental)

Handle file uploads with ease:

```typescript
import { ArkosRouter } from "arkos";

const uploadRouter = ArkosRouter();

// Single file upload
uploadRouter.post(
  {
    route: "/api/upload/avatar",
    authentication: true,
    experimental: {
      uploads: {
        type: "single",
        field: "avatar",
        uploadDir: "avatars",
        maxSize: 1024 * 1024 * 5, // 5MB
        allowedFileTypes: [".jpg", ".png", ".gif"],
        deleteOnError: true,
      },
    },
  },
  uploadController.uploadAvatar
);

// Multiple files
uploadRouter.post(
  {
    route: "/api/upload/gallery",
    authentication: true,
    experimental: {
      uploads: {
        type: "array",
        field: "photos",
        maxCount: 10,
        uploadDir: "gallery",
        maxSize: 1024 * 1024 * 10, // 10MB per file
      },
    },
  },
  uploadController.uploadGallery
);

export default uploadRouter;
```

:::info
Learn more about file uploads in the [File Upload Guide](/docs/guide/file-uploads).
:::

### Disabling Routes

You can temporarily disable routes without removing the code:

```typescript
analyticsRouter.post(
  {
    route: "/api/analytics/experimental-feature",
    disabled: true, // This route won't be registered
    validation: {
      body: ExperimentalSchema,
    },
  },
  analyticsController.experimentalFeature
);
```

## 2. Customizing Prisma Model Routers

While custom routers create entirely new endpoints, you often need to extend or modify the auto-generated endpoints for your Prisma models. With v1.4.0-beta, Prisma model routers now also benefit from ArkosRouter's enhanced features.

### When to Use Prisma Model Router Customization

Use this approach when you want to:

- Add new endpoints to an existing Prisma model's API
- Override specific auto-generated endpoints with custom implementation
- Disable certain auto-generated endpoints
- Configure validation, authentication, or other features for auto-generated endpoints
- Create nested routes for related models

:::tip
Prisma model routers, file-upload routers, and auth routers can all be easily managed and customized using the same ArkosRouter configuration approach. All the features you've learned about custom routers apply here too!
:::

### Adding Custom Endpoints to Model Routers

To add custom endpoints to an existing Prisma model router (such as adding a `/share` endpoint to the auto-generated `/api/posts` routes):

```typescript
// src/modules/post/post.router.ts

import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";
import { z } from "zod";
import postController from "./post.controller";

// Export configuration for the auto-generated endpoints
export const config: RouterConfig = {
  // Configuration options here (can be empty if you're just adding endpoints)
};

// Create an ArkosRouter for custom endpoints
const router = ArkosRouter();

// Define validation schema
const SharePostSchema = z.object({
  recipients: z.array(z.string().email()),
  message: z.string().max(500).optional(),
});

// Add a custom "share" endpoint to the posts model
// This will be accessible at /api/posts/:id/share
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
      params: z.object({
        id: z.string(),
      }),
    },
  },
  postController.sharePost
);

// Add a custom "featured" endpoint
// This will be accessible at /api/posts/featured
router.get(
  {
    route: "/featured",
    rateLimit: {
      windowMs: 60 * 1000,
      max: 30,
    },
  },
  postController.getFeaturedPosts
);

// Export the router as default
export default router;
```

:::tip Path resolution
When customizing a Prisma model router, you don't need to include the full path like `/api/posts/share`. Arkos automatically prefixes your paths with the model's base path (`/api/posts` in this example). Just specify the part after the model name (`/share`).
:::

:::danger Important naming conventions
The router configuration **must** be exported as `config` (lowercase) and your custom router **must** be exported as the default export. If these naming conventions aren't followed, Arkos won't recognize your customizations.
:::

### Configuring Auto-Generated Endpoints (New in v1.4.0-beta)

You can now configure individual auto-generated endpoints with all of ArkosRouter's features:

```typescript
// src/modules/post/post.router.ts
import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";

export const config: RouterConfig = {
  // Configure the findMany endpoint
  findMany: {
    authentication: {
      resource: "post",
      action: "View",
      rule: ["User", "Admin"],
    },
    rateLimit: {
      windowMs: 60 * 1000,
      max: 100,
    },
    queryParser: {
      parseNull: true,
      parseBoolean: true,
    },
  },

  // Configure the createOne endpoint
  createOne: {
    authentication: {
      resource: "post",
      action: "Create",
      rule: ["Admin", "Editor"],
    },
    rateLimit: {
      windowMs: 60 * 1000,
      max: 10,
    },
  },

  // Configure the deleteMany endpoint
  deleteMany: {
    authentication: {
      resource: "post",
      action: "Delete",
      rule: ["Admin"],
    },
    experimental: {
      openapi: {
        summary: "Bulk delete posts",
        description: "Delete multiple posts by ID",
        tags: ["Posts - Admin"],
      },
    },
  },
};

export default ArkosRouter();
```

### Disabling Auto-Generated Endpoints

You can selectively disable specific auto-generated endpoints using two approaches:

#### New Approach (Preferred - v1.4.0-beta+)

```typescript
// src/modules/post/post.router.ts
import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";

export const config: RouterConfig = {
  // Disable specific endpoints individually
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

#### Legacy Approach (Backward Compatible)

```typescript
// src/modules/post/post.router.ts
import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";

export const config: RouterConfig = {
  // Disable all endpoints for this model
  disable: true,

  // Or disable specific endpoints
  disable: {
    createMany: true,
    deleteMany: true,
    updateMany: true,
  },
};

export default ArkosRouter();
```

:::tip
While both approaches work, we recommend using the new syntax (`endpointName: { disabled: true }`) as it's more consistent with the rest of the configuration and allows you to add other options alongside `disabled` if needed in the future.
:::

When `disable: true` is set, Arkos will not generate any of the following endpoints:

- `POST /api/posts`
- `GET /api/posts/:id`
- `PATCH /api/posts/:id`
- `DELETE /api/posts/:id`
- `POST /api/posts/many`
- `GET /api/posts`
- `PATCH /api/posts/many`
- `DELETE /api/posts/many`

### Configuring Nested Routes

You can specify which nested endpoints to generate and configure them:

```typescript
// src/modules/post/post.router.ts
import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";

export const config: RouterConfig = {
  parent: {
    model: "author",
    foreignKeyField: "authorId", // Default is parent model name + Id
    // Only generate these specific nested endpoints
    endpoints: ["findMany", "findOne", "createOne"],
  },

  // Configure parent endpoints with ArkosRouter features
  findMany: {
    authentication: true,
    rateLimit: {
      windowMs: 60 * 1000,
      max: 50,
    },
  },
};

export default ArkosRouter();
```

### Overriding Auto-Generated Endpoints

You can completely replace an auto-generated endpoint with your own implementation:

```typescript
// src/modules/post/post.router.ts
import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";
import { z } from "zod";
import { prisma } from "../../utils/prisma";

export const config: RouterConfig = {
  // Disable the endpoint you're overriding
  findMany: {
    disabled: true,
  },
};

const router = ArkosRouter();

// Define custom query schema
const PostQuerySchema = z.object({
  published: z.boolean().optional(),
  authorId: z.string().optional(),
  tag: z.string().optional(),
});

// Override the default GET /api/posts endpoint
// No need to specify the full path - just use "/"
router.get(
  {
    route: "/",
    authentication: true,
    validation: {
      query: PostQuerySchema,
    },
    rateLimit: {
      windowMs: 60 * 1000,
      max: 100,
    },
  },
  async (req, res) => {
    // Custom implementation for listing posts
    const { published, authorId, tag } = req.query;

    const posts = await prisma.post.findMany({
      where: {
        ...(published !== undefined && { published }),
        ...(authorId && { authorId }),
        ...(tag && { tags: { has: tag } }),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(posts);
  }
);

export default router;
```

:::warning Important
When overriding auto-generated endpoints, you gain full control but must manually implement features like validation, authentication, and error handling using ArkosRouter's configuration options. The example above shows how to do this properly.
:::

## Migrating from Express Router to ArkosRouter

Migrating from Express Router to ArkosRouter is straightforward. Here's how to upgrade your existing custom routers:

### Before (Express Router)

```typescript
// src/routers/analytics.router.ts
import { Router } from "express";
import { authService } from "arkos/services";
import { handleRequestBodyValidationAndTransformation } from "arkos/middlewares";
import { GenerateReportSchema } from "../schemas/analytics.schema";
import analyticsController from "../controllers/analytics.controller";

const analyticsRouter = Router();

const authConfigs = {
  accessControl: {
    View: ["Analyst", "Admin"],
    GenerateReport: ["Analyst", "Admin"],
  },
};

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

### After (ArkosRouter)

```typescript
// src/routers/analytics.router.ts
import { ArkosRouter } from "arkos";
import { GenerateReportSchema } from "../schemas/analytics.schema";
import analyticsController from "../controllers/analytics.controller";

const analyticsRouter = ArkosRouter();

// All middleware logic moved to configuration
analyticsRouter.get(
  {
    route: "/api/analytics/dashboard",
    authentication: {
      resource: "analytics",
      action: "View",
      rule: ["Analyst", "Admin"],
    },
  },
  analyticsController.getDashboard
);

analyticsRouter.post(
  {
    route: "/api/analytics/reports",
    authentication: {
      resource: "analytics",
      action: "GenerateReport",
      rule: ["Analyst", "Admin"],
    },
    validation: {
      body: GenerateReportSchema,
    },
  },
  analyticsController.generateReport
);

export default analyticsRouter;
```

### Key Migration Benefits

1. **Cleaner Code**: Middleware chains become declarative configuration
2. **Type Safety**: Full TypeScript support for configuration objects
3. **Auto Documentation**: OpenAPI docs generated automatically
4. **Consistency**: Same configuration style across all routes
5. **Less Boilerplate**: No need to import and chain middleware manually

## Full Example: Feature-Complete Custom Router

Here's a comprehensive example showing multiple ArkosRouter features working together:

```typescript
// src/routers/blog.router.ts
import { ArkosRouter } from "arkos";
import { z } from "zod";
import blogController from "../controllers/blog.controller";

const blogRouter = ArkosRouter();

// Validation schemas
const CreatePostSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(10),
  excerpt: z.string().max(500).optional(),
  tags: z.array(z.string()).max(10).optional(),
  publishAt: z.string().datetime().optional(),
});

const UpdatePostSchema = CreatePostSchema.partial();

const PostQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().max(100)).optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
});

// Public endpoint - list posts with pagination
blogRouter.get(
  {
    route: "/api/blog/posts",
    validation: {
      query: PostQuerySchema,
    },
    rateLimit: {
      windowMs: 60 * 1000,
      max: 60,
    },
    compression: {
      level: 6,
    },
    queryParser: {
      parseNumber: true,
      parseBoolean: true,
    },
    experimental: {
      openapi: {
        summary: "List blog posts",
        description: "Get a paginated list of published blog posts",
        tags: ["Blog"],
        responses: {
          200: {
            description: "List of blog posts",
          },
        },
      },
    },
  },
  blogController.listPosts
);

// Public endpoint - get single post
blogRouter.get(
  {
    route: "/api/blog/posts/:id",
    validation: {
      params: z.object({
        id: z.string(),
      }),
    },
    rateLimit: {
      windowMs: 60 * 1000,
      max: 100,
    },
    experimental: {
      openapi: {
        summary: "Get blog post",
        description: "Get a single blog post by ID",
        tags: ["Blog"],
      },
    },
  },
  blogController.getPost
);

// Protected endpoint - create post
blogRouter.post(
  {
    route: "/api/blog/posts",
    authentication: {
      resource: "blog-post",
      action: "Create",
      rule: ["Editor", "Admin"],
    },
    validation: {
      body: CreatePostSchema,
    },
    rateLimit: {
      windowMs: 60 * 1000,
      max: 10,
    },
    experimental: {
      openapi: {
        summary: "Create blog post",
        description: "Create a new blog post (requires authentication)",
        tags: ["Blog - Admin"],
        responses: {
          201: {
            description: "Post created successfully",
          },
          400: {
            description: "Invalid request data",
          },
          401: {
            description: "Unauthorized",
          },
          403: {
            description: "Forbidden - insufficient permissions",
          },
        },
      },
    },
  },
  blogController.createPost
);

// Protected endpoint - update post
blogRouter.patch(
  {
    route: "/api/blog/posts/:id",
    authentication: {
      resource: "blog-post",
      action: "Update",
      rule: ["Editor", "Admin"],
    },
    validation: {
      params: z.object({
        id: z.string(),
      }),
      body: UpdatePostSchema,
    },
    rateLimit: {
      windowMs: 60 * 1000,
      max: 20,
    },
    experimental: {
      openapi: {
        summary: "Update blog post",
        description: "Update an existing blog post",
        tags: ["Blog - Admin"],
      },
    },
  },
  blogController.updatePost
);

// Protected endpoint - delete post
blogRouter.delete(
  {
    route: "/api/blog/posts/:id",
    authentication: {
      resource: "blog-post",
      action: "Delete",
      rule: ["Admin"],
    },
    validation: {
      params: z.object({
        id: z.string(),
      }),
    },
    rateLimit: {
      windowMs: 60 * 1000,
      max: 5,
    },
    experimental: {
      openapi: {
        summary: "Delete blog post",
        description: "Delete a blog post (Admin only)",
        tags: ["Blog - Admin"],
      },
    },
  },
  blogController.deletePost
);

// Protected endpoint - upload featured image
blogRouter.post(
  {
    route: "/api/blog/posts/:id/featured-image",
    authentication: {
      resource: "blog-post",
      action: "Update",
      rule: ["Editor", "Admin"],
    },
    validation: {
      params: z.object({
        id: z.string(),
      }),
    },
    experimental: {
      uploads: {
        type: "single",
        field: "image",
        uploadDir: "blog-images",
        maxSize: 1024 * 1024 * 5, // 5MB
        allowedFileTypes: [".jpg", ".jpeg", ".png", ".webp"],
        deleteOnError: true,
        attachToBody: "url",
      },
      openapi: {
        summary: "Upload featured image",
        description: "Upload a featured image for a blog post",
        tags: ["Blog - Admin"],
      },
    },
  },
  blogController.uploadFeaturedImage
);

export default blogRouter;
```

Then register in your app:

```typescript
// src/app.ts
import arkos from "arkos";
import blogRouter from "./routers/blog.router";

arkos.init({
  routers: {
    additional: [blogRouter],
  },
  authentication: {
    mode: "static-rbac", // or "dynamic-rbac"
  },
  validation: {
    resolver: "zod",
  },
  // other configs
});
```

## Full Example: Enhanced Prisma Model Router

Here's how to leverage ArkosRouter's features in a Prisma model router:

```typescript
// src/modules/product/product.router.ts
import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";
import { z } from "zod";
import productController from "./product.controller";

export const config: RouterConfig = {
  // Configure auto-generated endpoints
  findMany: {
    authentication: false, // Public endpoint
    rateLimit: {
      windowMs: 60 * 1000,
      max: 100,
    },
    queryParser: {
      parseNull: true,
      parseBoolean: true,
      parseNumber: true,
    },
    experimental: {
      openapi: {
        summary: "List products",
        description: "Get a list of all products with optional filtering",
        tags: ["Products"],
      },
    },
  },

  findOne: {
    authentication: false,
    rateLimit: {
      windowMs: 60 * 1000,
      max: 200,
    },
    experimental: {
      openapi: {
        summary: "Get product",
        description: "Get a single product by ID",
        tags: ["Products"],
      },
    },
  },

  createOne: {
    authentication: {
      resource: "product",
      action: "Create",
      rule: ["Admin", "ProductManager"],
    },
    rateLimit: {
      windowMs: 60 * 1000,
      max: 20,
    },
    experimental: {
      openapi: {
        summary: "Create product",
        description: "Create a new product (requires authentication)",
        tags: ["Products - Admin"],
      },
    },
  },

  updateOne: {
    authentication: {
      resource: "product",
      action: "Update",
      rule: ["Admin", "ProductManager"],
    },
    rateLimit: {
      windowMs: 60 * 1000,
      max: 30,
    },
  },

  deleteOne: {
    authentication: {
      resource: "product",
      action: "Delete",
      rule: ["Admin"],
    },
    rateLimit: {
      windowMs: 60 * 1000,
      max: 10,
    },
  },

  // Disable bulk operations
  createMany: {
    disabled: true,
  },
  updateMany: {
    disabled: true,
  },
  deleteMany: {
    disabled: true,
  },

  // Configure parent relationship
  parent: {
    model: "category",
    foreignKeyField: "categoryId",
    endpoints: ["findMany", "findOne"],
  },
};

// Create custom endpoints
const router = ArkosRouter();

// Custom search endpoint
const SearchProductsSchema = z.object({
  q: z.string().min(2),
  category: z.string().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  inStock: z.boolean().optional(),
});

router.get(
  {
    route: "/search",
    validation: {
      query: SearchProductsSchema,
    },
    rateLimit: {
      windowMs: 60 * 1000,
      max: 50,
    },
    experimental: {
      openapi: {
        summary: "Search products",
        description: "Advanced product search with filters",
        tags: ["Products"],
      },
    },
  },
  productController.searchProducts
);

// Custom bulk discount endpoint
const BulkDiscountSchema = z.object({
  productIds: z.array(z.string()).min(1).max(100),
  discountPercent: z.number().min(0).max(100),
  expiresAt: z.string().datetime().optional(),
});

router.post(
  {
    route: "/bulk-discount",
    authentication: {
      resource: "product",
      action: "BulkDiscount",
      rule: ["Admin", "ProductManager"],
    },
    validation: {
      body: BulkDiscountSchema,
    },
    rateLimit: {
      windowMs: 60 * 1000,
      max: 5,
    },
    experimental: {
      openapi: {
        summary: "Apply bulk discount",
        description: "Apply discount to multiple products at once",
        tags: ["Products - Admin"],
      },
    },
  },
  productController.applyBulkDiscount
);

// Custom image upload endpoint
router.post(
  {
    route: "/:id/images",
    authentication: {
      resource: "product",
      action: "Update",
      rule: ["Admin", "ProductManager"],
    },
    validation: {
      params: z.object({
        id: z.string(),
      }),
    },
    experimental: {
      uploads: {
        type: "array",
        field: "images",
        maxCount: 5,
        uploadDir: "products",
        maxSize: 1024 * 1024 * 3, // 3MB per image
        allowedFileTypes: [".jpg", ".jpeg", ".png", ".webp"],
        deleteOnError: true,
        attachToBody: "url",
      },
      openapi: {
        summary: "Upload product images",
        description: "Upload multiple images for a product",
        tags: ["Products - Admin"],
      },
    },
  },
  productController.uploadProductImages
);

export default router;
```

## Comparing the Two Approaches

| Feature                      | Custom Routers                      | Customizing Prisma Model Routers                             |
| ---------------------------- | ----------------------------------- | ------------------------------------------------------------ |
| **Purpose**                  | Create entirely new endpoints       | Extend or modify existing model endpoints                    |
| **Path Base**                | You define the full path            | Based on the model name (e.g., `/api/products`)              |
| **Registration**             | Added to `routers.additional` array | Auto-detected based on file location                         |
| **File Location**            | Anywhere (typically `src/routers`)  | Must be in `src/modules/model-name/model-name.router.ts`     |
| **Built-in Features**        | All ArkosRouter features available  | All ArkosRouter features available (same as custom routers)  |
| **Auto-generated Endpoints** | None                                | Can configure, disable, or override auto-generated endpoints |
| **Configuration Export**     | Not required                        | Must export `config` object and default router               |

:::tip Key Insight
As of v1.4.0-beta, **both approaches** now use ArkosRouter and have access to the same powerful features: validation, authentication, rate limiting, OpenAPI docs, file uploads, and more. The main difference is whether you're creating new endpoints from scratch or working with auto-generated model endpoints.
:::

## Best Practices

### 1. Choose the Right Approach

- **Use Custom Routers for**: Standalone features, complex business logic, cross-model operations
- **Use Prisma Model Customization for**: Extending model APIs, configuring auto-generated endpoints, model-specific operations

### 2. Consistent Configuration

Use ArkosRouter's declarative configuration style consistently:

```typescript
// ✅ Good - declarative configuration
router.post(
  {
    route: "/api/reports",
    authentication: {
      resource: "report",
      action: "Create",
      rule: ["Admin"],
    },
    validation: {
      body: CreateReportSchema,
    },
    rateLimit: {
      windowMs: 60 * 1000,
      max: 10,
    },
  },
  controller.createReport
);

// ❌ Avoid - mixing ArkosRouter with manual middleware chains
router.post(
  { route: "/api/reports" },
  authService.authenticate,
  authService.handleAccessControl("Create", "report"),
  validator(CreateReportSchema),
  controller.createReport
);
```

### 3. Favor Zod for Validation

While both Zod and class-validator are supported, Zod is recommended for its:

- Better type inference
- Composability
- Runtime transformation capabilities
- Smaller bundle size

```typescript
// ✅ Recommended - Zod
const UserSchema = z.object({
  email: z.string().email(),
  age: z.number().int().positive().optional(),
});

// ✅ Also supported - class-validator
class CreateUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  age?: number;
}
```

### 4. Organize Complex Validation

For complex schemas, create dedicated schema files:

```typescript
// src/schemas/order.schemas.ts
import { z } from "zod";

export const OrderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  customization: z.string().optional(),
});

export const CreateOrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1).max(50),
  shippingAddress: z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.string(),
    country: z.string(),
  }),
  paymentMethod: z.enum(["card", "paypal", "bank_transfer"]),
  notes: z.string().max(500).optional(),
});

export const UpdateOrderSchema = CreateOrderSchema.partial();
```

### 5. Secure Your Routes Properly

Always add authentication and appropriate rate limiting for sensitive operations:

```typescript
// ✅ Good - protected admin endpoint
router.delete(
  {
    route: "/api/users/:id",
    authentication: {
      resource: "user",
      action: "Delete",
      rule: ["Admin"],
    },
    rateLimit: {
      windowMs: 60 * 1000,
      max: 5,
    },
  },
  userController.deleteUser
);

// ❌ Bad - unprotected sensitive operation
router.delete(
  {
    route: "/api/users/:id",
  },
  userController.deleteUser
);
```

### 6. Document Your APIs

Use the experimental OpenAPI feature to generate comprehensive API documentation:

```typescript
router.post(
  {
    route: "/api/products",
    validation: {
      body: CreateProductSchema,
    },
    experimental: {
      openapi: {
        summary: "Create a new product",
        description:
          "Creates a new product in the catalog with the provided details",
        tags: ["Products", "Admin"],
        responses: {
          201: {
            description: "Product created successfully",
          },
          400: {
            description: "Invalid input data",
          },
          401: {
            description: "Authentication required",
          },
          403: {
            description: "Insufficient permissions",
          },
        },
      },
    },
  },
  productController.createProduct
);
```

### 7. Use Consistent Path Naming

Follow RESTful conventions and maintain consistency:

```typescript
// ✅ Good - RESTful paths
router.get({ route: "/api/products" }, ...);
router.get({ route: "/api/products/:id" }, ...);
router.post({ route: "/api/products" }, ...);
router.patch({ route: "/api/products/:id" }, ...);
router.delete({ route: "/api/products/:id" }, ...);

// Custom actions as sub-resources
router.post({ route: "/api/products/:id/publish" }, ...);
router.post({ route: "/api/products/:id/archive" }, ...);

// ❌ Avoid - inconsistent naming
router.get({ route: "/api/getProducts" }, ...);
router.post({ route: "/api/product-create" }, ...);
router.patch({ route: "/api/updateProduct/:id" }, ...);
```

### 8. Configure Rate Limits Appropriately

Different operations need different rate limits:

```typescript
export const config: RouterConfig = {
  // Public read operations - generous limits
  findMany: {
    rateLimit: {
      windowMs: 60 * 1000,
      max: 100,
    },
  },
  findOne: {
    rateLimit: {
      windowMs: 60 * 1000,
      max: 200,
    },
  },

  // Write operations - moderate limits
  createOne: {
    authentication: true,
    rateLimit: {
      windowMs: 60 * 1000,
      max: 20,
    },
  },
  updateOne: {
    authentication: true,
    rateLimit: {
      windowMs: 60 * 1000,
      max: 30,
    },
  },

  // Destructive operations - strict limits
  deleteOne: {
    authentication: {
      resource: "product",
      action: "Delete",
      rule: ["Admin"],
    },
    rateLimit: {
      windowMs: 60 * 1000,
      max: 5,
    },
  },
};
```

### 9. Handle File Uploads Carefully

Always configure proper validation and limits for file uploads:

```typescript
router.post(
  {
    route: "/api/upload/document",
    authentication: true,
    experimental: {
      uploads: {
        type: "single",
        field: "document",
        uploadDir: "documents",
        maxSize: 1024 * 1024 * 10, // 10MB
        allowedFileTypes: [".pdf", ".doc", ".docx"],
        deleteOnError: true, // Clean up on failure
        attachToBody: "pathname", // or "url" based on your needs
      },
    },
  },
  uploadController.handleDocument
);
```

### 10. Migrate Incrementally

When upgrading existing projects:

1. Start with new custom routers using ArkosRouter
2. Migrate heavily-used routes first to gain experience
3. Update Prisma model router configs to use new syntax
4. Keep legacy Express Router code until you're confident
5. Test thoroughly before removing old code

## Configuration Reference

For complete details on all available configuration options, refer to the [ArkosRouter Configuration Reference](/docs/api/arkos-router-config).

Quick reference for common options:

- **`route`**: The endpoint path (required)
- **`disabled`**: Temporarily disable the route
- **`authentication`**: Configure authentication and RBAC
- **`validation`**: Validate query, body, params, headers, cookies
- **`rateLimit`**: Rate limiting configuration
- **`compression`**: Response compression settings
- **`queryParser`**: Query parameter parsing options
- **`bodyParser`**: Custom body parser configuration
- **`experimental.openapi`**: OpenAPI/Swagger documentation
- **`experimental.uploads`**: File upload handling

## Next Steps

Now that you understand ArkosRouter, explore these related topics:

- **[Request Data Validation](/docs/core-concepts/request-data-validation)** - Deep dive into validation with Zod and class-validator
- **[Authentication System](/docs/core-concepts/authentication-system)** - Learn about Static and Dynamic RBAC
- **[OpenAPI/Swagger Documentation](/docs/guide/openapi-swagger)** - Auto-generate API documentation
- **[File Upload Guide](/docs/guide/file-uploads)** - Handle file uploads with ease
- **[Built-in Middlewares](/docs/guide/built-in-middlewares)** - Discover available middleware
- **[Error Handling](/docs/guide/error-handling)** - Proper error handling strategies
- **[ArkosRouter API Reference](/docs/api/arkos-router-config)** - Complete configuration reference

## Getting Help

If you encounter issues or have questions:

- Check the [GitHub Issues](https://github.com/your-org/arkos/issues)
- Join our [Discord Community](https://discord.gg/arkos)
- Read the [FAQ](/docs/faq)

Happy routing! 🚀
