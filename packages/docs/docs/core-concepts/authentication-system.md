---
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Authentication System

Arkos provides a comprehensive JWT-based authentication system with Role-Based Access Control (RBAC). This guide covers the complete setup and usage, starting with Static RBAC and showing how to upgrade to Dynamic RBAC when needed.

## JWT Configuration & Environment Setup

First, activate authentication in your Arkos application:

```typescript
// src/app.ts
import arkos from "arkos";

arkos.init({
    authentication: {
        mode: "static", // Start with static, upgrade to dynamic later if needed
        sendAccessTokenThrough: "both", // Options: "cookie-only", "response-only", "both"
    },
});
```

### JWT Configuration Options

You can configure JWT settings through environment variables (recommended) or directly in code:

**Environment Variables (Recommended):**

```env
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=30d
JWT_COOKIE_SECURE=true
JWT_COOKIE_HTTP_ONLY=true
JWT_COOKIE_SAME_SITE=none
```

**Direct Configuration:**

```typescript
arkos.init({
    authentication: {
        mode: "static",
        sendAccessTokenThrough: "both",
        jwt: {
            secret: process.env.JWT_SECRET,
            expiresIn: process.env.JWT_EXPIRES_IN || "30d",
            cookie: {
                secure: process.env.JWT_COOKIE_SECURE === "true",
                httpOnly: process.env.JWT_COOKIE_HTTP_ONLY !== "false",
                sameSite:
                    (process.env.JWT_COOKIE_SAME_SITE as
                        | "lax"
                        | "strict"
                        | "none") || undefined,
            },
        },
    },
});
```

### JWT Configuration Reference

| Option            | Description                                                     | Env Variable           | Default                      |
| ----------------- | --------------------------------------------------------------- | ---------------------- | ---------------------------- |
| `secret`          | Key used to sign and verify JWT tokens (required in production) | `JWT_SECRET`           | —                            |
| `expiresIn`       | Token validity duration (e.g., '30d', '1h')                     | `JWT_EXPIRES_IN`       | '30d'                        |
| `cookie.secure`   | Only send cookie over HTTPS                                     | `JWT_COOKIE_SECURE`    | true in production           |
| `cookie.httpOnly` | Prevent JavaScript access to cookie                             | `JWT_COOKIE_HTTP_ONLY` | true                         |
| `cookie.sameSite` | SameSite cookie attribute                                       | `JWT_COOKIE_SAME_SITE` | "lax" in dev, "none" in prod |

:::warning Production Security
Always set a strong `JWT_SECRET` in production (Otherwise Arkos will throw an error on login attempts when no JWT Secret is set under production). Never commit secrets to version control.
:::

## User Model Setup - Static RBAC Foundation

To use Arkos authentication, you must define a User model with specific required fields:

```typescript
// Define your roles (enum for most databases, string for SQLite)
enum UserRole {
  Admin
  Editor
  User
}

model User {
  // Required authentication fields
  id                    String    @id @default(uuid())
  username              String    @unique
  password              String
  passwordChangedAt     DateTime?
  lastLoginAt           DateTime?
  isSuperUser           Boolean   @default(false)
  isStaff               Boolean   @default(false)
  deletedSelfAccountAt  DateTime?
  isActive              Boolean   @default(true)

  // Role assignment (choose one approach)
  role                  UserRole  @default(User)      // Single role
  // OR
  // roles                 UserRole[]                     // Multiple roles

  // Add your custom fields here
  email                 String?   @unique
  firstName             String?
  lastName              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}
```

### Understanding User Model Fields

**Required Authentication Fields:**

- `id`: Unique identifier (usually UUID)
- `username`: Primary login identifier (can be customized to use `email/phone`)
- `password`: Automatically hashed with bcrypt
- `passwordChangedAt`: Invalidates JWT tokens after password changes
- `lastLoginAt`: Tracks user's most recent login
- `isSuperUser`: Grants full system access regardless of roles
- `isStaff`: Frontend-only flag for admin area access
- `deletedSelfAccountAt`: Soft deletion timestamp
- `isActive`: Controls whether user can access the system

