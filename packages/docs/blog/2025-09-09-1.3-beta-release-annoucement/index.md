---
slug: 1.3-beta
title: Announcing Arkos.js 1.3.0-beta Release
authors: [uanela]
tags: [arkosjs, superm7, webpropax, finegrained, swagger, servicehooks]
---

Today I am excited to share the newest beta version of Arkos.js, the 1.3.0-beta, a major update that brings enterprise-grade access control, automatic API documentation, and enhanced service layer capabilities to simplify the development of scalable and secure RESTful APIs.

<!-- truncate -->

Following Larry Ellison's philosophy that no one buys or uses the first version, we continue building toward the official v2.0 release with these substantial improvements that give you an even better taste of what's coming.

## What Is New?

1. **Fine-Grained Access Control (FGAC)** - Go beyond route-level authentication with code-level permission checking for complex business logic scenarios.
2. **Stable Swagger API Documentation** - Automatically generated, interactive OpenAPI documentation that stays synchronized with your actual API behavior.
3. **Service Hooks** - Execute custom business logic at the service layer level, ensuring consistency across all data operations.
4. **Enhanced Interceptor Middlewares** - Now supports arrays of functions and error handling hooks for better separation of concerns.
5. **Strict Routing Mode** - Fine-tune your API surface with granular control over which endpoints are exposed.
6. **Performance Improvements** - 2x faster startup times with the switch from `ts-node-dev` to `tsx-strict`.
7. **Better Authentication Context** - Access tokens and user context now flow through the entire service layer.

## How To Update

As a minor update towards v2.0, to get to the latest v1.3 version of Arkos on an existing project:

```bash
npm install arkos@latest
```

Or start a new project with the enhanced `create-arkos` CLI:

```
npm create arkos@latest my-project
```

## Major New Features In Practice

Let's dive deeper into the most impactful features that make this release a significant step forward.

### 1. Fine-Grained Access Control

Traditional role-based access control works great for endpoints, but complex applications need more granular control. FGAC allows you to implement conditional access, data filtering, and hierarchical permissions directly within your application logic.

```typescript
// Create permission checkers at module level
const canEditPost = authService.permission("EditOwn", "blog-post");
const canViewAll = authService.permission("ViewAll", "blog-post");

// Use in your business logic
export const beforeUpdateOne = [
    async (req, res, next) => {
        const hasPermission = await canEditPost(req.user);
        if (!hasPermission) {
            throw new AppError("Not authorized", 403);
        }
        next();
    },
];
```

Perfect for scenarios like:

- Authors edit their own posts, editors manage any post in their category
- Users access only their organization's data in multi-tenant systems
- Managers see team data, directors see department data

Read the complete guide at [Fine-Grained Access Control](/docs/advanced-guide/fine-grained-access-control).

### 2. Swagger API Documentation

Arkos now automatically generates comprehensive OpenAPI documentation that stays perfectly synchronized with your actual API behavior. The documentation system offers three schema generation approaches and integrates seamlessly with your existing validation and query configurations.

```typescript
arkos.init({
    swagger: {
        mode: "prisma", // or "class-validator" or "zod"
        options: {
            definition: {
                info: {
                    title: "My API",
                    version: "1.0.0",
                },
            },
        },
    },
});
```

The most powerful feature is automatic synchronization with your Custom Prisma Query Options - if your `user.query.ts` contains `include: { posts: true }`, the documentation will show user responses with posts included, ensuring your docs always match reality.

We chose Scalar over traditional Swagger UI for a modern, Postman-like interface that developers actually enjoy using.

Explore the full documentation system at [Swagger API Documentation](/docs/core-concepts/swagger-api-documentation).

### 3. Service Hooks

Execute custom business logic at the service layer level during CRUD operations. Unlike Interceptor Middlewares that run only on HTTP requests, Service Hooks execute whenever BaseService methods are called - ensuring consistency across your entire application.

