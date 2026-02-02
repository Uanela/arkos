---
sidebar_position: 4
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Request Data Validation

Request data validation in Arkos ensures incoming data meets your application's requirements before processing. The framework provides flexible validation through both class-validator and Zod integration, with automatic validation for request bodies, query parameters, and path parameters across all auto-generated endpoints, custom endpoints, and authentication routes.

**New in `v1.4.0-beta`**: [**ArkosRouter**](/docs/api-reference/arkos-router) brings declarative validation configuration that extends beyond just request bodies. You can now validate query parameters and path parameters for auto-generated endpoints, and enjoy a cleaner syntax for custom routes.

## Understanding the Three Validation Targets

Arkos validates three distinct parts of incoming HTTP requests, each serving a different purpose:

### 1. **Request Body (`req.body`)** - Data Being Created or Modified

The request body contains the payload data sent by the client, typically in POST, PATCH, or PUT requests. This is where you validate:

- Data being created (user registration, creating a product)
- Data being updated (profile changes, product modifications)
- Form submissions and complex data structures

**Example: Creating a product**

```typescript
// POST /api/products
// Request body:
{
  "name": "Wireless Mouse",
  "price": 29.99,
  "categoryId": "abc-123"
}
```

**Why validate req.body:**

- Prevent invalid data from entering your database
- Enforce business rules (e.g., price must be positive)
- Ensure required fields are present
- Protect against malicious or malformed data

### 2. **Query Parameters (`req.query`)** - Filtering and Configuration

Query parameters appear in the URL after the `?` symbol and control how data is retrieved or processed. This is where you validate:

- Filtering criteria (category, price ranges)
- Pagination settings (page, limit)
- Sorting preferences (sort by price, date)
- Feature flags (includeReviews, notify)

**Example: Filtering products**

```
GET /api/products?category=electronics&minPrice=50&maxPrice=200&page=2
```

**Why validate req.query:**

- Ensure data integrity and security by validating incoming query parameters
- Prevent SQL injection or Prisma query manipulation
- Type coercion (convert string "50" to number 50)
- Validate enum values (sort direction, status filters)
- Set safe limits on pagination to prevent performance issues

:::warning Critical: Query Parameter Security
Query parameters directly influence database queries. Without validation:

- User could request `limit=999999` causing performance issues
- Invalid category IDs could cause database errors
- Malformed date ranges could crash your application
- Type mismatches lead to unexpected query behavior

**Always validate query parameters** that affect database operations!
:::

### 3. **Path Parameters (`req.params`)** - Resource Identifiers

Path parameters are part of the URL path itself and identify specific resources. This is where you validate:

- Resource IDs (user IDs, product IDs)
- Route segments (slugs, categories)
- Versioning identifiers

**Example: Getting a specific product**

```
GET /api/products/550e8400-e29b-41d4-a716-446655440000
```

**Why validate req.params:**

- Validate UUID/ID format before database queries
- Prevent invalid IDs from causing database errors
- Ensure type safety (convert string IDs to proper formats)
- Catch routing errors early

:::tip Type Safety Across All Three
Use `ArkosRequest<Params, ResBody, ReqBody, Query>` generics in v1.4.0+ for full TypeScript type safety across all three validation targets:

```typescript
import { ArkosRequest, ArkosResponse } from "arkos";

interface ProductQuery {
  category?: string;
  minPrice?: number;
}

interface CreateProductBody {
  name: string;
  price: number;
}

interface ProductParams {
  id: string;
}

const handler = async (
  req: ArkosRequest<ProductParams, any, CreateProductBody, ProductQuery>,
  res: ArkosResponse
) => {
  // All validated and type-safe!
  const { category, minPrice } = req.query; // ✓ Type-safe query params
  const { name, price } = req.body; // ✓ Type-safe body data
  const { id } = req.params; // ✓ Type-safe path params
};
```

:::

## How Validation Works

Arkos automatically validates request data based on your chosen validation approach:

1. **Request arrives** at any API endpoint
2. **Validation middleware intercepts** the request
3. **Validation rules apply** to `req.body`, `req.query`, and `req.params` based on your DTOs or schemas
4. **Success**: Validated data replaces original data in `req.body`, `req.query`, or `req.params` with properly typed values and continues processing
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
    resolver: "zod", // or "class-validator"
    validationOptions: {
      whitelist: true, // Strips properties not defined in DTO/schema
      // Additional class-validator options
    },
  },
};

export default arkosConfig;
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// src/app.ts
import arkos from "arkos";

