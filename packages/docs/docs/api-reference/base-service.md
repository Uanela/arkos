---
sidebar_position: 2
title: Base Service
---

# Base Service Guide

The `BaseService` class is a fundamental component that provides standardized CRUD (Create, Read, Update, Delete) operations for all models in your application. It serves as the foundation for **Arkos**'s Prisma integration and can be extended for model-specific implementations.

## Key Features

- Provide consistent, reusable data access methods across all models
- Handle common operations like relation management and error handling
- Support for [Service Hooks](/docs/guide/service-hooks) to execute custom logic
- Allow for model-specific overrides and extensions
- Reduce code duplication in service implementations
- Full TypeScript support with automatic type inference (v1.4.0+)

## TypeScript Integration

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

### Enhanced Type Safety

Starting with v1.4.0, Arkos provides **automatic type inference** for all BaseService methods when you run the type generation command:

```bash
npx arkos prisma generate
```

This command does two things:

1. Runs `npx prisma generate` to generate your Prisma client
2. Generates enhanced TypeScript definitions that sync with your Prisma schema

**What gets generated:**

The command creates type definitions in `node_modules/arkos/types/modules/base/base.service.d.ts` that map your Prisma models to fully typed BaseService methods.

### Creating Type-Safe Services

```typescript
// src/modules/user/user.service.ts
import { BaseService } from "arkos/services";

// ✅ Full type inference after running `npx arkos prisma generate`
class UserService extends BaseService<"user"> {
  // TypeScript knows all available fields and relations
  async findActiveUsers() {
    // Full autocomplete for query options
    return this.findMany(
      { status: "ACTIVE" },
      {
        include: {
          profile: true,
          posts: {
            where: { published: true },
            take: 10,
          },
        },
        orderBy: { createdAt: "desc" },
      }
    );
  }
}

const userService = new UserService("user");

export default userService;
```

**Benefits:**

- ✅ Full autocomplete for all fields and relations
- ✅ Type checking for query options
- ✅ Compile-time validation of includes, selects, and where clauses
- ✅ Return types automatically inferred based on your query options

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

### Basic TypeScript Support (v1.3.0)

In v1.3.0, you need to manually specify the Prisma delegate type and even with there was not a good type inference:

```typescript
// src/modules/user/user.service.ts
import { BaseService } from "arkos/service";
import { Prisma } from "@prisma/client";

class UserService extends BaseService<Prisma.UserDelegate> {
  async findActiveUsers() {
    return this.findMany(
      { status: "ACTIVE" },
      {
        include: {
          profile: true,
          posts: true,
        },
      }
    );
  }
}

const userService = new UserService("user");

export default userService;
```

:::tip Upgrade Recommendation
We highly recommend upgrading to v1.4.0-beta for enhanced TypeScript support. The improved type inference significantly reduces development time and prevents runtime errors.
:::

</TabItem>
</Tabs>

## Constructor

```typescript
constructor(modelName: string)
```

Creates a new BaseService instance for the specified model.

**Parameters:**

- `modelName`: The kebab-case name of your Prisma model

**Example:**

```typescript
import { BaseService } from "arkos/services";

const userProfileService = new BaseService("user-profile");
```

## Properties

| Property         | Type                       | Description                                         |
| ---------------- | -------------------------- | --------------------------------------------------- |
| `modelName`      | `string`                   | The kebab-case name of the model                    |
| `relationFields` | `ModelGroupRelationFields` | Object containing singular and list relation fields |
| `prisma`         | `PrismaClient`             | Instance of the Prisma client                       |

## Core CRUD Methods

### `createOne`

Creates a single record in the database.

```typescript
async createOne<TOptions>(
    data: CreateOneData<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
): Promise<CreateOneResult<T>>
```

**Parameters:**

- `data`: Object containing data for the new record
- `queryOptions`: (Optional) Additional Prisma query options (include, select, etc.)
- `context`: (Optional) Context object with user info and execution options

**Returns:** The created record with applied query options

**Special Handling:**

- Automatically hashes passwords for User model
- Handles relation fields (connect, create, connectOrCreate)
- Executes [before/after/error hooks](/docs/core-concepts/service-hooks)

**Example:**

```typescript
// Basic creation
const user = await userService.createOne({
  email: "user@example.com",
  name: "John Doe",
  password: "securepassword", // Auto-hashed for User model
});

// With relations
const post = await postService.createOne(
  {
    title: "My First Post",
    content: "Post content here",
    author: {
      connect: { id: userId },
    },
    tags: {
      create: [{ name: "javascript" }, { name: "typescript" }],
    },
  },
  {
    include: {
      author: true,
      tags: true,
    },
  }
);

// With user context (for hooks)
const product = await productService.createOne(
  { name: "Laptop", price: 999.99 },
  { include: { category: true } },
  { user: currentUser, accessToken: req.headers.authorization }
);
```

