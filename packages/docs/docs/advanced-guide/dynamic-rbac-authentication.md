---
sidebar_position: 4
title: Dynamic Authentication
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `Dynamic` RBAC Authentication

**Arkos** offers a **Dynamic RBAC (Database-Based)** system, ideal for applications that require flexible, runtime-configurable roles and permissions. This approach allows you to define and modify access controls directly through your database, making it perfect for larger applications where permission structures may evolve over time.

## Key Concepts

- **Database-Driven Permissions**: Unlike Static RBAC, permissions are stored in the database and can be modified at runtime without code changes.
- **Required Models**: The system uses dedicated models (`AuthRole`, `AuthPermission`, `UserRole`) to manage roles and permissions.
- **Resource-Action Control**: Permissions are defined as combinations of resources (models) and actions (View, Create, Update, Delete, or custom actions).
- **Model-Specific Public Routes**: You can still configure which routes are public using auth config files as Static Authentication, but role-based access is managed in the database.
- **Custom Actions**: Beyond standard CRUD operations, you can define custom actions in your permission model for use in custom routes and controllers.

## How It Works

1. **Required Models Setup**: You must implement specific models (`AuthRole`, `AuthPermission`, `UserRole`) in your Prisma schema.
2. **User Association**: Users are associated with roles through the `UserRole` relation model.
3. **Permission Checks**: **Arkos** automatically checks permissions from the database when requests are made.
4. **Public Routes**: Configure authentication requirements (public vs. authenticated) through auth config files same as Static Authentication.

## Setting Up Authentication Mode To Dynamic

```ts
// src/app.ts
import arkos from "arkos";

arkos.init({
  authentication: {
    mode: "dynamic",
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN,
      cookie: {
        secure: process.env.JWT_COOKIE_SECURE === "true",
        httpOnly: process.env.JWT_COOKIE_HTTP_ONLY !== "false",
        sameSite:
          (process.env.JWT_COOKIE_SAME_SITE as "lax" | "strict" | "none") ||
          undefined,
      },
    },
  },
});
```

:::tip
You can pass these values directly in your configuration, but it's a best practice to use environment variables. Arkos will automatically pick up the environment variables even without explicit configuration.
:::

### JWT Configuration Options

You can pass these options in your configuration (they override environment variables if both are set):

| Option            | Description                                                      | Env Variable           | Default                          |
| ----------------- | ---------------------------------------------------------------- | ---------------------- | -------------------------------- |
| `secret`          | The key used to sign and verify JWT tokens. **Required in prod** | `JWT_SECRET`           | —                                |
| `expiresIn`       | How long the JWT token stays valid (e.g., `'30d'`, `'1h'`)       | `JWT_EXPIRES_IN`       | `'30d'`                          |
| `cookie.secure`   | If `true`, the cookie is only sent over HTTPS                    | `JWT_COOKIE_SECURE`    | `true` in production             |
| `cookie.httpOnly` | If `true`, prevents JavaScript access to the cookie              | `JWT_COOKIE_HTTP_ONLY` | `true`                           |
| `cookie.sameSite` | Controls the SameSite attribute of the cookie                    | `JWT_COOKIE_SAME_SITE` | `"lax"` in dev, `"none"` in prod |

## Using Env Variables Instead

```ts
// src/app.ts
import arkos from "arkos";

arkos.init({
  authentication: {
    mode: "dynamic",
  },
});
```

```env
JWT_SECRET=my-jwt-secret
JWT_EXPIRES_IN=30d
JWT_COOKIE_SECURE=true
JWT_COOKIE_HTTP_ONLY=true
JWT_COOKIE_SAME_SITE=none
```

:::danger
Only activate authentication after defining your required models and creating at least one user with `isSuperUser` set to `true`. By default, Arkos will require authentication for all endpoint routes and will only allow super users to operate unless you define public routes using auth configs.
:::

## Required Database Models for Dynamic RBAC

To implement Dynamic RBAC, you need to define the following models in your Prisma schema:

