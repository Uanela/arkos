---
sidebar_position: 1
title: Fine-Grained Access Control (new)
---

import SmallTag from "../components/small-tag"

# Fine-Grained Access Control <SmallTag>New</SmallTag>

> Available from `v1.3.0-beta`

Beyond endpoint-level authentication, Arkos provides fine-grained access control for complex business logic scenarios where role-based permissions alone aren't sufficient. This allows you to implement conditional access, data filtering, and hierarchical permissions directly within your application controllers and interceptor middlewares.

## What is Fine-Grained Access Control (FGAC)?

Fine-grained access control lets you check specific permissions within your business logic, beyond what route-level authentication provides. Instead of just "can this user access this endpoint?", you can ask "can this specific user perform this specific action on this specific resource?"

## When You Need Fine-Grained Control

Standard RBAC works great for endpoints, but complex applications need more:

```ts
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

## Core Implementation: authService.permission()

Fine-grained access control centers around `authService.permission()`, which creates permission checker functions for specific actions and resources.

### Basic Syntax

```ts
const permissionChecker = authService.permission(action, resource, accessControl?);
const hasPermission = await permissionChecker(user);
```

**Parameters:**

- `action`: The specific action (e.g., "View", "Edit", "Approve", "Export")
- `resource`: The resource name in kebab-case (e.g., "blog-post", "event", "user-profile")
- `accessControl`: Required for unknown modules beyond any prisma models, auth and file-upload

### Critical: Initialization Timing

`authService.permission()` must be called during application initialization, not during request handling:

```ts
// ✅ CORRECT: Called at module level during app startup
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
const canEditPost = authService.permission("Edit", "blog-post");

export const beforeUpdateOne = [
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const hasPermission = await canEditPost(req.user);
    if (!hasPermission) throw new AppError("Not authorized", 403);

    next();
  },
];

// ❌ WRONG: Called during request handling
export const beforeUpdateOne = [
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    // This will throw an error!
    const canEditPost = authService.permission("Edit", "blog-post");
    const hasPermission = await canEditPost(req.user);
  },
];
```

### Auto-Discovery Integration

All permissions created with `authService.permission()` and also those added into `authConfigs.accessControl` are automatically available through the `/api/auth-actions` endpoint, helping frontend developers discover available actions.

## Permission Organization Patterns

Organize related permissions into objects for better maintainability and discoverability:

### Creating Permission Objects

```ts
// src/modules/blog-post/blog-post.auth.ts
import { AuthConfigs } from "arkos/auth";
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
  /** Share blog posts via social media */
  canShare: authService.permission("Share", "blog-post"),
  /** Export blog posts to various formats */
  canExport: authService.permission("Export", "blog-post"),
};

const blogPostAuthConfigs: AuthConfigs = {
  authenticationControl: {
    // Only define actions that will be used in routes
    // Whether custom or built-in routes.
    ViewAll: true,
    ViewPublished: false, // Public access, no auth required
    Create: true,
    EditAny: true,
    EditOwn: true,
    Publish: true,
    Share: true,
    Export: true,
  },
  accessControl: {
    ViewAll: {
      // Only add roles if using static authentication
      roles: ["Author", "Editor", "Admin"],
      name: "View All Posts",
      description: "View both published and draft blog posts",
    },
    ViewPublished: {
      roles: ["Guest", "Author", "Editor", "Admin"],
      name: "View Published Posts",
      description: "View publicly published blog posts",
    },
    Create: {
      roles: ["Author", "Editor", "Admin"],
      name: "Create Posts",
      description: "Create new blog posts",
    },
    EditAny: {
      roles: ["Editor", "Admin"],
      name: "Edit Any Post",
      description: "Edit any blog post regardless of author",
    },
    EditOwn: {
      roles: ["Author", "Editor", "Admin"],
      name: "Edit Own Posts",
      description: "Edit blog posts authored by the user",
    },
    Publish: {
      roles: ["Editor", "Admin"],
      name: "Publish Posts",
      description: "Publish or unpublish blog posts",
    },
    Share: {
      roles: ["Author", "Editor", "Admin"],
      name: "Share Posts",
      description: "Share blog posts via social media platforms",
    },
    Export: {
      roles: ["Editor", "Admin"],
      name: "Export Posts",
      description: "Export blog posts to various formats (PDF, Word, etc.)",
    },
  },
};

