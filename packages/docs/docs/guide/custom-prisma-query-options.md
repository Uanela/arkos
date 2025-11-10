# Custom Prisma Query Options

Arkos automatically generates API endpoints based on your Prisma models while still giving you full control over the underlying database queries. The `PrismaQueryOptions` configuration allows you to define default query parameters for each operation type, ensuring consistent data access patterns while maintaining flexibility.

## How Arkos Handles Prisma Query Customization

The `prismaQueryOptions` configuration lets you set default options for all Prisma operations, which can be overridden by request query parameters when needed.

### Key Benefits

- **Consistent Data Access**: Apply standard includes, selects, and filters across all endpoints
- **Security By Default**: Exclude sensitive fields automatically
- **Performance Optimization**: Pre-configure relation loading for better performance
- **Operation-Specific Settings**: Apply different configurations for reads vs writes

## Configuration Structure

For it to work you must create a file `src/modules/model-name/model-name.query.ts` so that **Arkos** can find it and make usage of it.

:::info Naming Convention Change
Since v1.2.0-beta, the recommended filename pattern is `model-name.query.ts`. The previous pattern `model-name.prisma-query-options.ts` is still supported for backward compatibility, but you cannot use both naming conventions for the same model in the same directory.
:::

Arkos supports customizing options for all standard Prisma operations:

```ts
// src/modules/author/author.query.ts

import { Prisma } from "@prisma/client";
import { PrismaQueryOptions } from "arkos/prisma";
import { prisma } from "../../utils/prisma";

const authorPrismaQueryOptions: PrismaQueryOptions<typeof prisma.author> = {
  // Global options applied to all operations (params are the same as findMany)
  global: { ... },

  // Grouped operation options (added in v1.2.0)
  find: { ... },      // Controls both findOne and findMany
  save: { ... },      // Controls createOne, updateOne, createMany, updateMany
  create: { ... },    // Controls both createOne and createMany
  update: { ... },    // Controls both updateOne and updateMany
  delete: { ... },    // Controls both deleteOne and deleteMany
  saveOne: { ... },   // Controls createOne and updateOne
  saveMany: { ... },  // Controls createMany and updateMany

  // Individual operation options
  findOne: { ... },
  findMany: { ... },
  createOne: { ... },
  updateOne: { ... },
  deleteOne: { ... },
  createMany: { ... },
  updateMany: { ... },
  deleteMany: { ... }
};

export default authorPrismaQueryOptions;
```

:::danger Important
Follow the file name conventions and folder structure stated above for this to work. Read more about **Arkos** overall project structure [here](/docs/project-structure).
:::

## Generating Query Options Files

:::tip CLI Generation
Since v1.2.0-beta, you can quickly generate query options files using the built-in CLI:

```bash
npx arkos generate query-options --module post
# or shorthand
npx arkos g q -m post
```

This will create a properly structured file at `src/modules/post/post.query.{ts|js}` with all available options.
:::

## Available Query Options

The `PrismaQueryOptions` type supports all standard Prisma query parameters:

```typescript
type PrismaQueryOptions<T extends Record<string, any>> = {
    // Global options applied to all operations
    global?: Partial<Parameters<T["findMany"]>[0]>;

    // Grouped options (added in v1.2.0)
    find?: Partial<Parameters<T["findMany"]>[0]>; // findMany + findOne
    save?: Partial<Parameters<T["create"]>[0]>; // create + update operations
    create?: Partial<Parameters<T["create"]>[0]>; // createOne + createMany
    update?: Partial<Parameters<T["update"]>[0]>; // updateOne + updateMany
    delete?: Partial<Parameters<T["delete"]>[0]>; // deleteOne + deleteMany
    saveOne?: Partial<Parameters<T["create"]>[0]>; // createOne + updateOne
    saveMany?: Partial<Parameters<T["createMany"]>[0]>; // createMany + updateMany

    // Individual operation options
    findOne?: Partial<Parameters<T["findFirst"]>[0]>;
    findMany?: Partial<Parameters<T["findMany"]>[0]>;
    createOne?: Partial<Parameters<T["create"]>[0]>;
    updateOne?: Partial<Parameters<T["update"]>[0]>;
    deleteOne?: Partial<Parameters<T["delete"]>[0]>;
    deleteMany?: Partial<Parameters<T["deleteMany"]>[0]>;
    updateMany?: Partial<Parameters<T["updateMany"]>[0]>;
    createMany?: Partial<Parameters<T["createMany"]>[0]>;
};
```

### Grouped Options (v1.2.0+)

The grouped options simplify configuration by allowing you to apply settings to multiple related operations at once:

- **`find`** - Controls both `findMany` and `findOne` operations
- **`save`** - Controls `createOne`, `updateOne`, `createMany`, and `updateMany` operations
- **`create`** - Controls both `createOne` and `createMany` operations
- **`update`** - Controls both `updateOne` and `updateMany` operations
- **`delete`** - Controls both `deleteOne` and `deleteMany` operations
- **`saveOne`** - Specifically for `createOne` and `updateOne` operations
- **`saveMany`** - Specifically for `createMany` and `updateMany` operations

These wrapper options reduce repetition when you want the same settings across related operations.

Each operation type supports the full range of Prisma options including:

- `select`: Specify which fields to include in the response
- `include`: Configure which relations to load
- `omit`: Specify which fields to omit in the response
- `where`: Add default filters
- `orderBy`: Set default sorting
- `take` & `skip`: Configure pagination defaults
- `distinct`: Select distinct records

## Priority and Merging Behavior

Arkos follows a clear precedence order when applying query options:

