---
sidebar_position: 3
title: Static Authentication
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `Static` RBAC Authentication

**Arkos** offers a **Static RBAC (Config-Based)** system, ideal for predefined roles and permissions where access control is managed through configuration files. It's a simple yet flexible approach for setting up authentication and role-based access in your application.

### Key Concepts

- **Roles & Permissions**: Users can be assigned one or more roles (strings or enums) within the User model through the `role` field for single role or `roles` for multiple roles. Each role determines what actions the User is allowed to perform.
- **Model-Specific Auth Config**: Each model can have its own access control and authentication configuration, allowing granular control over which actions require authentication and which roles can perform them.
- **Custom Actions**: Beyond standard CRUD operations, you can define custom actions in your auth configs for use in custom routes and controllers.

### How It Works

1. **User Model Required Fields**: To use **Arkos** Built-in Auth System (ABAS) you must define a User model and it must contain some required fields, [see here](#defining-the-user-model-for-static-authentication).
2. **User Roles**: The `role` or `roles` fields in the **User** model can be a string or an enum, representing a single role (e.g., `Admin`) or multiple roles (e.g., `Admin`, `editor`).
3. **Auth Config Files**: Each model can have a custom authentication configuration file. This file defines which actions require authentication and which roles can perform them.

## Setting Up Authentication Mode To Static

```ts
// src/app.ts
import arkos from "arkos";

arkos.init({
  authentication: {
    mode: "static",
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
    mode: "static",
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
Only activate authentication after defining your User model and at least Create one User with `isSuperUser` set to `true`, because **Arkos** by default will required authentication for all endpoints routes and only allowing super users to operate unless you define it using auth configs mentioned above.
:::

### Defining The User Model For Static Authentication

As stated before, to use the **Arkos Built-in Auth System** in Static RBAC mode you must defined a User model with some pre-defined and required fields in order for it work.

```ts
enum UserRole { // Change to your own roles
  Admin
  User
}

model User {
  id                    String    @id @default(uuid())
  username              String    @unique
  password              String
  passwordChangedAt     DateTime?
  lastLoginAt           DateTime?
  isSuperUser           Boolean   @default(false)
  isStaff               Boolean   @default(false)
  deletedSelfAccountAt   DateTime?
  isActive              Boolean   @default(true)
  role                  UserRole  @default(User)
  // add more User fields if needed
}
```

### Understanding The User Model

#### `id: String`

- Uses UUID generation for unique User identification
- `@id` marks it as the primary identifier
- `@default(uuid())` automatically generates a unique identifier
- Is up to the prisma provider use are using

#### `username: String`

- Serves as the primary login identifier
- `@unique` constraint ensures no duplicate usernames
- Flexible design allows customization to email, phone, or other identifiers. by passing `login.allowedUsernames` in `arkos.init()` under authentication field.

```ts
// src/app.ts
import arkos from "arkos";

arkos.init({
  authentication: {
    mode: "static",
    login: {
      allowedUsernames: ["email"], // If wants to use User email field for login
    },
  },
});
```

Dive deep about allowed username fields and also see how to login with nested fields from User model on this guide [Example Changing The Username Field Guide](/docs/guide/authentication-system/sending-authentication-requests#example-changing-the-username-field).

#### `password: String`

- Stores the User's authentication credential
- Is hashed by default with bcrypt (implicit for security reasons)
- Critical for User authentication process

#### `passwordChangedAt: DateTime?`

- Used to invalidated a JWT Token after User changes password
- Useful for:
  - Security audits
  - Forcing password resets
  - Tracking recent password modifications

#### `lastLoginAt: DateTime?`

- Timestamp tracking User's most recent login
- Allows tracking of User authentication events

#### `isSuperUser: Boolean`

- Provides a global override for access controls
- When `true`, grants full system access regardless of role
- Typically reserved for system administrators
- Default is `false` for standard security

#### `isStaff: Boolean`

- Is just a way to differantiate people who can acess Admin area in your frontend as nothing to do with the backend
- When `true`, you can handle your frontend acess control
- `true` Typically reserved for staff people that can acess Admin area

#### `deletedSelfAccountAt: DateTime`

- Tracks if a User has voluntarily deleted their account and when
- Provides soft account deletion mechanism
- Default is `null`

#### `isActive: Boolean`

- Determines overall account accessibility
- When `false`, completely prevents User from performing any API actions
- Provides an administrative disable mechanism
- Default is `true` for normal account operation

#### `role: UserRole`

- Defines User's permission level
- Uses an enum for predefined role categories or can be a string
- You can any role based on your application
- Supports potential expansion to multiple roles.

```ts
enum UserRole { // Change to your own roles
  Admin
  User
}

model User {
  // other User fields
  roles               UserRole[]  @default(User)
  // more User fields
}
```

### Design Considerations

- Flexible authentication approach
- Comprehensive access control mechanisms
- Built-in security features
- Supports various authentication scenarios

### Potential Enhancements (Make On Your Own)

- Add last login timestamp
- Implement account lockout mechanisms
- Create detailed audit logging
- Support multi-factor authentication fields

:::tip
For the potential enhancements you can implement on your own into your applications as suggested above, or if you would like to see this inside **Arkos** just drop an issue explaining this or open an PR if you want to implement the code inside **Arkos**. [Github Issues](https://github.com/uanela/arkos/issues)
:::

Now that you have authentication and authorization all set up, you can explore the available auth route endpoints when using `Static RBAC` [here](/docs/core-concepts/built-in-authentication-system#pre-defined-authentication-routes). And also check about sending requests to these endpoints [here](/docs/guide/authentication-system/sending-authentication-requests).

## Using Auth Config To Customize Endpoint Behavior

By default in **Static-RBAC Auth** **Arkos** will require authentication in all endpoints and will only allow the User with the field `isSuperUser` set to `true` be able to operate on the API, and in most of the scenarios will want to customize your endpoint access control using the role.

Hence **Arkos** provides a simple and intuitive way to customize access control through Static Role-Based Acess Control using `model-name.auth-configs.ts` files.

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```ts
// src/modules/post/post.auth-configs.ts
import { AuthConfigs } from "arkos/auth";

const postAuthConfigs: AuthConfigs = {
  authenticationControl: {
    View: false, // Public endpoint: no authentication required to View
    Create: true, // Authenticated users can Create posts (default behavior)
    // You can add custom actions for authentication control
    Export: true, // Authentication required for export operation
  },
  accessControl: {
    Delete: ["Admin"], // Only 'Admin' role can Delete a post
    // You can define custom actions beyond CRUD operations
    Export: ["Admin", "Analyst"], // Custom action for exporting posts
    BulkApprove: ["Admin", "Moderator"], // Custom action for bulk approval
  },
};

export default postAuthConfigs;
```

</TabItem>
<TabItem value="js" label="JavaScript" >

```js
// src/modules/post/post.auth-configs.ts
const postAuthConfigs = {
  authenticationControl: {
    View: false, // Public endpoint: no authentication required to View
    Create: true, // Authenticated users can Create posts (default behavior)
    // You can add custom actions for authentication control
    Export: true, // Authentication required for export operation
  },
  accessControl: {
    Delete: ["Admin"], // Only 'Admin' role can Delete a post
    // You can define custom actions beyond CRUD operations
    Export: ["Admin", "Analyst"], // Custom action for exporting posts
    BulkApprove: ["Admin", "Moderator"], // Custom action for bulk approval
  },
};

module.exports = postAuthConfigs;
```

</TabItem>
</Tabs>

### Standard and Custom Actions:

- **Standard CRUD Actions**: Arkos automatically applies your configuration for the standard "Create", "Update", "Delete", and "View" actions.
- **Custom Actions**: You can define additional actions like "Export", "BulkApprove", etc. in your auth configs. However, **these custom actions must be implemented in custom routers**, as Arkos will not automatically use them.

### Implementing Custom Actions in Custom Routers:

```ts
// src/modules/post/post.custom-routes.ts
import { Router } from "express";
import { authService } from "arkos/services";
import { catchAsync } from "arkos/error-handler";

const router = Router();

// Export posts endpoint with custom action authentication
router.get(
  "/api/posts/export",
  authService.authenticate, // First authenticate the user
  // Note: handleAccessControl receives the roles array directly, not an object
  authService.handleAccessControl(
    "Export", // The custom action name
    "post", // The model name
    ["Admin", "Analyst"] // Roles that can perform this action
  ),
  exportPostsController
);

// Bulk approve posts endpoint
router.post(
  "/api/posts/bulk-approve",
  authService.authenticate,
  authService.handleAccessControl("BulkApprove", "post", [
    "Admin",
    "Moderator",
  ]),
  bulkApprovePostsController
);

export default router;
```

> **Important**: When using `handleAccessControl`, note that it receives the allowed roles directly as an array (e.g., `["Admin", "Analyst"]`), not as an object containing `accessControl`. This is different from how you define them in the auth config files.

For more detailed information on implementing authentication in custom routers, see the guide on [Adding Authentication to Custom Routers](/docs/guide/adding-custom-routers#adding-authentication-to-custom-routers).

### Explanation:

- **authenticationControl**: Specifies whether authentication is required for each action. For example, the `View` action is publicly accessible (no authentication required), while `Create` requires authentication (this is the default behavior).
- **accessControl**: Defines which roles can perform specific actions. The `Delete` action is restricted to users with the `Admin` role. You can specify multiple roles, for example, `['Admin', 'moderator']`, to grant permissions to more than one role.

### Benefits:

- **Single and Multiple Roles**: Static RBAC can handle both single roles (e.g., just `Admin`) and multiple roles (e.g., `Admin`, `moderator`, `editor`), providing flexibility in access control.
- **Simple Configuration**: No need for a complex setup—just configure the roles and permissions directly in the configuration files.
- **Customizable Access**: Define different authentication and access rules for each model in your application.
- **Custom Actions**: Extend beyond basic CRUD operations with custom actions specific to your business needs.

### When to Use Static RBAC:

Static RBAC is perfect for applications with a well-defined set of roles that don't change often. It's ideal for systems where access control is based on preconfigured roles and permissions, offering simplicity and clarity in managing authentication.

### Alternatives

See [Dynamic Role-Based Acess Control Authentication Guide](/docs/advanced-guide/dynamic-rbac-authentication).

Now you can start sending request to the authentication endpoints, read [Sending Authentication Requests Guide](/docs/guide/authentication-system/sending-authentication-requests) to learn more.
