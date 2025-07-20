---
sidebar_position: 2
---

# Authentication System Flow

The Arkos authentication system provides a comprehensive JWT-based authentication and role-based access control (RBAC) framework. It handles user authentication, authorization, and session management with minimal configuration required from developers.

### 1. User Authentication Process

When a user attempts to authenticate with the system:

1. **Login Request**: The client sends credentials to `/api/auth/login`
2. **Credential Verification**: The auth controller verifies the username and password
3. **Token Generation**: Upon successful verification, a JWT token is generated
4. **Token Delivery**: The token is delivered to the client (via response, cookie, or both)
5. **Authorization Header**: For subsequent requests, the client includes the token

### 2. Request Authorization Flow

For protected routes:

1. **Token Extraction**: The system extracts the JWT from the request (header or cookie)
2. **Token Verification**: The JWT is verified for authenticity and expiration
3. **User Retrieval**: The system loads the user based on the ID in the token
4. **Access Control**: The user's roles are checked against the required permissions
5. **Request Processing**: If authorized, the request proceeds to the controller

## Core Components

### Auth Service

The `authService` object is the central component of the authentication system, providing methods for:

- **JWT Token Management**: Signing and verifying tokens
- **Password Management**: Hashing, comparing, and validating passwords
- **User Authentication**: Verifying user credentials and session state
- **Access Control Handling**: Enforcing role-based permissions

> For a complete reference of all available methods and their parameters, see the [Auth Service Object API Reference](/docs/api-reference/auth-service-object).

### Auth Controller

The auth controller implements the core authentication endpoints:

- **Login**: Authenticates users and issues JWT tokens
- **Signup**: Creates new user accounts
- **Logout**: Invalidates the current session
- **User Profile**: Manages the current user's information
- **Password Updates**: Allows users to change their passwords

### Authentication Middleware

The authentication middleware:

1. Intercepts incoming requests
2. Verifies authentication tokens
3. Loads user information
4. Validates access permissions
5. Either allows the request to proceed or returns an appropriate error

## Authentication Modes

Arkos supports two RBAC modes:

### Static RBAC

Roles and permissions are defined in configuration files, ideal for applications with well-defined access rules that change infrequently. see full guide on [Static RBAC Authentication Guide](/docs/advanced-guide/static-rbac-authentication).

### Dynamic RBAC

Roles and permissions are stored in the database and can be modified at runtime, suitable for applications with complex or frequently changing access control requirements. see full guide on [Dynamic RBAC Authentication Guide](/docs/advanced-guide/dynamic-rbac-authentication).

## Using Auth Service Methods

The `authService` provides several method categories that you can leverage in your application:

### JWT Token Management

- Generate custom tokens with different expiration times
- Verify token authenticity and extract payload data
- Check token expiration status

### Password Management

- Hash plain text passwords securely
- Compare password inputs against stored hashes
- Validate password strength against security requirements

### User Authentication

- Retrieve authenticated user information
- Check if passwords were changed after token issuance
- Implement custom authentication flows

### Access Control Handling

- Apply role-based permissions to custom routes
- Implement conditional authentication requirements
- Create custom authorization rules

## Common Integration Points

### Custom Authentication Flows

You can extend the default authentication behavior using interceptors middlewares and go beyond **Arkos** auth flow:

```ts
// src/modules/auth/auth.middlewares.ts
export const beforeLogin = catchAsync(async (req, res, next) => {
  // Custom logic before login
  next();
});

export const afterLogin = catchAsync(async (req, res, next) => {
  // Custom logic after successful login
  next();
});
```

see full guide [clicking here](/docs/guide/authentication-system/authentication-interceptor-middlewares).

## Best Practices

1. **Use Environment Variables**: Store JWT secrets and configuration in environment variables
2. **Implement Password Policies**: Enforce strong password requirements
3. **Token Expiration**: Set appropriate expiration times based on security needs
4. **Error Handling**: Implement proper error handling for authentication failures
5. **Interceptors**: Use authentication interceptors for custom business logic
6. **Cookie Security**: Enable secure and httpOnly flags for cookies in production

## Security Considerations

- **Token Storage**: Store tokens securely (HttpOnly cookies preferred)
- **HTTPS**: Always use HTTPS in production environments
- **Password Hashing**: Never store plain text passwords
- **Rate Limiting**: Implement rate limiting for authentication endpoints
- **Token Invalidation**: Provide mechanisms to invalidate tokens on password change
