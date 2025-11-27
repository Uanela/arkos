---
sidebar_position: 4
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Request Data Validation

Request data validation in Arkos ensures incoming data meets your application's requirements before processing. The framework provides flexible validation through both class-validator and Zod integration, with automatic validation for all auto-generated endpoints, custom endpoints and authentication routes.

**New in `v1.4.0-beta`**: [**ArkosRouter**](/docs/api-reference/arkos-router) brings declarative validation configuration that extends beyond just request bodies. You can now validate query parameters and path parameters for auto-generated endpoints, and enjoy a cleaner syntax for custom routes.

## How Validation Works 

Arkos automatically validates request data based on your chosen validation approach:

1. **Request arrives** at any API endpoint
2. **Validation middleware intercepts** the request
3. **Validation rules apply** based on your DTOs or schemas
4. **Success**: Validated data replaces request body and continues processing
5. **Failure**: Returns structured error response with validation details

The validation system works seamlessly with:
- Auto-generated CRUD endpoints (`/api/posts`, `/api/users`, etc)
- Authentication endpoints (`/api/auth/login`, `/api/auth/signup`, etc)
- Custom routes you define

## Initial Configuration

Enable validation in your application configuration:

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```ts
// arkos.config.ts
import { ArkosConfig } from "arkos";

const arkosConfig: ArkosConfig = {
  validation: {
    resolver: "zod", // or " "class-validator""
    validationOptions: {
      whitelist: true, // Strips properties not defined in DTO/schema
      // Additional class-validator options
    },
  },
}

export default arkosConfig
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// src/app.ts
import arkos from "arkos";

arkos.init({
  validation: {
    resolver: "zod", // or "class-validator""
    validationOptions: {
      whitelist: true, // Strips properties not defined in DTO/schema
      // Additional class-validator options
    },
  },
});
```

</TabItem>
</Tabs>

**Configuration Options:**

| Option | Description | 
|--------|-------------|
| `resolver` | Validation library: `"zod"` or `"class-validator"`|
| `validationOptions` | Options passed to your chosen validator | 

:::warning Important
Validation is **disabled by default**. You must explicitly enable it in your configuration.
:::

## Accessing Validated Data

After validation passes, access the validated data through standard Express request properties:


<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```typescript
// In any controller or middleware
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";

// Define your types based on validation schemas
interface CreateProductBody {
  name: string;
  price: number;
  description?: string;
}

interface ProductParams {
  id: string;
}

interface ProductQuery {
  includeReviews?: boolean;
  minPrice?: number;
}

// Use ArkosRequest with generics for type safety
const myHandler = async (
  req: ArkosRequest<ProductQuery, CreateProductBody, ProductParams>,
  res: ArkosResponse,
  next: ArkosNextFunction
) => {
  // Validated and type-safe access
  const { name, price, description } = req.body;      // Body data
  const { id } = req.params;                          // URL parameters
  const { includeReviews, minPrice } = req.query;     // Query parameters

  // All data is already validated according to your schemas
  // Use it safely in your logic
  res.json({ name, price, id });
};
```

**Type Signature:**
```typescript
ArkosRequest<Query = any, Body = any, Params = any>
```

:::tip Type Safety
Use `ArkosRequest<Query, Body, Params>` generics for full TypeScript support. This provides autocomplete and type checking for validated data, matching your Zod schemas or class-validator DTOs.
:::

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// In any controller or middleware
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";

const myHandler = async (
  req: ArkosRequest,
  res: ArkosResponse,
  next: ArkosNextFunction
) => {
  // Validated data in standard Express properties
  const { name, price } = req.body;         // Body data
  const { id } = req.params;                // URL parameters
  const { minPrice } = req.query;           // Query parameters

  // Data is validated but no TypeScript type inference
  res.json({ name, price, id });
};
```

**Note**: In v1.3, `ArkosRequest` doesn't support generic type parameters for type safety.

</TabItem>
</Tabs>

## Validation for Auto-Generated Endpoints

### File Structure Convention For Prisma Models

Arkos automatically discovers validation files based on naming conventions:

```
src/modules/[model-name]/
├── schemas/                           # Zod approach
│   ├── create-[model-name].schema.ts
│   └── update-[model-name].schema.ts
└── dtos/                        # Class-validator approach
    ├── create-[model-name].dto.ts
    └── update-[model-name].dto.ts
