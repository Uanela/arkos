---
slug: 1.4-beta
title: Announcing Arkos.js 1.4.0-beta Release
authors: [uanela]
tags:
  [arkosjs, arkosrouter, openapi, typescript, declarative-config, file-uploads]
---

Today marks a pivotal moment in the Arkos.js journey with the release of 1.4.0-beta - our most ambitious update yet. This release introduces **ArkosRouter**, a complete reimagining of how you build and configure APIs, along with groundbreaking improvements to OpenAPI documentation, file uploads, TypeScript integration, and developer experience.

<!-- truncate -->

After months of development and over 100 commits, we're excited to share a release that fundamentally transforms how you think about API development. Instead of scattering configuration across middleware chains, validation files, and route handlers, ArkosRouter brings everything together in one declarative, type-safe configuration object.

## The Star of the Show: ArkosRouter

ArkosRouter represents a paradigm shift from imperative to declarative API development. Instead of chaining middleware functions and managing complex execution orders, you define your route's complete behavior through a single configuration object.

### Before: The Traditional Approach

```typescript
import { Router } from "express";
import { authService } from "arkos/services";
import { handleRequestBodyValidationAndTransformation } from "arkos/middlewares";
import { rateLimit } from "express-rate-limit";

const router = Router();

router.post(
  "/api/posts",
  authService.authenticate,
  authService.handleAccessControl("Create", "post", {
    Create: ["Admin", "Editor"],
  }),
  handleRequestBodyValidationAndTransformation(CreatePostSchema),
  postController.create
);
```

### After: The ArkosRouter Way

```typescript
import { ArkosRouter } from "arkos";
import z from "zod";

const router = ArkosRouter();

router.post(
  {
    path: "/api/posts",
    authentication: {
      resource: "post",
      action: "Create",
      rule: ["Admin", "Editor"],
    },
    validation: {
      body: CreatePostSchema,
      query: CreatePostQuerySchema,
      params: CreatePostParamsSchema,
    },
  },
  postController.create
);
```

Clean, self-documenting, and impossible to misconfigure. Everything your route needs is right there in one place.

## What's New in 1.4.0

### 1. Comprehensive Request Validation

One of the most wanted features is finally here: **full validation support for query parameters and path parameters**, not just request bodies. This closes a critical security gap that existed in previous versions.

```typescript
router.get(
  {
    path: "/api/products",
    validation: {
      query: z.object({
        category: z.string().optional(),
        minPrice: z.coerce.number().min(0).optional(),
        maxPrice: z.coerce.number().max(10000).optional(),
        inStock: z.coerce.boolean().optional(),
        page: z.coerce.number().int().min(1).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional(),
      }),
    },
  },
  productController.findMany
);
```

Without this validation, a request like `?minPrice=abc&limit=999999` would crash your application or cause performance issues. Now, Arkos automatically validates and type-coerces these values, ensuring your database queries are always safe and predictable.

:::tip
You could do this before manually that would not kind of taking to much effort (some may say), but something that is so logical and repetitive shall be easier as sleeping.
:::

You check the docs about this new feature for a fully dive into it [Request Data Validation In `v1.4.0-beta`](/docs/core-concepts/request-data-validatoin).

### 2. Revolutionary OpenAPI Integration

The new OpenAPI system is the most developer-friendly documentation solution we've ever seen. You can use **Zod schemas, DTOs, or plain JSON Schema** directly in your route configuration - no need to write traditional OpenAPI response objects.

```typescript
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  profile: z.object({
    bio: z.string().optional(),
    avatar: z.string().url().optional(),
  }),
});

router.get(
  {
    path: "/api/users/:id",
    validation: {
      params: z.object({
        id: z.string().uuid("Invalid user ID"),
      }),
    },
    experimental: {
      openapi: {
        summary: "Get user by ID",
        tags: ["Users"],
        responses: {
          200: UserSchema, // Just pass your schema!
          404: {
            // Go down a level to description and do then same
            content: z.object({ message: z.string() }),
            description: "User not found",
          },
        },
      },
    },
  },
  userController.getUser
);
```

The magic? Your validation schemas automatically generate request documentation. Define your `validation.body` once, and Arkos creates both runtime validation and OpenAPI documentation from the same source. No duplication, no drift between docs and reality.

### 3. Route-Level File Uploads