**Role Assignment:**

- Use `role` for single role per user
- Use `roles` for multiple roles per user
- Both approaches work with Static RBAC

### Customizing Login Field

By default, users login with `username`. You can customize this:

```typescript
arkos.init({
    authentication: {
        mode: "static",
        login: {
            allowedUsernames: ["email"], // Use email field for login
            // allowedUsernames: ["username", "email"], // Allow both
        },
    },
});
```

:::warning Required Setup
Create at least one user with `isSuperUser: true` before activating authentication. By default, Arkos requires authentication for all endpoints and only allows super users until you configure access controls.
:::

### Login With Different Fileds

After customizing your `allowedUsernames` Arkos will take the first on the array and consider as the default when users try to make login through api call at `/api/auth/login` in order to change this behavior let's say you have:

```ts
{
    allowedUsernames: [
        "email",
        "username",
        "profile.nickname",
        "phones.some.number",
    ];
}
```

#### Login With Email

```curl
POST /api/auth/login

{
    "email": "cacilda@arkosjs.com",
    "password": "SomeCoolStrongPass123"
}
```

In this situation it will just work because `email` is the first element on the array of `allowedUsernames` if it wasn't or if you would like to Explicitly describe which username field to use, the request would look like:

```curl
POST /api/auth/login?usernameField=email

{
    "email": "cacilda@arkosjs.com",
    "password": "SomeCoolStrongPass123"
}
```

#### Login With a Different Field (username)

```curl
POST /api/auth/login?usernameField=username

{
    "username": "cacilda",
    "password": "SomeCoolStrongPass123"
}
```

When you want to use a non default (not the first element under `allowedUsernames`) you must explicitly pass it as a search param `usernameField=username` as the example above, this way Arkos will know exactly what field it must use in order to execute the login request.

#### Login With Relation Fields (Nested Fields)

Arkos supports logging in with nested fields using dot notation, which allows you to authenticate users based on fields within related models. For example, with the configuration:

```curl
POST /api/auth/login?usernameField=profile.nickname

{
    "nickname": "cacilda_cool"
    "password": "SomeCoolStrongPass123"
}
```


#### Login With Deeply Nested Field (phones.some.number)

```curl
POST /api/auth/login?usernameField=phones.some.number

{
    "number": "+5511999999999"
    "password": "SomeCoolStrongPass123"
}
```

#### How Logging In With Relation Fields Works?

The dot notation (`phones.some.number`) is converted into a Prisma `where` clause that Arkos uses to search for the user. For the example above, Arkos would construct a query similar to:

```ts
prisma.user.findUnique({
    where: {
        phones: {
            some: {
                number: "+5511999999999"
            }
        }
    }
})
```

This allows you to authenticate users based on fields within related models, providing flexible login options.

### Important Considerations When Logging In With Different Fields

1. **Uniqueness Requirement**: All fields specified in `allowedUsernames` must be unique across your user records. If multiple users share the same value for any of these fields, Arkos will throw an error during server startup.

2. **Explicit Field Specification**: When using any field that is not the first in your `allowedUsernames` array, you must explicitly specify it using the `usernameField` query parameter.

3. **Data Structure**: The request body only requires the actual field value, not the nested structure. For `profile.nickname`, you simply provide `{"nickname": "value"}`, not `{profile: {nickname: "value"}}`. Similarly, for `phones.some.number`, you provide `{"number": "+5511999999999"}`. If you try to use the nested structure (like `{profile: {nickname: "value"}}`), it will NOT work. Arkos automatically maps the field name to the appropriate nested query internally.

This approach provides maximum flexibility while maintaining security and proper data validation through Prisma's type-safe query system.

## Auth Config Files - Static RBAC

