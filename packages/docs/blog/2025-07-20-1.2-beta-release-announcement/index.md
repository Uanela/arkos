---
slug: 1.2-beta
title: Announcing Arkos.js 1.2-beta Release
authors: [uanela]
tags: [arkosjs, superm7, webpropax]
---

Today I am excited to share the newest beta version of Arkos.js the 1.2-beta, an minor update that at the same times brings with it more efficency, way better developer experience and automation on repetitive tasks.

<!-- truncate -->

Why did I not started from 0.x? I am just following Larry Ellison philosophy, no one buys or uses the first version so the first official release will be v2.0, but until there those small minor updates will give you a good taste of what is comming.

## What Is New?

1. New `built-in cli` for quickly generate Arkos and Express components like routers, controllers, services and other arkos.js own domain components.
2. Automatic restart on creating and deleting files, so that Arkos.js can load the modules that it auto-loads.
3. Simplified prisma query options control through new options like find (findMany, findOne), save (createOne, updateOne, createMany, updateMany) and many others.
4. New file uploads interceptor middlewares to control before and after request processing flows.
5. New api endpoint for auto updating uploaded files.
6. Naming conventions made easy from `model.prisma-query-options.{ts|js}` to `model.query.{ts|js}`, from `model.auth-configs.{ts|js}` to `model.auth.{ts|js}`, for better DX.
7. New `authService.isPaswordHashed` method.
8. New `create-arkos` cli to quickly scaffold an Arkos.js project.
9. Exposed running arkos configuration passed when calling `arkos.init()`.

## How To Update

As a simple minor update towards v2.0, to get to the latest v1.2 version of Arkos on an exsting project you can simply install it through:

```bash
npm install arkos@latest
```

Or if you want to start a new project you can simply use the new `create-arkos` cli to quickly scaffold your new project:

```
npm create arkos@latest my-project
```

And you will be ready to go and get a taste of this new version.

## Newest Funcionalities On Practice

Let's now dive a little bit deeper into this new functionalities so that you can have a more in depth idea of how powerful this new Arkos.js version is.

### 1. New Built-in CLI

As stated throughout the Arkos.js documentation, its main goal is to speed the development of scalable and secure RESTful APIs. Others Express applications are possible, but the main goal is focused on RESTful APIs. With this said, I've decided to take one step further in pursuing this goal by allowing developers to quickly generate components like:

#### 1.1. Controllers

```bash
npx arkos generate controller --model post
```

Or shorthand (Just to ease your DX):

```bash
npx arkos g c -m post
```

By running this, Arkos will generate a controller extending the BaseController under `src/modules/post/post.controller.{ts|js}`.

**Output:**

```typescript
import { BaseController } from "arkos/controllers";

class PostController extends BaseController {
    constructor() {
        super("post");
    }
}

const postController = new PostController();

export default postController;
```

See more about the `BaseController` class on practice at [The BaseController Class Guide](/docs/api-reference/the-base-controller-class).

#### 1.2. Routers

```bash
npx arkos generate router --model post
```

Or shorthand:

```bash
npx arkos g r -m post
```

This generates a custom router for your model under `src/modules/post/post.router.{ts|js}` with authentication and access control ready to use.

**Output:**

```typescript
import { Router } from "express";
import { authService } from "arkos/services";
import postController from "./post.controller";

const postRouter = Router();

postRouter.post(
    "/custom-endpoint", // resolves to /api/posts/custom-endpoint
    authService.authenticate,
    authService.handleAccessControl("CustomAction", "post"),
    postController.someHandler
);

export default postRouter;
```

You can see more about `adding custom routers` on practice at [Adding Custom Routers Guide](/docs/guide/adding-custom-routers).

#### 1.3. Services

```bash
npx arkos generate service --model post
```

Or shorthand:

```bash
npx arkos g s -m post
```

Generates a service class extending BaseService under `src/modules/post/post.service.{ts|js}` for custom business logic.

**Output:**

```typescript
import { prisma } from "../../utils/prisma";
import { BaseService } from "arkos/services";

class PostService extends BaseService<typeof prisma.post> {
    constructor() {
        super("post");
    }

    // Add your custom service methods here
}

const postService = new PostService();

export default postService;
```

