---
sidebar_position: 4
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Request Data Validation

Request data validation in Arkos ensures incoming data meets your application's requirements before processing. The framework provides flexible validation through both class-validator and Zod integration, with automatic validation for all auto-generated endpoints and authentication routes.

## How Validation Works 

Arkos automatically validates request data based on your chosen validation approach:

1. **Request arrives** at any API endpoint
2. **Validation middleware intercepts** the request
3. **Validation rules apply** based on your DTOs or schemas
4. **Success**: Validated data replaces request body and continues processing
5. **Failure**: Returns structured error response with validation details

The validation system works seamlessly with:
- Auto-generated CRUD endpoints (`/api/posts`, `/api/users`)
- Authentication endpoints (`/api/auth/login`, `/api/auth/signup`)
- Custom routes you define

## Initial Configuration

Enable validation in your application configuration:

```typescript
// src/app.ts
import arkos from "arkos";

arkos.init({
  validation: {
    resolver: "class-validator", // or "zod"
    validationOptions: {
      whitelist: true, // Strips properties not defined in DTO/schema
      // Additional class-validator options
    },
  },
});
```

**Configuration Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `resolver` | Validation library: `"class-validator"` or `"zod"` | `"class-validator"` |
| `validationOptions` | Options passed to your chosen validator | `{}` |

:::warning Important
Validation is **disabled by default**. You must explicitly enable it in your configuration.
:::

## Implementation Workflow

### Step 1: Choose Your Validation Approach

**Class-Validator (Decorator-based):**
```typescript
// src/modules/post/dtos/create-post.dto.ts
import { IsString, IsOptional, MaxLength } from "class-validator";

export default class CreatePostDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  content?: string;
}
```

**Zod (Schema-based):**
```typescript
// src/modules/post/schemas/create-post.schema.ts
import { z } from "zod";

const CreatePostSchema = z.object({
  title: z.string().max(200),
  content: z.string().optional(),
});

export default CreatePostSchema;
```

### Step 2: File Structure Convention

Arkos automatically discovers validation files based on naming conventions:

```
src/modules/[model-name]/
├── dtos/                           # Class-validator approach
│   ├── create-[model-name].dto.ts
│   └── update-[model-name].dto.ts
└── schemas/                        # Zod approach
    ├── create-[model-name].schema.ts
    └── update-[model-name].schema.ts
```

**Examples:**
- `User` model → `create-user.dto.ts`, `update-user.dto.ts`
- `BlogPost` model → `create-blog-post.dto.ts`, `update-blog-post.dto.ts`

:::warning Convention Requirements
- Model names must be in **kebab-case** for file names
- Must use exact naming pattern: `create-[model].dto.ts` / `update-[model].dto.ts`
- Choose either DTOs **or** schemas - cannot use both together
:::

### Step 3: Define Validation Rules

**For Standard CRUD Operations:**

```typescript
// src/modules/product/dtos/create-product.dto.ts
import { IsString, IsNumber, IsOptional, Min } from "class-validator";

export default class CreateProductDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsOptional()
  description?: string;
}
```

```typescript
// src/modules/product/dtos/update-product.dto.ts
import { IsString, IsNumber, IsOptional, Min } from "class-validator";

export default class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  description?: string;
}
```

## Authentication Endpoint Validation

Authentication endpoints have special validation requirements and file naming conventions:

### Authentication File Structure

```
src/modules/auth/
├── dtos/                    # Class-validator approach
│   ├── login.dto.ts
│   ├── signup.dto.ts
│   ├── update-me.dto.ts
│   └── update-password.dto.ts
└── schemas/                 # Zod approach
    ├── login.schema.ts
    ├── signup.schema.ts
    ├── update-me.schema.ts
    └── update-password.schema.ts
```

### Login Validation

```typescript
// src/modules/auth/dtos/login.dto.ts
import { IsString, IsNotEmpty } from "class-validator";

export default class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string; // Matches your login.allowedUsernames config

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

**Dynamic Login Fields:**
If you've configured custom login fields:

```typescript
// For email-based login
export default class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

### Signup Validation

```typescript
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
    message: "Password must contain uppercase, lowercase, and number",
  })
  password: string;

  // Add other required fields from your User model
  @IsString()
  @IsOptional()
  firstName?: string;
}
```