export default blogPostAuthConfigs;
```

:::tip IMPORTANT
Notice the `roles` fields in the `accessControl` actions - those are only required if you are using `Static Authentication` because in `Dynamic Authentication` roles and permissions are managed at the database level.
:::

### Resource Naming Conventions

- Use kebab-case for resource names: "blog-post", "user-profile", "event-category"
- Match your model names but in kebab-case: BlogPost → "blog-post"
- Be specific when needed: "blog-post", "blog-category", "blog-comment"

## Common Use Cases

The most common pattern is adding fine-grained permissions to Arkos's auto-generated CRUD endpoints using interceptor middlewares.

:::info File Naming: .interceptors.ts
Starting from **v1.4.0**, interceptor middleware files should use the `.interceptors.ts` extension instead of `.middlewares.ts`. This change provides better separation of concerns between interceptor functions (hooks into auto-generated endpoints) and regular Express middlewares.

**Deprecation Timeline:**

- **v1.4.0**: Both `.middlewares.ts` and `.interceptors.ts` work, but `.middlewares.ts` shows deprecation warnings
- **v1.5.0**: Still works with warnings
- **v1.6.0**: `.middlewares.ts` will be completely removed

**Migration:** Simply rename your files from `module-name.middlewares.ts` to `module-name.interceptors.ts`. The code inside remains unchanged.
:::

### Simple Permission Check in Interceptors

```ts
// src/modules/blog-post/blog-post.auth.ts
import { authService } from "arkos/services";
import { AuthConfigs } from "arkos/auth";

export const blogPostPermissions = {
  canEditOwn: authService.permission("EditOwn", "blog-post"),
  canEditAny: authService.permission("EditAny", "blog-post"),
};

const blogPostAuthConfigs: AuthConfigs = {
  authenticationControl: {
    Update: true,
    EditOwn: true,
    EditAny: true,
  },
  accessControl: {
    Update: ["Author", "Editor", "Admin"],
    EditOwn: {
      roles: ["Author", "Editor", "Admin"],
      name: "Edit Own Posts",
      description: "Edit blog posts authored by the user",
    },
    EditAny: {
      roles: ["Editor", "Admin"],
      name: "Edit Any Post",
      description: "Edit any blog post regardless of author",
    },
  },
};

export default blogPostAuthConfigs;
```

Finally use in interceptor middlewares:

```ts
// src/modules/blog-post/blog-post.interceptors.ts
import { AppError } from "arkos/error-handler";
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { blogPostPermissions } from "./blog-post.auth";
import blogPostService from "./blog-post.service";

