---
slug: 1.5-beta
title: Annoucing Arkos.js v1.5.0-beta
authors: [uanela]
tags: [arkosjs, superm7, webpropax, finegrained, swagger, servicehooks]
---

## Type Safety, Security & Developer Experience Revolution

Today we're thrilled to announce **Arkos 1.5.0-beta** - a release that doubles down on type safety, security by default, and developer productivity. With revolutionary code generation, simplified Prisma relations, and enhanced validation, this release makes building production-ready APIs faster and safer than ever.

<!-- truncate -->

After extensive development and community feedback, 1.5.0 delivers the features developers have been asking for: intelligent type utilities, comprehensive code generation, automatic security defaults, and quality-of-life improvements that eliminate boilerplate across your entire codebase.

## Front Window Features

### 1. Revolutionary Code Generation

The enhanced CLI now generates **everything** you need for a complete module in seconds:

```bash
# Generate all components for a module at once
npx arkos generate components -m user --all

# Or pick specific components
npx arkos generate components -m product -n service,controller,router,schema,dto

# New: Generate base and query schemas/DTOs
npx arkos generate base-schema -m user
npx arkos generate query-schema -m user
npx arkos generate base-dto -m post
npx arkos generate query-dto -m post
```

**What's generated:**

- Service, Controller, Router
- Base, Create, Update, Query schemas (Zod)
- Base, Create, Update, Query DTOs (class-validator)
- Prisma models
- Auth configurations
- Query options, Interceptors, Hooks

**Time saved:** From 30+ minutes of manual setup to **5 seconds** ⚡

