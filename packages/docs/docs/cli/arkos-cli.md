import { Callout } from 'fumadocs-ui/components/callout';

---
sidebar_position: 14
title: Arkos CLI
---
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import SmallTag from "../components/small-tag"

# Arkos CLI

The built-in Arkos.js CLI provides powerful development commands for building, running, and generating components in your Arkos.js projects. Unlike the scaffolding CLI (`create-arkos`), this CLI is available within existing Arkos.js projects to streamline your development workflow.

## Available Commands

The Arkos.js CLI offers five main command categories:

```bash
arkos [command] [options]
```

### Development Commands

| Command | Description | Purpose |
|---------|-------------|---------|
| `arkos dev` | Run development server | Hot-reload development with file watching |
| `arkos build` | Build for production | Create optimized production builds |
| `arkos start` | Run production server | Start the built application |

### Code Generation Commands


| Command | Alias | Description | Version |
|---------|-------|-------------|---------|
| `arkos generate controller` | `arkos g c` | Generate a new controller | 1.3.0 |
| `arkos generate service` | `arkos g s` | Generate a new service | 1.3.0 |
| `arkos generate router` | `arkos g r` | Generate a new router | 1.3.0 |
| `arkos generate auth-configs` | `arkos g a` | Generate auth configuration | 1.3.0 |
| `arkos generate query-options` | `arkos g q` | Generate Prisma query options | 1.3.0 |
| `arkos generate interceptors` | `arkos g i` | Generate interceptors file | 1.3.0 |
| `arkos generate hooks` | `arkos g h` | Generate service hooks file | 1.3.0 |
| `arkos generate schema` | `arkos g sc` | Generate base Zod schema | 1.5.0 |
| `arkos generate create-schema` | `arkos g cs` | Generate create Zod schema | 1.4.0 |
| `arkos generate update-schema` | `arkos g us` | Generate update Zod schema | 1.4.0 |
| `arkos generate query-schema` | `arkos g qs` | Generate query Zod schema | 1.5.0 |
| `arkos generate dto` | `arkos g d` | Generate base class-validator DTO | 1.5.0 |
| `arkos generate create-dto` | `arkos g cd` | Generate create DTO | 1.4.0 |
| `arkos generate update-dto` | `arkos g ud` | Generate update DTO | 1.4.0 |
| `arkos generate query-dto` | `arkos g qd` | Generate query DTO | 1.5.0 |
| `arkos generate model` | `arkos g m` | Generate Prisma model | 1.5.0 |
| `arkos generate components` | `arkos g co` | Generate multiple components at once | 1.5.0 |

<Callout type="info" title="New in v1.4.0+">
- `arkos generate interceptors` is now the recommended command (replaces `middlewares`)
- `--module` flag is now preferred over `--model` for consistency
</Callout>

### Utilities Exportation Commands
> Available from `v1.4.0-beta`

| Command | Alias | Description |
|---------|-------|-------------|
| `arkos export auth-action` | `arkos e ac` | Exports all auth-actions to a file |

### Typescript Types Generation
> Available from `v1.4.0-beta`

| Command | Alias | Description |
|---------|-------|-------------|
| `arkos prisma generate` | `arkos p g` | Generate Prisma client types and sync Arkos internal types |

## Development Server

### `arkos dev`

Starts a development server with hot-reload capabilities, automatically restarting when files change.

```bash
arkos dev [options]
```

**Options:**
- `-p, --port <number>` - Custom port number
- `-h, --host <host>` - Host to bind to

