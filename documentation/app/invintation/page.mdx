---
sidebar_position: 2
---

# Project Structure

Arkos.js follows a thoughtfully designed architecture that emphasizes simplicity, convention over configuration, and developer productivity. The structure is designed to scale from simple APIs to complex enterprise applications while maintaining clarity and organization.

:::info
Is worth mentioning that on this section you'll find some folders/files that are required for Arkos.js to be able to automatically find those folders/files and do it's jobs with it. You will also find some folders/files that are simply considered best practices around the Server-Side JavaScript Community, those that are required will be marked with `required`.
:::

## Architecture Philosophy

The project structure is built on three core principles:

- **File-based conventions** - Special files with specific naming patterns (`.router.ts`, `.auth.ts`) automatically integrate (automatically loaded) with the framework 
- **Module-centric organization** - Each Prisma model gets its own module directory containing all related components
- **Zero-configuration defaults** - Sensible defaults with the flexibility to customize when needed

## Root Directory Structure

```
my-arkos-project/
├── prisma/
│   └── schema/
│       └── schema.prisma          # Database schema definition
├── src/                           # Application source code (required)
│   ├── modules/                   # Feature modules (one per Prisma model)
│   ├── utils/                     # Shared utilities and configurations (required)
│   └── app.ts                     # Application entry point (required)
├── uploads/                       # File storage directory
├── .env                          # Environment variables
├── package.json                  # Project dependencies and scripts
└── arkos.config.ts               # Framework configuration
```

## The `/src` Directory

The source directory contains all your application logic, organized into distinct areas of responsibility:

### Application Entry Point

**`src/app.ts`** - Your application's main configuration file:

```typescript
import arkos from 'arkos';

arkos.init({
  cors: {
    allowedOrigins: process.env.NODE_ENV !== "production" ? "*" : "https://yoursite.com"
  },
  // Additional configuration options
});
```

### Utilities Directory

**`src/utils/`** - Contains shared utilities and the required Prisma client:

```
src/utils/
├── prisma/
│   └── index.ts                   # Prisma client instance (required)
├── helpers/                       # Shared helper functions
└── types/                         # TypeScript type definitions
```

**Critical requirement**: Your Prisma client must be exported as default from `src/utils/prisma/index.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;
```

### Modules Directory

**`src/modules/`** - The heart of your application. Each Prisma model gets its own module directory:

```
src/modules/
├── auth/                          # Built-in authentication module
│   ├── dtos/                      # Data Transfer Objects (required for class-validator)
│   ├── schemas/                   # Or Zod validation schemas (required for Zod)
│   └── utils/                     # Authentication utilities
├── user/                          # User model module
├── post/                          # Post model module
└── product/                       # Product model module
```

## Module Structure

Each module directory follows a consistent structure. Here's an example for a `post` module:

```
src/modules/post/
├── post.controller.ts             # Custom controller logic
├── post.service.ts                # Business logic and data operations
├── post.router.ts                 # Custom route definitions
├── post.middlewares.ts            # Request interceptors for auto-generated endpoints
├── post.auth.ts                   # Authentication and authorization rules
├── post.query.ts                  # Default Prisma query configurations
├── post.hooks.ts                  # Lifecycle hooks (before/after operations)
├── dtos/                          # Class-validator DTOs
│   ├── create-post.dto.ts
│   └── update-post.dto.ts
├── schemas/                       # Zod validation schemas
│   ├── create-post.schema.ts
│   └── update-post.schema.ts
└── utils/                         # Module-specific utilities
```

### File Types Explained

#### Controller Files (`*.controller.ts`)
Define custom business logic and handle complex operations beyond basic CRUD:

```typescript
import { ArkosRequest, ArkosResponse } from "arkos";
import { BaseController } from "arkos/controllers"

class PostController extends BaseController {
    async getPostAnalytics (req: ArkosRequest, res: ArkosResponse) {
        // Custom analytics logic
        res.json({ data: analytics });
      }
}

const postController = new PostController("post")

export const postController
```

#### Service Files (`*.service.ts`)
Extend the base service with custom business logic:

```typescript
import { BaseService } from "arkos/service";
import prisma from "../../utils/prisma";

class PostService extends BaseService {
  async getPostsByAuthor(authorId: string) {
    return this.findMany(
       { authorId },
       { include: { author: true } }
    );
  }
}

const postService = new PostService("post");

export default postService
```

#### Router Files (`*.router.ts`)
Define custom routes alongside auto-generated endpoints:

```typescript
import { Router } from "express";
import postController from "./post.controller";
import { catchAsync } from "arkos/error-handler"

const postRouter = Router();

postRouter.get(
    "/analytics",
    authService.authenticate, 
    authService.handleAccessControl("ViewAnaltytics", "post")
    catchAsync(postController.getPostAnalytics));

postRouter.post("/bulk-import", postController.bulkImportPosts);

export default postRouter;
```

#### Interceptor Middleware Files (`*.middlewares.ts`)
Intercept requests to auto-generated endpoints:

```typescript
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { AppError } from "arkos/error-handler";

export const beforeCreateOne = 
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        // Add author ID from authenticated user
        req.body.authorId = req.user.id;
        next();
    };

export const onCreateOneError = 
    async (err: any, req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        // Handle validation manually
        if (err.name === 'ValidationError') 
            throw new AppError("Invalid data, please check your data", 400)

        // Handle conflict errors with custom messages
        if (err.code === 11000) 
            throw new AppError("A post with this a title already exists", 409)
        
        // Let the Arkos.js global error handler handle
        next(err);
    };

export const afterFindMany = 
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        // Transform response data
        res.locals.data = res.locals.data.map(post => ({
            ...post,
            readingTime: calculateReadingTime(post.content)
        }));
        next();
    };

```