```

**Examples:**
- `User` model → `create-user.schema.ts`, `update-user.schema.ts`
- `BlogPost` model → `create-blog-post.schema.ts`, `update-blog-post.schema.ts`

### File Structure Convention For Authentication
```
src/modules/auth/
├── schemas/                           # Zod approach
│   ├── login.schema.ts
│   ├── signup.schema.ts
│   ├── update-me.schema.ts
│   ├── update-password.schema.ts
└── dtos/                        # Class-validator approach
    ├── login.dto.ts
    ├── signup.dto.ts
    ├── update-me.dto.ts
    └── update-password.dto.ts
```

:::warning Convention Requirements
- Model names must be in **kebab-case** for file names
- Must use exact naming pattern: `create-[model].schema.ts` / `update-[model].schema.ts`
- Choose either schemas **or** Dtos - cannot use both together
:::

### Standard CRUD Validation

Define validation rules for auto-generated endpoints using file-based discovery:

<Tabs groupId="approach">
<TabItem value="zod" label="Zod Schemas" default>

```typescript
// src/modules/product/schemas/create-product.schema.ts
import z from "zod";

const CreateProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.number().min(0, "Price must be positive"),
  description: z.string().optional(),
  categoryId: z.string().uuid(),
});

export default CreateProductSchema;
```

```typescript
// src/modules/product/schemas/update-product.schema.ts
import z from "zod";

const UpdateProductSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional(),
});

export default UpdateProductSchema;
```

</TabItem>
<TabItem value="class-validator" label="Class-Validator DTOs">

```typescript
// src/modules/product/dtos/create-product.dto.ts
import { IsString, IsNumber, IsOptional, Min, IsUUID } from "class-validator";

export default class CreateProductDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  categoryId: string;
}
```

```typescript
// src/modules/product/dtos/update-product.dto.ts
import { IsString, IsNumber, IsOptional, Min, IsUUID } from "class-validator";

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

  @IsUUID()
  @IsOptional()
  categoryId?: string;
}
```

</TabItem>
</Tabs>

These files are automatically applied to:
- `POST /api/products` (createOne) → uses `create-product` schema/DTO
- `PATCH /api/products/:id` (updateOne) → uses `update-product` schema/DTO
- `POST /api/products/many` (createMany) → uses `create-product` schema/DTO
- `PATCH /api/products/many` (updateMany) → uses `update-product` schema/DTO

### Advanced: Validating Query and Params

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (New Feature)" default>

**The new declarative approach allows you to validate query parameters and path parameters for auto-generated endpoints** - something that wasn't possible before v1.4.0:

```typescript
// src/modules/product/product.router.ts
import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";
import z from "zod";

export const config: RouterConfig = {
  // Validate query parameters on findMany endpoint
  findMany: {
    validation: {
      query: z.object({
        category: z.string().optional(),
        minPrice: z.number().min(0).optional(),
        maxPrice: z.number().min(0).optional(),
        inStock: z.boolean().optional(),
      }),
    },
  },

  // Validate path parameters on findOne endpoint
  findOne: {
    validation: {
      params: z.object({
        id: z.string().uuid("Invalid product ID format"),
      }),
    },
  },

  // Combine body, query, and params validation
  updateOne: {
    validation: {
      params: z.object({
        id: z.string().uuid(),
      }),
      body: z.object({
        name: z.string().min(1).optional(),
        price: z.number().min(0).optional(),
      }),
      query: z.object({
        notify: z.boolean().optional(),
      }),
    },
  },
};

const router = ArkosRouter();

