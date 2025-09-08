---
sidebar_position: 5
title: Fine-Grained Access Control (new)
---

import SmallTag from "../components/small-tag"

# Fine-Grained Access Control <SmallTag>New</SmallTag>

> Available from `v1.3.0-beta`

Beyond endpoint-level authentication, Arkos provides fine-grained access control for complex business logic scenarios where role-based permissions alone aren't sufficient. This allows you to implement conditional access, data filtering, and hierarchical permissions directly within your application controllers.

## What is Fine-Grained Access Control?

Fine-grained access control lets you check specific permissions within your business logic, beyond what route-level authentication provides. Instead of just "can this user access this endpoint?", you can ask "can this specific user perform this specific action on this specific resource?"

### When You Need Fine-Grained Control

Standard RBAC works great for endpoints, but complex applications need more:

```typescript
// Route-level: "Can user access /api/posts?"
// Fine-grained: "Can this user edit posts in this specific category?"
// Fine-grained: "Can this user see all posts or only published ones?"
// Fine-grained: "Should this user see all events or only events in their region?"
```

**Common Use Cases:**

- **Content Management**: Authors edit their own posts, editors manage their assigned categories
- **Multi-tenant Systems**: Users access only their organization's data
- **Hierarchical Permissions**: Managers see team data, directors see department data
- **Conditional Access**: Different data views based on user role or context

## Core Implementation: `authService.permission()`

Fine-grained access control centers around `authService.permission()`, which creates permission checker functions for specific actions and resources.

### Basic Syntax

```typescript
const permissionChecker = authService.permission(action, resource, accessControl?);
const hasPermission = await permissionChecker(user);
```

**Parameters:**

- `action`: The specific action (e.g., "View", "Edit", "Approve", "Export")
- `resource`: The resource name in kebab-case (e.g., "blog-post", "event", "user-profile")
- `accessControl`: Required for static mode, ignored in dynamic mode

### Critical: Initialization Timing

`authService.permission()` **must** be called during application initialization, not during request handling:

```typescript
// ✅ CORRECT: Called at module level during app startup
const canEditPost = authService.permission("Edit", "blog-post");

export const blogController = {
    async updatePost(req, res) {
        const hasPermission = await canEditPost(req.user);
        if (!hasPermission) {
            throw new AppError("Not authorized", 403);
        }
        // Continue with update logic...
    },
};

// ❌ WRONG: Called during request handling
export const blogController = {
    async updatePost(req, res) {
        // This will throw an error!
        const canEditPost = authService.permission("Edit", "blog-post");
        const hasPermission = await canEditPost(req.user);
    },
};
```

### Auto-Discovery Integration

All permissions created with `authService.permission()` are automatically available through the `/api/auth-actions` endpoint, helping frontend developers discover available actions.

## Permission Organization Patterns

Organize related permissions into objects for better maintainability and discoverability:

### Creating Permission Objects

```typescript
// src/modules/blog-post/blog-post.auth.ts
import { authService } from "arkos/services";

/**
 * Blog post permissions for content management system
 */
export const blogPostPermissions = {
    /** View published and draft posts */
    canViewAll: authService.permission("ViewAll", "blog-post"),
    /** View only published posts */
    canViewPublished: authService.permission("ViewPublished", "blog-post"),
    /** Create new blog posts */
    canCreate: authService.permission("Create", "blog-post"),
    /** Edit any blog post */
    canEditAny: authService.permission("EditAny", "blog-post"),
    /** Edit only own blog posts */
    canEditOwn: authService.permission("EditOwn", "blog-post"),
    /** Publish/unpublish blog posts */
    canPublish: authService.permission("Publish", "blog-post"),
    /** Delete blog posts */
    canDelete: authService.permission("Delete", "blog-post"),
};
```

### Resource Naming Conventions

- Use **kebab-case** for resource names: `"blog-post"`, `"user-profile"`, `"event-category"`
- Match your model names but in kebab-case: `BlogPost` → `"blog-post"`
- Be specific when needed: `"blog-post"`, `"blog-category"`, `"blog-comment"`

## Basic Usage Examples

### Simple Permission Check