File uploads are now a first-class citizen in route configuration. Handle single files, multiple files, or complex multi-field uploads with declarative configuration.

**Single File Upload:**

```typescript
router.post(
  {
    path: "/api/users/avatar",
    authentication: true,
    experimental: {
      uploads: {
        type: "single",
        field: "avatar",
        maxSize: 1024 * 1024 * 5, // 5MB
        uploadDir: "avatars",
      },
    },
  },
  userController.uploadAvatar
);
```

**Multiple Files with Nested Fields:**

```typescript
router.post(
  {
    path: "/api/products",
    experimental: {
      uploads: {
        type: "fields",
        fields: [
          { name: "product[thumbnail]", maxCount: 1 },
          { name: "product[gallery]", maxCount: 5 },
          { name: "documents[manual]", maxCount: 1 },
        ],
        uploadDir: "products",
        deleteOnError: true,
      },
    },
  },
  productController.create
);
```

Arkos automatically parses bracket notation into nested objects in `req.body`, making complex form structures trivial to handle:

```typescript
// Automatically structured in req.body:
{
  name: "Laptop Pro",
  product: {
    thumbnail: "/images/laptop-thumb.jpg",
    gallery: ["/images/laptop-1.jpg", "/images/laptop-2.jpg"]
  },
  documents: {
    manual: "/documents/manual.pdf"
  }
}
```