export default router;
```

:::tip New Capability
**This is a major improvement in v1.4.0**: Previously, only request bodies could be validated for auto-generated endpoints through file-based DTOs/schemas. Now you can validate **any part of the request** (body, query, params) using the declarative router configuration.
:::

**With Class-Validator DTOs:**

```typescript
// src/modules/product/product.router.ts
import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";
import { IsString, IsNumber, IsOptional, IsBoolean, IsUUID, Min } from "class-validator";

class ProductQueryDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @IsBoolean()
  @IsOptional()
  inStock?: boolean;
}

class ProductParamsDto {
  @IsUUID()
  id: string;
}

export const config: RouterConfig = {
  findMany: {
    validation: {
      query: ProductQueryDto,
    },
  },

  findOne: {
    validation: {
      params: ProductParamsDto,
    },
  },
};

const router = ArkosRouter();

export default router;
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

**Query and params validation for auto-generated endpoints was not supported in v1.3**. Only request body validation was possible through file-based DTOs/schemas.

To validate query parameters or path parameters, you had to:
1. Override the entire endpoint
2. Manually add validation middleware
3. Re-implement the controller logic

```typescript
// src/modules/product/product.router.ts
import { Router } from "express";
import { RouterConfig } from "arkos";
import { handleRequestQueryValidationAndTransformation } from "arkos/middlewares";
import { ProductQuerySchema } from "./schemas/product-query.schema";

export const config: RouterConfig = {
  disable: {
    findMany: true, // Disable to override
  },
};

const router = Router();

// Manual override required for query validation
router.get(
  "/",
  handleRequestQueryValidationAndTransformation(ProductQuerySchema),
  async (req, res) => {
    // Re-implement findMany logic manually
    const products = await prisma.product.findMany({
      where: req.query,
    });
    res.json(products);
  }
);

export default router;
```

</TabItem>
</Tabs>

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

<Tabs groupId="approach">
<TabItem value="zod" label="Zod" default>

```typescript
// src/modules/auth/schemas/login.schema.ts
import z from "zod";

const LoginSchema = z.object({
  username: z.string().min(1, "Username is required"), // Matches your login.allowedUsernames config
  password: z.string().min(1, "Password is required"),
});

export default LoginSchema;
```

**Dynamic Login Fields:**
If you've configured custom login fields:

```typescript
// For email-based login
const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default LoginSchema;
```

</TabItem>
<TabItem value="class-validator" label="Class-Validator">

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

```typescript
// For email-based login
import { IsEmail, IsString, IsNotEmpty } from "class-validator";

export default class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

</TabItem>
</Tabs>

### Signup Validation

<Tabs groupId="approach">
<TabItem value="zod" label="Zod" default>

```typescript
// src/modules/auth/schemas/signup.schema.ts
import z from "zod";

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
  firstName: z.string().optional(),
  // Add other required fields from your User model
});

export default SignupSchema;
```

</TabItem>
<TabItem value="class-validator" label="Class-Validator">

```typescript
// src/modules/auth/dtos/signup.dto.ts
import { IsString, IsEmail, MinLength, Matches, IsOptional, IsNotEmpty } from "class-validator";

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

  @IsString()
  @IsOptional()
  firstName?: string;
  // Add other required fields from your User model
}
```

</TabItem>
</Tabs>

:::warning User Model Dependency
Your SignupDto fields must match the required fields in your Prisma User model. Arkos requires specific fields for authentication - see the [Authentication System Guide](/docs/core-concepts/authentication-system#user-model-setup---static-rbac-foundation).
:::

### Profile Update Validation

<Tabs groupId="approach">
<TabItem value="zod" label="Zod" default>

```typescript
// src/modules/auth/schemas/update-me.schema.ts
import z from "zod";

const UpdateMeSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  // Add other user fields you want to allow updating
  // DO NOT include password field - use update-password endpoint
});

export default UpdateMeSchema;
```

</TabItem>
<TabItem value="class-validator" label="Class-Validator">

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

</TabItem>
</Tabs>

:::warning Password Security
The `/api/users/me` endpoint automatically rejects requests containing a `password` field, even if defined in your DTO. Use the dedicated `/api/auth/update-password` endpoint for password changes.
:::

### Password Change Validation

<Tabs groupId="approach">
<TabItem value="zod" label="Zod" default>

```typescript
// src/modules/auth/schemas/update-password.schema.ts
import z from "zod";

const UpdatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/,
      "Password must contain uppercase, lowercase, and number"
    ),
});

export default UpdatePasswordSchema;
```

</TabItem>
<TabItem value="class-validator" label="Class-Validator">

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

</TabItem>
</Tabs>

### Advanced: Customizing Auth Endpoint Validation

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

You can override or enhance auth endpoint validation using router configuration:

```typescript
// src/modules/auth/auth.router.ts
import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";
import z from "zod";

export const config: RouterConfig<"auth"> = {
  // Add query parameter validation to getMe
  getMe: {
    validation: {
      query: z.object({
        include: z.enum(["profile", "settings"]).optional(),
      }),
    },
  },

  // Override signup validation with custom rules
  signup: {
    validation: {
      body: z.object({
        email: z.string().email(),
        password: z.string().min(10), // Stricter password requirement
        name: z.string().min(2),
        terms: z.boolean().refine((val) => val === true, {
          message: "You must accept terms and conditions",
        }),
      }),
    },
  },
};

const router = ArkosRouter();

export default router;
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

Auth endpoint customization required overriding the entire endpoint:

```typescript
// src/modules/auth/auth.router.ts
import { Router } from "express";
import { RouterConfig } from "arkos";

export const config: RouterConfig = {
  // Configuration was limited
};

const router = Router();

// No built-in way to customize auth validation beyond file-based DTOs/schemas

export default router;
```

</TabItem>
</Tabs>

## Validation for Custom Routers

When creating custom routes with ArkosRouter, validation becomes declarative and powerful:

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```typescript
// src/routers/reports.router.ts
import { ArkosRouter } from "arkos";
import z from "zod";
import reportsController from "../controllers/reports.controller";

const router = ArkosRouter();

// Validate request body
const GenerateReportSchema = z.object({
  type: z.enum(["sales", "inventory", "customers"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  format: z.enum(["pdf", "excel"]).default("pdf"),
});

router.post(
  {
    path: "/api/reports/generate",
    authentication: {
      resource: "report",
      action: "Generate",
      rule: ["Admin", "Manager"],
    },
    validation: {
      body: GenerateReportSchema,
    },
  },
  reportsController.generateReport
);

// Validate query parameters
router.get(
  {
    path: "/api/reports/summary",
    validation: {
      query: z.object({
        year: z.number().int().min(2000).max(2100),
        quarter: z.number().int().min(1).max(4).optional(),
      }),
    },
  },
  reportsController.getSummary
);

// Validate path parameters
router.get(
  {
    path: "/api/reports/:id/download",
    validation: {
      params: z.object({
        id: z.string().uuid("Invalid report ID"),
      }),
    },
  },
  reportsController.downloadReport
);

// Validate all parts of the request
router.patch(
  {
    path: "/api/reports/:id",
    validation: {
      params: z.object({
        id: z.string().uuid(),
      }),
      body: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
      }),
      query: z.object({
        notify: z.boolean().optional(),
      }),
    },
  },
  reportsController.updateReport
);

export default router;
```

**With Class-Validator:**