**Features:**
- **File Watching**: Automatically detects changes in `src/`, configuration files, and environment files
- **TypeScript Support**: Uses [`tsx-strict`](https://github.com/uanela/tsx-strict) for TypeScript projects
- **JavaScript Support**: Uses [`tsx-strict`](https://github.com/uanela/tsx-strict) without type-check for JavaScript projects  
- **Environment Reload**: Restarts server when `.env` files change
- **Smart Debouncing**: Prevents excessive restarts with intelligent delay

**Example:**
```bash
# Start dev server on default port
arkos dev

# Start on custom port and host
arkos dev --port 4000 --host 0.0.0.0
```

The development server provides real-time feedback:
```
  Arkos.js 1.5.0
  - Local:        http://localhost:8000
  - Environments: .env, .env.local

12:34:56 Restarting: src/controllers/user.controller.ts changed
```

## Production Build

### `arkos build`

Creates an optimized production build of your Arkos.js application.

```bash
arkos build 
```

**Features:**
- **TypeScript Compilation**: Compiles TypeScript to JavaScript with custom tsconfig
- **Environment Detection**: Automatically detects project type (TS/JS)

**Build Process:**
2. For TypeScript: Compiles with temporary tsconfig
3. For JavaScript: Copies and processes JS files

**Example:**
```bash
arkos build
```

**Output:**
```
  Arkos.js 1.5.0
  - Environments: .env

  Creating an optimized production build...

  Build complete!

  Next step:
  Run it using npm run start
```

## Production Server

### `arkos start`

Runs the production build of your application.

```bash
arkos start [options]
```

**Options:**
- `-p, --port <number>` - Custom port number
- `-h, --host <host>` - Host to bind to

**Requirements:**
- Must run `arkos build` first
- Looks for built application at `.build/src/app.js`

**Example:**
```bash
# Start production server
arkos start

# Start with custom configuration
arkos start --port 3000 --host 0.0.0.0
```

## Code Generation

The generate commands create boilerplate code following Arkos.js conventions and best practices.

### Common Options

All generate commands support:
- `-m, --module <name>` - **Required** - Module/component name (recommended v1.4.0+)
- `--model <name>` - **Deprecated** - Module/component name (still works, use `--module` instead)
- `-p, --path <path>` - Custom path (default: `src/modules`)
- `-o, --overwrite` - Overwrite existing files

<Callout type="info" title="Module vs Model">
Starting with v1.4.0+, use `--module` instead of `--model` for better consistency. Both work, but `--module` is the recommended flag going forward.
</Callout>

### Controller Generation

```bash
arkos generate controller --module user
arkos g c -m user
```

**Generated Template:**
```typescript
import { BaseController } from "arkos/controllers";

class UserController extends BaseController{  }

const userController = new UserController("user");

export default userController;
```

**Features:**
- Extends `BaseController` for automatic customizable CRUD operations
- Uses kebab-case for resource naming
- Follows TypeScript/JavaScript project conventions

### Service Generation

```bash
arkos generate service --module user
arkos g s -m user
```

**Special Module Values:**

The `--module` (or `-m`) option can take special values:

- **auth**: Generates component for the Authentication module
- **file-upload**: Generates component for the File Upload module

```bash
# Generate auth service
arkos g s -m auth

# Generate file-upload service
arkos g s -m file-upload
```

<Callout type="warn">
Not all components are available for `auth` and `file-upload` modules. The CLI will show an error if you try to generate unsupported components for these modules.
</Callout>

**Generated Template:**

```typescript
import { BaseService } from "arkos/services";

class UserService extends BaseService<"user"> {
  // Add your custom service methods here
}

const userService = new UserService("user");

export default userService;
```

**Features:**
- Extends `BaseService` with Prisma type safety
- Automatic Prisma client integration
- Ready for custom business logic

### Router Generation

```bash
arkos generate router --module user
arkos g r -m user
```

**Generated Template:**
```typescript
import { ArkosRouter } from 'arkos'
import { authService } from 'arkos/services'

const userRouter = ArkosRouter()

export default userRouter
```

**Features:**
- Automatic pluralization for endpoint paths
- Built-in authentication middleware integration
- Controller auto-import (if file exists)
- Access control setup

### Auth Configuration Generation

```bash
arkos generate auth-configs --module post
arkos g a -m post
```

Generates authentication configuration for role-based access control with separated authentication and authorization controls.

```ts
import { AuthConfigs } from 'arkos/auth';
import { authService } from "arkos/services";

export const postAccessControl = {
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

function createPostPermission(action: string) {
  return authService.permission(action, "post", postAccessControl);
}

export const postPermissions = {
  canCreate: createPostPermission("Create"),
  canUpdate: createPostPermission("Update"),
  canDelete: createPostPermission("Delete"),
  canView: createPostPermission("View"),
};

export const postAuthenticationControl = {
  Create: true,
  Update: true,
  Delete: true,
  View: true,
};

const postAuthConfigs: AuthConfigs = {
  authenticationControl: postAuthenticationControl,
  accessControl: postAccessControl,
};

export default postAuthConfigs;
```
**Features (v1.5.0+):**
- Separated authentication control (who needs to be logged in)
- Access control with permission helpers
- Wildcard role support (`*` for all authenticated users)
- Auto-generated permission helper functions (with `--advanced` flag)

#### Advanced Auth Configs Generation


```bash
arkos generate auth-configs --module post --advanced
arkos g a -m post -a
```

Everything remains the same the only change is that now you will have 

```ts
import { AuthConfigs } from 'arkos/auth';
import { authService } from "arkos/services";

export const postAccessControl = {
  Create: {
    roles: [],
    name: "Create Post",
    description: "Permission to create new post records",
  },
  Update: {
    roles: [],
    name: "Update Post",
    description: "Permission to update existing post records",
  },
  Delete: {
    roles: [],
    name: "Delete Post",
    description: "Permission to delete post records",
  },
  View: {
    roles: [],
    name: "View Post",
    description: "Permission to view post records",
  },
} as const satisfies AuthConfigs["accessControl"];

type PostPermissionName = `can${keyof typeof postAccessControl & string}`;

export const postPermissions = Object.keys(postAccessControl).reduce(
  (acc, key) => {
    acc[`can${key}` as PostPermissionName] = authService.permission(
      key,
      "post",
      postAccessControl
    );
    return acc;
  },
  {} as Record<PostPermissionName, ReturnType<typeof authService.permission>>
);

export const postAuthenticationControl = {
  Create: true,
  Update: true,
  Delete: true,
  View: true,
};

const postAuthConfigs: AuthConfigs = {
  authenticationControl: postAuthenticationControl,
  accessControl: postAccessControl,
};

export default postAuthConfigs;
```

### Query Options Generation

```bash
arkos generate query-options --module user
arkos g q -m user
```

**Generated Template:**
```typescript
import { Prisma } from "@prisma/client";
import { PrismaQueryOptions } from 'arkos/prisma';

const userQueryOptions: PrismaQueryOptions<Prisma.UserDelegate> = {
    global: {},
    find: {},
    findOne: {},
    findMany: {},
    update: {},
    updateMany: {},
    updateOne: {},
    create: {},
    createMany: {},
    createOne: {},
    save: {},
    saveMany: {},
    saveOne: {},
    delete: {},
    deleteMany: {},
    deleteOne: {},
}

export default userQueryOptions;
```

**Features:**
- Type-safe Prisma query configuration
- Supports all CRUD operations
- Special handling for auth models

### Interceptors Generation

```bash
arkos generate interceptors --module user
arkos g i -m user
```

Generates interceptor middleware files for request processing.

**File Location:** `src/modules/user/user.interceptors.ts`

<Callout type="info" title="Replaces `generate middlewares` (v1.4.0+)">
The `interceptors` command is the new recommended way. The old `middlewares` command still works but shows deprecation warnings and will be removed in v1.6.0.
</Callout>

### Service Hooks Generation

```bash
arkos generate hooks --module user
arkos g h -m user
```

Generates service hook files for customizing BaseService behavior at the service layer.

**File Location:** `src/modules/user/user.hooks.ts`

### Schema Generation (Zod)

Generate Zod validation schemas for your Prisma models:

```bash
# Base schema (all fields)
arkos generate schema --module user
arkos g sc -m user

# Create schema (fields needed for creation)
arkos generate create-schema --module user
arkos g cs -m user

# Update schema (fields that can be updated)
arkos generate update-schema --module user
arkos g us -m user

# Query schema (fields for filtering/searching)
arkos generate query-schema --module user
arkos g qs -m user
```

**Generated Location:** `src/modules/user/schemas/`

**Features:**
- Auto-generates from Prisma schema
- Supports all Prisma field types
- Nested object and relation support

### DTO Generation (class-validator)

Generate class-validator DTOs for your Prisma models:

```bash
# Base DTO (all fields)
arkos generate dto --module user
arkos g d -m user

# Create DTO
arkos generate create-dto --module user
arkos g cd -m user

# Update DTO
arkos generate update-dto --module user
arkos g ud -m user

# Query DTO
arkos generate query-dto --module user
arkos g qd -m user
```

**Generated Location:** `src/modules/user/dtos/`

### Prisma Model Generation

```bash
arkos generate model --module product
arkos g m -m product
```

**Generated Location:** `prisma/schema/` (customizable with `--path`)

**Features:**
- Generates basic Prisma model template
- Includes common fields (id, createdAt, updatedAt) from your existing models
- Ready for customization

### Bulk Component Generation <SmallTag>v1.5.0+</SmallTag>

Generate multiple components for a module at once - the most powerful feature for rapid development:

```bash
# Generate ALL components for a module
arkos generate components --module post --all
arkos g co -m post --all

# Generate specific components (comma-separated)
arkos generate components --module post --names service,controller,router,schema,dto
arkos g co -m post -n s,c,r,sc,d

# Mix full names and aliases
arkos g co -m post -n service,c,router,sc,dto
```

**Available Component Names:**

| Full Name | Alias | What It Generates |
|-----------|-------|-------------------|
| `service` | `s` | BaseService extension |
| `controller` | `c` | BaseController extension |
| `router` | `r` | ArkosRouter configuration |
| `interceptors` | `i` | Interceptor middlewares |
| `hooks` | `h` | Service hooks |
| `auth-configs` | `a` | Auth configuration |
| `query-options` | `q` | Prisma query options |
| `schema` | `sc` | Base Zod schema |
| `create-schema` | `cs` | Create Zod schema |
| `update-schema` | `us` | Update Zod schema |
| `query-schema` | `qs` | Query Zod schema |
| `dto` | `d` | Base class-validator DTO |
| `create-dto` | `cd` | Create DTO |
| `update-dto` | `ud` | Update DTO |
| `query-dto` | `qd` | Query DTO |
| `model` | `m` | Prisma model |

**Example - Generate Complete Module:**

```bash
# Everything you need for a new module in one command
arkos g co -m product --all
```

This generates:
- `product.service.ts`
- `product.controller.ts`
- `product.router.ts`
- `product.interceptors.ts`
- `product.hooks.ts`
- `product.auth.ts`
- `product.query.ts`
- `prisma/schema/product.prisma`
- `schemas/product.schema.ts`
- `schemas/create-product.schema.ts`
- `schemas/update-product.schema.ts`
- `schemas/query-product.schema.ts`

**Time saved:** From 30+ minutes of manual setup to **5 seconds** ⚡

## Utility Commands

### Export Auth Actions <SmallTag>v1.4.0+</SmallTag>

Export all authentication actions to a TypeScript/JavaScript file for frontend integration:

```bash
# Export to default location (src/modules/auth/utils/auth-actions.ts)
arkos export auth-action
arkos e ac

# Overwrite existing file (instead of merging)
arkos export auth-action --overwrite
arkos e ac -o

# Custom output path
arkos export auth-action --path src/constants
arkos e ac -p src/constants
```

**Generated File:**

```typescript
// src/modules/auth/utils/auth-actions.ts
const authActions = [
  {
    resource: "post",
    action: "Create",
    roles: ["Editor", "Admin"],
    name: "Create Posts",
    description: "Allows creating new blog posts",
  },
  // ... all your auth actions
];

export default authActions;
```

**Use Cases:**
- Map permissions to UI elements
- Hide/show features based on roles
- Add i18n translations
- Generate TypeScript types

### Prisma Generate <SmallTag>v1.4.0+</SmallTag>

Generate Prisma client types and sync Arkos internal types for better TypeScript support:

```bash
arkos prisma generate
arkos p g
```

**What It Does:**
- Runs `prisma generate` to create Prisma client
- Syncs Arkos's internal type system with your Prisma schema
- Ensures type safety across BaseService and other Arkos features

**When to Use:**
- After modifying your Prisma schema
- After pulling schema changes from version control
- When TypeScript shows type errors related to Prisma models

## File Structure & Conventions

### Generated Module Structure

When generating components, Arkos.js creates organized module directories:

```
src/modules/
└── user/
    ├── user.controller.ts
    ├── user.service.ts
    ├── user.router.ts
    ├── user.auth.ts
    ├── user.query.ts
    ├── user.interceptors.ts
    ├── user.hooks.ts
    ├── schemas/
    │   ├── user.schema.ts
    │   ├── create-user.schema.ts
    │   ├── update-user.schema.ts
    │   └── query-user.schema.ts
    └── dtos/
        ├── user.dto.ts
        ├── create-user.dto.ts
        ├── update-user.dto.ts
        └── query-user.dto.ts
```

### Naming Conventions

Arkos.js uses consistent naming patterns:

| Case Type | Usage | Example |
|-----------|-------|---------|
| **kebab-case** | Files, routes, resources | `user-profile.controller.ts` |
| **camelCase** | Variables, instances | `userProfileController` |
| **PascalCase** | Classes, types | `UserProfileController` |

### TypeScript vs JavaScript

The CLI automatically detects your project type:

- **TypeScript Projects**: Uses `.ts` extension, includes type annotations
- **JavaScript Projects**: Uses `.js` extension, omits TypeScript-specific features

## Advanced Usage

### Custom Paths

Override default module paths:

```bash
# Generate in custom directory
arkos g c -m user -p src/custom/modules

# Results in: src/custom/modules/user/user.controller.ts
```

### Overwriting Files

By default, Arkos prevents overwriting existing files. Use `-o` or `--overwrite` to force:

```bash
# Overwrite existing service
arkos g s -m user --overwrite

# Bulk generation with overwrite
arkos g co -m user --all --overwrite
```

### Environment Integration

The CLI automatically integrates with your environment setup:

- Loads multiple `.env` files (`.env`, `.env.local`, etc.)
- Watches environment files for changes in dev mode
- Displays loaded environment files in startup info

## Error Handling & Debugging

### Common Issues

**Build Errors:**
- Ensure TypeScript compilation succeeds
- Check for missing dependencies
- Verify file permissions

**Dev Server Issues:**
- Port conflicts: Use `--port` option
- File watching problems: Check file permissions
- Memory issues: Restart the development server

**Generation Errors:**
- Invalid module names: Use alphanumeric characters
- Path conflicts: Ensure target directories are writable
- Missing dependencies: Run `npm install`

### Debug Output

The CLI provides detailed feedback:

```bash
# Development server with file change notifications
12:34:56 [Info] Restarting: user.controller.ts changed

# Build process with environment info
  Arkos.js 1.5.0
  - Environments: .env, .env.local

  Creating an optimized production build...
```

## Integration with Project Workflow

### Development Workflow

1. **Start Development**: `arkos dev`
2. **Generate Components**: `arkos g co -m ModelName --all`
3. **Build for Production**: `arkos build`
4. **Deploy**: `arkos start`

### CI/CD Integration

```bash
# In your CI pipeline
npm install
arkos build
arkos start --port $PORT
```

### Package.json Scripts

Add these scripts to your `package.json` (automatically added when project is created using `create-arkos` CLI):

```json
{
  "scripts": {
    "dev": "arkos dev",
    "build": "arkos build",
    "start": "arkos start",
    "arkos": "arkos"
  }
}
```

## Cross-Reference with Create-Arkos

The built-in CLI complements the [scaffolding CLI](/docs/api-reference/create-arkos):

| Phase | Tool | Purpose |
|-------|------|---------|
| **Project Setup** | `create-arkos` | Bootstrap new projects with configuration |
| **Development** | `arkos dev` | Hot-reload development server |
| **Code Generation** | `arkos generate` | Create components and boilerplate |
| **Production** | `arkos build` + `arkos start` | Deploy optimized applications |

## Summary

The built-in Arkos.js CLI transforms your development experience with:

### Key Benefits

1. **Integrated Development**: Seamless dev server with hot-reload
2. **Production Ready**: Optimized builds with module format support  
3. **Code Generation**: Consistent, type-safe component scaffolding
4. **Best Practices**: Generated code follows Arkos.js conventions
5. **Developer Experience**: Smart file watching and environment integration

### Productivity Features

- **Zero Configuration**: Works out-of-the-box with intelligent defaults
- **TypeScript First**: Full TypeScript support with type safety
- **Environment Aware**: Automatic environment file detection and reloading
- **Cross-Platform**: Consistent behavior across operating systems
- **Extensible**: Generated code serves as starting points for customization
- **Bulk Generation (v1.5.0+)**: Create entire modules in seconds with `generate components`

The built-in CLI handles the repetitive aspects of development, allowing you to focus on building your application's unique features and business logic.