```typescript
// src/modules/blog-post/blog-post.controller.ts
import { AppError } from "arkos/error-handler";
import { blogPostPermissions } from "./blog-post.auth";
import blogPostService from "./blog-post.service";

export const getBlogPosts = async (req: ArkosRequest, res: ArkosResponse) => {
    const user = req.user;

    // Check if user can view all posts (including drafts)
    const canViewAll = await blogPostPermissions.canViewAll(user);

    let posts;
    if (canViewAll) {
        // Admin/Editor: Show all posts including drafts
        posts = await blogPostService.findMany({});
    } else {
        // Regular users: Show only published posts
        posts = await blogPostService.findMany({
            where: { status: "published" },
        });
    }

    res.json({ success: true, data: posts });
};

export const deleteBlogPost = async (req: ArkosRequest, res: ArkosResponse) => {
    const user = req.user;

    // Check delete permission
    const canDelete = await blogPostPermissions.canDelete(user);

    if (!canDelete) {
        throw new AppError(
            "You don't have permission to delete blog posts",
            403
        );
    }

    await blogPostService.deleteOne({ id: req.params.id });
    res.json({ success: true, message: "Post deleted successfully" });
};
```

### Multiple Permission Checks

For better performance when checking multiple permissions, use `Promise.all`:

```typescript
export const getBlogPostEditor = async (
    req: ArkosRequest,
    res: ArkosResponse
) => {
    const user = req.user;

    // Check multiple permissions efficiently
    const [canCreate, canEditAny, canEditOwn, canPublish] = await Promise.all([
        blogPostPermissions.canCreate(user),
        blogPostPermissions.canEditAny(user),
        blogPostPermissions.canEditOwn(user),
        blogPostPermissions.canPublish(user),
    ]);

    res.json({
        success: true,
        permissions: {
            canCreate,
            canEditAny,
            canEditOwn,
            canPublish,
        },
    });
};
```

## Advanced Implementation Patterns

### Hierarchical Permission Logic

Implement cascading permissions where higher-level permissions include lower-level ones:

```typescript
// src/modules/event/event.auth.ts
export const eventPermissions = {
    /** View all events system-wide */
    canViewGlobal: authService.permission("ViewGlobal", "event"),
    /** View events in assigned regions */
    canViewRegional: authService.permission("ViewRegional", "event"),
    /** View events in own city only */
    canViewLocal: authService.permission("ViewLocal", "event"),
    /** Manage events in assigned regions */
    canManageRegional: authService.permission("ManageRegional", "event"),
    /** Manage events in own city only */
    canManageLocal: authService.permission("ManageLocal", "event"),
};

// src/modules/event/event.controller.ts
export const getEvents = async (req: ArkosRequest, res: ArkosResponse) => {
    const user = req.user;

    // Check permissions in hierarchical order
    const [canViewGlobal, canViewRegional, canViewLocal] = await Promise.all([
        eventPermissions.canViewGlobal(user),
        eventPermissions.canViewRegional(user),
        eventPermissions.canViewLocal(user),
    ]);

    let whereClause = {};

    if (canViewGlobal) {
        // Global access: no restrictions
        whereClause = {};
    } else if (canViewRegional) {
        // Regional access: events in user's assigned regions
        const userProfile = await userProfileService.findOne({
            userId: user.id,
        });
        whereClause = {
            region: {
                in: userProfile.assignedRegions,
            },
        };
    } else if (canViewLocal) {
        // Local access: events in user's city only
        const userProfile = await userProfileService.findOne({
            userId: user.id,
        });
        whereClause = {
            city: userProfile.city,
        };
    } else {
        throw new AppError("You don't have permission to view events", 403);
    }

    const events = await eventService.findMany({ where: whereClause });
    res.json({ success: true, data: events });
};
```

### Conditional Query Modification

Modify database queries based on user permissions:

```typescript
// src/modules/blog-post/blog-post.interceptors.ts
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { blogPostPermissions } from "./blog-post.auth";
import userService from "../user/user.service";

export const beforeFindMany = [
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        const user = req.user;
        if (!user) return next();

        // Check what level of access user has
        const [canViewAll, canEditAny, canEditOwn] = await Promise.all([
            blogPostPermissions.canViewAll(user),
            blogPostPermissions.canEditAny(user),
            blogPostPermissions.canEditOwn(user),
        ]);

        if (canViewAll) {
            // Admin/Editor: can see all posts, no query modification needed
            return next();
        }

        // Build query restrictions based on permissions
        const baseQuery = req.query || {};

        if (canEditOwn) {
            // Author: can see published posts + their own drafts
            req.query = {
                ...baseQuery,
                OR: [{ status: "published" }, { authorId: user.id }],
            };
        } else {
            // Regular user: only published posts
            req.query = {
                ...baseQuery,
                status: "published",
            };
        }

        next();
    },
];
```

### Resource-Specific Permission Checks

Check permissions for specific resources with additional context:

```typescript
export const updateBlogPost = async (req: ArkosRequest, res: ArkosResponse) => {
    const user = req.user;
    const postId = req.params.id;

    // Get the post first
    const post = await blogPostService.findOne({ id: postId });
    if (!post) {
        throw new AppError("Blog post not found", 404);
    }

    // Check permissions with context
    const [canEditAny, canEditOwn] = await Promise.all([
        blogPostPermissions.canEditAny(user),
        blogPostPermissions.canEditOwn(user),
    ]);

    // Determine if user can edit this specific post
    const canEditThisPost =
        canEditAny || (canEditOwn && post.authorId === user.id);

    if (!canEditThisPost) {
        throw new AppError("You don't have permission to edit this post", 403);
    }

    // Additional business logic checks
    if (post.status === "published" && !canEditAny) {
        throw new AppError("You cannot edit published posts", 403);
    }

    const updatedPost = await blogPostService.updateOne(
        { id: postId },
        req.body
    );

    res.json({ success: true, data: updatedPost });
};
```

## Static vs Dynamic Mode Considerations

### Static Mode Usage

In static mode, you can use fine-grained permissions alongside your enum-based roles, though it's less common since both roles and permissions are fixed:

```typescript
// Static mode: provide accessControl configuration
export const blogPostPermissions = {
    canEditOwn: authService.permission("EditOwn", "blog-post", {
        EditOwn: ["Author", "Editor", "Admin"],
    }),
    canEditAny: authService.permission("EditAny", "blog-post", {
        EditAny: ["Editor", "Admin"],
    }),
};
```

**When to use in Static mode:**

- Complex business logic that goes beyond simple role checks
- Preparing for future migration to Dynamic mode
- Avoiding hardcoded role checks in business logic

### Dynamic Mode Usage (Recommended)

Dynamic mode is where fine-grained access control truly shines, as permissions are managed in the database:

```typescript
// Dynamic mode: no accessControl needed, permissions come from database
export const blogPostPermissions = {
    canEditOwn: authService.permission("EditOwn", "blog-post"),
    canEditAny: authService.permission("EditAny", "blog-post"),
    canPublish: authService.permission("Publish", "blog-post"),
};
```

**Advantages in Dynamic mode:**

- Permissions can be changed at runtime
- Role-permission relationships are flexible
- No need to redeploy when permissions change
- Supports complex permission hierarchies

### Migration Considerations

Using `authService.permission()` makes migration from Static to Dynamic mode seamless:

```typescript
// This code works in both modes without changes!
const canEditPost = await blogPostPermissions.canEditOwn(user);

// Avoid direct role checks, as they break in Dynamic mode:
// ❌ if (user.role === "Author") // Breaks in Dynamic mode
// ✅ if (await blogPostPermissions.canEditOwn(user)) // Works in both modes
```

## Performance and Best Practices

### Optimization Strategies

1. **Batch Permission Checks**: Use `Promise.all` for multiple permissions:

```typescript
// ✅ Efficient: Parallel execution
const [canEdit, canDelete, canPublish] = await Promise.all([
    blogPostPermissions.canEditOwn(user),
    blogPostPermissions.canDelete(user),
    blogPostPermissions.canPublish(user),
]);

// ❌ Inefficient: Sequential execution
const canEdit = await blogPostPermissions.canEditOwn(user);
const canDelete = await blogPostPermissions.canDelete(user);
const canPublish = await blogPostPermissions.canPublish(user);
```