export const beforeUpdateOne = [
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const user = req.user;
    const postId = req.params.id;

    // Get the post first to check ownership
    const post = await blogPostService.findOne({ id: postId });
    if (!post) throw new AppError("Blog post not found", 404);

    // Check permissions with context
    const [canEditAny, canEditOwn] = await Promise.all([
      blogPostPermissions.canEditAny(user),
      blogPostPermissions.canEditOwn(user),
    ]);

    // Determine if user can edit this specific post
    const canEditThisPost =
      canEditAny || (canEditOwn && post.authorId === user.id);

    if (!canEditThisPost)
      throw new AppError(
        "You don't have permission to edit this post",
        403,
        {},
        "CannotEditThisPost"
      );

    // Additional business logic checks
    if (post.status === "published" && !canEditAny)
      throw new AppError(
        "You cannot edit published posts",
        403,
        {},
        "CannotEditPublishedPost"
      );

    next();
  },
];
```

### Data Filtering in Interceptors

Modify queries based on user permissions in `beforeFindMany`:

```ts
// src/modules/blog-post/blog-post.interceptors.ts
export const beforeFindMany = [
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const user = req.user;
    if (!user) return next();

    // Check what level of access user has
    const [canViewAll, canEditOwn] = await Promise.all([
      blogPostPermissions.canViewAll(user),
      blogPostPermissions.canEditOwn(user),
    ]);

    if (canViewAll)
      // Admin/Editor: can see all posts, no query modification needed
      return next();

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

### Response Modification with Permissions

Add permission flags to responses in `afterFindOne`:

```ts
// src/modules/blog-post/blog-post.interceptors.ts
export const afterFindOne = [
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const user = req.user;
    const post = res.locals.data.data;

    if (!user || !post) return next();

    // Check multiple permissions efficiently
    const [canEdit, canDelete, canPublish, canShare] = await Promise.all([
      blogPostPermissions
        .canEditAny(user)
        .then(
          (canEditAny) =>
            canEditAny ||
            ((await blogPostPermissions.canEditOwn(user)) &&
              post.authorId === user.id)
        ),
      blogPostPermissions.canDelete(user),
      blogPostPermissions.canPublish(user),
      blogPostPermissions.canShare(user),
    ]);

    // Add permission metadata to response
    res.locals.data.data = {
      ...post,
      _permissions: {
        canEdit,
        canDelete,
        canPublish,
        canShare,
      },
    };

    next();
  },
];
```

## Custom Business Logic with Fine-Grained Control

For operations beyond standard CRUD, implement custom controllers and routes with fine-grained permissions.

### Custom Controller with Permission Checks

```ts
// src/modules/blog-post/blog-post.controller.ts
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { BaseController } from "arkos/controllers";
import { AppError } from "arkos/error-handler";
import { blogPostPermissions } from "./blog-post.auth";
import blogPostService from "./blog-post.service";

const postNotFoundError = new AppError(
  "Post not found",
  404,
  {},
  "PostNotFound"
);

class BlogPostController extends BaseController {
  async sharePost(req: ArkosRequest, res: ArkosResponse) {
    const user = req.user;
    const postId = req.params.id;
    const { platform, message } = req.body;

    // Check share permission
    const canShare = await blogPostPermissions.canShare(user);
    if (!canShare)
      throw new AppError("You don't have permission to share posts", 403);

    // Get post and verify it's shareable
    const post = await blogPostService.findOne({ id: postId });
    if (!post) throw postNotFoundError;

    if (post.status !== "published")
      throw new AppError(
        "Only published posts can be shared",
        400,
        {},
        "CannotShareUnpublishedPost"
      );

    // Perform share operation
    const shareResult = await this.socialMediaService.share(post, {
      platform,
      message,
      sharedBy: user.id,
    });

    // Log the share activity (custom logic)
    await this.auditService.logActivity({
      action: "share_post",
      userId: user.id,
      resourceId: postId,
      metadata: { platform, shareId: shareResult.id },
    });

    res.json({
      success: true,
      data: shareResult,
      message: "Post shared successfully",
    });
  }

  async getBlogPostAnalytics(req: ArkosRequest, res: ArkosResponse) {
    const user = req.user;
    const postId = req.params.id;

    // Check if user can view analytics (custom business logic)
    const [canEditAny, canEditOwn] = await Promise.all([
      blogPostPermissions.canEditAny(user),
      blogPostPermissions.canEditOwn(user),
    ]);

    const post = await blogPostService.findOne({ id: postId });
    if (!post) throw postNotFoundError;

    // Authors can see analytics for their own posts, editors for any post
    const canViewAnalytics =
      canEditAny || (canEditOwn && post.authorId === user.id);

    if (!canViewAnalytics)
      throw new AppError(
        "You don't have permission to view analytics for this post",
        403
      );

    const analytics = await this.analyticsService.getPostAnalytics(postId);

    res.json({ success: true, data: analytics });
  }

  async exportPosts(req: ArkosRequest, res: ArkosResponse) {
    const user = req.user;
    const { format = "csv", filters = {} } = req.body;

    // Check export permission
    const canExport = await blogPostPermissions.canExport(user);
    if (!canExport) {
      throw new AppError("You don't have permission to export posts", 403);
    }

    // Apply user-specific filtering based on permissions
    const [canViewAll] = await Promise.all([
      blogPostPermissions.canViewAll(user),
    ]);

    let queryFilters = filters;
    if (!canViewAll) {
      // Restrict to user's own posts if they can't view all
      queryFilters = {
        ...filters,
        authorId: user.id,
      };
    }

    const posts = await blogPostService.findMany({ where: queryFilters });
    const exportData = await this.exportService.export(posts, format);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="posts.${format}"`
    );
    res.setHeader("Content-Type", this.getContentType(format));
    res.send(exportData);
  }
}

const blogPostController = new BlogPostController("blog-post");

export default blogPostController;
```

### Custom Routes with Fine-Grained Control

```ts
// src/modules/blog-post/blog-post.router.ts
import { Router } from "express";
import { authService } from "arkos/services";
import { catchAsync } from "arkos/error-handler";
import blogPostController from "./blog-post.controller";
import { blogPostPermissions } from "./blog-post.auth";