Each model can have its own authentication configuration file that defines which actions require authentication and which roles can perform them.

### Creating Auth Config Files

Generate auth configuration files using the CLI:

```bash
npx arkos generate auth-configs --module post
```

**Shorthand:**

```bash
npx arkos generate a -m post
```

This creates `src/modules/post/post.auth.ts`:

```typescript
import { AuthConfigs } from "arkos/auth";

export const postAuthConfigs: AuthConfigs = {
    authenticationControl: {
        View: false, // Public access - no authentication required
        Create: true, // Authentication required
        Update: true, // Authentication required (default)
        Delete: true, // Authentication required (default)

        // Custom actions
        Export: true,
        BulkApprove: true,
    },

    accessControl: {
        // Simple format (description auto-generated)
        Create: ["Editor", "Admin"],
        Update: ["Editor", "Admin"],
        Delete: ["Admin"],

        // Detailed format with custom descriptions
        Export: {
            roles: ["Admin", "Analyst"],
            name: "Export Posts",
            description: "Allows exporting posts to various formats",
        },

        BulkApprove: {
            roles: ["Admin", "Moderator"],
            name: "Bulk Approve Posts",
            description: "Allows approving multiple posts at once",
        },
    },
};
```

### Auth Config Structure

**`authenticationControl`**: Determines if authentication is required

- `false`: Public access (no authentication needed)
- `true`: Requires authentication (default for Create/Update/Delete)

**`accessControl`**: Defines which roles can perform actions

- Simple format: `["Role1", "Role2"]` (description auto-generated)
- Detailed format: `{ roles: [...], name: "...", description: "..." }`

### Using Custom Actions in Routes

Custom actions defined in auth configs must be implemented in custom routes:

```typescript
// src/modules/post/post.router.ts
import { Router } from "express";
import { authService } from "arkos/services";
import { catchAsync } from "arkos/error-handler";
import postAuthConfigs from "./post.auth"

const router = Router();
const { accessControl } = postAuthConfigs

router.get(
    "/export", // will translate to /api/posts/export
    authService.authenticate,
    authService.handleAccessControl("Export", "post", accessControl.Export),
    catchAsync(exportPostsController)
);

export default router;
```

## Authentication System Flow

Understanding how authentication works in Arkos helps you implement custom logic and troubleshoot issues.

### 1. User Authentication Process

```
Client Login Request
       ↓
Credential Verification (/api/auth/login)
       ↓
JWT Token Generation
       ↓
Token Delivery (response/cookie/both)
       ↓
Client Stores Token
       ↓
Subsequent Requests Include Token
```

### 2. Request Authorization Flow

```
Incoming Request
       ↓
Token Extraction (header/cookie)
       ↓
Token Verification & Validation
       ↓
User Loading from Database
       ↓
Role-Based Access Control Check
       ↓
Request Processing (if authorized)
```

### 3. Core Components

**Auth Service (`authService`)**:

- JWT token management (sign, verify)
- Password operations (hash, compare)
- User authentication verification
- Access control enforcement

**Auth Controller**:

- `/api/auth/login` - User authentication
- `/api/auth/signup` - User registration
- `/api/auth/logout` - Session termination
- `/api/users/me` - User profile management
- `/api/auth/update-password` - Password changes

**Authentication Middleware**:

- Intercepts requests to protected routes
- Verifies JWT tokens
- Loads user information
- Enforces role-based permissions

## Sending Authentication Requests

### User Registration

```javascript
const response = await fetch("/api/auth/signup", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        username: "john_doe",
        password: "SecurePassword123!",
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
    }),
});

const result = await response.json();
```

### User Login

```javascript
const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    credentials: "include", // Important for cookie-based auth
    body: JSON.stringify({
        username: "john_doe", // or email if configured
        password: "SecurePassword123!",
    }),
});

const result = await response.json();
```

