---
sidebar_position: 14
---

# Built-in Arkos.js CLI

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

| Command | Alias | Description |
|---------|-------|-------------|
| `arkos generate controller` | `arkos g c` | Generate a new controller |
| `arkos generate service` | `arkos g s` | Generate a new service |
| `arkos generate router` | `arkos g r` | Generate a new router |
| `arkos generate auth-configs` | `arkos g a` | Generate auth configuration |
| `arkos generate query-options` | `arkos g q` | Generate Prisma query options |
| `arkos generate middlewares` | `arkos g m` | Generate middleware file |

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
- **TypeScript Support**: Uses `ts-node-dev` for TypeScript projects
- **JavaScript Support**: Uses `nodemon` for JavaScript projects  
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
  Arkos.js 1.0.0
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
- **File Copying**: Copies all non-source assets (JSON, images, etc.)
- **Environment Detection**: Automatically detects project type (TS/JS)

**Build Process:**
1. Validates module type and creates build directory
2. For TypeScript: Compiles with temporary tsconfig
3. For JavaScript: Copies and processes JS files
4. Copies all non-source files to build directory
5. Generates appropriate `package.json` for module type

**Example:**
```bash
arkos build
```

**Output:**
```
  Arkos.js 1.0.0
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
- `-m, --model <name>` - **Required** - Model/component name
- `-p, --path <path>` - Custom path (default: `src/modules`)

### Controller Generation

```bash
arkos generate controller --model user
arkos g c -m user
```

**Generated Template:**
```typescript
import { BaseController } from "arkos/controllers";

class UserController extends BaseController {
  constructor() {
    super("user");
  }
}

const userController = new UserController();

export default userController;
```

**Features:**
- Extends `BaseController` for automatic CRUD operations
- Uses kebab-case for resource naming
- Follows TypeScript/JavaScript project conventions

### Service Generation

```bash
arkos generate service --model user
arkos g s -m user
```

Is worth mentioning that beside your models name, the option `--model` or `-m` (which are the same) can also take values such as:

- **auth**: will generate the component you want to generate but for the `Authentication` module as they slightly differ on some classes and simple implementations.
- **file-upload**: will generate the component you want to genreate but for the `File Upload` module as they also slightly differ on some simple implementations.

:::warning
Even though the `--model` or `-m` option can take values such as `auth` and `file-upload` for component generation, not all components are available for both
:::

**Generated Template:**
```typescript
import { prisma } from "../../utils/prisma";
import { BaseService } from "arkos/services";

class UserService extends BaseService<typeof prisma.user> {
  constructor() {
    super("user");
  }
  // Add your custom service methods here
}

const userService = new UserService();
export default userService;
```

**Features:**
- Extends `BaseService` with Prisma type safety
- Automatic Prisma client integration
- Ready for custom business logic

### Router Generation

```bash
arkos generate router --model User
arkos g r -m User
```

**Generated Template:**
```typescript
import { Router } from 'express'
import { authService } from 'arkos/services'
import userController from "./user.controller"

const userRouter = Router()

userRouter.post(
  '/custom-endpoint', // resolves to /api/users/custom-endpoint
  authService.authenticate,
  authService.handleAccessControl('CustomAction', 'user'),
  userController.someHandler
)

export default userRouter
```

**Features:**
- Automatic pluralization for endpoint paths
- Built-in authentication middleware integration
- Controller auto-import (if file exists)
- Access control setup

### Auth Configuration Generation

```bash
arkos generate auth-configs --model user
arkos g a -m user
```

Generates authentication configuration for role-based access control.

### Query Options Generation

```bash
arkos generate query-options --model user
arkos g q -m user
```

**Generated Template:**
```typescript
import { prisma } from "../../utils/prisma";
import { PrismaQueryOptions } from 'arkos/prisma';

const userQueryOptions: PrismaQueryOptions<typeof prisma.user> = {
    global: {},
    find: {},
    findOne: {},
    findMany: {},
    udpate: {},
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

### Middleware Generation

```bash
arkos generate middlewares --model user
arkos g m -m user
```

Generates custom intercpetor middlewares files for request processing.

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
    └── user.middlewares.ts
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
- Invalid model names: Use alphanumeric characters
- Path conflicts: Ensure target directories are writable
- Missing dependencies: Run `npm install`

### Debug Output

The CLI provides detailed feedback:

```bash
# Development server with file change notifications
12:34:56 Restarting: user.controller.ts changed

# Build process with environment info
  Arkos.js 1.0.0
  - Environments: .env, .env.local

  Creating an optimized production build...
```

## Integration with Project Workflow

### Development Workflow

1. **Start Development**: `arkos dev`
2. **Generate Components**: `arkos g c -m ModelName`
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

Add these scripts to your `package.json` (automatically added when project is created using `create-arkos cli`):

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

The built-in CLI complements the [scaffolding CLI](./create-arkos-cli):

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

The built-in CLI handles the repetitive aspects of development, allowing you to focus on building your application's unique features and business logic.