2. **Cache Permission Results**: For expensive permission checks within the same request:

```typescript
export const getBlogPostWithPermissions = async (
    req: ArkosRequest,
    res: ArkosResponse
) => {
    const user = req.user;

    // Cache permission results on the request object
    if (!req.userPermissions) {
        req.userPermissions = {
            canEditOwn: await blogPostPermissions.canEditOwn(user),
            canEditAny: await blogPostPermissions.canEditAny(user),
            canPublish: await blogPostPermissions.canPublish(user),
        };
    }

    // Use cached permissions throughout the request
    const post = await blogPostService.findOne({ id: req.params.id });
    const canEditThisPost =
        req.userPermissions.canEditAny ||
        (req.userPermissions.canEditOwn && post.authorId === user.id);

    res.json({
        success: true,
        data: post,
        permissions: {
            canEdit: canEditThisPost,
            canPublish: req.userPermissions.canPublish,
        },
    });
};
```

### Error Handling Patterns

```typescript
export const deleteBlogPost = async (req: ArkosRequest, res: ArkosResponse) => {
    const user = req.user;
    const canDelete = await blogPostPermissions.canDelete(user);

    if (!canDelete) {
        throw new AppError(
            "You don't have permission to delete blog posts",
            403
        );
    }

    // Continue with deletion logic...
};
```

### Integration with Middleware

Combine fine-grained permissions with interceptor middlewares for automatic enforcement:

```typescript
// src/modules/blog-post/blog-post.interceptors.ts
import { AppError } from "arkos/error-handler";
import { blogPostPermissions } from "./blog-post.auth";

export const beforeDeleteOne = [
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        const user = req.user;
        if (!user) return next();

        const canDelete = await blogPostPermissions.canDelete(user);

        if (!canDelete) {
            throw new AppError(
                "Insufficient permissions to delete blog posts",
                403
            );
        }

        next();
    },
];
```

## Common Gotchas and Troubleshooting

### Initialization Timing Issues

```typescript
// ❌ This will throw an error during request handling
app.get("/posts", async (req, res) => {
    const canView = authService.permission("View", "blog-post"); // Error!
});

// ✅ Initialize permissions at module level
const canViewPosts = authService.permission("View", "blog-post");

app.get("/posts", async (req, res) => {
    const hasPermission = await canViewPosts(req.user);
});
```

### Resource Naming Mistakes

```typescript
// ❌ Wrong: camelCase or PascalCase
const canEdit = authService.permission("Edit", "blogPost");
const canEdit = authService.permission("Edit", "BlogPost");

// ✅ Correct: kebab-case
const canEdit = authService.permission("Edit", "blog-post");
```

### User Object Requirements

```typescript
// Ensure user object has required fields for permission checks
const hasPermission = await somePermission(user);

// User must have:
// - id field (for Dynamic mode database queries)
// - isSuperUser field (super users bypass all checks)
// - role/roles fields (for Static mode, if not super user)
```

### Mode-Specific Considerations

```typescript
// Static mode: accessControl is required for unknown actions
const canCustomAction = authService.permission("CustomAction", "blog-post", {
    CustomAction: ["Admin"],
});

// Dynamic mode: accessControl is ignored, permissions come from database
const canCustomAction = authService.permission("CustomAction", "blog-post");
```

## Next Steps

- Learn about [Authentication System](/docs/core-concepts/authentication-system) for the foundational concepts
- Explore [Interceptor Middlewares](/docs/core-concepts/interceptor-middlewares) for automatic permission enforcement
- Check out [Dynamic RBAC](/docs/core-concepts/authentication-system#upgrading-to-dynamic-rbac) for database-managed permissions
- Review the [Auth Service API](/docs/api-reference/the-auth-service-object) for additional authentication utilities

Fine-grained access control gives you the flexibility to implement complex business rules while maintaining the simplicity of Arkos's automated systems. Use it when standard endpoint-level permissions aren't sufficient for your application's security requirements.