Depending on your setup under `sendAccessTokenThrough` property it will whether setup the token as cookie, attach into the json response or do both (default behavior).

### Accessing Protected Endpoints

**With Token in Authorization Header:**

```javascript
const response = await fetch("/api/posts", {
    method: "GET",
    headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    },
});
```

**With Cookie-based Authentication:**

```javascript
const response = await fetch("/api/posts", {
    method: "GET",
    credentials: "include", // Automatically includes cookies
    headers: {
        "Content-Type": "application/json",
    },
});
```

### User Profile Management

```javascript
// Get current user profile
const profile = await fetch("/api/users/me", {
    credentials: "include",
}).then((r) => r.json());

// Update user profile
const updated = await fetch("/api/users/me", {
    method: "PATCH",
    credentials: "include",
    body: JSON.stringify({
        firstName: "John Updated",
        email: "newemail@example.com",
    }),
}).then((res) => res.json());

// Change password
const passwordUpdate = await fetch("/api/auth/update-password", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({
        currentPassword: "oldPassword",
        newPassword: "newSecurePassword123!",
    }),
}).then((r) => r.json());
```

### Logout

```javascript
const response = await fetch("/api/auth/logout", {
    method: "DELETE",
    credentials: "include",
});
// Clears authentication cookies and invalidates session
```

## Upgrading To Dynamic RBAC

When your application grows and needs flexible, runtime-configurable permissions, you can upgrade from Static to Dynamic RBAC.

### What Changes

**User Model Updates:**

```typescript
model User {
  // Keep all existing fields from Static RBAC
  id                    String    @id @default(uuid())
  username              String    @unique
  password              String
  passwordChangedAt     DateTime?
  lastLoginAt           DateTime?
  isSuperUser           Boolean   @default(false)
  isStaff               Boolean   @default(false)
  deletedSelfAccountAt  DateTime?
  isActive              Boolean   @default(true)

  // CHANGE: Replace role/roles enum with UserRole relationships
  roles                 UserRole[] // Connect to UserRole junction table

  // Keep your custom fields
  email                 String?   @unique
  firstName             String?
  lastName              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}
```

**Add Required Models:**

```typescript
model AuthRole {
  id          String          @id @default(uuid())
  name        String          @unique
  permissions AuthPermission[]
  users       UserRole[]
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}

enum AuthPermissionAction {
  View
  Create
  Update
  Delete
  // Add custom actions as needed
  Export
  BulkApprove
}

model AuthPermission {
  id        String               @id @default(uuid())
  resource  String               // e.g., "post", "user-profile"
  action    AuthPermissionAction // PascalCase: "Create", "View", etc.
  roleId    String
  role      AuthRole @relation(fields: [roleId], references: [id])

  @@unique([resource, action, roleId])
}

model UserRole {
  id      String   @id @default(uuid())
  userId  String
  roleId  String
  user    User     @relation(fields: [userId], references: [id])
  role    AuthRole @relation(fields: [roleId], references: [id])

  @@unique([userId, roleId])
}
```

### Update Application Configuration

```typescript
// src/app.ts
arkos.init({
    authentication: {
        mode: "dynamic", // Change from "static" to "dynamic"
        // Keep all other JWT settings the same
    },
});
```

### Auth Config Files in Dynamic Mode

Auth config files serve a different purpose in Dynamic mode:

```typescript
// src/modules/post/post.auth.ts
export const postAuthConfigs: AuthConfigs = {
    authenticationControl: {
        View: false, // Still controls authentication requirements
        Create: true,
        Export: true,
    },

    accessControl: {
        // In Dynamic mode: used ONLY for documentation
        // roles field is ignored - actual control comes from database
        Create: {
            // roles: ["Admin"], // This field is ignored in Dynamic mode
            name: "Create Posts",
            description: "Allows creating new blog posts",
        },

        Export: {
            name: "Export Posts",
            description: "Allows exporting posts in various formats",
        },
    },
};
```