arkos.init({
  validation: {
    resolver: "zod", // or "class-validator"
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

| Option              | Description                                        |
| ------------------- | -------------------------------------------------- |
| `resolver`          | Validation library: `"zod"` or `"class-validator"` |
| `validationOptions` | Options passed to your chosen validator            |

:::warning Important
Validation is **disabled by default**. You must explicitly enable it in your configuration.
:::

## Accessing Validated Data

After validation passes, access the validated and type-safe data through standard Express request properties:

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
  maxPrice?: number;
}

// Use ArkosRequest with generics for type safety
const myHandler = async (
  req: ArkosRequest<ProductParams, any, CreateProductBody, ProductQuery>,
  res: ArkosResponse,
  next: ArkosNextFunction
) => {
  // ✓ Validated and type-safe access to req.body
  const { name, price, description } = req.body;
  // TypeScript knows: name is string, price is number, description is string | undefined

  // ✓ Validated and type-safe access to req.params
  const { id } = req.params;
  // TypeScript knows: id is string (validated as UUID)

  // ✓ Validated and type-safe access to req.query
  const { includeReviews, minPrice, maxPrice } = req.query;
  // TypeScript knows: includeReviews is boolean, minPrice/maxPrice are numbers
  // Note: Query values are type-coerced from strings to proper types!

  // All data is already validated according to your schemas
  // Safe to use directly in database queries
  const product = await prisma.product.create({
    data: { name, price, description },
  });

  res.json(product);
};
```

**Type Signature:**

```typescript
ArkosRequest<Params = any, ResBody = any, ReqBody = any, Query = any>
```

:::tip Type Safety Benefits
Using `ArkosRequest<Params, ResBody, ReqBody, Query>` generics provides:

- **Autocomplete**: IDE suggestions for all validated properties
- **Type checking**: Compile-time errors for invalid property access
- **Documentation**: Self-documenting code through types
- **Refactoring safety**: Changes to schemas automatically update types
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
  const { name, price } = req.body; // Body data
  const { id } = req.params; // URL parameters
  const { minPrice } = req.query; // Query parameters

  // Data is validated but no TypeScript type inference
  res.json({ name, price, id });
};
```

**Note**: In v1.3, `ArkosRequest` doesn't support generic type parameters for type safety.

</TabItem>
</Tabs>

## Validating Request Body for Auto-Generated Endpoints

### File Structure Convention For Prisma Models

Arkos automatically discovers validation files for request bodies based on naming conventions:

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
│   └── update-password.schema.ts
└── dtos/                        # Class-validator approach
    ├── login.dto.ts
    ├── signup.dto.ts
    ├── update-me.dto.ts
    └── update-password.dto.ts
```

:::warning Convention Requirements

- Model names must be in **kebab-case** for file names
- Must use exact naming pattern: `create-[model].schema.ts` / `update-[model].schema.ts`
- Choose either schemas **or** DTOs - cannot use both together
  :::

### Standard CRUD Body Validation

Define validation rules for request bodies on auto-generated endpoints using file-based discovery:

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

These files are automatically applied to validate `req.body` on:

- `POST /api/products` (createOne) → uses `create-product` schema/DTO
- `PATCH /api/products/:id` (updateOne) → uses `update-product` schema/DTO
- `POST /api/products/many` (createMany) → uses `create-product` schema/DTO
- `PATCH /api/products/many` (updateMany) → uses `update-product` schema/DTO

## Validating Query Parameters and Path Parameters

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (New Feature)" default>

**The new declarative approach allows you to validate query parameters and path parameters for auto-generated endpoints** - something that wasn't possible before v1.4.0:

```typescript
// src/modules/product/product.router.ts
import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";
import z from "zod";

export const config: RouterConfig = {
  // ✓ Validate query parameters (req.query) on findMany endpoint
  findMany: {
    validation: {
      query: z.object({
        category: z.string().optional(),
        minPrice: z.coerce.number().min(0).optional(),
        maxPrice: z.coerce.number().min(0).optional(),
        inStock: z.coerce.boolean().optional(),
        page: z.coerce.number().int().min(1).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional(),
      }),
    },
  },

  // ✓ Validate path parameters (req.params) on findOne endpoint
  findOne: {
    validation: {
      params: z.object({
        id: z.string().uuid("Invalid product ID format"),
      }),
    },
  },

  // ✓ Combine body, query, and params validation
  updateOne: {
    validation: {
      params: z.object({
        id: z.string().uuid(),
      }),
      // body validation comes from update-product.schema.ts (file-based)
      query: z.object({
        notify: z.coerce.boolean().optional(),
      }),
    },
  },
};

const router = ArkosRouter();

export default router;
```

:::tip New Capability
**This is a major improvement in v1.4.0**: Previously, only request bodies could be validated for auto-generated endpoints through file-based DTOs/schemas. Now you can validate **query parameters and path parameters** using the declarative router configuration.
:::

**Real-World Example: Why Query Validation Matters**

```typescript
// Without validation:
GET /api/products?minPrice=abc&limit=999999&inStock=yes

// ❌ Problems:
// - minPrice="abc" causes database error (expected number)
// - limit=999999 causes performance issues
// - inStock="yes" is truthy string, not boolean

// With validation:
export const config: RouterConfig = {
  findMany: {
    validation: {
      query: z.object({
        minPrice: z.coerce.number().min(0).optional(),     // ✓ Converts "50" → 50
        limit: z.coerce.number().int().min(1).max(100).optional(), // ✓ Caps at 100
        inStock: z.coerce.boolean().optional(),            // ✓ Converts "true" → true
      }),
    },
  },
};

// ✓ Invalid request returns clear error:
{
  "status": "error",
  "message": "Invalid Data",
  "errors": [
    {
      "property": "minPrice",
      "constraints": { "number": "minPrice must be a number" }
    }
  ]
}
```

**With Class-Validator DTOs:**

```typescript
// src/modules/product/product.router.ts
import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

class ProductQueryDto {
  @IsString()
  @IsOptional()
  category?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  inStock?: boolean;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
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

:::warning Type Coercion is Essential
Query parameters and path parameters arrive as **strings** from the URL. Always use:

- **Zod**: `z.coerce.number()`, `z.coerce.boolean()`
- **Class-Validator**: `@Type(() => Number)`, `@Type(() => Boolean)`

Without coercion, `minPrice=50` remains the string `"50"` instead of number `50`!
:::

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
import { ProductQuerySchema } from "./schemas/product-query.schema";

export const config: RouterConfig = {
  disable: {
    findMany: true, // Disable to override
  },
};

const router = Router();

// Manual override required for query validation
router.get("/", async (req, res) => {
  // Re-implement findMany logic manually
  const products = await prisma.product.findMany({
    where: req.query,
  });
  res.json(products);
});

export default router;
```

</TabItem>
</Tabs>

## Authentication Endpoint Validation

Authentication endpoints have special validation requirements and file naming conventions.

### Login Body Validation

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

### Signup Body Validation

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
import {
  IsString,
  IsEmail,
  MinLength,
  Matches,
  IsOptional,
  IsNotEmpty,
} from "class-validator";

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

### Profile Update Body Validation

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

### Password Change Body Validation

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

  // Override signup body validation with custom rules
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

## Validation for Custom Routes

When creating custom routes with ArkosRouter, validation becomes declarative and powerful:

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```typescript
// src/routers/reports.router.ts
import { ArkosRouter } from "arkos";
import z from "zod";
import reportsController from "../controllers/reports.controller";

const router = ArkosRouter();

// ✓ Validate request body (req.body)
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
      body: GenerateReportSchema, // Validates req.body
    },
  },
  reportsController.generateReport
);