1. **Request query parameters** (highest priority)
2. **Individual operation options** (e.g., `findMany`, `createOne`)
3. **Grouped operation options** (e.g., `find`, `save`) - _added in v1.2.0_
4. **Global query options** (lowest priority)

Options are intelligently merged at each level, with object properties being deep-merged rather than replaced.

:::warning Important
Request query parameters always take precedence over configured defaults, allowing API consumers to override your defaults when needed, as mentioned they are deep-merged rather than replaced.
:::

You can read more about how **Arkos** allows developers to handle request query parameters [here](/docs/guide/request-query-parameters)

## Usage Examples

### Basic Example: Excluding Sensitive Data

```typescript
// src/modules/user/user.query.ts
import { Prisma } from "@prisma/client";
import { PrismaQueryOptions } from "arkos/prisma";
import { prisma } from "../../utils/prisma";

const userPrismaQueryOptions: PrismaQueryOptions<typeof prisma.user> = {
    global: {
        select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            updatedAt: true,
            // Explicitly exclude sensitive fields
            password: false,
            resetToken: false,
            twoFactorSecret: false,
        },
    },
};

export default userPrismaQueryOptions;
```

### Using Grouped Options (v1.2.0+)

```typescript
// src/modules/post/post.query.ts
import { Prisma } from "@prisma/client";
import { PrismaQueryOptions } from "arkos/prisma";
import { prisma } from "../../utils/prisma";

const postPrismaQueryOptions: PrismaQueryOptions<typeof prisma.post> = {
    // Apply to all read operations (findOne and findMany)
    find: {
        where: {
            published: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    },

    // Apply to all save operations (create and update)
    save: {
        include: {
            author: true,
            tags: true,
        },
    },

    // Override for specific operation if needed
    findMany: {
        take: 10, // Default page size for lists only
    },
};

export default postPrismaQueryOptions;
```

### Advanced Example: Different Behaviors Per Operation

```typescript
// src/modules/post/post.query.ts
import { Prisma } from "@prisma/client";
import { PrismaQueryOptions } from "arkos/prisma";
import { prisma } from "../../utils/prisma";

const postPrismaQueryOptions: PrismaQueryOptions<typeof prisma.post> = {
    // Global defaults for all operations
    global: {
        where: {
            published: true, // Default to only published posts
        },
        orderBy: {
            createdAt: "desc", // Newest first
        },
    },

    // List view shows less data
    findMany: {
        select: {
            id: true,
            title: true,
            excerpt: true,
            author: {
                select: {
                    id: true,
                    name: true,
                },
            },
            createdAt: true,
            tags: true,
        },
        take: 10, // Default page size
    },

    // Detailed view includes comments and full content
    findOne: {
        include: {
            author: {
                select: {
                    id: true,
                    name: true,
                    bio: true,
                },
            },
            comments: {
                where: {
                    approved: true,
                },
                orderBy: {
                    createdAt: "asc",
                },
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            tags: true,
        },
    },

    // Creating/updating includes validation
    createOne: {
        include: {
            author: true,
            tags: true,
        },
    },

    // Admin operations can see unpublished posts too
    deleteOne: {
        where: {
            // No default filters, allowing deletion of unpublished posts
        },
    },
};

export default postPrismaQueryOptions;
```

### Complex Relations: User Model with Role Management

```typescript
// src/modules/user/user.query.ts
import { Prisma } from "@prisma/client";
import { PrismaQueryOptions } from "arkos/prisma";
import { prisma } from "../../utils/prisma";

const userPrismaQueryOptions: PrismaQueryOptions<typeof prisma.user> = {
    global: {
        // Base configuration for all operations
        select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            updatedAt: true,
            // Sensitive data excluded by default
            password: false,
            isActive: true,
        },
    },

    // For listing users, include their roles
    findMany: {
        include: {
            roles: {
                select: {
                    role: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
        where: {
            isActive: true,
            deletedAt: null,
        },
        orderBy: {
            name: "asc",
        },
    },

    // User profile view includes more details
    findOne: {
        include: {
            roles: {
                select: {
                    role: true,
                },
            },
            posts: {
                where: {
                    published: true,
                },
                select: {
                    id: true,
                    title: true,
                    createdAt: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: 5,
            },
        },
    },

    // When creating users, auto-include created roles
    createOne: {
        include: {
            roles: true,
        },
    },
};

export default userPrismaQueryOptions;
```

## Request Query Parameters Override

When API clients send query parameters, these override your configured defaults. For example:

### API Request:

```
GET /api/users?select=id,name,email&include=posts&where[isActive]=true
```

This would override any conflicting `select`, `include`, or `where` parameters in your configuration, while keeping non-conflicting options intact.

## Best Practices

1. **Security First**: Always exclude sensitive fields in your `global` configuration
2. **Use Grouped Options**: Leverage the grouped options (v1.2.0+) like `find`, `save`, `create` to reduce repetition
3. **Pagination Defaults**: Set reasonable `take` limits to prevent performance issues
4. **Deep Relations**: Be cautious with deeply nested `include` statements
5. **Documentation**: Document your default behavior for API consumers
6. **Performance**: Use `select` instead of `include` when possible to minimize data transfer
7. **Generate with CLI**: Use `npx arkos g q -m modelName` to quickly scaffold query options files

## Version History

- **v1.2.0-beta**:
    - Added grouped query options (`find`, `save`, `create`, `update`, `delete`, `saveOne`, `saveMany`)
    - Simplified naming convention from `model.prisma-query-options.ts` to `model.query.ts`
    - Added CLI command for generating query options files
    - Changed `queryOptions` property to `global` for clarity