**Key Differences in Dynamic Mode:**

- `accessControl.SomeAction.roles` field is ignored
- Actual access control comes from `AuthPermission` records in database
- Auth configs provide documentation for the `/api/auth-actions` endpoint
- `authenticationControl` still works the same way

### Database-Based Permission Management

In Dynamic mode, you manage permissions through database records:

```typescript
// Example: Creating roles and permissions programmatically
const adminRole = await prisma.authRole.create({
    data: { name: "Admin" },
});

const editorRole = await prisma.authRole.create({
    data: { name: "Editor" },
});

// Grant permissions to roles
await prisma.authPermission.createMany({
    data: [
        { resource: "post", action: "Create", roleId: editorRole.id },
        { resource: "post", action: "Update", roleId: editorRole.id },
        { resource: "post", action: "View", roleId: editorRole.id },
        { resource: "post", action: "Delete", roleId: adminRole.id },
        { resource: "post", action: "Export", roleId: adminRole.id },
    ],
});

// Assign roles to users
await prisma.userRole.create({
    data: {
        userId: user.id,
        roleId: adminRole.id,
    },
});
```

### Available RBAC Management Endpoints

Dynamic RBAC provides built-in endpoints for managing roles and permissions:

```typescript
// Role management
GET    /api/auth-roles          // List all roles
POST   /api/auth-roles          // Create new role
GET    /api/auth-roles/:id      // Get specific role
PATCH  /api/auth-roles/:id      // Update role
DELETE /api/auth-roles/:id      // Delete role

// Permission management
GET    /api/auth-permissions    // List all permissions
POST   /api/auth-permissions    // Create new permission
GET    /api/auth-permissions/:id // Get specific permission
PATCH  /api/auth-permissions/:id // Update permission
DELETE /api/auth-permissions/:id // Delete permission

// User-Role assignment
GET    /api/user-roles          // List user-role assignments
POST   /api/user-roles          // Assign role to user
DELETE /api/user-roles/:id      // Remove role from user
```

### Migration Considerations

When upgrading from Static to Dynamic RBAC:

1. **Backup your database** before making schema changes
2. **Migrate existing user roles** to the new UserRole system
3. **Create AuthRole records** for your existing enum values
4. **Create AuthPermission records** based on your auth config files
5. **Update auth config files** to remove functional `roles` fields
6. **Test thoroughly** as access control logic changes completely

:::tip INFO
On next versions there is a plan on adding a migration script into the `cli` in order to easy authentication mode migrations.
:::

## Fine-Grained Access Control

Beyond endpoint-level protection, use `authService.permission` for granular access control within your application logic. This works in both Static and Dynamic modes, you can read more at [**Fine-Grained Access Control Guide**](/docs/advanced-guide/fine-grained-access-control).

## Auth Actions Discovery

The `/api/auth-actions` endpoint helps frontend developers discover available permissions:

```javascript
const authActions = await fetch("/api/auth-actions", {
    credentials: "include",
}).then((res) => res.json());

// Returns array of available actions:
// [
//   {
//     roles: ["Admin", "Editor"],    // Only in Static mode
//     action: "Create",
//     resource: "post",
//     name: "Create Posts",
//     description: "Allows creating new blog posts"
//   },
//   // ... more actions
// ]
```

**Data Source:**

- **Static Mode**: Data comes from auth config files (including `roles`)
- **Dynamic Mode**: Data comes from database records (no `roles` field)

This endpoint is particularly useful for building permission management UIs and helping frontend developers understand what actions are available in your application.

## Next Steps

- Learn about [Authentication Interceptor Middlewares](/docs/guide/auth-interceptor-middlewares) for customizing authentication behavior
- Explore [Authentication Data Validation](/docs/guide/auth-data-validation) for request validation
- Check out [Fine-Grained Access Control](/docs/advanced-guide/fine-grained-access-control) for advanced permissions