const router = Router();

// Share post route
router.post(
  "/:id/share",
  authService.authenticate,
  // You could also use authService.handleAccessControl for simpler cases
  catchAsync(blogPostController.sharePost)
);

// Analytics route - custom permission logic is in controller
router.get(
  "/:id/analytics",
  authService.authenticate,
  catchAsync(blogPostController.getBlogPostAnalytics)
);

// Export route
router.post(
  "/export",
  authService.authenticate,
  catchAsync(blogPostController.exportPosts)
);

// Bulk operations with direct permission check in middleware
router.patch(
  "/bulk-approve",
  authService.authenticate,
  // You can also prefer to use authService.handleAccessControl
  // When implementing authentication into routers
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const canApprove = await blogPostPermissions.canPublish(req.user);
    if (!canApprove)
      throw new AppError("You don't have permission to approve posts", 403);

    next();
  },
  catchAsync(blogPostController.bulkApprove)
);

export default router;
```

:::tip
As a best practice you can prefer to use `authService.handleAccessControl` instead, when adding authentication into custom routes. Check out more at [**Adding Authentication Into Custom Routers Section**](/docs/guide/adding-custom-routers#adding-authentication-in-custom-routers).
:::

## Advanced Implementation Patterns

### Hierarchical Permission Logic

Implement cascading permissions where higher-level permissions include lower-level ones:

```ts
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
```

```ts
// src/modules/event/event.interceptors.ts
export const beforeFindMany = [
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
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

    // Apply the where clause to the query
    req.query = {
      ...req.query,
      where: {
        ...req.query.where,
        ...whereClause,
      },
    };

    next();
  },
];
```

### Permission Caching Pattern

Cache permission results for expensive checks within the same request:

```ts
// src/modules/blog-post/blog-post.interceptors.ts
export const beforeFindOne = [
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const user = req.user;

    // Cache permission results on the request object
    if (!(req as any).userPermissions) {
      (req as any).userPermissions = {
        canEditOwn: await blogPostPermissions.canEditOwn(user),
        canEditAny: await blogPostPermissions.canEditAny(user),
        canViewAll: await blogPostPermissions.canViewAll(user),
      };
    }

    next();
  },
];

export const afterFindOne = [
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const post = res.locals.data.data;
    const permissions = (req as any).userPermissions;

    if (!post || !permissions) return next();

    // Use cached permissions
    const canEditThisPost =
      permissions.canEditAny ||
      (permissions.canEditOwn && post.authorId === req.user.id);

    res.locals.data.data = {
      ...post,
      _permissions: {
        canEdit: canEditThisPost,
        canViewAll: permissions.canViewAll,
      },
    };

    next();
  },
];
```

## Static vs Dynamic Mode Considerations

### Usage in Both Modes

Fine-grained permissions work identically in both static and dynamic modes. The `accessControl` parameter is **not required** for either mode when working with known modules:

```ts
// Works in both Static and Dynamic mode - no accessControl parameter needed
// Just define it under .auth.ts and it will work just fine
export const blogPostPermissions = {
  canEditOwn: authService.permission("EditOwn", "blog-post"),
  canEditAny: authService.permission("EditAny", "blog-post"),
  canShare: authService.permission("Share", "blog-post"),
  canExport: authService.permission("Export", "blog-post"),
};
```

### Differences in Both Modes Using FGAC

When using `Static Authentication` and want to fine-grain access control of a known module, it is recommended to define the actions under the `.auth.ts` file under the `accessControl` object (see [**This Example**](#permission-organization-patterns)). By doing so, you will not need to pass the `accessControl` object as a third parameter.

The same applies to `Dynamic Authentication` - the only difference is that the `roles` field under `accessControl.SomeAction` won't be used here. But it is also highly recommended to define those there when wanting to fine-grain access control because it will help later with auto-documenting your actions for frontend developers (see [**Auto-Discovery Integration Section**](#auto-discovery-integration)).

### When accessControl is Required

The `accessControl` parameter is only required for **unknown modules** (modules that are not Prisma models, auth, or file-upload):

```ts
// Only needed for unknown modules
const canCustomAction = authService.permission(
  "CustomAction",
  "unknown-module",
  {
    CustomAction: ["Admin", "Manager"],
  }
);
```

### Known Modules

If the action you're checking exists in the `.auth.ts` file of a known module (any Prisma model, auth, or file-upload), you're good to go without the third parameter. Learn more about [Known vs Unknown Modules](#link-to-section).

### Migration Considerations

Using `authService.permission()` makes migration between Static and Dynamic modes seamless since the API remains identical:

```ts
// This code works in both modes without changes!
const canEditPost = await blogPostPermissions.canEditOwn(user);