### `createMany`

Creates multiple records in a single database operation.

```typescript
async createMany<TOptions>(
    data: CreateManyData<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
): Promise<CreateManyResult<T>>
```

**Parameters:**

- `data`: Array of objects containing data for the new records
- `queryOptions`: (Optional) Additional Prisma query options
- `context`: (Optional) Context object

**Returns:** Object with count and created records

**Special Handling:**

- Automatically hashes passwords for User model (for each user in array)
- Handles relation fields for each record
- Executes hooks for the batch operation

**Example:**

```typescript
// Create multiple users
const result = await userService.createMany([
  { email: "user1@example.com", name: "User 1", password: "pass1" },
  { email: "user2@example.com", name: "User 2", password: "pass2" },
  { email: "user3@example.com", name: "User 3", password: "pass3" },
]);

console.log(result.count); // 3

// With relations
const posts = await postService.createMany(
  [
    {
      title: "Post 1",
      content: "Content 1",
      author: { connect: { id: userId } },
    },
    {
      title: "Post 2",
      content: "Content 2",
      author: { connect: { id: userId } },
    },
  ],
  {
    include: { author: true },
  }
);
```

### `findMany`

Retrieves multiple records based on provided filters.

```typescript
async findMany<TOptions>(
    filters?: FindManyFilters<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
): Promise<FindManyResult<T, TOptions>>
```

**Parameters:**

- `filters`: (Optional) Object containing filters to apply
- `queryOptions`: (Optional) Pagination, sorting, includes, etc.
- `context`: (Optional) Context object

**Returns:** Array of found records

**Special Handling:**

- By default includes singular relation fields (for performance)
- Supports all Prisma filter operations (where, orderBy, take, skip, etc.)

**Example:**

```typescript
// Find all active users
const users = await userService.findMany({
  status: "ACTIVE",
});

// With pagination and sorting
const posts = await postService.findMany(
  {
    published: true,
    author: {
      status: "ACTIVE",
    },
  },
  {
    take: 10,
    skip: 0,
    orderBy: { createdAt: "desc" },
    include: {
      author: true,
      comments: {
        take: 5,
        orderBy: { createdAt: "desc" },
      },
    },
  }
);

// Complex filtering
const products = await productService.findMany(
  {
    OR: [{ category: "Electronics" }, { featured: true }],
    price: {
      gte: 100,
      lte: 1000,
    },
  },
  {
    orderBy: [{ featured: "desc" }, { price: "asc" }],
  }
);
```

### `findById`

Finds a single record by its ID.

```typescript
async findById<TOptions>(
    id: string | number,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
): Promise<FindByIdResult<T> | null>
```

**Parameters:**

- `id`: The record ID (string or number)
- `queryOptions`: (Optional) Additional query options
- `context`: (Optional) Context object

**Returns:** The found record or `null` if not found

**Example:**

```typescript
// Find by ID
const user = await userService.findById("user-uuid-123");

// With relations
const post = await postService.findById("post-id-456", {
  include: {
    author: true,
    comments: true,
    tags: true,
  },
});

if (!post) {
  throw new Error("Post not found");
}
```

### `findOne`

Finds a single record by custom filters.

```typescript
async findOne<TOptions>(
    filters: FindOneFilters<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
): Promise<FindOneResult<T> | null>
```

**Parameters:**

- `filters`: Object containing criteria to find the record
- `queryOptions`: (Optional) Additional query options
- `context`: (Optional) Context object

**Returns:** The found record or `null` if not found

**Special Handling:**

- Uses `findUnique` when filtering by ID only (more performant)
- Uses `findFirst` for other filters
- Includes all relation fields by default

**Example:**

```typescript
// Find by unique field
const user = await userService.findOne({
  email: "user@example.com",
});

// Find with complex filters
const post = await postService.findOne(
  {
    slug: "my-post-slug",
    published: true,
  },
  {
    include: {
      author: {
        include: {
          profile: true,
        },
      },
      comments: {
        where: { approved: true },
        take: 10,
      },
    },
  }
);

// Using ID (automatically uses findUnique)
const product = await productService.findOne({ id: "product-123" });
```

### `updateOne`

Updates a single record by its filters.

