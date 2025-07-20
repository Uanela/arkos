---
sidebar_position: 5
---

# Authentication Data Validation

In **Arkos**, request data validation for authentication endpoints is crucial for ensuring security and data integrity. This documentation explains how to implement and customize validation for authentication-related operations.

## Overview of Authentication Endpoints

The authentication router in **Arkos** provides several key endpoints:

- `/auth/login` - User login
- `/auth/signup` - User registration
- `/auth/logout` - User logout
- `/auth/update-password` - Update user password
- `/users/me` - Get, update, or delete current user

Each of these endpoints requires proper data validation to ensure valid input data before processing.

## Validation Structure

Authentication validation files are organized by mutation type and stored in either the DTOs or schemas directory depending on your chosen validation strategy:

```
src/modules/auth/
├── dtos/                    # For class-validator approach
│   ├── login.dto.ts
│   ├── signup.dto.ts
│   ├── update-me.dto.ts
│   └── update-password.dto.ts
└── schemas/                 # For Zod approach
    ├── login.schema.ts
    ├── signup.schema.ts
    ├── update-me.schema.ts
    └── update-password.schema.ts
```

On the following sections you have examples of dto's that you can create for authentication data validation.

## 1. Class-Validator Approach

If you're using class-validator for validation (the default), you'll define DTOs with decorators:

### Login Validation

```ts
// src/modules/auth/dtos/login.dto.ts
import { IsString, IsNotEmpty } from "class-validator";

export default class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string; // Or email based on login.allowedUsernames config

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

### Signup Validation

```ts
// src/modules/auth/dtos/signup.dto.ts
import { IsString, IsEmail, MinLength, Matches } from "class-validator";

export default class SignupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  })
  password: string;

  // Additional fields as needed
}
```

:::warning
This SignupDto is just an mere example, because these data will basically be stored in your User Model under prisma, so it depends on what fields are required in your user prisma schema even though **Arkos** have required fields on user schema when using authentication, [see this fields here](/docs/advanced-guide/static-rbac-authentication#defining-the-user-model-for-static-authentication).
:::

### Update Password Validation

```ts
// src/modules/auth/dtos/update-password.dto.ts
import { IsString, MinLength, Matches } from "class-validator";

export default class UpdatePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  })
  newPassword: string;
}
```

### Update Me Validation

```typescript
// src/modules/auth/dtos/update-me.dto.ts
import { IsString, IsEmail, IsOptional } from "class-validator";

export default class UpdateMeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  // Add other user fields that you want to allow updating
}
```

:::warning
This endpoint must not be used to update password, by default **Arkos** will throw an error if password is sent to this endpoint even though your DTO or schema have listed the password field, in order to update the current user password [see here](/docs/guide/authentication-system/authentication-data-validation#update-password-validation).
:::

## 2. Zod Approach

If you prefer using Zod for validation, configure your `arkos.init()` with `{ validation: { resolver: "zod" }}` and define schemas:

### Login Schema

```typescript
// src/modules/auth/schemas/login.schema.ts
import { z } from "zod";

const LoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default LoginSchema;
```

### Signup Schema

```ts
// src/modules/auth/schemas/signup.schema.ts
import { z } from "zod";

const SignupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"), // Or your login.allowedUsernames for authentication
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

export default SignupSchema;
```

:::warning
This SignupSchema is just an mere example, because these data will basically be stored in your User Model under prisma, so it depends on what fields are required in your user prisma schema even though **Arkos** have required fields on user schema when using authentication, [see this fields here](/docs/advanced-guide/static-rbac-authentication#defining-the-user-model-for-static-authentication).
:::

### Update Password Schema

```ts
// src/modules/auth/schemas/update-password.schema.ts
import { z } from "zod";

const UpdatePasswordSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
  })
  .refine((data) => data.newPassword === data.passwordConfirm, {
    message: "Passwords don't match",
    path: ["passwordConfirm"],
  });

export default UpdatePasswordSchema;
```

### Update Me Schema

```typescript
// src/modules/auth/schemas/update-me.schema.ts
import { z } from "zod";

const UpdateMeSchema = z.object({
  name: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  // Add other user fields that you want to allow updating
});

export default UpdateMeSchema;
```

:::warning
This endpoint must not be used to update password, by default **Arkos** will throw an error if password is sent to this endpoint even though your DTO or schema have listed the password field, in order to update the current user password [see here](/docs/guide/authentication-system/authentication-data-validation#update-password-validation).
:::

## Custom Middleware Validation

For more complex validation scenarios, you can create custom middleware in `src/modules/auth/auth.middlewares.ts`:

```typescript
// src/modules/auth/auth.middlewares.ts
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { catchAsync, AppError } from "arkos/error-handler";

export const beforeSignup = catchAsync(
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    // Check if password and passwordConfirm match
    if (req.body.password !== req.body.passwordConfirm) {
      throw new AppError("Passwords do not match", 400);
    }

    // Add additional validation logic

    next();
  }
);
```

## Validation Flow

When a request hits an authentication endpoint:

1. If a custom middleware exists (e.g., `beforeLogin`, `beforeSignup`), it runs first
2. The middleware can perform custom validation and transform the request
3. If validation passes, the controller method is executed
4. If a custom "after" middleware exists, it runs next
5. Finally, the response is sent using `sendResponse`

## Error Handling

When validation fails, **Arkos** returns a structured error response:

```json
{
  "status": "error",
  "message": "Invalid Data",
  "code": 400,
  "errors": [
    {
      "property": "password",
      "constraints": {
        "matches": "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      }
    }
  ]
}
```

## Best Practices

1. Always validate authentication inputs thoroughly
2. Use strong password requirements
3. Keep validation rules consistent between your DTOs/schemas and your API documentation
4. Add custom validation middleware for complex business rules
5. Use rate limiting to prevent brute force attacks, [see more here](/docs/guide/authentication-system/sending-authentication-requests#rate-limiting).

By following these validation practices, you can ensure that your **Arkos** application remains secure and reliable.