// Avoid direct role checks, as they break in Dynamic mode:
// ❌ if (user.role === "Author") // Breaks in Dynamic mode
// ✅ if (await blogPostPermissions.canEditOwn(user)) // Works in both modes
```

## Performance and Best Practices

### Optimization Strategies

**1. Batch Permission Checks**: Use Promise.all for multiple permissions:

```ts
// ✅ Efficient: Parallel execution
const [canEdit, canDelete, canShare] = await Promise.all([
  blogPostPermissions.canEditOwn(user),
  blogPostPermissions.canDelete(user),
  blogPostPermissions.canShare(user),
]);

// ❌ Inefficient: Sequential execution
const canEdit = await blogPostPermissions.canEditOwn(user);
const canDelete = await blogPostPermissions.canDelete(user);
const canShare = await blogPostPermissions.canShare(user);
```

**2. Cache Permission Results**: For expensive permission checks within the same request:

```ts
export const beforeFindOne = [
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const user = req.user;

    // Cache permission results on the request object
    if (!req.userPermissions) {
      req.userPermissions = {
        canEditOwn: await blogPostPermissions.canEditOwn(user),
        canEditAny: await blogPostPermissions.canEditAny(user),
        canShare: await blogPostPermissions.canShare(user),
      };
    }

    next();
  },
];
```

### Error Handling Patterns

```ts
export const beforeUpdateOne = [
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const user = req.user;
    const canEdit = await blogPostPermissions.canEditOwn(user);

    if (!canEdit) {
      throw new AppError("You don't have permission to edit blog posts", 403);
    }

    next();
  },
];
```

## Integration Patterns

### Combining with Interceptor Middlewares

Use fine-grained permissions in interceptor middlewares for automatic enforcement:

```ts
// src/modules/blog-post/blog-post.interceptors.ts
import { AppError } from "arkos/error-handler";
import { blogPostPermissions } from "./blog-post.auth";

export const beforeCreateOne = [
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const user = req.user;
    if (!user) return next();

    const canCreate = await blogPostPermissions.canCreate(user);
    if (!canCreate) {
      throw new AppError("Insufficient permissions to create blog posts", 403);
    }

    // Add author ID automatically
    req.body.authorId = user.id;
    next();
  },
];
```

## Common Gotchas and Troubleshooting

### Initialization Timing Issues

```ts
// ❌ This will throw an error during request handling
export const beforeCreateOne = [
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const canCreate = authService.permission("Create", "blog-post"); // Error!
  },
];

// ✅ Initialize permissions at module level
const canCreatePosts = authService.permission("Create", "blog-post");

export const beforeCreateOne = [
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const hasPermission = await canCreatePosts(req.user);
  },
];
```

### Resource Naming Mistakes

```ts
// ❌ Wrong: camelCase or PascalCase
const canEdit = authService.permission("Edit", "blogPost");
const canEdit = authService.permission("Edit", "BlogPost");

// ✅ Correct: kebab-case
const canEdit = authService.permission("Edit", "blog-post");
```

### User Object Requirements

```ts
// Ensure user object has required fields for permission checks
const hasPermission = await somePermission(user);

// User must have:
// - id field (for Dynamic mode database queries)
// - isSuperUser field (super users bypass all checks)
// - role/roles fields (for Static mode, if not super user)
```

## Next Steps

- Learn about [Authentication System](/docs/core-concepts/authentication-system) for the foundational concepts
- Explore [Interceptor Middlewares](/docs/core-concepts/interceptor-middlewares) for automatic permission enforcement
- Review the [Auth Service Object Reference API](/docs/api-reference/the-auth-service-object) for additional authentication utilities

Fine-grained access control gives you the flexibility to implement complex business rules while maintaining the simplicity of Arkos's automated systems. Use interceptor middlewares to enhance auto-generated endpoints with permission checks, and custom controllers with routes for unique business logic that goes beyond standard CRUD operations.