#### Authentication Configuration (`*.auth.ts`)
Control access to auto-generated endpoints:

```typescript
import { AuthConfigs } from "arkos/auth";

const postAuthConfigs: AuthConfigs = {
  authenticationControl: {
    View: false,          // Public endpoint
    Create: true,          // Requires authentication
    Update: true,
    Delete: true,
  },
  accessControl: {
    Create: ["Author", "Admin"],
    Update: ["Author", "Admin"],
    Delete: ["Admin"],
  },
};

export default postAuthConfigs;
```

#### Prisma Query Options (`*.query.ts`)
Define default query parameters for consistent data fetching:

```typescript
import { Prisma } from "@prisma/client";
import { PrismaQueryOptions } from "arkos/prisma";
import prisma from "../../utils/prisma";

export type PostDelegate = typeof prisma.post

const postPrismaQueryOptions: PrismaQueryOptions<PostDelegate> = {
  findMany: {
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      tags: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  },
  findOne: {
    include: {
      author: true,
      tags: true,
      comments: {
        include: {
          author: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  },
};

export default postPrismaQueryOptions;
```

#### Hooks (`*.hooks.ts`)
Execute custom logic before or after service operations:

```typescript
import { BeforeCreateOneHookArgs } from "arkos/services";
import { emailService } from "../email/email.service"
import { PostDelegate } "./post.query"
import postService "./post.service"

export const beforeCreateOne = async ({ data }: BeforeCreateOneHookArgs<PostDelegate>) => {
  // Generate slug from title
  data.slug = postService.generateSlug(data.title);
};

export const afterCreateOne = async (context: HookContext) => {
  // Send notification email
  await emailService.notifyFollowers(context.result);
  
  // Update search index
  await searchService.indexPost(context.result);
};
```

#### Validation (DTOs and Schemas)

**Class-Validator DTOs** (`dtos/*.dto.ts`):
```typescript
import { IsString, IsOptional, MaxLength } from "class-validator";

export default class CreatePostDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  excerpt?: string;
}
```

**Zod Schemas** (`schemas/*.schema.ts`):
```typescript
import { z } from "zod";

const CreatePostSchema = z.object({
  title: z.string().max(200),
  content: z.string().min(10),
  excerpt: z.string().optional(),
});

export default CreatePostSchema;
```

## Special Directories

### Database Schema

**`prisma/schema/schema.prisma`** (required) - Your database schema definition:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id    String @id @default(cuid())
  email String @unique
  name  String
  posts Post[]
}

model Post {
  id       String @id @default(cuid())
  title    String
  content  String
  author   User   @relation(fields: [authorId], references: [id])
  authorId String
}
```

### File Uploads

**`uploads/`** - Organized file storage:

```
uploads/
├── images/                        # Image files
├── documents/                     # PDF, DOC files  
├── videos/                        # Video files
└── files/                         # Other file types
```

## Environment Configuration

ArkosJS loads environment variables in this order (highest priority first):

1. **Process environment variables** (system-level)
2. **`.env`** - Main environment file
3. **`.env.local`** - Local overrides (not committed)
4. **`.env.[NODE_ENV].local`** - Environment-specific local overrides
5. **`.env.[NODE_ENV]`** - Environment-specific variables
6. **`.env.defaults`** - Default values (lowest priority)

### Required Environment Variables

```bash
# Database connection (required)
DATABASE_URL="postgresql://username:password@localhost:5432/dbname"

# JWT authentication (required if using auth)
JWT_SECRET="your-super-secret-jwt-key"

# Server configuration
PORT=8000
NODE_ENV=development
```

## Package.json Configuration

Essential scripts for ArkosJS development:

```json
{
  "type": "module", // JavaScript only required
  "scripts": {
    "dev": "arkos dev",
    "build": "arkos build", 
    "start": "arkos start",
    "arkos": "arkos"
  },
  "prisma": {
    "schema": "prisma/schema/"
  }
}
```

## Best Practices

### Module Organization
- **One module per Prisma model** (required) - Keep related functionality together. It is required if you want to harness some of Arkos.js built-in features that you will find across other sections.
- **Use kebab-case** (required) - for module directory names (`user-profile`, not `userProfile` nor `user-profiles`).
- **Consistent file naming** (required partially) - Always use the pattern `model-name.file-type.ts`.

### File Structure Guidelines
- **Keep modules focused** - Each module should have a single, clear responsibility
- **Use type-safe imports** - Leverage TypeScript for better developer experience
- **Organize utilities** (required only for prisma client) - Shared code goes in `/src/utils`, module-specific code in module's `/utils`

### Development Workflow
1. **Define your Prisma schema** first
2. **Generate Prisma client** with `npx prisma generate`
3. **Create module directories** for each model you want to customize
4. **Add authentication configs** to control access
5. **Implement custom logic** in controllers, interceptors and services as needed

### Configuration Tips
- **Environment-specific configs** - Use `.env.development`, `.env.production`
- **Keep secrets secure** - Never commit `.env` files with sensitive data
- **Use meaningful names** - Choose descriptive module and file names

This structure provides the perfect balance of convention and flexibility, allowing you to build powerful APIs quickly while maintaining the ability to customize every aspect of your application when needed.
