---
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

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

For it to work you must delcares create a file `src/modules/model-name/model-name.prisma-query-options.ts` so that **Arkos** can find it and make usage of it.

Arkos supports customizing options for all standard Prisma operations:

```ts
// src/modules/author/author.prisma-query-options.ts

import { Prisma } from "@prisma/client";
import { PrismaQueryOptions } from "arkos/prisma";
import { prisma } from "../../utils/prisma";

const authorPrismaQueryOptions: PrismaQueryOptions<typeof prisma.author> = {
  // Global options applied to all operations (params are the same as findMany)
  queryOptions: { ... },

  // Operation-specific options
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

:::danger
Is very important to follow the file name conventions and folder structure stated above in order for this to work, you can also read more about **Arkos** overall project structure [`clicking here`](/docs/project-structure).
:::

## Available Query Options

The `PrismaQueryOptions` type supports all standard Prisma query parameters:

```typescript
type PrismaQueryOptions<T extends Record<string, any>> = {
  // Global options applied to all operations
  queryOptions?: Partial<Parameters<T["findMany"]>[0]>;

  // Read operations
  findOne?: Partial<Parameters<T["findFirst"]>[0]>;
  findMany?: Partial<Parameters<T["findMany"]>[0]>;

  // Write operations
  createOne?: Partial<Parameters<T["Create"]>[0]>;
  updateOne?: Partial<Parameters<T["Update"]>[0]>;
  deleteOne?: Partial<Parameters<T["Delete"]>[0]>;

  // Bulk operations
  deleteMany?: Partial<Parameters<T["deleteMany"]>[0]>;
  updateMany?: Partial<Parameters<T["updateMany"]>[0]>;
  createMany?: Partial<Parameters<T["createMany"]>[0]>;
};
```

Each operation type supports the full range of Prisma options including:

- `select`: Specify which fields to include in the response
- `include`: Configure which relations to load
- `where`: Add default filters
- `orderBy`: Set default sorting
- `take` & `skip`: Configure pagination defaults
- `distinct`: Select distinct records

## Configuration Location

Place your Prisma query options in a file following this naming convention:

```
src/modules/[model-name]/[model-name].prisma-query-options.ts
```

Arkos will automatically discover and apply these options when generating your API endpoints.

## Priority and Merging Behavior

Arkos follows a clear precedence order when applying query options:

1. **Request query parameters** (highest priority)
2. **Operation-specific options** (e.g., `findMany`, `createOne`)
3. **Global query options** (lowest priority)

Options are intelligently merged at each level, with object properties being deep-merged rather than replaced.

:::warning Important
Request query parameters always take precedence over configured defaults, allowing API consumers to override your defaults when needed, as mentioned they are deep-merged rather than replaced.
:::

You can read more about how **Arkos** allows developers to handle request query parameters [clicking here](/docs/guide/request-query-parameters)

## Usage Examples

### Basic Example: Excluding Sensitive Data

```typescript
// src/modules/user/user.prisma-query-options.ts
import { Prisma } from "@prisma/client";
import { PrismaQueryOptions } from "arkos/prisma";
import { prisma } from "../../utils/prisma";

const userPrismaQueryOptions: PrismaQueryOptions<typeof prisma.user> = {
  queryOptions: {
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

### Advanced Example: Different Behaviors Per Operation

```typescript
// src/modules/post/post.prisma-query-options.ts
import { Prisma } from "@prisma/client";
import { PrismaQueryOptions } from "arkos/prisma";
import { prisma } from "../../utils/prisma";

const postPrismaQueryOptions: PrismaQueryOptions<typeof prisma.post> = {
  // Global defaults for all operations
  queryOptions: {
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
// src/modules/user/user.prisma-query-options.ts
import { Prisma } from "@prisma/client";
import { PrismaQueryOptions } from "arkos/prisma";
import { prisma } from "../../utils/prisma";

const userPrismaQueryOptions: PrismaQueryOptions<typeof prisma.user> = {
  queryOptions: {
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

1. **Security First**: Always exclude sensitive fields in your `queryOptions` global configuration
2. **Pagination Defaults**: Set reasonable `take` limits to prevent performance issues
3. **Deep Relations**: Be cautious with deeply nested `include` statements
4. **Documentation**: Document your default behavior for API consumers
5. **Performance**: Use `select` instead of `include` when possible to minimize data transfer