```typescript
async updateOne<TOptions>(
    filters: UpdateOneFilters<T>,
    data: UpdateOneData<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
): Promise<UpdateOneResult<T>>
```

**Parameters:**

- `filters`: Object containing criteria to find the record
- `data`: Object containing data to update
- `queryOptions`: (Optional) Additional query options
- `context`: (Optional) Context object

**Returns:** The updated record

**Special Handling:**

- Automatically hashes passwords for User model
- Handles relation fields (connect, disconnect, update)
- Executes before/after/error hooks

**Example:**

```typescript
// Simple update
const user = await userService.updateOne({ id: userId }, { name: "New Name" });

// Update with relations
const post = await postService.updateOne(
  { id: postId },
  {
    title: "Updated Title",
    published: true,
    tags: {
      connect: [{ id: "tag1" }, { id: "tag2" }],
      disconnect: [{ id: "tag3" }],
    },
  },
  {
    include: {
      author: true,
      tags: true,
    },
  }
);

// Password update (auto-hashed for User)
const updatedUser = await userService.updateOne(
  { email: "user@example.com" },
  { password: "newpassword123" } // Automatically hashed
);
```

### `updateMany`

Updates multiple records based on filters.

```typescript
async updateMany<TOptions>(
    filters: UpdateManyFilters<T>,
    data: UpdateManyData<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
): Promise<UpdateManyResult<T>>
```

**Parameters:**

- `filters`: Object containing filters to identify records
- `data`: Object containing data to update
- `queryOptions`: (Optional) Additional query options
- `context`: (Optional) Context object

**Returns:** Object with count of updated records

**Example:**

```typescript
// Update multiple posts
const result = await postService.updateMany(
  {
    authorId: userId,
    published: false,
  },
  {
    published: true,
    publishedAt: new Date(),
  }
);

console.log(`Published ${result.count} posts`);

// Conditional bulk update
await productService.updateMany(
  {
    category: "Electronics",
    stock: { lte: 10 },
  },
  {
    status: "LowStock",
  }
);
```

### `deleteOne`

Deletes a single record by its filters.

```typescript
async deleteOne(
    filters: DeleteOneFilters<T>,
    context?: ServiceBaseContext
): Promise<DeleteOneResult<T>>
```

**Parameters:**

- `filters`: Object containing parameters to find the record
- `context`: (Optional) Context object

**Returns:** The deleted record

**Example:**

```typescript
// Delete by ID
const deletedPost = await postService.deleteOne({ id: postId });

// Delete by other criteria
const deletedUser = await userService.deleteOne({
  email: "user@example.com",
});
```

### `deleteMany`

Deletes multiple records based on filters.

```typescript
async deleteMany(
    filters: DeleteManyFilters<T>,
    context?: ServiceBaseContext
): Promise<DeleteManyResult<T>>
```

**Parameters:**

- `filters`: Object containing filters to identify records
- `context`: (Optional) Context object

**Returns:** Object with count of deleted records

**Example:**

```typescript
// Delete old posts
const result = await postService.deleteMany({
  createdAt: {
    lt: new Date("2023-01-01"),
  },
  published: false,
});

console.log(`Deleted ${result.count} old drafts`);

// Delete user's comments
await commentService.deleteMany({
  authorId: userId,
});
```

### `count`

Counts records matching the filters.

```typescript
async count(
    filters?: CountFilters<T>,
    context?: ServiceBaseContext
): Promise<number>
```

**Parameters:**

- `filters`: (Optional) Object containing filters
- `context`: (Optional) Context object

**Returns:** Number of matching records

**Example:**

```typescript
// Count all users
const totalUsers = await userService.count();

// Count active users
const activeUsers = await userService.count({
  status: "Active",
});

// Count published posts by author
const publishedCount = await postService.count({
  authorId: userId,
  published: true,
});
```

## Batch Operations (Transactions)

### `batchUpdate`

Updates multiple records in a single transaction with individual filters and data.

```typescript
async batchUpdate<TOptions>(
    dataArray: Array<UpdateOneData<T> & { where: any }>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
): Promise<Array<UpdateOneResult<T>>>
```

**Parameters:**

- `dataArray`: Array of objects containing `where` filters and update data
- `queryOptions`: (Optional) Query options applied to all updates
- `context`: (Optional) Context object

**Returns:** Array of updated records

**Example:**

```typescript
// Update multiple posts with different data
const updated = await postService.batchUpdate([
  {
    where: { id: "post1" },
    title: "Updated Title 1",
    published: true,
  },
  {
    where: { id: "post2" },
    title: "Updated Title 2",
    content: "New content",
  },
  {
    where: { id: "post3" },
    featured: true,
  },
]);

// All operations succeed or all fail (transaction)
```

