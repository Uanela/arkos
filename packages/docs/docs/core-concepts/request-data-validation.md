---
sidebar_position: 4
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Request Data Validation

In **Arkos**, request data validation is a crucial feature that ensures incoming data meets your application's requirements before processing. The framework offers flexible validation options through both Zod and class-validator integration.

## Validation Configuration

**Arkos** provides built-in validation that can be configured when initializing your application:

```typescript
// src/app.ts
import arkos from "arkos";

arkos.init({
  validation: {
    resolver: "class-validator", // or "zod"
    validationOptions: {
      whitelist: true,
      // Additional validation options
    },
  },
});
```

By default, validation is disabled. When enabled, **Arkos** uses class-validator as the default resolver.

:::tip
You can switch between validation libraries based on your team's preference without changing your application logic.
:::

## Validation Methods

**Arkos** supports two primary validation approaches:

### 1. Class-Validator

Use class-validator with decorators to define validation rules in Data Transfer Objects (DTOs):

```typescript
// src/modules/user/dtos/create-user.dto.ts
import { IsString, IsEmail } from "class-validator";

export default class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;
}
```

The validation process is handled by the `validateDto` internal utility function and also exposed through `arkos/validation`:

```ts
import { validateDto } from "arkos/validation";

// wrapped on an async function
const validatedUser = await validateDto(CreateUserDto, data);
```

### 2. Zod Schema

Alternatively, define validation rules using Zod schemas:

```typescript
// src/modules/user/schemas/create-user.schema.ts
import { z } from "zod";

const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

export default CreateUserSchema;
```

Validate data using the `validateSchema` internal utility function and also exposed through `arkos/validation`:

```typescript
import { validateDto } from "arkos/validation";

// wrapped on an async function
const validatedUser = await validateSchema(CreateUserSchema, data);
```

:::tip
Bear in mind that all of this are handled automatically by **Arkos** behind the scenes for your prisma models and provided authentication endpoints, read more below to understand it.
:::

## Request Validation Flow

**Arkos** automatically applies validation to incoming request bodies based on your configuration:

1. The request hits your API endpoint
2. The middleware rensponsible for handling validation intercepts the request
3. Based on your validation configuration, it applies either class-validator or zod validation
4. If validation fails, an `AppError` is thrown with a 400 status code and validation details, [read more](/docs/api-reference/the-app-error-class) about `AppError`.
5. If validation passes, the validated data replaces the original request body

:::info
The validation process respects your model's create and update DTOs or schemas, applying them automatically for the corresponding operations.
:::

## Integration with Models

For each model in your application, **Arkos** looks for validation schemas or DTOs based on naming conventions explained on the [project structure section](/docs/project-structure):

```
/src/modules/[model-name]/
├── schemas/
│   ├── create-model-name.schema.ts
│   └── update-model-name.schema.ts
├── dtos/
│   ├── create-model-name.dto.ts
│   └── update-model-name.dto.ts
```

The framework will automatically use these files for validation based on your chosen resolver.

:::warning important
You do not need to define both schemas and DTO's, it is up to the configuration you choose whether it is zod (schemas) or class-validator (DTO). remember both cannot be used together currently.
:::

## Custom Validation Logic

For more complex validation scenarios, you can use middlewares to implement custom validation logic:

```typescript
// src/modules/user/user.middlewares.ts
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { catchAsync } from "arkos/error-handler";

export const beforeCreateOne = catchAsync(
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    // Custom validation logic
    if (req.body.password !== req.body.confirmPassword) {
      throw new AppError("Passwords do not match", 400);
    }

    next();
  }
);
```

## Error Handling

When validation fails, **Arkos** responds with a standardized error format:

```json
{
  "status": "error",
  "message": "Invalid Data",
  "code": 400,
  "errors": [
    // Validation errors from class-validator or Zod
  ]
}
```

This consistent error format makes it easy for clients to understand and handle validation issues.

:::tip
You can customize error messages by configuring your validation options or by implementing custom error handling middleware through interceptor middlewares.
:::

## Authentication Validation

**Arkos** also provides built-in password validation for authentication:

```ts
arkos.init({
  authentication: {
    mode: "static", // or dynamic
    passwordValidation: {
      regex: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/,
      message:
        "Password must contain at least 8 characters, including uppercase, lowercase, and numbers",
    },
  },
  // Other config fields
});
```

By default, passwords must contain at least one uppercase letter, one lowercase letter, and one digit. [read more](/docs/guide/authentication-system/authentication-data-validation) about authentication data validation.

:::warning important
This will have no effect you if a `create-user` or `update-user` dto's or schemas are defined. and also for authentication dto's or schemas like `login`, `signup`, `update-password` are defined, read more about **authencation data validation** [clicking here](/docs/guide/authentication-system/authentication-data-validation).
:::

## Best Practices

1. Choose a consistent validation approach (class-validator or Zod) for your project
2. Define clear validation rules that match your business requirements
3. Use middlewares for complex validation scenarios that involve things that cannot be done through schemas or DTO's.
4. Keep validation logic separate from business logic for better maintainability
5. Document your validation rules for API consumers using the built-in documentation tool impleted through swagger or do it on your own you wish, you can [read more](/docs/core-concepts/built-in-swagger-documenation) about how to setup the built-in documentation.

By leveraging **Arkos**'s validation capabilities, you can ensure data integrity and improve error handling in your application.