```typescript
// src/modules/post/post.hooks.ts
export const beforeCreateOne = [
    async ({ data, context }) => {
        // Auto-generate slug
        if (!data.slug && data.title) {
            data.slug = generateSlug(data.title);
        }

        // Add current user as author
        if (context?.user?.id) {
            data.authorId = context.user.id;
        }
    },
];

export const afterCreateOne = [
    async ({ result }) => {
        // Send notifications
        await notifyFollowers(result.authorId, {
            type: "new_post",
            postId: result.id,
        });

        // Update search index
        await searchService.indexPost(result);
    },
];
```

Service Hooks run whether you call the API endpoint or use the service programmatically, ensuring your business logic is always applied consistently.

Learn more at [Service Hooks](/docs/guide/service-hooks).

### 4. Enhanced Interceptor Middlewares

Interceptor middlewares now support arrays of functions for better separation of concerns, plus new error handling hooks for robust error management.

```typescript
// Multiple functions for clean separation
export const beforeCreateOne = [
    async (req, res, next) => {
        // Validation logic
        validatePostData(req.body);
        next();
    },

    async (req, res, next) => {
        // Image processing
        req.body.featuredImage = await processImage(req.file);
        next();
    },
];

// New error handling hooks
export const onCreateOneError = [
    async (req, res, next) => {
        // Clean up uploaded files on error
        await cleanupFiles(req.uploadedFiles);
        next();
    },
];
```

This enhancement provides cleaner, more maintainable middleware organization while adding powerful error recovery capabilities.

### 5. Strict Routing Mode

Take complete control over your API surface with strict routing mode. Instead of auto-exposing all CRUD endpoints, you can selectively enable only the ones you need.

```ts
// src/app.ts
import arkos from "arkos";

arkos.init({
    routers: {
        strict: true, // boolean | "no-bulk":  disable all routes and then explicitly activae
    },
});
```

```typescript
// src/modules/post/post.router.ts
export const config: RouterConfig<"prisma"> = {
    routes: {
        createOne: true,
        findMany: true,
        findOne: true,
        updateOne: false, // Disabled
        deleteOne: false, // Disabled
    },
};
```

Perfect for APIs that need to expose limited functionality or when building public APIs where you want precise control over the available operations.

### 6. Performance Improvements

We've made significant performance improvements that you'll notice immediately:

- **2x faster startup** with the switch from `ts-node-dev` to `tsx-strict`
- **Better host resolution** by translating localhost to 127.0.0.1 for broader compatibility
- **Streamlined module loading** with refactored component import system

These improvements make the development experience noticeably snappier, especially during frequent restarts.

## Breaking Changes and Migration

This release includes some important changes to be aware of:

### Deprecated Naming Conventions

The old naming conventions are now deprecated and will show warnings:

- `model.prisma-query-options.{ts|js}` → use `model.query.{ts|js}`
- `model.auth-configs.{ts|js}` → use `model.auth.{ts|js}`

These old names will be removed in v1.4.0-beta, so update your files when convenient.

### Removed Endpoints

- `/available-routes` endpoint removed (Swagger docs provide this functionality)
- Database connection check middleware removed (Prisma handles this internally)

## CLI Enhancements

The built-in CLI now generates Service Hooks:

```bash
npx arkos generate hooks --model post
# or shorthand:
npx arkos g h -m post
```

All generated interceptor middlewares now use the array syntax by default, and the CLI includes strict routing mode options.

## What's Next?

- Enhanced `create-arkos` templates and scaffolding options
- More granular validation modes and stricter type checking
- Additional Service Hook types for specialized use cases
- Further performance optimizations and developer experience improvements

This 1.3.0-beta release represents a significant step toward the v2.0 vision of making scalable, secure RESTful API development as simple as possible. The combination of fine-grained access control, automatic documentation, and enhanced service capabilities provides the foundation for building production-ready APIs with minimal configuration.

These improvements continue to reinforce Arkos's main goal: allowing developers to focus on what really matters for their business logic while the framework handles the repetitive, complex infrastructure concerns.