### `batchDelete`

Deletes multiple specific records in a single transaction.

```typescript
async batchDelete(
    batchFilters: Array<DeleteOneFilters<T>>,
    context?: ServiceBaseContext
): Promise<Array<DeleteOneResult<T>>>
```

**Parameters:**

- `batchFilters`: Array of filter objects to identify records
- `context`: (Optional) Context object

**Returns:** Array of deleted records

**Example:**

```typescript
// Delete specific posts by ID
const deleted = await postService.batchDelete([
  { id: "post1" },
  { id: "post2" },
  { id: "post3" },
]);

// Delete by different criteria
await commentService.batchDelete([
  { id: "comment1" },
  { authorId: userId, status: "SPAM" },
  { id: "comment3" },
]);
```

## Service Context

The `ServiceBaseContext` object allows you to pass request-specific information to service methods and control hook execution:

```typescript
interface ServiceBaseContext {
  user?: User; // Authenticated user
  accessToken?: string; // Access token from request
  skip?:
    | "before"
    | "after"
    | "error"
    | "all"
    | Array<"before" | "after" | "error">; // Skip specific hooks
  throwOnError?: boolean; // Whether to throw errors (default: true)
}
```

**Example:**

```typescript
// Pass user context (available in hooks)
const post = await postService.createOne(
  { title: "My Post", content: "..." },
  { include: { author: true } },
  {
    user: req.user,
    accessToken: req.headers.authorization,
  }
);

// Skip after hooks for performance
const data = await userService.findMany(
  { status: "Active" },
  {},
  { skip: "after" }
);

// Skip all hooks
const rawData = await postService.findOne({ id: postId }, {}, { skip: "all" });

// Don't throw errors, return undefined instead
const result = await userService.createOne(
  invalidData,
  {},
  { throwOnError: false }
);

if (!result) {
  console.log("Creation failed but didn't throw");
}
```

## Extending BaseService

### File Structure

```
my-arkos-project/
└── src/
    └── modules/
        └── [model-name]/
            ├── [model-name].service.ts      ← Custom service
            ├── [model-name].hooks.ts        ← Service hooks
            ├── [model-name].interceptors.ts ← HTTP interceptors (v1.4.0+)
            └── [model-name].middlewares.ts  ← HTTP interceptors (v1.3.0)
```

### Generating Custom Services

Use the Arkos CLI to scaffold service files:

```bash
npx arkos generate service --module post
```

**Shorthand:**

```bash
npx arkos g s -m post
```

### Example: Custom User Service

```typescript
// src/modules/user/user.service.ts
import { BaseService } from "arkos/services";
import { AppError } from "arkos/error-handler";
import authService from "../auth/auth.service";
import emailService from "../email/email.service";

class UserService extends BaseService<"user"> {
  // Custom method: Find by email
  async findByEmail(email: string) {
    return this.findOne(
      { email },
      {
        include: {
          profile: true,
          posts: {
            where: { published: true },
            take: 10,
          },
        },
      }
    );
  }

  // Custom method: Change password
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ) {
    const user = await this.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Validate old password
    const isValid = await authService.isCorrectPassword(
      oldPassword,
      user.password
    );

    if (!isValid) {
      throw new AppError("Invalid old password", 400);
    }

    // Update password (automatically hashed by BaseService)
    return this.updateOne({ id: userId }, { password: newPassword });
  }

  // Custom method: Get user statistics
  async getUserStats(userId: string) {
    const [user, postCount, commentCount] = await Promise.all([
      this.findById(userId),
      this.prisma.post.count({ where: { authorId: userId } }),
      this.prisma.comment.count({ where: { authorId: userId } }),
    ]);

    return {
      user,
      stats: {
        posts: postCount,
        comments: commentCount,
        joinedAt: user?.createdAt,
      },
    };
  }
}

// Export as singleton
const userService = new UserService("user");

export default userService;
```

You can then use [**Service Hooks**](/docs/guide/service-hooks) to customize every|some calls of `createOne` method:

```ts
// src/modules/user/user.hooks.ts
import {
  BeforeCreateOneHookArgs,
  AfterCreateOneHookArgs,
} from "arkos/services";
import { Prisma } from "@prisma/client";
import { AppError } from "arkos/error-handler";
import userService from "./user.service";
import emailService from "../email/email.service";

export const beforeCreateOne = [
  async ({
    data,
    queryOptions,
    context,
  }: BeforeCreateOneHookArgs<Prisma.UserDelegate>) => {
    if (!data.email) throw new AppError("Email is required", 400);

    const existing = await userService.findOne({ email: data.email });
    if (existing) throw new AppError("Email already in use", 400);
  },
];

export const afterCreateOne = [
  async ({
    result,
    data,
    queryOptions,
    context,
  }: AfterCreateOneHookArgs<Prisma.UserDelegate>) => {
    await emailService.sendWelcomeEmail({
      to: result.email,
      name: result.name,
    });
  },
];
```

