---
sidebar_position: 1
title: Arkos Router (new)
---

import SmallTag from "../components/small-tag"

# Arkos Router Guide <SmallTag>New</SmallTag>

> Available from `v1.4.0-beta`

A comprehensive reference for configuring routes with ArkosRouter, Arkos's enhanced Express Router that provides declarative configuration for authentication, validation, rate limiting, file uploads, and more.

## Overview

ArkosRouter extends Express Router with a configuration-first approach. Instead of chaining middleware functions, you define your route's behavior through a configuration object:

```typescript
import { ArkosRouter } from "arkos";

const router = ArkosRouter();

router.get(
  {
    path: "/api/users/:id",
    authentication: true,
    validation: {
      params: z.object({ id: z.string() }),
    },
  },
  userController.getUser
);
```

This declarative approach keeps your routes clean, self-documenting, and consistent across your application.

## Configuration Object

The first argument to any HTTP method (`get`, `post`, `put`, `patch`, `delete`) is a configuration object with the following properties:

### `path` (required)

The route path following Express routing conventions.

```typescript
router.get({ path: "/api/users" }, handler);

router.get({ path: "/api/users/:id" }, handler);

router.get({ path: "/api/posts/:postId/comments/:commentId" }, handler);
```

**Path Parameters**: Use Express parameter syntax (`:paramName`). These can be validated using the `validation.params` option.

### `disabled`

Completely disables the route. Useful for temporarily removing endpoints without deleting code.

```typescript
router.post(
  {
    path: "/api/admin/dangerous-action",
    disabled: true, // This endpoint won't be registered
  },
  handler
);
```

## Authentication

Control authentication and role-based access control for your routes.

### Basic Authentication

Require users to be authenticated:

```typescript
router.get(
  {
    path: "/api/profile",
    authentication: true,
  },
  handler
);
```

### Role-Based Access Control

Define which roles can access the endpoint:

```typescript
router.post(
  {
    path: "/api/posts",
    authentication: {
      resource: "post",
      action: "Create",
      rule: { roles: ["Admin", "Editor"] }, // When using static authentication
    },
  },
  handler
);
```

**Authentication Object Properties:**

| Property   | Type                                | Description                                                                                         |
| ---------- | ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `resource` | `string`                            | The resource being accessed (e.g., "post", "user")                                                  |
| `action`   | `string`                            | The action being performed (e.g., "Create", "Update", "Delete")                                     |
| `rule`     | `{ roles: string[] }` or `string[]` | Array of role names that can perform this action (This only works when using static authentication) |

