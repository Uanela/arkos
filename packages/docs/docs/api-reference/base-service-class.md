---
sidebar_position: 5
---

# Base Service Class

The `BaseService` class is a fundamental component that provides standardized CRUD (Create, Read, Update, Delete) operations for all models in the application and is used by default behind the scenes in **Arkos** as a prisma models services factory. It serves as a base class that can be extended and customized for model-specific service implementations.

- Provide consistent, reusable data access methods across all models
- Handle common operations like relation management and error handling
- Allow for model-specific overrides and extensions
- Reduce code duplication in service implementations

## Properties

| Property    | Type           | Description                     |
| ----------- | -------------- | ------------------------------- |
| `modelName` | `string`       | The camelCase name of the model |
| `prisma`    | `PrismaClient` | Instance of the Prisma client   |

## Constructor

```ts
constructor(modelName: string)
```

- **Parameters**:
  - `modelName`: The name of the model for which this service will handle operations.

## Core Methods

### `createOne`

Creates a single record in the database.

```ts
async createOne(body: Record<string, any>, queryOptions: string = "{}"): Promise<any>
```

- **Parameters**:
  - `body`: Object containing data for the new record
  - `queryOptions`: (Optional) JSON string with additional Prisma query options
- **Returns**: The created record
- **Special Handling**:
  - Automatically hashes passwords for User model
  - Handles relation fields in the request body
  - By default includes all singular and list relation fields (customizable on your defined custom prisma query options).

### `createMany`

Creates multiple records in a single database operation.

```ts
async createMany(body: Record<string, any>[]): Promise<{ total: number; data: any }>
```

- **Parameters**:
  - `body`: Array of objects containing data for the new records
- **Returns**: Object containing total count and created data
- **Special Handling**:
  - Automatically hashes passwords for User model
  - Handles relation fields in the request body
  - By default includes all relation fields singular and list fields (customizable on your defined custom prisma query options).

### `findMany`

Retrieves multiple records based on provided filters.

```ts
async findMany(filters: Record<string, any>): Promise<{ total: number; data: any }>
```

- **Parameters**:
  - `filters`: Object containing filters to apply to the query
- **Returns**: Object containing total count and found data
- **Special Handling**:
  - By default includes all singular relation fields (customizable on your defined custom prisma query options). only singular because of perfomance concerns.

### `findOne`

Finds a single record by its parameters.

```ts
async findOne(filters: Record<string, any>, queryOptions: string = "{}"): Promise<any>
```

- **Parameters**:
  - `filters`: Object containing criteria to find the record
  - `queryOptions`: (Optional) JSON string with additional Prisma query options
- **Returns**: The found record
- **Error Handling**: Throws a 404 error if the record is not found
- **Special Handling**:
  - By default includes all singular and list relation fields (customizable on your defined custom prisma query options).

### `updateOne`

Updates a single record by its ID.

```ts
async updateOne(filters: Record<string, any>, body: Record<string, any>, queryOptions: string = "{}"): Promise<any>
```

- **Parameters**:
  - `filters`: Object containing criteria to find the record
  - `body`: Object containing data to update
  - `queryOptions`: (Optional) JSON string with additional Prisma query options
- **Returns**: The updated record
- **Error Handling**: Throws a 404 error if the record is not found
- **Special Handling**:
  - Automatically hashes passwords for User model
  - Handles relation fields in the request body
  - By default includes all singular relation fields and list (customizable on your defined custom prisma query options).

### `updateMany`

Updates multiple records based on the provided filter and data.

```ts
async updateMany(filters: Record<string, any>, body: Record<string, any>): Promise<{ total: number; data: any }>
```

- **Parameters**:
  - `filters`: Object containing filters to identify records
  - `body`: Object containing data to update
- **Returns**: Object containing total count and update result
- **Error Handling**: Throws a 404 error if no records match the filters
- **Special Handling**:
  - Automatically hashes passwords for User model
  - Handles relation fields in the request body
  - By default includes all singular relation fields (customizable on your defined custom prisma query options).

### `deleteOne`

Deletes a single record by its ID.

```ts
async deleteOne(params: Record<string, any>): Promise<any>
```

- **Parameters**:
  - `params`: Object containing parameters to find the record
- **Returns**: The deleted record

### `deleteMany`

Deletes multiple records based on the provided filter.

```ts
async deleteMany(filters: Record<string, any>): Promise<{ total: number; data: any }>
```

- **Parameters**:
  - `filters`: Object containing filters to identify records
- **Returns**: Object containing total count and delete result
- **Error Handling**: Throws a 404 error if no records match the filter

## Extending BaseService with Custom Services

The `BaseService` class was designed to **Arkos** internal usage and can be extended for model-specific implementations. This allows you to override default behavior or add custom methods.