Check the full guide at [File Upload With Arkos Router](docs/core-concepts/file-uploads#auto-generated-routes-with-file-uploads).

### 4. Enhanced TypeScript Support

The new `ArkosRequest<Query, Body, Params>` generic type brings complete type safety across all three validation targets:

```typescript
import { ArkosRequest, ArkosResponse } from "arkos";

interface ProductQuery {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}

interface CreateProductBody {
  name: string;
  price: number;
  description?: string;
}

interface ProductParams {
  id: string;
}

const handler = async (
  req: ArkosRequest<ProductQuery, CreateProductBody, ProductParams>,
  res: ArkosResponse
) => {
  // All validated and type-safe!
  const { category, minPrice, maxPrice } = req.query;
  const { name, price, description } = req.body;
  const { id } = req.params;

  // TypeScript knows exact types - no casting needed
};
```

### 5. Simplified Configuration System

Say goodbye to `src/app.ts` initialization complexity. The new `arkos.config.ts` brings all configuration into one clean, exportable file:

```typescript
// arkos.config.ts
import { ArkosConfig } from "arkos";

const arkosConfig: ArkosConfig = {
  validation: {
    resolver: "zod",
    validationOptions: {
      whitelist: true,
    },
  },
  swagger: {
    mode: "prisma",
    options: {
      definition: {
        info: {
          title: "My API",
          version: "1.0.0",
        },
      },
    },
  },
  authentication: {
    enabled: true,
    jwt: {
      secret: process.env.JWT_SECRET!,
      expiresIn: "7d",
    },
  },
};

export default arkosConfig;
```

Learn more about the updated configuration style at [Arkos Configuration Guide](/docs/api-reference/arkos-configuration).

### 6. Enhanced CLI Tools

New commands make generating components and exporting configurations easier than ever:

#### Generate Create and Update Request Validators

```bash
# Generate validation schemas
npx arkos generate create-schema --module product
npx arkos generate update-schema --module product

# Generate DTOs
npx arkos generate create-dto --module user
npx arkos generate update-dto --module user
```

#### Export auth actions for frontend

```bash
npx arkos export auth-action
```

With this you can easily add i18n, custom description and so many more, check it now [Exporting Auth Actions For Frontend](/docs/core-concepts/authentication-system#exporting-auth-actions-for-frontend)

#### Enhanced Prisma integration With Base Service

```bash
npx arkos prisma generate
```

This finally bring the `@prisma/client` TS types to the `BaseService` class for better developer experience, check more about it at [Fully Typed Base Service Class](/docs/api-reference/base-service-class).

### 7. Better Developer Experience

- **Interceptor Middlewares**: New `.interceptors.ts` naming convention (replaces `.middlewares.ts`) for better clarity
- **catchAsync Is Over**: You no longer need to even wrap your custom controllers handlers even you are using `ArkosRouter`, this is also true for interceptors since `v1.3.0-beta`
- **Enhanced Error Messages**: More detailed error information in development mode with original error details
- **Faster Startup**: Optimized module loading and route registration
- **Network Binding**: Server now binds to 0.0.0.0 with network IP display for better mobile testing

## Real-World Impact: Security and Performance

### Security Improvements

**Before 1.4.0:**

```typescript
// Query parameters were unvalidated strings
GET /api/products?limit=999999&minPrice=not-a-number

// This would either crash or cause severe performance issues
const products = await prisma.product.findMany({
  take: req.query.limit, // String "999999" causes issues
  where: {
    price: { gte: req.query.minPrice } // String causes database error
  }
});
```

**With 1.4.0:**

```typescript
// Validation catches issues before they reach your database
export const config: RouterConfig = {
  findMany: {
    validation: {
      query: z.object({
        limit: z.coerce.number().int().min(1).max(100),
        minPrice: z.coerce.number().min(0),
      }),
    },
  },
};

// Invalid request returns clear error:
{
  "status": "error",
  "message": "Invalid Data",
  "errors": [
    {
      "property": "limit",
      "constraints": { "max": "limit must not be greater than 100" }
    }
  ]
}
```

### Performance Benefits

The declarative approach enables better optimization:

- **Eager validation**: Catch errors before expensive database operations
- **Type coercion**: Automatic string-to-number conversions eliminate manual parsing
- **Route-level optimization**: Compression, body parsing, and rate limiting configured per-route
- **Better caching**: Validation schemas are compiled once and reused

## Migration Path

While 1.4.0 introduces significant improvements, we've maintained backward compatibility where possible. The migration is straightforward:

### 1. Update Configuration

```typescript
// Old: src/app.ts
import arkos from "arkos";

arkos.init({
  validation: { resolver: "zod" },
  swagger: { mode: "prisma" },
  cors: {
    allowedOrigins: "*",
  },
});

// New: arkos.config.ts
import { ArkosConfig } from "arkos";

const arkosConfig: ArkosConfig = {
  validation: { resolver: "zod" },
  swagger: { mode: "prisma" },
  middlewares: {
    cors: {
      allowedOrigins: "*",
    },
  },
};

export default arkosConfig;
```

### 2. Adopt ArkosRouter

```typescript
// Old approach still works, but upgrade to get new features
import { Router } from "express";
const router = Router();

// New approach with all benefits
import { ArkosRouter } from "arkos";
const router = ArkosRouter();
```

### 3. Rename Interceptor Files

```bash
# Rename .middlewares.ts to .interceptors.ts
mv src/modules/user/user.middlewares.ts src/modules/user/user.interceptors.ts
```

## Breaking Changes

- `arkos.config.ts` is now the standard configuration method
- `.interceptors.ts` replaces `.middlewares.ts` (old naming still works with warnings until 1.6.0)
- Route configuration syntax updated for ArkosRouter
- Some internal APIs changed for better type safety

## What's Next

This 1.4.0-beta release sets the foundation for exciting future enhancements:

- More granular validation modes and error customization
- Enhanced service layer capabilities
- Additional experimental features for file processing
- Further TypeScript improvements and stricter type checking
- Performance optimizations and caching strategies

## How to Upgrade

For existing projects:

```bash
npm install arkos@latest
```

For new projects:

```bash
npm create arkos@latest my-project
```

## Closing Thoughts

Arkos 1.4.0-beta represents our vision of what modern API development should be: **declarative, type-safe, and delightfully simple** allowing your focus on the application business logic and not standard patterns. By bringing together routing, validation, authentication, file uploads, and documentation into one cohesive system, we're eliminating the complexity that traditionally plagued API development.

The new ArkosRouter isn't just a better router - it's a fundamentally different way of thinking about API design. Instead of managing dozens of scattered configuration files and middleware chains, you declare your intent once, and Arkos handles the rest.

We're incredibly excited to see what you build with these new capabilities. The combination of comprehensive validation, automatic documentation, and enhanced type safety provides the foundation for building production-ready APIs with minimal configuration.

As always, your feedback drives our development. Try out 1.4.0-beta and let us know what you think!

---

**Resources:**

- [Full Documentation](https://arkosjs.com/docs)
- [Arkos Router Api Reference](https://arkosjs.com/docs/api-reference/arkos-router)
- [GitHub Repository](https://github.com/Uanela/arkos)