```ts
model AuthRole {
  id          String          @id @default(uuid())
  name        String          @unique
  permissions AuthPermission[]
  users       UserRole[]
}

// This enum options must be in lower-case as Arkos expects
enum AuthPermissionAction {
  View
  Create
  Update
  Delete
  GenerateReport // custom action
}
// You increase this to add more and more actions
// according to your application:
// e.g. GenerateReport, DownloadReport it is up to you

model AuthPermission {
  id        String               @id @default(uuid())

  // any resource name to be protected
  // for built-in prisma models api endpoints must be
  // modal name Database models name in kebab-case
  resource  String
  action    AuthPermissionAction @default(View) // When using sqlite, this can be a plain String
  roleId    String
  role      AuthRole @relation(fields: [roleId], references: [id])

  @@unique([resource, action, roleId])
}

model UserRole {
  id      String    @id @default(uuid())
  userId  String
  user    User      @relation(fields: [userId], references: [id])
  roleId  String
  role    AuthRole  @relation(fields: [roleId], references: [id])

  @@unique([userId, roleId])
}

model User {
  id                 String    @id @default(uuid())
  username           String    @unique
  password           String
  passwordChangedAt  DateTime?
  lastLoginAt        DateTime?
  isSuperUser        Boolean   @default(false)
  isStaff            Boolean   @default(false)
  deletedSelfAccountAt DateTime?
  isActive           Boolean   @default(true)
  roles              UserRole[] // Association with roles through UserRole model
  // other fields for your application
}
```

:::info
You can add fields like `createdAt`, `updatedAt`, `updatedAt` and other fields all according to your application requirements. For fields that are not required by **Arkos** you can interact through the interceptor middlewares. see [Authentication Interceptor Middlewares](/docs/guide/authentication-system/authentication-interceptor-middlewares) and see [General Interceptor Middlewares](/docs/core-concepts/interceptor-middlewares).
:::

:::tip
You can add more actions on the `AuthPermissionAction` enum if you wish to use this also in your own custom routers, for example protect the routes to generate reports or something of your own application business logic.
:::