// ✓ Validate query parameters (req.query)
router.get(
  {
    path: "/api/reports/summary",
    validation: {
      query: z.object({
        year: z.coerce.number().int().min(2000).max(2100),
        quarter: z.coerce.number().int().min(1).max(4).optional(),
        department: z.enum(["sales", "marketing", "engineering"]).optional(),
      }),
    },
  },
  reportsController.getSummary
);

// ✓ Validate path parameters (req.params)
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

// ✓ Validate all three: body, query, and params
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
        status: z.enum(["draft", "published", "archived"]).optional(),
      }),
      query: z.object({
        notify: z.coerce.boolean().optional(),
        sendEmail: z.coerce.boolean().optional(),
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
import { IsEnum, IsString, IsOptional, IsUUID, IsBoolean, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import reportsController from "../controllers/reports.controller

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

class ReportSummaryQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  @IsOptional()
  quarter?: number;

  @IsEnum(["sales", "marketing", "engineering"])
  @IsOptional()
  department?: string;
}

class ReportParamsDto {
  @IsUUID()
  id: string;
}

class UpdateReportBodyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(["draft", "published", "archived"])
  @IsOptional()
  status?: string;
}

class UpdateReportQueryDto {
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  notify?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean;
}

// Validate request body (req.body)
router.post(
  {
    path: "/api/reports/generate",
    validation: {
      body: GenerateReportDto,
    },
  },
  reportsController.generateReport
);

// Validate query parameters (req.query)
router.get(
  {
    path: "/api/reports/summary",
    validation: {
      query: ReportSummaryQueryDto,
    },
  },
  reportsController.getSummary
);

// Validate path parameters (req.params)
router.get(
  {
    path: "/api/reports/:id/download",
    validation: {
      params: ReportParamsDto,
    },
  },
  reportsController.downloadReport
);

// Validate all three: req.params, req.body, req.query
router.patch(
  {
    path: "/api/reports/:id",
    validation: {
      params: ReportParamsDto,
      body: UpdateReportBodyDto,
      query: UpdateReportQueryDto,
    },
  },
  reportsController.updateReport
);

export default router;
```

**Real-World Validation Example:**

```typescript
// Controller using validated data
import { ArkosRequest, ArkosResponse } from "arkos";

interface ReportQuery {
  year: number;
  quarter?: number;
  department?: string;
}

const getSummary = async (
  req: ArkosRequest<any, any, any, ReportQuery>,
  res: ArkosResponse
) => {
  // All query params are validated and type-coerced!
  const { year, quarter, department } = req.query;

  // TypeScript knows: year is number, not string
  // Safe to use directly in calculations
  const dateRange = {
    start: new Date(year, quarter ? (quarter - 1) * 3 : 0, 1),
    end: new Date(year, quarter ? quarter * 3 : 12, 0),
  };

  const reports = await prisma.report.findMany({
    where: {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
      department: department,
    },
  });

  res.json(reports);
};
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
router.get("/api/reports/summary", reportsController.getSummary);

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

:::tip Why Validate All Three Parts?
Each part serves a different purpose and requires validation:

- **`req.body`**: Prevents malformed data from entering your database
- **`req.query`**: Protects against query manipulation and ensures type safety
- **`req.params`**: Validates resource identifiers before database lookups

Validating only `req.body` while ignoring `req.query` and `req.params` leaves security gaps!
:::

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

Validation failures return structured error responses with details about which part of the request failed:

**Request body validation error:**

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

**Query parameter validation error:**

```json
{
  "status": "error",
  "message": "Invalid Data",
  "code": 400,
  "errors": [
    {
      "property": "minPrice",
      "constraints": {
        "number": "minPrice must be a number"
      }
    },
    {
      "property": "limit",
      "constraints": {
        "max": "limit must not be greater than 100"
      }
    }
  ]
}
```

**Path parameter validation error:**

```json
{
  "status": "error",
  "message": "Invalid Data",
  "code": 400,
  "errors": [
    {
      "property": "id",
      "constraints": {
        "isUuid": "id must be a valid UUID"
      }
    }
  ]
}
```

## Custom Validation with Interceptors

For complex validation scenarios beyond Schemas/DTOs, you can use [**Interceptor Middlewares**](/docs/core-concepts/interceptor-middlewares):

```typescript
// src/modules/user/user.interceptors.ts
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { AppError } from "arkos/error-handler";

export const beforeCreateOne = [
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    // Custom validation logic for req.body
    if (req.body.password !== req.body.confirmPassword) {
      throw new AppError("Passwords do not match", 400);
    }

    // Check business rules
    const existingUser = await prisma.user.findUnique({
      where: { email: req.body.email },
    });

    if (existingUser) {
      throw new AppError("Email already exists", 409);
    }

    // Validate query parameters for special operations
    if (req.query.sendWelcomeEmail === "true") {
      if (!req.body.email) {
        throw new AppError("Email required when sendWelcomeEmail is true", 400);
      }
    }

    next();
  },
];
```

:::info File Naming Convention
The `.interceptors.ts` extension is the recommended convention from `v1.4.0-beta` onwards. If you're on earlier versions, use `.middlewares.ts` instead.
:::

## Integration with API Documentation

Your Schemas and DTOs automatically generate JSON Schema for API documentation. The validation rules for `req.body`, `req.query`, and `req.params` become part of your OpenAPI specification when using Arkos's built-in Swagger integration.

**Example generated OpenAPI specification:**

```yaml
/api/products:
  get:
    parameters:
      - name: category
        in: query
        schema:
          type: string
      - name: minPrice
        in: query
        schema:
          type: number
          minimum: 0
      - name: maxPrice
        in: query
        schema:
          type: number
          minimum: 0
      - name: page
        in: query
        schema:
          type: integer
          minimum: 1
      - name: limit
        in: query
        schema:
          type: integer
          minimum: 1
          maximum: 100
```

Learn more about API documentation at [**Swagger API Documentation**](/docs/core-concepts/open-api-documentation).

## Validation Flow Summary

```
Request → Authentication Check → Validation Middleware →
  ├─ req.body validation
  ├─ req.query validation
  └─ req.params validation
    → DTO/Schema Validation → Type Coercion → Controller → Response
```

**For authenticated endpoints:**

1. JWT token verification
2. Request data validation (`req.body`, `req.query`, `req.params`)
3. Type coercion (strings → numbers, booleans, etc.)
4. Business logic execution

**For public endpoints:**

1. Request data validation (`req.body`, `req.query`, `req.params`)
2. Type coercion
3. Business logic execution

## Security Implications

**Without proper validation on all three parts:**

```typescript
// ❌ DANGEROUS: No validation
GET /api/products/invalid-uuid?limit=999999&minPrice=abc

// Results in:
// - Database error from invalid UUID
// - Performance issue from unlimited limit
// - Type error from non-numeric minPrice
```

**With comprehensive validation:**

```typescript
// ✓ SAFE: All parts validated
export const config: RouterConfig = {
  findOne: {
    validation: {
      params: z.object({
        id: z.string().uuid(), // Validates req.params.id
      }),
      query: z.object({
        limit: z.coerce.number().max(100), // Validates req.query.limit
        minPrice: z.coerce.number(), // Validates req.query.minPrice
      }),
    },
  },
};

// Invalid request returns clear error before hitting database
```

## Real-World Validation Scenarios

### Scenario 1: E-commerce Product Filtering

```typescript
// Without validation:
GET /api/products?minPrice=fifty&maxPrice=abc&category=12345&limit=999999

// Problems:
// - minPrice and maxPrice are strings, not numbers
// - Category might not exist
// - Unlimited limit causes performance issues

// With validation:
export const config: RouterConfig = {
  findMany: {
    validation: {
      query: z.object({
        minPrice: z.coerce.number().min(0).optional(),
        maxPrice: z.coerce.number().min(0).optional(),
        category: z.string().uuid().optional(),
        limit: z.coerce.number().int().min(1).max(100).optional(),
        inStock: z.coerce.boolean().optional(),
      }),
    },
  },
};
```

### Scenario 2: User Profile Update

```typescript
// Validate all three parts for comprehensive security
router.patch(
  {
    path: "/api/users/:id",
    validation: {
      params: z.object({
        id: z.string().uuid("Invalid user ID"), // req.params
      }),
      body: z.object({
        name: z.string().min(1).optional(), // req.body
        email: z.string().email().optional(),
      }),
      query: z.object({
        sendNotification: z.coerce.boolean().optional(), // req.query
      }),
    },
  },
  userController.updateProfile
);
```

### Scenario 3: Report Generation

```typescript
// Complex validation combining date ranges and enums
export const config: RouterConfig = {
  generateReport: {
    validation: {
      body: z
        .object({
          type: z.enum(["sales", "inventory", "customers"]),
          startDate: z.string().datetime(),
          endDate: z.string().datetime(),
        })
        .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
          message: "Start date must be before end date",
        }),
      query: z.object({
        format: z.enum(["pdf", "excel", "csv"]).default("pdf"),
        includeCharts: z.coerce.boolean().default(true),
      }),
    },
  },
};
```

## Validation Performance Tips

1. **Validate Early**: Validation happens before database queries, saving resources
2. **Use Appropriate Types**: Don't over-validate - `z.string()` is faster than complex regex
3. **Cache Validation Schemas**: Zod schemas are reusable and should be defined once
4. **Limit String Lengths**: Prevent DOS attacks with `.max()` on string fields
5. **Set Array Limits**: Validate array lengths to prevent memory issues

```typescript
// Good: Reasonable limits
const ProductQuerySchema = z.object({
  tags: z.array(z.string()).max(10), // Max 10 tags
  name: z.string().max(100), // Max 100 characters
  description: z.string().max(1000).optional(), // Max 1000 characters
});
```

**Correct Implementation**: Follow naming conventions, use one validation approach, validate all three parts (`req.body`, `req.query`, `req.params`), separate password updates, match database fields, leverage TypeScript generics for type safety, always use type coercion for query and path parameters, and set reasonable limits on all validated fields.