:::tip
The `rule` field is required for defining roles when you are using the [Static Authentication Mode](/docs/core-concepts/authentication-system#jwt-configuration--environment-setup). This field can be an object `{ roles: string[] }` and you can add many other descriptive fields to easy your frontend devs lives or it can be a simple array of string `string[]` which will be converted to an object under the hood.

You can more about detailed access control rules at [Adding Auth Configs File Guide](/docs/core-concepts/authentication-system#auth-config-files---static-rbac).
:::

**Example with Custom Actions:**

```typescript
router.post(
  {
    path: "/api/posts/:id/publish",
    authentication: {
      resource: "post",
      action: "Publish",
      rule: { roles: ["Admin", "Editor"] }, // When using static authentication
    },
  },
  handler
);
```

For complete authentication setup and advanced features, see the [Authentication System Guide](/docs/core-concepts/authentication-system).

## Validation

Validate incoming request data using Zod schemas or class-validator DTOs.

### Request Body Validation

```typescript
import z from "zod";

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

router.post(
  {
    path: "/api/users",
    validation: {
      body: CreateUserSchema,
    },
  },
  handler
);
```

### Query Parameters Validation

```typescript
const SearchQuerySchema = z.object({
  q: z.string(),
  limit: z.number().int().min(1).max(100).default(10),
  offset: z.number().int().min(0).default(0),
});

router.get(
  {
    path: "/api/search",
    validation: {
      query: SearchQuerySchema,
    },
  },
  handler
);
```

### Path Parameters Validation

```typescript
const UserParamsSchema = z.object({
  id: z.string().uuid(),
});

router.get(
  {
    path: "/api/users/:id",
    validation: {
      params: UserParamsSchema,
    },
  },
  handler
);
```

### Multiple Validation Targets

```typescript
router.patch(
  {
    path: "/api/posts/:id",
    validation: {
      params: z.object({ id: z.string() }),
      body: UpdatePostSchema,
      query: z.object({ publish: z.boolean().optional() }),
    },
  },
  handler
);
```

**Validation Options:**

| Property | Type                             | Description                |
| -------- | -------------------------------- | -------------------------- |
| `body`   | `ZodSchema \| ClassValidatorDto` | Validates request body     |
| `query`  | `ZodSchema \| ClassValidatorDto` | Validates query parameters |
| `params` | `ZodSchema \| ClassValidatorDto` | Validates URL parameters   |

For complete validation setup and class-validator usage, see the [Request Data Validation Guide](/docs/core-concepts/request-data-validation).

## Rate Limiting

Protect your endpoints from abuse by limiting request frequency.

### Basic Rate Limiting

```typescript
router.post(
  {
    path: "/api/auth/login",
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 requests per window
    },
  },
  handler
);
```

### Custom Rate Limit Messages

```typescript
router.post(
  {
    path: "/api/reports/generate",
    rateLimit: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3,
      message: "Report generation limit exceeded. Please try again in an hour.",
    },
  },
  handler
);
```

**Rate Limit Properties:**

| Property   | Type     | Description                 | Default             |
| ---------- | -------- | --------------------------- | ------------------- |
| `windowMs` | `number` | Time window in milliseconds | -                   |
| `max`      | `number` | Maximum requests per window | -                   |
| `message`  | `string` | Custom error message        | "Too many requests" |

**Note**: Route-level rate limits override global configuration. If you've set rate limiting globally in `arkos.config.ts`, specifying it here will use these values instead.

## File Uploads

Handle file uploads with automatic validation and processing.

### Single File Upload

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
  handler
);
```

### Multiple Files Upload

```typescript
router.post(
  {
    path: "/api/gallery",
    authentication: true,
    experimental: {
      uploads: {
        type: "array",
        field: "photos",
        maxCount: 10,
        uploadDir: "gallery",
        allowedFileTypes: [".jpg", ".png", ".webp"],
      },
    },
  },
  handler
);
```

### Multiple Fields Upload

```typescript
router.post(
  {
    path: "/api/products",
    authentication: true,
    experimental: {
      uploads: {
        type: "fields",
        fields: [
          { name: "thumbnail", maxCount: 1 },
          { name: "images", maxCount: 5 },
          { name: "documents", maxCount: 3 },
        ],
        uploadDir: "products",
      },
    },
  },
  handler
);
```

### Nested Fields Upload

Arkos Router also supports nested field names using bracket notation, making it easy to handle complex form structures. When using nested fields with `attachToBody` enabled (default), uploaded files are automatically organized in the correct nested structure within `req.body`.

```typescript
router.post(
  {
    path: "/api/users",
    authentication: true,
    experimental: {
      uploads: {
        type: "single",
        field: "profile[photo]", // Nested field notation
        uploadDir: "users-profile",
      },
    },
  },
  handler
);
```

**Result in `req.body`:**

```typescript
// console.log(req.body)
{
  name: "Luis Juliano",
  email: "luis@becas.co.mz",
  profile: {
    photo: "/images/my-profile-photo-34123843219438.jpg" // Nested correctly
  },
  birthday: "1999-08-03"
}
```

**Multiple Nested Files:**

```typescript
router.post(
  {
    path: "/api/products",
    authentication: true,
    experimental: {
      uploads: {
        type: "fields",
        fields: [
          { name: "product[thumbnail]", maxCount: 1 },
          { name: "product[gallery]", maxCount: 5 },
          { name: "documents[manual]", maxCount: 1 },
          { name: "documents[warranty]", maxCount: 1 },
        ],
        uploadDir: "products",
      },
    },
  },
  handler
);
```

**Result in `req.body`:**

```typescript
{
  name: "Laptop Pro",
  price: 1299.99,
  product: {
    thumbnail: "/images/laptop-thumb.jpg",
    gallery: [
      "/images/laptop-1.jpg",
      "/images/laptop-2.jpg",
      "/images/laptop-3.jpg"
    ]
  },
  documents: {
    manual: "/documents/laptop-manual.pdf",
    warranty: "/documents/warranty-card.pdf"
  }
}
```

**Deep Nesting:**

```typescript
router.post(
  {
    path: "/api/company/profile",
    experimental: {
      uploads: {
        type: "single",
        field: "company[details][logo]", // Deep nesting
        uploadDir: "company-logos",
      },
    },
  },
  handler
);
```

**Result in `req.body`:**

```typescript
{
  company: {
    name: "Tech Corp",
    details: {
      logo: "/images/techcorp-logo.png" // Deeply nested
    }
  }
}
```

**Important Notes:**

- Bracket notation (`field[nested]`) is automatically parsed into nested objects even for non file upload fields
- Works with all upload types: `single`, `array`, and `fields`
- Only applies when `attachToBody` is not `false` (it's `"pathname"` by default)
- The nested structure is created even if other fields in the path don't exist in the request

**Upload Configuration Properties:**

| Property           | Type                                     | Description                            | Default                    |
| ------------------ | ---------------------------------------- | -------------------------------------- | -------------------------- |
| `type`             | `"single" \| "array" \| "fields"`        | Upload type                            | -                          |
| `field`            | `string`                                 | Form field name (single/array)         | -                          |
| `fields`           | `Array<{name, maxCount}>`                | Multiple field config (fields type)    | -                          |
| `uploadDir`        | `string`                                 | Storage directory                      | Auto-detected by MIME type |
| `maxSize`          | `number`                                 | Max file size in bytes                 | From global config         |
| `maxCount`         | `number`                                 | Max files (array type)                 | -                          |
| `allowedFileTypes` | `string[] \| RegExp`                     | Allowed file extensions/patterns       | From global config         |
| `attachToBody`     | `"pathname" \| "url" \| "file" \| false` | How to attach file info to req.body    | `"pathname"`               |
| `deleteOnError`    | `boolean`                                | Delete uploaded files if request fails | `false`                    |

**Accessing Uploaded Files:**

```typescript
// Single file
const file = req.file;

// Array of files
const files = req.files;

// Fields (multiple)
const files = req.files as { [fieldname: string]: Express.Multer.File[] };
```

For complete upload configuration and advanced features, see the [File Upload Guide](/docs/core-concepts/file-uploads).

## OpenAPI Documentation

Generate interactive API documentation automatically from your route configuration.

### Basic Documentation

```typescript
router.get(
  {
    path: "/api/users",
    experimental: {
      openapi: {
        summary: "List all users",
        description: "Retrieves a paginated list of users",
        tags: ["Users"],
      },
    },
  },
  handler
);
```

### Documentation with Responses

The power of ArkosRouter's OpenAPI integration is that you can use **Zod schemas, DTOs, or plain JSON Schema** directly—no need to write traditional OpenAPI response objects:

```typescript
import z from "zod";

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const ErrorSchema = z.object({
  message: z.string(),
  code: z.number(),
});

router.get(
  {
    path: "/api/users/:id",
    validation: {
      params: z.object({ id: z.string() }),
    },
    experimental: {
      openapi: {
        summary: "Get user by ID",
        tags: ["Users"],
        responses: {
          200: UserSchema, // Just pass the schema!
          404: ErrorSchema,
        },
      },
    },
  },
  handler
);
```

### Responses with Descriptions

If you need custom descriptions, wrap your schema in an object:

```typescript
router.post(
  {
    path: "/api/users",
    validation: {
      body: CreateUserSchema,
    },
    experimental: {
      openapi: {
        summary: "Create a new user",
        tags: ["Users"],
        responses: {
          201: {
            content: UserSchema,
            description: "User created successfully",
          },
          400: {
            content: ErrorSchema,
            description: "Invalid input data",
          },
          409: {
            content: ErrorSchema,
            description: "Email already exists",
          },
        },
      },
    },
  },
  handler
);
```

### Full OpenAPI Configuration

For complete control, use the full OpenAPI response format:

```typescript
router.post(
  {
    path: "/api/upload",
    experimental: {
      uploads: {
        type: "single",
        field: "file",
      },
      openapi: {
        summary: "Upload file",
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: FileUploadSchema,
            },
          },
          required: true,
        },
        responses: {
          200: {
            description: "File uploaded successfully",
            content: {
              "application/json": {
                schema: UploadResultSchema,
              },
            },
          },
        },
      },
    },
  },
  handler
);
```

### Excluding Routes from Documentation

```typescript
router.get(
  {
    path: "/api/internal/metrics",
    experimental: {
      openapi: false, // Won't appear in docs
    },
  },
  handler
);
```

**OpenAPI Configuration Properties:**

| Property      | Type       | Description                        |
| ------------- | ---------- | ---------------------------------- |
| `summary`     | `string`   | Short description of the endpoint  |
| `description` | `string`   | Detailed description               |
| `tags`        | `string[]` | Groups endpoints in documentation  |
| `responses`   | `object`   | Response schemas by status code    |
| `requestBody` | `object`   | Request body documentation         |
| `parameters`  | `array`    | Additional parameter documentation |

**Important**: If you define validation in the `validation` field, **DO NOT** redefine the same schemas in `openapi`. Arkos automatically generates OpenAPI documentation from your validation schemas. The `experimental.openapi` field is for:

- Adding metadata (summary, description, tags)
- Documenting responses
- Endpoints without validation

For complete OpenAPI setup and configuration, see the [Swagger API Documentation Guide](/docs/core-concepts/swagger-api-documentation).

## Query Parsing

ArkosRouter provides Django-style query parameter parsing that automatically transforms query strings into Prisma-compatible filters.

### How It Works

Instead of manually constructing nested query objects, use double underscores (`__`) to define relationships and operators:

```typescript
// Traditional approach
GET /api/products?price[gte]=50&price[lt]=200&name[contains]=wireless