:::warning User Model Dependency
Your SignupDto fields must match the required fields in your Prisma User model. Arkos requires specific fields for authentication - see the [Authentication System Guide](/docs/core-concepts/authentication-system#user-model-setup---static-rbac-foundation).
:::

### Profile Update Validation

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

  // Add other user fields you want to allow updating
  // DO NOT include password field - use update-password endpoint
}
```

:::warning Password Security
The `/api/users/me` endpoint automatically rejects requests containing a `password` field, even if defined in your DTO. Use the dedicated `/api/auth/update-password` endpoint for password changes.
:::

### Password Change Validation

```typescript
// src/modules/auth/dtos/update-password.dto.ts
import { IsString, MinLength, Matches } from "class-validator";

export default class UpdatePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/, {
    message: "Password must contain uppercase, lowercase, and number",
  })
  newPassword: string;
}
```

## Zod Schema Examples

If using Zod instead of class-validator:

```typescript
// src/modules/auth/schemas/signup.schema.ts
import { z } from "zod";

const SignupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/,
      "Password must contain uppercase, lowercase, and number"
    ),
});

export default SignupSchema;
```

```typescript
// src/modules/product/schemas/create-product.schema.ts
import { z } from "zod";

const CreateProductSchema = z.object({
  name: z.string(),
  price: z.number().min(0, "Price must be positive"),
  description: z.string().optional(),
});

export default CreateProductSchema;
```

## Validation Methods (Manual Usage)

For custom validation outside auto-generated endpoints:

```typescript
import { validateDto, validateSchema } from "arkos/validation";
import CreateUserDto from "./dtos/create-user.dto";
import CreateUserSchema from "./schemas/create-user.schema";

// Class-validator validation
const validatedData = await validateDto(CreateUserDto, requestData);

// Zod validation
const validatedData = await validateSchema(CreateUserSchema, requestData);
```

## Built-in Password Validation

For authentication, Arkos provides default password validation:

```typescript
arkos.init({
  authentication: {
    mode: "static",
    passwordValidation: {
      regex: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/,
      message: "Password must contain at least 8 characters, including uppercase, lowercase, and numbers",
    },
  },
});
```

:::warning DTO Override
Custom DTOs/schemas override built-in password validation. If you define authentication DTOs, they take precedence over the `passwordValidation` configuration.
:::

## Error Handling

Validation failures return structured error responses:

```json
{
  "status": "error",
  "message": "Invalid Data",
  "code": 400,
  "errors": [
    {
      "property": "email",
      "constraints": {
        "isEmail": "email must be an email"
      }
    },
    {
      "property": "password",
      "constraints": {
        "matches": "Password must contain uppercase, lowercase, and number"
      }
    }
  ]
}
```

## Custom Validation with Interceptors

For complex validation scenarios beyond DTOs/schemas you can use [**Interceptor Middlewares**](/docs/core-concepts/interceptor-middlewares):

```typescript
// src/modules/user/user.middlewares.ts
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { AppError } from "arkos/error-handler";
import { catchAsync } from "arkos/error-handler";

export const beforeCreateOne = [
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    // Custom validation logic
    if (req.body.password !== req.body.confirmPassword) {
      throw new AppError("Passwords do not match", 400);
    }

    // Check business rules
    if (await isEmailTaken(req.body.email)) {
      throw new AppError("Email already exists", 409);
    }

    next();
  }
];
```

## Integration with API Documentation

Your DTOs and schemas automatically generate JSON Schema for API documentation. The validation rules become part of your OpenAPI specification when using Arkos's built-in Swagger integration. Learn more about API documentation at [**Swagger API Documentation**](/docs/core-concepts/swagger-api-documentation).

## Validation Flow Summary

```
Request → Authentication Check → Validation Middleware → DTO/Schema Validation → Controller → Response
```

**For authenticated endpoints:**
1. JWT token verification
2. Request data validation
3. Business logic execution

**For public endpoints:**
1. Request data validation
2. Business logic execution

## Best Practices

1. **Consistent Validation Strategy**: Choose either class-validator or Zod for your entire project
2. **Match Your Database Schema**: Ensure validation rules align with your Prisma models
3. **Separate Concerns**: Use DTOs/schemas for data structure, middlewares for business logic
4. **Error Messages**: Provide clear, user-friendly validation messages
5. **Security First**: Always validate sensitive operations like password changes
6. **API Documentation**: Leverage automatic schema generation for consistent docs

## Common Pitfalls

1. ❌ **Mixed Validation Approaches**: Using both DTOs and schemas in the same project
2. ❌ **Incorrect File Naming**: Not following kebab-case convention for model names
3. ❌ **Missing Optional Decorators**: Forgetting `@IsOptional()` for optional fields
4. ❌ **Password in Update Endpoints**: Including password validation in profile update DTOs
5. ❌ **Inconsistent Field Names**: DTO fields not matching your database schema

**Correct Implementation**: Follow naming conventions, use one validation approach, separate password updates, match database fields.
