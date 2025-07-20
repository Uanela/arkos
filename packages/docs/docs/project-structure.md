---
sidebar_position: 3
---

# Project Structure

This framework uses a thoughtfully organized structure that balances clarity and flexibility, drawing some inspiration from NestJS while emphasizing a file-based approach to reduce complexity for developers.

## Overview

The project structure follows these key principles:

- **File-based approach** for most cases, reducing the need to worry about complex folder hierarchies
- **Module-based organization** for clear separation of concerns
- **Consistent naming conventions** for special files (.middlewares.ts, .auth-configs.ts, etc.)
- **Prisma integration** for database operations with clear schema organization

## Root Structure

```
/
├── prisma/
|   └── schema/
│       └── schema.prisma  # Prisma schema folder
├── src/                   # Application source code
│   ├── modules/           # Feature modules
│   └── utils/             # Shared utilities
|        └── prisma.ts         # Prisma Instance
├── uploads/               # File storage
├── .env.development       # Env for development (Optional Or .env)
├── .env.production        # Env for production (Or .env)
```

This approach keeps each model definition separate, making them easier to manage and maintain.

:::warning
Pay attention to the structure, because **Arkos** uses file-based in some instances so it is important to aware of this.
:::

## Source Directory

The `/src` directory contains the application logic organized into modules:

```
root/src/
    ├── modules/
    │   ├── auth/                           # Authentication module
    │   │   ├── dtos/                       # Class Validator Dtos
    │   │   ├── schemas/                    # Zod schemas
    │   │   └── utils/                      # Auth utilities
    │   └── model-name/                     # Prisma Model module
    │       ├── model-name.auth-configs.ts
    │       ├── model-name.middlewares.ts
    │       ├── model-name.prisma-query-options.ts
    │       ├── model-name.service.ts
    │       ├── model-name.router.ts
    │       ├── model-name.controller.ts
    │       ├── schemas/
    │       ├── dtos/
    |       └── utils/         # some model utils
    ├── utils/
    │    └── prisma.ts         # Prisma Instance
    ├── app.ts
```

:::tip
Under the `src/modules` folder you can create model-name-in-kebab folders in order to customize and harness **Arkos** built-in features.
:::

## Special File Types

The framework uses consistent naming conventions for special-purpose files:

### Middleware Files (\*.middlewares.ts)

Contain request processing logic that executes before or after arkos built-in controllers.

```typescript
// src/modules/user/user.middlewares.ts
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";

export const beforeCreateOne = catchAsync(
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    // Validation logic
    next();
  }
);
```

### Authentication Configuration (\*.auth-configs.ts)

Define authentication strategies and requirements for generated api endpoints.

```ts
// src/modules/post/post.auth-configs.ts
import { AuthConfigs } from "arkos/auth";

const postAuthConfigs: AuthConfigs = {
  authenticationControl: {
    View: false, // Public endpoint
  },
  accessControl: {
    Create: ["Author", "Admin"],
    Update: ["Author", "Admin"],
    Delete: ["Admin"],
  },
};

export default postAuthConfigs;
```

### Prisma Query Options (\*.prisma-query-options.ts)

Configure reusable Prisma query parameters.

```ts
// src/modules/user/user.prisma-query-options.ts
import { Prisma } from "@prisma/client";
import { PrismaQueryOptions } from "arkos/prisma";
import { prisma } from "../../utils/prisma";

const userPrismaQueryOptions: PrismaQueryOptions<typeof prisma.user> = {
  findOne: {
    include: {
      profile: true,
      orders: {
        take: 5,
        orderBy: { createdAt: "desc" },
      },
    },
  },
};

export default userPrismaQueryOptions;
```

### Data Transfer Objects (dtos/\*.dto.ts)

Define data validation using class-validator for input processing.

```typescript
// src/modules/post/dtos/create-post.dto.ts
export default class CreatePostDto {
  // Your fields here
}
```

### Schemas (schemas/\*.schema.ts)

Define validation rules using Zod for request data.

```ts
// src/modules/post/schemas/create-post.schema.ts
import { z } from "zod";

const CreatePostSchema = z.object({
  // Your fields here
});

export default CreatePostSchema;
```

## Uploads Directory

The `/uploads` directory stores application uploaded files:

```
/uploads/
├── documents/            # Document files (PDF, DOC, etc.)
├── images/               # Image files
├── videos/               # Video files
└── files/                # Other files (Not specified above)
```