// Django-style approach (cleaner!)
GET /api/products?price__gte=50&price__lt=200&name__icontains=wireless
```

Both produce the same Prisma query, but the Django-style is more intuitive and easier to read.

### Examples

**Basic Filtering:**

```typescript
// GET /api/users?age__gte=18&age__lt=65
// Transforms to: { age: { gte: 18, lt: 65 } }
router.get(
  {
    path: "/api/users",
    queryParser: {
      parseDoubleUnderscore: true, // Enable Django-style parsing
      parseNumber: true, // "18" becomes 18
      parseBoolean: true, // "true" becomes true
    },
  },
  handler
);
```

**String Search:**

```typescript
// GET /api/products?name__icontains=phone&category__equals=Electronics
// Transforms to:
{
  name: { contains: "phone", mode: "insensitive" },
  category: { equals: "Electronics" }
}
```

**Nested Relations:**

```typescript
// GET /api/posts?author__name__icontains=john
// Transforms to:
{
  author: {
    name: { contains: "john", mode: "insensitive" }
  }
}
```

**Combining with Other Query Features:**

```typescript
// GET /api/products?name__icontains=laptop&price__gte=500&sort=-price&limit=20
// Filters + sorting + pagination all work together
```

### Query Parser Configuration

Configure how query parameters are parsed and transformed:

```typescript
router.get(
  {
    path: "/api/products",
    queryParser: {
      parseDoubleUnderscore: true, // Enable Django-style operators
      parseNumber: true, // Convert numeric strings to numbers
      parseBoolean: true, // Convert "true"/"false" to booleans
      parseNull: true, // Convert "null" to null
      parseArray: true, // Parse comma-separated values as arrays
    },
  },
  handler
);
```

**Query Parser Properties:**

| Property                | Type      | Description                                   | Default |
| ----------------------- | --------- | --------------------------------------------- | ------- |
| `parseDoubleUnderscore` | `boolean` | Enable Django-style parsing (Arkos extension) | `true`  |
| `parseNumber`           | `boolean` | Convert numeric strings to numbers            | `true`  |
| `parseBoolean`          | `boolean` | Convert "true"/"false" strings to booleans    | `true`  |
| `parseNull`             | `boolean` | Convert "null" string to null                 | `true`  |
| `parseArray`            | `boolean` | Parse comma-separated values as arrays        | `true`  |

For more examples and advanced filtering options, see the [Request Query Parameters Guide](/docs/guide/request-query-parameters).

## Body Parser

Customize how the request body is parsed for specific routes:

```typescript
router.post(
  {
    path: "/api/webhooks/stripe",
    bodyParser: {
      parser: "raw",
      options: { type: "application/json" }, // Parse as raw buffer but only for application/json
    },
  },
  stripeWebhookHandler
);