See more about the `BaseService` by reading [The BaseService Class Guide](/docs/api-reference/the-base-service-class).

#### 1.4. Interceptor Middlewares

```bash
npx arkos generate middlewares --model post
```

Or shorthand:

```bash
npx arkos g m -m post
```

Creates middleware functions for all CRUD operations under `src/modules/post/post.middlewares.{ts|js}`. Following Arkos's main goal of reducing boilerplate, you no longer need the `catchAsync` wrapper - Arkos adds it automatically.

If you are completely new to Arkos.js, you can understand more about what `Interceptor Middlewares` really are by reading [Interceptors Middlewares Guide](/docs/core-concepts/interceptor-middlewares).

**Output:**

```typescript
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";

// export const beforeCreateOne = async (
//   req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction
// ) => {
//   // Your logic here
//   next();
// };

// export const afterCreateOne = async (
//   req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction
// ) => {
//   // Your logic here
//   next();
// };

// export const beforeFindOne = async (
//   req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction
// ) => {
//   // Your logic here
//   next();
// };

// export const afterFindOne = async (
//   req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction
// ) => {
//   // Your logic here
//   next();
// };

// Similar patterns for: FindMany, UpdateOne, UpdateMany, DeleteOne, DeleteMany, CreateMany
```

**Special Cases:**

For auth models (`--model auth`), it generates auth-specific middlewares:

```typescript
// beforeLogin, afterLogin, beforeLogout, afterLogout
// beforeSignup, afterSignup, beforeGetMe, afterGetMe
// beforeUpdatePassword, afterUpdatePassword
```

For file upload models (`--model fileUpload`), it generates file-specific middlewares:

```typescript
// beforeUploadFile, afterUploadFile, beforeUpdateFile, afterUpdateFile
// beforeDeleteFile, afterDeleteFile, beforeFindFile
```

#### 1.5. Prisma Query Options

```bash
npx arkos generate query-options --model post
```

Or shorthand:

```bash
npx arkos g q -m post
```

Generates Prisma query configuration under `src/modules/post/post.query.{ts|js}` to customize database queries for each operation.

**Output:**

```typescript
import { prisma } from "../../utils/prisma";
import { PrismaQueryOptions } from "arkos/prisma";

const postQueryOptions: PrismaQueryOptions<typeof prisma.post> = {
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
};

export default postQueryOptions;
```

For auth models, it generates auth-specific query options:

```typescript
const authQueryOptions: AuthPrismaQueryOptions<typeof prisma.auth> = {
    getMe: {},
    updateMe: {},
    deleteMe: {},
    login: {},
    signup: {},
    updatePassword: {},
};
```

See more about prisma query options concept reading [Custom Prisma Query Options Advanced Guide](/docs/guide/custom-prisma-query-options).

#### 1.6. Endpoint Authentication Configurations

```bash
npx arkos generate auth-config --model post
```

Or shorthand:

```bash
npx arkos g a -m post
```