```typescript
// src/routers/reports.router.ts
import { ArkosRouter } from "arkos";
import { IsEnum, IsString, IsOptional, IsUUID, IsBoolean } from "class-validator";
import reportsController from "../controllers/reports.controller";

const router = ArkosRouter();

class GenerateReportDto {
  @IsEnum(["sales", "inventory", "customers"])
  type: string;

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsEnum(["pdf", "excel"])
  @IsOptional()
  format?: string = "pdf";
}

class ReportParamsDto {
  @IsUUID()
  id: string;
}

class UpdateReportQueryDto {
  @IsBoolean()
  @IsOptional()
  notify?: boolean;
}

router.post(
  {
    path: "/api/reports/generate",
    validation: {
      body: GenerateReportDto,
    },
  },
  reportsController.generateReport
);

router.patch(
  {
    path: "/api/reports/:id",
    validation: {
      params: ReportParamsDto,
      query: UpdateReportQueryDto,
    },
  },
  reportsController.updateReport
);

export default router;
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// src/routers/reports.router.ts
import { Router } from "express";
import { handleRequestBodyValidationAndTransformation } from "arkos/middlewares";
import { GenerateReportSchema } from "../schemas/reports.schema";
import reportsController from "../controllers/reports.controller";

const router = Router();

// Body validation required manual middleware
router.post(
  "/api/reports/generate",
  handleRequestBodyValidationAndTransformation(GenerateReportSchema),
  reportsController.generateReport
);

// Query validation required manual implementation
router.get(
  "/api/reports/summary",
  reportsController.getSummary
);

// Params validation required manual implementation
router.get(
  "/api/reports/:id/download",
  // No built-in params validation helper
  reportsController.downloadReport
);

export default router;
```

</TabItem>
</Tabs>

## Validation Methods (Manual Usage)

For custom validation outside declarative configuration:

```typescript
import { validateDto, validateSchema } from "arkos/validation";
import CreateUserDto from "./dtos/create-user.dto";
import CreateUserSchema from "./schemas/create-user.schema";

// Class-validator validation
const validatedData = await validateDto(CreateUserDto, requestData);

// Zod validation
const validatedData = await validateSchema(CreateUserSchema, requestData);
```

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

For complex validation scenarios beyond Schemas/DTOs you can use [**Interceptor Middlewares**](/docs/core-concepts/interceptor-middlewares):

```typescript
// src/modules/user/user.interceptors.ts
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { AppError } from "arkos/error-handler";

export const beforeCreateOne = [
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    // Custom validation logic
    if (req.body.password !== req.body.confirmPassword) 
        throw new AppError("Passwords do not match", 400);


    // Check business rules
    const existingUser = await prisma.user.findUnique({
      where: { email: req.body.email },
    });

    if (existingUser) 
        throw new AppError("Email already exists", 409);


    next();
  }
];
```

:::warning
The extension `.interceptors.ts` only works from `v1.4.0-beta` and is the new recommended convention, if you are on earlier versions you must go with `.middlewares.ts`. You understand more about this change by reading this blog [Why Updating from .middlewares.ts to .interceptors.ts](/blog/v-1.4#why-updating-from-middlewares-ts-to-interceptors-ts).
:::

## Integration with API Documentation

Your Schemas and Dtos automatically generate JSON Schema for API documentation. The validation rules become part of your OpenAPI specification when using Arkos's built-in Swagger integration. Learn more about API documentation at [**Swagger API Documentation**](/docs/core-concepts/swagger-api-documentation).

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

1. **Consistent Validation Strategy**: Choose either Zod or class-validator for your entire project
2. **Match Your Database Schema**: Ensure validation rules align with your Prisma models
3. **Separate Concerns**: Use Schemas/DTOS for data structure, middlewares for business logic
4. **Error Messages**: Provide clear, user-friendly validation messages
5. **Security First**: Always validate sensitive operations like password changes
6. **API Documentation**: Leverage automatic schema generation for consistent docs
7. **Use Type Generics**: Apply `ArkosRequest<Query, Body, Params>` for TypeScript type safety

## Common Pitfalls

1. ❌ **Mixed Validation Approaches**: Using both Schemas and DTOs in the same project
2. ❌ **Incorrect File Naming**: Not following kebab-case convention for model names
3. ❌ **Missing Optional Decorators**: Forgetting `.optional()` or `@IsOptional()` for optional fields
4. ❌ **Password in Update Endpoints**: Including password validation in profile update DTOs
5. ❌ **Inconsistent Field Names**: DTO fields not matching your database schema
6. ❌ **Ignoring Type Safety**: Not using `ArkosRequest` generics in v1.4.0+

**Correct Implementation**: Follow naming conventions, use one validation approach, separate password updates, match database fields, and leverage TypeScript generics for type safety.