router.post(
  {
    path: "/api/data/upload",
    bodyParser: {
      parser: "text",
      options: { type: "text/plain", limit: "10mb" },
    },
  },
  textDataHandler
);

router.post(
  {
    path: "/api/form",
    bodyParser: {
      parser: "urlencoded",
      options: { extended: true },
    },
  },
  formHandler
);

router.post(
  {
    path: "/api/disable-parsing",
    bodyParser: false, // Disable body parsing entirely
  },
  customParsingHandler
);
```

**Body Parser Configuration:**

```typescript
bodyParser: {
  parser: "json" | "urlencoded" | "raw" | "text",
  options?: { /* parser-specific options */ }
}
// OR
bodyParser: false // Disable parsing
```

**Parser Types:**

| Parser         | Description                                                       | Common Options                        |
| -------------- | ----------------------------------------------------------------- | ------------------------------------- |
| `"json"`       | Parse as JSON (default globally)                                  | `limit`, `strict`, `type`             |
| `"urlencoded"` | Parse as URL-encoded form data                                    | `limit`, `extended`, `parameterLimit` |
| `"raw"`        | Parse as raw Buffer (for webhooks needing signature verification) | `limit`, `type`                       |
| `"text"`       | Parse as plain text                                               | `limit`, `type`, `defaultCharset`     |
| `false`        | Disable body parsing for this route                               | -                                     |

**Note**: By default, JSON parsing is enabled globally. Use this option to override the parser for specific routes, such as webhook endpoints that need raw request bodies for signature verification.

## Compression

Control response compression for specific routes, this is the same as the npm package compression you can check it at [Compression Github Repo](https://github.com/expressjs/compression).

```typescript
router.get(
  {
    path: "/api/reports/large-dataset",
    compression: true, // Use default compression settings
  },
  handler
);