## Best Practices

### 1. Keep Constructor Simple

```typescript
class ProductService extends BaseService<"product"> {
  constructor() {
    super("product");
    // Avoid complex initialization here
  }
}
```

### 2. Reuse Parent Methods

```typescript
class PostService extends BaseService<"post"> {
  async createDraft(data: any) {
    // Call parent with additional data
    return this.createOne({
      ...data,
      published: false,
      publishedAt: null,
    });
  }
}
```

### 3. Use Service Hooks for Business Logic

Instead of overriding methods, use hooks when possible:

```typescript
// ✅ Better: Use hooks (post.hooks.ts)
export const beforeCreateOne = [
  async ({ data, context }) => {
    if (!data.slug) data.slug = generateSlug(data.title);
  },
];
```

### 4. Handle Transactions Properly

```typescript
class OrderService extends BaseService<"order"> {
  async createOrderWithItems(orderData: any, items: any[]) {
    return this.prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: orderData,
      });

      // Create order items
      await tx.orderItem.createMany({
        data: items.map((item) => ({
          ...item,
          orderId: order.id,
        })),
      });

      return order;
    });
  }
}
```

### 5. Export as Singleton

```typescript
class UserService extends BaseService<"user"> {}

// ✅ Export singleton instance
const userService = new UserService("user");

export default userService;

// ❌ Don't export the class
// export default UserService;
```

## Common Patterns

### 1. Soft Deletes

```typescript
class PostService extends BaseService<"post"> {
  async softDelete(id: string) {
    return this.updateOne(
      { id },
      {
        deleted: true,
        deletedAt: new Date(),
      }
    );
  }

  async findActive(filters: any = {}) {
    return this.findMany({
      ...filters,
      deleted: false,
    });
  }
}
```

### 2. Pagination Helper

```typescript
class ProductService extends BaseService<"product"> {
  async paginate(page: number = 1, limit: number = 10, filters: any = {}) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.findMany(filters, { take: limit, skip }),
      this.count(filters),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
```

### 3. Search Implementation

```typescript
class PostService extends BaseService<"post"> {
  async search(query: string, filters: any = {}) {
    return this.findMany(
      {
        ...filters,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
          {
            author: {
              name: { contains: query, mode: "insensitive" },
            },
          },
        ],
      },
      {
        include: {
          author: true,
          tags: true,
        },
      }
    );
  }
}
```

## Related Documentation

- **[Service Hooks](/docs/guide/service-hooks)** - Execute custom logic during CRUD operations
- **[Interceptor Middlewares](/docs/core-concepts/interceptor-middlewares)** - HTTP-level request/response processing
- **[Adding Custom Routers](/docs/guide/adding-custom-routers)** - Create custom API endpoints
- **[Request Handling Pipeline](/docs/api-reference/request-handling-pipeline)** - Understand how requests flow through Arkos

## Migration from v1.3.0 to v1.4.0

### Type Changes

<Tabs groupId="version">
<TabItem value="before" label="Before v1.3.0">

```typescript
import { BaseService } from "arkos/service";
import { Prisma } from "@prisma/client";

class UserService extends BaseService<Prisma.UserDelegate> {
  constructor() {
    super("user");
  }
}
```

</TabItem>
<TabItem value="after" label="After v1.4.0+ (Recommended)" default>

```typescript
import { BaseService } from "arkos/services";

class UserService extends BaseService<"user"> {
  constructor() {
    super("user");
  }
}

// Run this after updating your schema
// npx arkos prisma generate
```

</TabItem>
</Tabs>

### Key Changes

2. **Generic type**: `Prisma.UserDelegate` → `"user"` (model name as string literal)
3. **Type generation**: Run `npx arkos prisma generate` after schema changes

### Benefits of Upgrading

- Better autocomplete for all Prisma operations
- Compile-time validation of includes and selects
- Automatic return type inference based on query options
- Reduced type annotations needed
- Better IDE support and developer experience

:::tip
After upgrading to v1.4.0, run `npx arkos prisma generate` to generate the enhanced type definitions. This command should be run whenever you modify your Prisma schema.
:::
