---
sidebar_position: 1
---

# Sending Authentication Requests

This guide demonstrates how to interact with all available authentication endpoints in **Arkos** generated RESTful API. These endpoints handle user registration, authentication, profile management, and password updates.

:::info
In order to explore the following available request you must setup wether a `Static RBAC Authentication` or `Dynamic RBAC Authentication` if yet set up.
:::

- [Static RBAC Authentication Guide](/docs/advanced-guide/static-rbac-authentication)
- [Dynamic RBAC Authentication Guide](/docs/advanced-guide/dynamic-rbac-authentication)

## Base URL

```curl
http://localhost:8000/api
```

## Authentication Endpoints

### User Registration

```
POST /api/auth/signup
```

Creates a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "StrongP@ss123",
  "name": "John Doe"
}
```

**Response:**

```json
{
  "data": {
    "id": "1",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2025-04-05T14:23:45.123Z",
    "updatedAt": "2025-04-05T14:23:45.123Z"
  }
}
```

**Note:** The password will not be included in the response.

### User Login

```
POST /api/auth/login
```

Authenticates a user and returns an access token.

**Request Body:**

```json
{
  "username": "user@example.com",
  "password": "StrongP@ss123"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note:**

- The username field (default is "username") can be configured in your application to email, phone or whatever field you want to use.

### Example Changing The Username Field

```ts
// src/app.ts
arkos.init({
  authentication: {
    mode: "static",
    login: {
      allowedUsernames: ["email", "phones.some.number", "profile.nickname"],
    },
  },
});
```

- **`email`**:
  Will be marked as default because it's the first.

- **`phones.some.number`**: having `phones` with prisma type `Phone[]` (list field), where model `Phone` have a @unique `number` field.

- **`profile.nickname`**: where profile is of prisma type `UserProfile` (another model one-to-one) and it contains a @unique field `nickname`.

:::info
By passing many fields you will allow users to be able to login with different fields according to what will be configured on the fly.
:::

or you can do it on the fly through any `@unique` field in user model or even a relation field that contains an `@unique` field as shown on example above with `phones.some.number` and `profile.nickname`.

Example below it shows with phone number from field `phones` on user (It contains a field `number` as @unique):

```curl
POST /api/auth/login?usernameField=phones.some.number
```

```json
{
  "number": "+258891234567",
  "password": "StrongP@ss123"
}
```

- The token will also be set as an HTTP-only cookie named `arkos_access_token` by default.
- The token delivery method can be configured as:
  - `"response-only"`: Token only in JSON response
  - `"cookie-only"`: Token only in cookie
  - Default: `"both"` response and cookie

### Example Changing Token Delivery Method

```ts
// src/app.ts
arkos.init({
  authentication: {
    mode: "static", // or dynamic
    login: {
      sendAccessTokenThrough: "cookie-only",
    },
  },
  // other configs
});
```

### User Logout

```
DELETE /api/auth/logout
```

Ends the current user session by invalidating their access token.

**Authorization:** `Bearer YOUR_API_TOKEN` or via cookie

**Response:** (204 No Content)

### Update Password

```
POST /api/auth/update-password
```

Updates the current user's password.

**Authorization:** `Bearer YOUR_API_TOKEN` or via cookie

**Request Body:**

```json
{
  "currentPassword": "StrongP@ss123",
  "newPassword": "EvenStronger@456"
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Password updated successfully!"
}
```

**Note:** Password must meet strength requirements (by default, at least one uppercase letter, one lowercase letter, and one number).

## User Profile Management

### Get Current User Profile

```
GET /api/users/me
```

Retrieves the profile information of the currently authenticated user.

**Authorization:** `Bearer YOUR_API_TOKEN` or via cookie

**Response:**

```json
{
  "data": {
    "id": "1",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2025-04-05T14:23:45.123Z",
    "updatedAt": "2025-04-05T14:23:45.123Z"
  }
}
```

### Update Current User Profile

```
PATCH /api/users/me
```

Updates the profile information of the currently authenticated user.

**Authorization:** `Bearer YOUR_API_TOKEN` or via cookie

**Request Body:**

```json
{
  "name": "John Smith",
  "bio": "Software Engineer"
}
```

**Response:**

```json
{
  "data": {
    "id": "1",
    "email": "user@example.com",
    "name": "John Smith",
    "bio": "Software Engineer",
    "createdAt": "2025-04-05T14:23:45.123Z",
    "updatedAt": "2025-04-05T15:30:12.456Z"
  }
}
```

**Note:** You cannot update the password through this endpoint. Use the `/api/auth/update-password` endpoint instead.

### Delete User Account

```
DELETE /api/users/me
```

Permanently deletes the currently authenticated user's account.

**Authorization:** `Bearer YOUR_API_TOKEN` or via cookie

**Response:** (204 No Content)

## Authentication Headers

For endpoints requiring authentication, you can provide the token in one of two ways:

1. **Authorization Header**:

   ```
   Authorization: Bearer YOUR_API_TOKEN
   ```

2. **Cookie** (set automatically after login):
   The cookie `arkos_access_token` is automatically set during login and sent with subsequent requests.

## Data Validation

Even though this is an special module in **Arkos** it also supports data validation through `zod` or `class-validator` for ensuring that you endpoints are protected from unwanted data and validate with your own business logic, you refer to [Authentication Data Validation Guide](/docs/guide/authentication-system/authentication-data-validation) to more details.

## Rate Limiting

Authentication endpoints have rate limiting applied to prevent abuse:

- Maximum of 10 requests within a 5-second window (`/api/users/me` is applied global rate-limit rather the specific for authentication)
- After exceeding this limit, requests will be rejected until the window expires

You can customize this by passing an option when initializing `Arkos`:

```ts
// src/app.ts
arkos.init({
  authentication: {
    mode: "static", // or dynamic
    login: {
      sendAccessTokenThrough: "cookie-only",
    },
    // npm package express-rate-limit options
    requestRateLimitOptions: {
      // (default configuration)
      windowMs: 5000,
      limit: 10,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    },
  },
  // other configs
});
```

Read more about the mentioned package [https://www.npmjs.com/package/express-rate-limit](https://www.npmjs.com/package/express-rate-limit).

## Error Responses

### Unauthorized (401)

```json
{
  "status": "error",
  "message": "You are not logged in! Please log in to get access."
}
```

### Bad Request (400)

```json
{
  "status": "error",
  "message": "Please provide email and password"
}
```

If you were using another `login.allowedUsernames` it would show it, rather than `email`.

### Incorrect Credentials (401)

```json
{
  "status": "error",
  "message": "Incorrect email or password"
}
```

## Dynamic Roles and Permissions Management

For applications using [`Dynamic RBAC`](/docs/advanced-guide/dynamic-rbac-authentication) , the following endpoints are available:

:::tip
Notice that these are normal prisma models management nothing special, this is here just for example completion.
:::

### Role Management

**Endpoint:**

```
/api/auth-roles
```

**Description:**

CRUD operations for managing roles.

#### Create Role

```bash
POST /api/auth-roles
```

```json
{
  "name": "Administrator"
}
```

#### Get All Roles

```bash
GET /api/auth-roles
```

#### Get One Role

```bash
GET /api/auth-roles/:id
```

#### Update Role

```bash
PUT /api/auth-roles/:id
```

```json
{
  "name": "Coordinator"
}
```

#### Delete Role

```bash
DELETE /api/auth-roles/:id
```

### Permission Management

**Endpoint:**

```
/api/auth-permissions
```

**Description:**

CRUD operations for managing permissions.

#### Create Permission

```bash
POST /api/auth-permissions
```

```json
{
  "resource": "user", // prisma models in kebab-case or other custom resource
  "action": "Create", // Update, View, Delete or other any custom action
  "role": {
    "id": "role-uuid"
  }
}
```

#### Example: creating permission for custom resource with custom action

```json
{
  "resource": "PDF", // prisma models in kebab-case or other custom resource
  "action": "Export", // Update, View, Delete or other any custom action
  "role": {
    "id": "role-uuid"
  }
}
```

:::warning important
The `resource` could be an prisma model name in lowercase and kebab-case, file-upload (for file uploads) or even any other resource name you would like to protect when using the built-in auth system in your own created routers. see [Adding Authentication In Custom Routes](/docs/guide/adding-custom-routers#adding-authentication-in-custom-routers)
:::

#### Get All Permissions

```bash
GET /api/auth-permissions
```

#### Get One Permission

```bash
GET /api/auth-permissions/:id
```

#### Update Permission

```bash
PUT /api/auth-permissions/:id
```

```json
{
  "resource": "user",
  "action": "Delete"
}
```

#### Delete Permission

`**DELETE**`/api/auth-permissions/:id`

### User Role Assignment

**Endpoint:**

```
/api/user-roles
```

**Description:**  
CRUD operations for assigning roles to users.

#### Assign Role to User

```bash
POST /api/user-roles
```

```json
{
  "userId": "user-uuid",
  "roleId": "role-uuid"
}
```

#### Get All User Roles

```bash
GET /api/user-roles
```

#### Get One User Role

```bash
GET /api/user-roles/:id
```

#### Update User Role Assignment

```bash
PUT /api/user-roles/:id
```

```json
{
  "userId": "user-uuid",
  "roleId": "new-role-uuid"
}
```

#### Remove User Role

```bash
DELETE /api/user-roles/:id
```

---

:::tip important
These are normal prisma models, so they get their own auto generated endpoints as other models, the only difference are that these are used in auth system when you are using Dynamic RBAC. to manipulate them send plain requests as normal models ([read more about](/docs/guide/sending-requests)), and it is also valid for validation treat them as other models ([see more](/docs/core-concepts/request-data-validation)).
:::

For detailed information about implementing and configuring Static RBAC or Dynamic RBAC, please refer to the [Static RBAC Guide](/docs/advanced-guide/static-rbac-authentication) or [Dynamic RBAC Guide](/docs/advanced-guide/dynamic-rbac-authentication).