router.get(
  {
    path: "/api/reports/optimized",
    compression: {
      level: 6, // Compression level (0-9)
      threshold: "1kb", // Only compress responses larger than 1kb
    },
  },
  handler
);

router.get(
  {
    path: "/api/stream/video",
    compression: false, // Disable compression for this route
  },
  videoStreamHandler
);
```

### Compression Configuration:

```typescript
compression: true | false | {
  level?: number;        // 0-9, default: -1 (default compression)
  threshold?: number | string;  // Minimum size to compress, default: "1kb"
  filter?: (req, res) => boolean;  // Custom filter function
  memLevel?: number;     // Memory level (1-9), default: 8
  strategy?: number;     // Compression strategy
  chunkSize?: number;    // Chunk size for compression
}
```

**Compression Options:**

| Option      | Type               | Description                                                | Default                    |
| ----------- | ------------------ | ---------------------------------------------------------- | -------------------------- |
| `level`     | `number`           | Compression level (0=none, 9=max)                          | `-1` (default)             |
| `threshold` | `number \| string` | Minimum response size to compress                          | `"1kb"`                    |
| `filter`    | `function`         | Custom function to decide if response should be compressed | Uses `compressible` module |
| `memLevel`  | `number`           | Memory allocated for compression (1-9)                     | `8`                        |
| `strategy`  | `number`           | Compression strategy (zlib constants)                      | `Z_DEFAULT_STRATEGY`       |
| `chunkSize` | `number`           | Chunk size in bytes                                        | `16384`                    |

**Common Use Cases:**

```typescript
// High compression for large static reports
compression: {
  level: 9, // Maximum compression
  threshold: "10kb"
}