Creates authentication and authorization configurations under `src/modules/post/post.auth.{ts|js}` to control access to your endpoints, read more about this topic at [Static Role-Based Access Control Guide](/docs/core-concepts/authentication-system#using-auth-config-to-customize-endpoint-behavior).

**Output:**

```typescript
import { AuthConfigs } from "arkos/auth";

const postAuthConfigs: AuthConfigs = {
    authenticationControl: {
        // Create: true,
        // Update: true,
        // Delete: true,
        // View: false,
    },
    // Only when using Static RBAC
    accessControl: {
        // Create: ["Admin"],
        // Update: ["Admin", "Manager"],
        // Delete: ["Admin"],
        // View: ["User", "Admin", "Guest"],
    },
};

export default postAuthConfigs;
```

#### CLI Features

- **Smart Detection**: Automatically detects TypeScript vs JavaScript based on your project configuration
- **File Existence Checking**: Checks if related files exist and adjusts imports accordingly
- **Model Naming**: Supports multiple naming conventions (camelCase, PascalCase, kebab-case)
- **Special Model Handling**: Provides specialized templates for `auth` and `fileUpload` models
- **Consistent Structure**: All generated files follow Arkos.js conventions and best practices

#### Usage Tips

1. **Generate in Order**: Start with controllers and services, then add routers and middlewares
2. **Customize After Generation**: All generated files are templates - modify them to fit your specific needs
3. **Use Shorthand**: Save time with shortened commands (`g c -m` instead of `generate controller --model`)
4. **Model Names**: Use singular form for model names (e.g., `post` not `posts`)

This CLI dramatically reduces the time needed to scaffold new features in your Arkos.js application, allowing you to focus on implementing your business logic rather than writing boilerplate code.

You can a more in depth understanding this new `built-in cli` by reading it's dedicated guide [Clicking Here](/docs/arkos-cli/then-built-in-cli).

### 2. New File Watcher For Hot Reload

Now Arkos.js will automatically watch your project files and restarts the development server when changes are detected. The watcher monitors:

:::info

On previous versions Arkos used to relay simply on `ts-node-dev` and `nodemon` but there was not optimized watching system when new files were added or some files where delete, nor watchers for .env files and package.json so sometimes to trigger Arkos.js to load a new module for example you needed to manually restart the server on your terminal.

:::

File creation under the src directory
File deletion under the src directory
Environment file changes (.env, .env.local, .env.development, etc.)
Package.json changes
Configuration file changes (tsconfig.json, arkos.config.\*)

When any of these changes occur, you'll see a timestamped restart message in your terminal:

```bash
[INFO] 12:34:56 Restarting: src/modules/user/user.controller.ts has been created
[INFO] 12:35:12 Restarting: environment files changed
[INFO] 12:35:23 Restarting: package.json has been modified
```

This ensures your application always runs the latest version of your code without any manual intervention.

### 3. Simplified Prisma Query Options

Arkos now provides simplified query options that group related operations together, making it easier to configure your database queries:

- **`find`** - Controls both `findMany` and `findOne` operations
- **`save`** - Controls `createOne`, `updateOne`, `createMany`, and `updateMany` operations
- **`create`** - Controls both `createOne` and `createMany` operations
- **`update`** - Controls both `updateOne` and `updateMany` operations
- **`delete`** - Controls both `deleteOne` and `deleteMany` operations
- **`saveOne`** - Specifically for `createOne` and `updateOne` operations
- **`saveMany`** - Specifically for `createMany` and `updateMany` operations

These wrapper options simplify query configuration by reducing repetition when you want the same settings across related operations.

### 4. File Upload Interceptor Middlewares

New middleware system that provides complete control over the file upload request processing flow. These interceptors allow you to execute custom logic before and after each file operation.

**Available Interceptors:**

- `beforeUploadFile` / `afterUploadFile` - Control file upload flow
- `beforeUpdateFile` / `afterUpdateFile` - Control file update flow
- `beforeDeleteFile` / `afterDeleteFile` - Control file deletion flow
- `beforeFindFile` - Control file serving flow

The middleware system automatically chains your custom interceptors with the core file upload controller methods, giving you full flexibility to add validation, logging, transformations, or any custom business logic.

Have a good understanding by reading the dedicated section on [File Upload Interceptor Middlewares Section](/docs/core-concepts/interceptor-middlewares#file-upload-interceptor-middlewares).

### 5. Auto-Update File API Endpoint

New PATCH endpoint for updating existing files: `PATCH /api/uploads/:fileType/:fileName`

This endpoint handles the complete file replacement workflow:

- Automatically deletes the old file (if it exists)
- Uploads and processes the new file
- Supports both single and multiple file uploads
- Works with all file types (images, videos, documents, general files)
- Includes proper error handling for missing old files

The endpoint intelligently handles different URL patterns and provides appropriate success messages based on whether it's replacing an existing file or uploading new ones. see other file upload endpoint at [File Upload Guide](docs/core-concepts/file-uploads#basic-usage).

### 6. Simplified Naming Conventions

Streamlined file naming for better developer experience:

**Query Options:**

- Old: `model.prisma-query-options.{ts|js}`
- New: `model.query.{ts|js}`

**Auth Configurations:**

- Old: `model.auth-configs.{ts|js}`
- New: `model.auth.{ts|js}`

:::warning important
You mix those naming convention but on different modules on your Arkos.js application, for example there can have `user.prisma-query-options`, `post.query.ts`, `another-model.prisma-query-options` and so on.

But there must not be `user.prisma-query-options.ts` and `user.query.ts` at the same folder where Arkos.js expects one of them. If this happens Arkos will throw an error `Cannot use both user.prisma-query-options.ts and user.query.ts at once, please choose only one name convention.`, the same applies for `Authentication Configuration files`, this happens because there is backward compatibility to ease adoption of this new naming conventions on existing projects.
:::

### 7. New AuthService Password Validation

Added `authService.isPasswordHashed` method to prevent double password encryption in auto-generated endpoints. This method checks if a password is already hashed before applying encryption, solving the common debugging issue where passwords were being encrypted multiple times, causing authentication failures.

**Why?** Once I simply exported my users data on local development, and then after changing what I wanted I decided to add them again and simply added it through the `createMany endpoint` for users, and guess what happens the password were hashed again (to an error), but it took me some good valuable minutes to find out.

:::info disclaimer
Bear in mind if you send and hashed password through the endpoints or even use `createOne` or `createMany` methods from a class extending `BaseService`, this password must have been hashed using `authService.hashPassword` otherwise it may not work with the built-in authentication system.
:::

### 8. New `create-arkos` CLI For Scaffolding

As the goal is to remove friction when developing scalable and secure RESTful API's, there was a step that wasn'treceiving the needed attention, the step is `starting a new Arkos.js project` this pain was felt among the earlier adopters when we started to create different projects using Arkos.js, hence the idea of creating an CLI to facilitate scaffolding came to live.

```bash
npm create arkos@latest my-project-name
```

By running this you will quickly create an Arkos.js project with all setup just for you start adding features and not worry about repetitive tasks of setting up new project.

#### Interactive Setup

The CLI will guide you through an interactive setup process:

```bash
> create-arkos@1.0 dev

? Would you like to use TypeScript? No
? What db provider will be used for Prisma? mongodb
? Would you like to set up Validation? Yes
? Choose validation library: class-validator
? Would you like to set up Authentication? Yes
? Choose authentication type: static
? Would you like to use authentication with Multiple Roles? Yes
? Choose default username field for login: email
```

#### Generated Project Structure

```
my-arkos-project/
├── prisma/
│   │── schema.prisma          # Database schema with auth tables (if dynamic)
│   └── user.prisma            # User schema with all Arkos.js auth fields
├── src/
│   ├── utils/
│   │   └── prisma/
│   │       └── index.js       # Prisma client configuration
│   ├── app.js                 # Main application file
│   ├── arkos.config.js        # Arkos.js configurations
│   └── package.json           # Dependencies and scripts
├── .env                       # Environment variables
├── .gitignore                 # Git ignore rules
├── package.json               # Project configuration
```

By using this new cli `create-arkos` you can quickly scaffold a new ready to go Arkos.js project, this way I enforce once again the main goal that is to simply the development of a secure and scalableRESTful API with minial configuration, allowing developers to focus on what really matters for the business logic. you can read more about this new incredible cli at [`create-arkos Cli Guide`](/docs/cli/create-arkos).

### 9. Exposed Running ArkosConfig

I do not know exactly for what use case you may need this, but there way times that I needed this in one project so just thought it could be helpful for the community to have access to it, you can access the underlying running `ArkosConfig`, currently passed to `arkos.init()`, by following example below:

```ts
import { getArkosConfig } from "arkos";
```

Just call the `getArkosConfig` function inside another function that will not execute at the same time/tick as the `arkos.init()`, basically do not call both at the same level because you will have no access to nothing yet.

## What Is Next?

- Add more templates for `create-arkos` cli.
- Add more componentes into the `built-in cli` to generate components like dtos, schemas and more.
- Fully separate configurations to go at `arkos.init()` from those from `arkos.config.{js|ts}`
- Add strict mode when using validation (requiring dtos/schemas in all endpoints).
- Improve `create-arkos` cli scaffolding process to match community feedback.