Notice that even though **Arkos** uses this by default to control the access of the auto generated api endpoints you can use it on your own routes through the `authService.handleAccessControl` in order to leverage the `Arkos Dynamic Authentication` in your own custom api endpoints, see [Adding Authentication In Custom Routes](/docs/guide/adding-custom-routers#adding-authentication-in-custom-routers).

### Managing Authentication For AuthRole, AuthPermission, UserRole

Treat them as normal prisma models although these are used for authentication by **Arkos**, define the authentication also through database and make it private or public through auth config files (Most of the time will be private, maybe never public).

### Understanding the Dynamic RBAC Models

#### `AuthRole`

- Represents a role that can be assigned to users
- Contains a unique name identifier
- Links to permissions and users through relationships

#### `AuthPermission`

- Defines what actions can be performed on specific resources
- `resource`: Corresponds to your Prisma model names in kebab-case (e.g., `user`, `blog-post`) or any other resource you would like to protect.
- `action`: Must be one of the PascalCase values: `View`, `Create`, `Update`, `Delete` for your prisma models or any other action you want to your own added routers.
- Special resource `file-upload` is available for file upload permission control (see [File Uploads Authentication](/docs/advanced-guide/file-uploads-authentication))

#### `UserRole`

- Junction table connecting users to roles (many-to-many relationship)
- Allows a user to have multiple roles or you can change to be only one
- Allows roles to be assigned to multiple users
- You can add for example the attributedBy field to track who attribute a given role to whom.

#### `User`

- The User model remains similar to the Static RBAC version
- Instead of having a direct `role` or `roles` field as `Enum` or `String`, it relates to roles through the `UserRole` model
- You can also change between `roles` and `UserRole[]` to `role` and `UserRole` to use single based role

## Understanding The User Model Fields

The User model fields serve the same purposes as in Static RBAC:

#### `id: String`

- Unique user identifier, typically a UUID

#### `username: String`

- Primary login identifier with unique constraint
- Can be changed to others like email and customized to work in authentication via the `login.allowedUsernames` option

```ts
// src/app.ts
import arkos from "arkos";

arkos.init({
  authentication: {
    mode: "dynamic",
    login: {
      allowedUsernames: ["email", "phones.some.number"],
    }, // Use email, some phones number field for authentication
    // other configs
  },
});
```

Dive deep about allowed username fields and also see how to login with nested fields from user model on this guide [Example Changing The Username Field Guide](/docs/guide/authentication-system/sending-authentication-requests#example-changing-the-username-field).

#### `password: String`

- Stores the hashed user password

#### `passwordChangedAt: DateTime?`

- Used to invalidate JWT tokens after password changes
- Allows to prevent JWT tokens generated before not to work

#### `lastLoginAt: DateTime?`

- Tracks the user's most recent login time

#### `isSuperUser: Boolean`

- When `true`, grants full system access regardless of roles or permissions
- Reserved for system administrators

#### `isStaff: Boolean`

- Indicates users who can access admin areas in your frontend
- Does not directly affect backend permissions (just recommended)

#### `deletedSelfAccountAt: DateTime?`

- Tracks if/when a user has voluntarily deleted their account
- Supports soft deletion functionality

#### `isActive: Boolean`

- Controls whether the user can access the system
- When `false`, prevents all API actions

## Creating Auth Configs for Dynamic RBAC

With Dynamic RBAC, auth config files serve a more limited purpose - they only control which routes require authentication (public vs. private). The role-based permissions are managed in the database.

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```ts
// src/modules/post/post.auth-configs.ts
import { AuthConfigs } from "arkos/auth";

const postAuthConfigs: AuthConfigs = {
  authenticationControl: {
    View: false, // Public endpoint: no authentication required to View
    Create: true, // Authentication required to Create (default behavior)
    Update: true, // Authentication required to Update (default behavior)
    Delete: true, // Authentication required to Delete (default behavior)
    ExportReport: true, // Custom action requiring authentication
  },
  // accessControl is not used in dynamic mode since permissions are in the database
};

export default postAuthConfigs;
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
// src/modules/post/post.auth-configs.js
const postAuthConfigs = {
  authenticationControl: {
    View: false, // Public endpoint: no authentication required to View
    Create: true, // Authentication required to Create (default behavior)
    Update: true, // Authentication required to Update (default behavior)
    Delete: true, // Authentication required to Delete (default behavior)
    ExportReport: true, // Custom action requiring authentication
  },
  // accessControl is not used in dynamic mode since permissions are in the database
};

module.exports = postAuthConfigs;
```

</TabItem>
</Tabs>

### Explanation:

- **✅ authenticationControl**: Determines which actions require authentication. Setting an action to `false` makes it publicly accessible.
- **❌ accessControl**: Not used in Dynamic RBAC mode as permissions are managed in the database.

## Implementing Custom Actions in Custom Routers

Similar to Static RBAC, you can define custom actions beyond the standard CRUD operations in your Dynamic RBAC system. However, with Dynamic RBAC, these permissions are stored in the database rather than in configuration files.

```ts
// src/modules/post/post.custom-routes.ts
import { Router } from "express";
import { authService } from "arkos/services";
import { catchAsync } from "arkos/error-handler";

const router = Router();

// Export posts endpoint with custom action authentication
router.get(
  "/api/posts/export-report",
  authService.authenticate, // First authenticate the user
  // Note: handleAccessControl receives the action, resource, and roles directly
  authService.handleAccessControl(
    "ExportReport", // The custom action name
    "post", // The model/resource name
    [] // Empty array as permissions are checked from the database in dynamic mode
  ),
  exportReportController
);

export default router;
```

> **Important**: When using `handleAccessControl` with Dynamic RBAC, you pass the action and resource names, but the roles array can be empty since permissions are retrieved from the database. The function receives the values directly, not wrapped in an object.

For more detailed information on implementing authentication in custom routers, see the guide on [Adding Authentication to Custom Routers](/docs/guide/adding-custom-routers#adding-authentication-in-custom-routers).

## Checking Available Resources

**Arkos** provides an endpoint to help frontend developers retrieve the list of all available resources when building permission management interfaces:

```
GET /api/available-resources
```

This endpoint returns a list of all resources (model names) available in your application that can be used when creating permissions. For more details, see [Checking Available Resources Guide](/docs/core-concepts/endpoints-auto-generation#checking-available-resources).

## Benefits of Dynamic RBAC:

- **Runtime Configuration**: Permissions can be modified without code changes or redeployment
- **Flexible Permission Structure**: Easy to adapt to changing business requirements
- **Centralized Management**: All permissions are stored in one place (the database)
- **UI Integration**: Build admin interfaces to manage roles and permissions
- **Scalability**: Well-suited for large applications with complex permission needs
- **Custom Actions Support**: Define application-specific actions beyond standard CRUD operations

## When to Use Dynamic RBAC:

Dynamic RBAC is ideal for:

- Large applications with evolving permission requirements
- Systems where non-developers need to manage permissions
- Applications where new resources are frequently added
- Multi-tenant systems with custom role configurations
- Applications requiring custom actions specific to business processes

## Future Enhancements

In upcoming releases, Arkos will support:

- **Row-Level Policies**: Define permissions at the database row level (e.g., authors can only edit their own posts)
- **Advanced Permission Rules**: Create more complex permission logic beyond basic CRUD operations

Now you can start sending requests to the authentication endpoints. Read [Sending Authentication Requests Guide](/docs/guide/authentication-system/sending-authentication-requests) to learn more.