// Fast compression for real-time data
compression: {
  level: 1, // Fastest compression
  threshold: "5kb"
}

// Custom filter to exclude certain content types
compression: {
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}
```

**Note**: Compression is enabled globally by default in Arkos. Use `compression: false` to disable it for specific routes where it's not beneficial (like streaming endpoints or pre-compressed content), or customize compression settings per route.

## Using Standard Express Middleware

While ArkosRouter provides declarative configuration for common needs, you can still use standard Express middleware alongside your handlers:

```typescript
import { someMiddleware } from "./post.middlewares";

router.post(
  {
    path: "/api/posts",
    authentication: true,
    validation: { body: CreatePostSchema },
  },
  someMiddleware,
  anotherMiddleware,
  postController.create
);
```

Middleware functions execute in order before reaching your controller. This is standard Express behavior—ArkosRouter's configuration options are just convenient shortcuts for common middleware patterns.

## Complete Example

Here's a comprehensive example showing multiple features together:

```typescript
import { ArkosRouter } from "arkos";
import z from "zod";
import postController from "./post.controller";

const router = ArkosRouter();

const CreatePostSchema = z.object({
  title: z.string().min(5).max(200),
  content: z.string(),
  tags: z.array(z.string()).optional(),
});

const PostResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  author: z.object({
    id: z.string(),
    name: z.string(),
  }),
  createdAt: z.string(),
});

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
    },
    rateLimit: {
      windowMs: 60 * 1000,
      max: 10,
    },
    queryParser: {
      parseDoubleUnderscore: true,
    },
    experimental: {
      uploads: {
        type: "single",
        field: "featuredImage",
        uploadDir: "post-images",
        maxSize: 1024 * 1024 * 5,
      },
      openapi: {
        summary: "Create a new blog post",
        description: "Creates a new post with optional featured image",
        tags: ["Posts"],
        responses: {
          201: {
            content: PostResponseSchema,
            description: "Post created successfully",
          },
          400: {
            content: z.object({ message: z.string() }),
            description: "Invalid input",
          },
        },
      },
    },
  },
  postController.create
);

export default router;
```

## Related Documentation

- **[Adding Custom Routers](/docs/guide/adding-custom-routers)** - How to create and register custom routers
- **[Authentication System](/docs/core-concepts/authentication-system)** - Complete authentication setup
- **[Request Data Validation](/docs/core-concepts/request-data-validation)** - Validation with Zod and class-validator
- **[File Upload Guide](/docs/core-concepts/file-uploads)** - File upload configuration
- **[Swagger API Documentation](/docs/core-concepts/swagger-api-documentation)** - OpenAPI documentation setup
- **[Request Query Parameters](/docs/guide/request-query-parameters)** - Advanced filtering and querying