Read more about code generation at [Arkos CLI Code Generation Guide.](/docs/cli/arkos-cli#code-generation)

### 2. Auto-Login After Password Update

Security workflows just got smoother. When users update their password via `/api/auth/update-password`, Arkos now **automatically re-authenticates** them with a fresh JWT token.

```typescript
// Before: Users had to log in again manually
POST /api/auth/update-password
{
  "currentPassword": "old123",
  "newPassword": "new456"
}
// Response: { "message": "Password updated" }
// User needs to call /login again

// After: Seamless re-authentication
POST /api/auth/update-password
{
  "currentPassword": "old123",
  "newPassword": "new456"
}
// Response: {
//   "message": "Password updated successfully",
//   "accessToken": "eyJhbG..." // Fresh token!
// }
```

**Why this matters:** Eliminates the awkward "password updated, please log in again" UX pattern. Users stay authenticated seamlessly.

### 3. ArkosPrismaInput - Simplified Prisma Relations

Writing Prisma relation operations just got **dramatically simpler**. The new `ArkosPrismaInput<T>` utility type transforms verbose nested operations into intuitive flat structures:

```typescript
import { Prisma } from "@prisma/client";
import { ArkosPrismaInput } from "arkos/prisma";

// Traditional Prisma way (verbose)
const userData: Prisma.UserCreateInput = {
    name: "John Doe",
    email: "john@example.com",
    posts: {
        create: [{ title: "First Post" }],
        connect: [{ id: 1 }],
        update: [
            {
                where: { id: 2 },
                data: { title: "Updated Post" },
            },
        ],
    },
};

// Arkos way (intuitive) ✨
const userData: ArkosPrismaInput<Prisma.UserCreateInput> = {
    name: "John Doe",
    email: "john@example.com",
    posts: [
        { title: "First Post" }, // auto-detects: create
        { id: 1 }, // auto-detects: connect
        { id: 2, title: "Updated Post" }, // auto-detects: update
        { id: 3, apiAction: "delete" }, // explicit operation
    ],
};
```

**How it works:**

- Flattens nested `create`, `connect`, `update` operations into simple arrays
- Auto-detects operation type based on fields present
- Supports explicit `apiAction` for disambiguation
- Works recursively for deeply nested relations
- Perfect for interceptors and custom validation

This pairs perfectly with Arkos's built-in relation handling that's been available since the beginning. Learn more at [Handling Prisma Relation Fields](https://www.arkosjs.com/docs/advanced-guide/handling-prisma-relations).

**Use case example** - Type-safe interceptor:

```typescript
import { ArkosRequest } from "arkos";
import { Prisma } from "@prisma/client";
import { ArkosPrismaInput } from "arkos/prisma";

type CreateUserBody = ArkosPrismaInput<Prisma.UserCreateInput>;

export const addDefaults = async (
    req: ArkosRequest<any, any, CreateUserBody>,
    res: ArkosResponse,
    next: NextFunction
) => {
    // Type-safe access to flattened relation structure
    if (!req.body.profile) {
        req.body.profile = {
            bio: "New user",
            isPublic: true,
        };
    }
    next();
};
```

Consider checking this NEW TypeScript utility type api reference at [Arkos Prisma Input API Reference Guide](/docs/api-reference/arkos-prisma-input).

### 4. Security by Default - `forbidNonWhitelisted`

Arkos now **rejects unknown fields automatically** for both Zod and class-validator, closing a common security gap where malicious payloads could slip through.

```typescript
// Before: Unknown fields silently ignored
POST /api/users
{
  "name": "John",
  "email": "john@example.com",
  "isAdmin": true  // ⚠️ Ignored, but potentially dangerous
}

// After: Unknown fields rejected with clear errors ✅
POST /api/users
{
  "name": "John",
  "email": "john@example.com",
  "isAdmin": true
}
// Response:
{
  "status": "error",
  "message": "Unrecognized key(s) in object: 'isAdmin'",
  "code": "UnrecognizedKeysConstraint",
  "meta": {
    "error": [...]
  }
}
```

**Configuration:**

```typescript
// arkos.config.ts
export default arkosConfig = {
    validation: {
        resolver: "zod", // or "class-validator"
        validationOptions: {
            forbidNonWhitelisted: true, // ✅ Now default for both!
        },
    },
} satisfies ArkosConfig;
```

**Need the old behavior?** Simply set `forbidNonWhitelisted: false` in your config. No breaking changes, just better defaults.

If you forgot you forgot something about arkos configuration, we got your back, check its api reference at [Arkos Configuration API Reference](/docs/api-reference/arkos-configuration).

### 5. Beautiful, Actionable Error Messages

Validation errors are now **immediately actionable** with clear, developer-friendly messages:

```typescript
// Before
{
  "status": "error",
  "message": "Invalid request body",
  "meta": { /* buried details */ }
}

// After 🚀
{
  "status": "error",
  "message": "'email' must be a valid email address",
  "code": "EmailIsEmailConstraint",
    "meta": {
      "errors": [...]
    }
}
```

**What's improved:**

- Field paths shown clearly (including nested fields and array indices)
- Human-readable constraint names as error codes
- Consistent format across Zod and class-validator
- `meta` field still available for deep inspection

No more digging through nested error objects - errors tell you exactly what's wrong and where, catch up fully about this NEW beautiful and improved error messages [Error Handling Guide](/docs/core-concepts/error-handling).

### 6. Separated Authentication & Authorization in Code Generation

The new auth config generation creates a clean separation between authentication and authorization with intelligent permission helpers:

```typescript
// Generated with: npx arkos generate auth-configs -m post

export const postAccessControl = {
    Publish: {
        roles: ["Admin", "Editor"],
        name: "Publish Post",
        description: "Permission to publish post records",
    },
    Create: {
        roles: ["Admin", "Editor"],
        name: "Create Post",
        description: "Permission to create new post records",
    },
    Update: {
        roles: ["Admin", "Editor", "Author"],
        name: "Update Post",
        description: "Permission to update existing post records",
    },
    Delete: {
        roles: ["Admin"],
        name: "Delete Post",
        description: "Permission to delete post records",
    },
    View: {
        roles: ["*"], // Wildcard: all authenticated users
        name: "View Post",
        description: "Permission to view post records",
    },
} as const satisfies AuthConfigs["accessControl"];

// Helper function
function createPostPermission(action: string) {
    return authService.permission(action, "post", postAccessControl);
}

// Auto-generated permission helpers
export const postPermissions = {
    canCreate: createPostPermission("Create"),
    canUpdate: createPostPermission("Update"),
    canDelete: createPostPermission("Delete"),
    canView: createPostPermission("View"),
};

// Separated authentication control
export const postAuthenticationControl = {
    Create: true,
    Update: true,
    Delete: true,
    View: true,
};
```

**Use in custom routers:**

```typescript
import { ArkosRouter } from "arkos";
import { postPermissions } from "./post.auth";

const router = ArkosRouter();

router.post(
    {
        path: "/api/posts/publish",
        authentication: {
            resource: "post",
            action: "Create",
            rule: postPermissions.Publish,
        },
    },
    postController.publish
);
```

**Benefits:**

- Easy synchronization between access control definitions and usage
- Type-safe permission objects
- Clear separation of concerns
- **Advanced mode:** Use `--advanced` flag for automatic permission object generation

### 7. Wildcard Roles for Flexible Authorization

Need to allow all authenticated users? Use the wildcard `*`:

```typescript
export const postAccessControl = {
  Create: {
    roles: "*",  // ✅ Any authenticated user can access
    name: "Create Post",
    description: "Permission to create new post records",
  },
```

Perfect for public-facing APIs with some protected routes.

### 8. Router Prefixes for Clean API Organization

Organize your APIs with declarative prefixes:

```typescript
import { ArkosRouter } from "arkos";

// API versioning
const v1Router = ArkosRouter({ prefix: "/api/v1" });
const v2Router = ArkosRouter({ prefix: "/api/v2" });

// Modular organization
const adminRouter = ArkosRouter({ prefix: "/admin" });
const publicRouter = ArkosRouter({ prefix: "/public" });

// Routes automatically prefixed
v1Router.get({ path: "/users" }, handler);
// → GET /api/v1/users

adminRouter.post({ path: "/settings" }, handler);
// → POST /admin/settings
```

### 9. Enhanced File Upload Configuration

File uploads now support **required fields** and **auto-generate OpenAPI documentation**:

```typescript
router.post(
    {
        path: "/api/products",
        experimental: {
            uploads: {
                type: "fields",
                fields: [
                    {
                        name: "thumbnail",
                        maxCount: 1,
                        required: true, // ✅ New: Mark as required (new default)
                    },
                    {
                        name: "gallery",
                        maxCount: 5,
                        required: false,
                    },
                ],
            },
        },
    },
    productController.create
);
```

Refresh your knowledge about `ArkosRouter` by reading it's api reference at [Arkos Router Guide](/docs/api-reference/arkos-router).

**Auto-generated OpenAPI docs:**

When file uploads are defined, Arkos automatically adds `multipart/form-data` request body documentation with proper field definitions - no manual OpenAPI configuration needed.

Learn more: [Swagger API Documentation](https://www.arkosjs.com/docs/core-concepts/open-api-documentation)

### 10. Enhanced Email Service

The email service now exposes the underlying transport for advanced use cases:

```typescript
import emailService from "arkos/services/email";

// Verify connection before sending
const isConnected = await emailService.verifyConnection();

// Access transport for advanced features
await emailService.transport.verify();

// Send with familiar Nodemailer-like API
await emailService.send({
    to: "user@example.com",
    subject: "Welcome!",
    html: "<h1>Welcome to our app</h1>",
});
```

## Supporting Features

### TypeScript & DX Improvements

- **Better type inference**: Improved generic constraints across the framework
- **Overwrite protection**: CLI warns before overwriting existing files with `--overwrite` flag

### Validation Enhancements

- **Nested field validation**: Full support for deeply nested objects and arrays
- **Better error paths**: Array indices like `tags[0].name` properly displayed
- **Consistent behavior**: Zod and class-validator now have feature parity

### Code Generation Improvements

- **Bulk generation**: Generate multiple components with single command
- **Query DTOs/Schemas**: Generate specialized query validation files
- **Path customization**: Override default paths for generated files

## Migration Guide

### Update Your Config

Move your configuration to `arkos.config.ts`:

```typescript
// arkos.config.ts
import { ArkosConfig } from "arkos";

const arkosConfig: ArkosConfig = {
    validation: {
        resolver: "zod",
        validationOptions: {
            forbidNonWhitelisted: true, // Now default for both Zod & class-validator
        },
    },
    // ... rest of your config
};

export default arkosConfig;
```

### Adopt New Features Gradually

All new features are **additive** - your existing code continues to work. Adopt features as needed:

1. **Start using `ArkosPrismaInput`** in interceptors and middlewares for better types
2. **Generate auth configs** with the new separated structure
3. **Use router prefixes** for better API organization
4. **Enable auto-login** (already works, no changes needed!)

## What's Next

Version 1.5.0-beta lays the groundwork for exciting upcoming features in 1.6.0-beta:

- Full MongoDB composite type support
- OpenAPI documentation authentication
- Advanced TypeScript utility types
- Enhanced service layer capabilities
- More quality-of-life improvements

See the [full roadmap of v1.6.0-beta on GitHub](https://github.com/Uanela/arkos/milestone/4).

## How to Upgrade

**Existing projects:**

```bash
pnpm install arkos@latest
```

**New projects:**

```bash
pnpm create arkos@latest my-project
```

We're excited to see what you build with these new capabilities. Your feedback continues to drive our development - try 1.5.0-beta and let us know what you think!

**Resources:**

- [Full Documentation](https://arkosjs.com/docs)
- [Arkos Router Api Reference](https://arkosjs.com/docs/api-reference/arkos-router)
- [GitHub Repository](https://github.com/Uanela/arkos)

## Full Changelog

View the complete list of changes, fixes, and improvements in the [GitHub release notes](https://github.com/Uanela/arkos/releases/tag/v1.5.0-beta).