## Environment Configuration

**Arkos** loads environment variables in a prioritized order:

1. `.env.defaults` - Base defaults (lowest priority)
2. `.env.[NODE_ENV]` - Environment-specific variables (development, production, staging, test etc.)
3. `.env.[NODE_ENV].local` - Environment-specific local overrides
4. `.env.local` - Local environment overrides
5. `.env` - Main environment variables
6. Process environment variables - System-level variables (highest priority)

```
/.env.defaults            # Default values for all environments
/.env.development         # Development environment variables
/.env.development.local   # Local development overrides (not committed to repo)
/.env.production          # Production environment variables
/.env.production.local    # Local production overrides (not committed to repo)
/.env.staging             # Staging environment variables
/.env.local               # Local overrides for all environments
/.env                     # Main environment file
```

Note that `.local` files are typically excluded from version control and are meant for local development customizations and will not be loaded on production. Required environment variables include: `DATABASE_URL` for prisma.

## .gitignore file

Below is a comprehensive `.gitignore` configuration for your **Arkos** project that covers common files and directories that should be excluded from version control:

```
# Dependencies
/node_modules
/.pnp
.pnp.js
package-lock.json
yarn.lock
pnpm-lock.yaml
.npm

# Environment files
.env
.env.local
.env.*.local
.env.development
.env.test
.env.production
*.env

# Build and output directories
/build
/dist
/out
/.build
/coverage
/.nyc_output

# TypeScript cache and declaration files
*.tsbuildinfo
/src/**/*.js.map
/src/**/*.d.ts
/types/generated/*

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# IDE and editor directories
/.idea
/.vscode
*.swp
*.swo
.DS_Store
.project
.classpath
.settings/

# OS files
.DS_Store
Thumbs.db
ehthumbs.db
Desktop.ini
$RECYCLE.BIN/

# Testing
/coverage
/.nyc_output
/cypress/screenshots
/cypress/videos
/.jest-cache

# Temporary files
*.tmp
*.temp
.cache/
.eslintcache
.stylelintcache

# Misc
.serverless/
.fusebox/
.dynamodb/
.webpack/
.next/
.nuxt/
.cache/
.docz/
.vercel
```

This `.gitignore` includes:

1. **Dependencies**: Excludes all package manager related files and directories.
2. **Environment Files**: Ignores all environment files that might contain sensitive information.
3. **Build Directories**: Ignores all common output directories (`/build` for **Arkos**).
4. **TypeScript**: Ignores TypeScript compiler output and cache files.
5. **Logs**: Excludes various types of log files.
6. **IDE/Editor**: Ignores configuration files for common development environments.
7. **OS Files**: Ignores operating system generated files.
8. **Testing**: Excludes test coverage reports and artifacts.
9. **Temporary Files**: Ignores various temporary files created during development.
10. **Misc**: Excludes various framework-specific build directories.

Feel free to customize this configuration based on your specific project needs. You can remove sections that aren't relevant to your development workflow or add additional patterns for project-specific files that shouldn't be committed to version control.

# Package.json Scripts

Add the following scripts to your `package.json` file to utilize the Arkos CLI commands:

```json
{
  // your configs
  "scripts": {
    "dev": "arkos dev",
    "start": "arkos start",
    "build": "arkos build",
    "arkos": "arkos"
    // other scripts
  }
}
```

With these scripts configured, you can run the commands using npm or yarn:

- `npm run dev` or `pnpm dev` - Start the development server
- `npm run build` or `pnpm build` - Build your project for production
- `npm start` or `pnpm start` - Run the production server
- `npm run arkos` or `pnpm arkos` - Run custom Arkos CLI commands

You can also pass additional parameters to these commands:

```bash
# Start dev server on custom port
npm run dev -p 3050

# Build with ESM modules
npm run build -m esm

# Start production server with specific host
npm start -h 0.0.0.0
```

## Best Practices

1. **Module Organization**: Create new modules for distinct prisma model
2. **File Naming**: Follow the established naming conventions for special files
3. **DTOs vs Schemas**: Both approach are supported choose according to your application requirements.
4. **Middleware Usage**: Route-specific middleware to intercept request on generated api routes should be defined in model-name.middlewares.ts files
5. **Utility Functions**: Shared helpers should go in the /utils directory, module-specific helpers in the module's utils folder