### File Structure

```
src/
└── modules/
    └── [model-name]/
        └── [model-name].service.ts
```

### Creating a Custom Service

To create a custom service for a specific model:

1. Create a new service file at `src/modules/[model-name]/[model-name].service.ts`
2. Extend the `BaseService` class
3. Override methods or add new ones as needed

### Example: Custom User Service

:::warning
By overriding default methods these new ones will then be used by **Arkos** behind the scenes under the request handling pipeline, which you can see more [here](/docs/api-reference/request-handling-pipeline)
:::

```ts
// src/modules/user/user.service.ts
import { BaseService } from "arkos/services";
import { prisma } from "../../utils/prisma";
import { AppError } from "arkos/error-handler";
import { authService } from "arkos/services";
import prisma from "../../utils/prisma";

class UserService extends BaseService<typeof prisma.user> {
  constructor() {
    super("user");
  }

  // ⚠️ Overrides createOne method to add custom logic
  async createOne(
    body: Record<string, any>,
    queryOptions: string = "{}"
  ): Promise<any> {
    // Custom validation
    if (!body.email) {
      throw new AppError("Email is required", 400);
    }

    // Check if email already exists
    const prisma = getPrismaInstance();
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      throw new AppError("Email already in use", 400);
    }

    // Call the parent createOne method
    return super.createOne(body, queryOptions);
  }

  // Add a custom method
  async findByEmail(email: string): Promise<any> {
    const prisma = getPrismaInstance();
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        ...this.singularRelationFieldToInclude,
        ...this.listRelationFieldToInclude,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  // Add a method for changing password
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<any> {
    const prisma = getPrismaInstance();
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Validate old password
    const isValidPassword = await authService.isCorrectPassword(
      oldPassword,
      user.password
    );
    if (!isValidPassword) {
      throw new AppError("Invalid old password", 400);
    }

    // Hash and update the new password
    const hashedPassword = await authService.hashPassword(newPassword);
    return this.updateOne({ id: userId }, { password: hashedPassword });
  }
}

// Export as singleton instance
const userService = new UserService();

export default userService;
```

Once you've created a custom service, it will be automatically loaded by **Arkos** when the application starts and for methods that you've overridden those will be used as default into the auto generated endpoints. And You can use it in anywhere in your application also.

## Best Practices

When extending `BaseService`:

1. **Keep the Constructor Simple**: Pass the model name to the parent constructor.
2. **Reuse Parent Methods**: Call the parent method using `super` when appropriate.
3. **Add Model-Specific Logic**: Implement custom validation, business rules, or domain-specific behavior.
4. **Export as Singleton**: Create a single instance of your service and export it as the default export.
5. **Handle Transactions**: For operations that need to be atomic, use Prisma transactions.
6. **Maintain Consistency**: Follow the same error handling patterns used in the base service.

## Common Customization Scenarios

### 1. Advanced Validation

```ts
//  ✅ Will override default service method
// NB: Must be as method of a class extending BaseService class
async createOne(body: Record<string, any>, queryOptions: string = "{}"): Promise<any> {
  // Custom validation logic
  if (body.startDate && body.endDate && new Date(body.startDate) > new Date(body.endDate)) {
    throw new AppError("Start date cannot be after end date", 400);
  }

  return super.createOne(body, queryOptions);
}
```

### 2. Business Rules Enforcement

```ts
// ✅ Will override default service method
// NB: Must be as method of a class extending BaseService class
async updateOne(filters: Record<string, any>, body: Record<string, any>, queryOptions: string = "{}"): Promise<any> {
  // Get the existing record
  const existing = await this.findOne(filters);

  // Business rule: Cannot change status from 'completed' to anything else
  if (existing.status === 'completed' && body.status && body.status !== 'completed') {
    throw new AppError("Cannot change status after completion", 400);
  }

  return super.updateOne(filters, body, queryOptions);
}
```

:::danger caution
Be carreful when overriding the default services methods as shown above, just do it if you know what you are really doing. Because this way you lose some **Arkos** built-in features such as (depending on the overridden method): `auto relation fields handling`, `password hashing for users`, `relation fields include handling` and others.
:::

### 3. Complex Aggregations or Reporting

```ts
// ❌ Will not override nothing because `BaseService` does not have this method
async getUserStats(userId: string): Promise<any> {
  const prisma = getPrismaInstance();

  const stats = await prisma.$queryRaw`
    SELECT
      COUNT(*) as totalOrders,
      SUM(amount) as totalSpent,
      MAX(createdAt) as lastOrderDate
    FROM "Order"
    WHERE "userId" = ${userId}
  `;

  return stats[0];
}
```
