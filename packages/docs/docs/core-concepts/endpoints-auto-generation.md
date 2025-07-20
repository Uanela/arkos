---
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Endpoints Auto Generation

## How Arkos Generates API Routes

Arkos automatically generates a complete RESTful API for each model defined in your Prisma schema, eliminating the need to manually create routes, controllers, and services. Let's look at how this powerful feature works behind the scenes.

### 1. Core Concepts

The auto-generation process happens through several key components:

1. **Reading Prisma Schema**: Arkos analyzes your Prisma models to understand your data structure, including fields and relationships
2. **Route Generation**: Creates standardized REST endpoints for each model
3. **Controller Logic**: Implements standard CRUD operations that follow best practices
4. **Middleware Support**: Allows for customization at various points in the request lifecycle
5. **Authentication & Authorization**: Integrates security controls automatically

### 2. The Generation Pipeline

In the following steps we can see how Arkos generates these endpoints, for each model in your Prisma schema:

1. Arkos converts the model name to kebab-case (e.g., `UserProfile` becomes `user-profile`, `OrderItem` - `order-item`, `User` - `user`).
2. It loads any custom modules you've defined for that model under `src/modules/[model-name-in-kebab]`.
3. It pluralizes the model name for RESTful route naming (e.g., `user-profile` becomes `user-profiles`).
4. It uses the `BaseController` to create controller functions for all CRUD operations.

### 3. Generated Endpoints

For each model, Arkos creates the following endpoints :

:::tip
Arkos converts the model names to kebab-case and to plural e.g UserProfile to user-profiles, user to users. The pluralization of the model names happens only on the api endpoints.
:::

| HTTP Method | Endpoint                 | Description                                       |
| ----------- | ------------------------ | ------------------------------------------------- |
| GET         | `/api/[model-name]`      | List all records with filtering, pagination, etc. |
| POST        | `/api/[model-name]`      | Create a single record                            |
| GET         | `/api/[model-name]/:id`  | Retrieve a specific record by ID                  |
| PATCH       | `/api/[model-name]/:id`  | Update a specific record                          |
| DELETE      | `/api/[model-name]/:id`  | Delete a specific record                          |
| POST        | `/api/[model-name]/many` | Create multiple records                           |
| PATCH       | `/api/[model-name]/many` | Update multiple records based on filter           |
| DELETE      | `/api/[model-name]/many` | Delete multiple records based on filter           |

## Behind the Scenes

### The `BaseService` Class

Arkos uses a powerful `BaseService` class to handle operations across all models:

#### Mere Behind The Scenes Ilustration

```ts
class BaseService {
  // Class implementation...

  async createOne(
    body: Record<string, any>,
    queryOptions: string = "{}"
  ): Promise<any> {
    // Handle password hashing for users
    if (kebabCase(this.modelName) === "user" && body.password)
      body.password = await authService.hashPassword(body.password);

    // Handles relationships automatically
    const bodyWithRelationFieldsHandled = handleRelationFieldsInBody(
      body,
      { ...this.relationFields },
      ["Delete", "disconnect", "Update"]
    );

    // Execute Prisma query with all options merged
    return await prisma[this.modelName].create(/* ... */);
  }

  // Other methods...
}
```

This is by default an internal **Arkos** class used behind the scenes to handle your prisma models services in the generated api endpoints, if you would like to setup your own services for CRUD operations (which sucks), you can read about the `BaseService` class and how to implement it on your code [clicking here](/docs/api-reference/the-base-service-class).

This class intelligently:

- Handles Prisma relationships automatically
- Manages special cases like password hashing
- Applies your custom query options

### The `BaseController` Class

The `BaseController` class creates standardized controllers that:

1. Pass request data to the appropriate service method
2. Handle response formatting consistently
3. Manage error handling through the `catchAsync` wrapper
4. Support interceptor middlewares for customization

#### Mere Behind The Scenes Ilustration

```ts
class BaseController {
 constructor(modelName: string){
   this.baseService = new BaseService(modelName);
 }
  // Create controller methods for all operations...

  return {
    createOne: catchAsync(async (req, res, next) => {
      // Controller implementation...
    }),
    // Other controller methods...
  };
}
```

> This is also an internal **factory** class used by **Arkos** and is exposed for usage outside **Arkos**, [read more about](/docs/api-reference/the-base-controller-class).

## Overview Handling Request Query Parameters

**Arkos** handles the query parameters of Express requests for the developers, providing built-in things like

- **Filtering**
- **Searching** \*only for string fields.
- **Sorting**
- **Pagination** - with limit of results also.
- **Fields Selection**

The `APIFeatures` class is an internal utility designed by in **Arkos** to parse and transform query parameters from an incoming HTTP request into a structured Prisma query object. This allows the developer to dynamically apply filters, sorting, pagination, field selection, and search functionality when querying the database. To more details and advanced concepts about query parameters handling with arkos [see more](/docs/guide/request-query-parameters).

### Example Request Query Handling

#### Request URL

```
GET /api/items?page=2&limit=10&sort=-createdAt&search=phone&fields=name,price
```

#### Transformed Prisma Query

```json
{
  "where": {
    "OR": [
      { "name": { "contains": "phone", "mode": "insensitive" } },
      { "description": { "contains": "phone", "mode": "insensitive" } }
    ]
  },
  "orderBy": [{ "createdAt": "desc" }],
  "select": { "name": true, "price": true },
  "skip": 10,
  "take": 10
}
```

This allows us to dynamically filter, search, and paginate data while keeping our API flexible and efficient.

## Checking Availabe Routes

By default **Arkos** exposes an `/api/available-routes` endpoint so that you can see all the available routes in your RESTful API even though without using the built-in documenation with swagger.

:::danger
This is only available for users with `isSuperUser` set to true or only under development.
:::

### Sending Request

```
GET /api/available-routes
```

### Response Example

```json
[
  {
    "method": "POST",
    "path": "/api/posts"
  },
  {
    "method": "GET",
    "path": "/api/posts"
  }
  // other endpoints
]
```

## Checking Available Resources

By default **Arkos** exposes also an `/api/available-resources` endpoint so that you can see all the available resources (prisma models) in your RESTful API even though without using the built-in documenation with swagger. It also includes image-upload, video-upload, document-upload, audio-upload and file-upload.

:::danger
This is only available for users with `isSuperUser` set to true or only under development.
:::

### Sending Request

```
GET /api/available-resources
```

### Response Example

```json
[
  "post",
  "user",
  "author",
  "file-upload" // for all kind of files
  // other resources
]
```

> This is useful when you want to create `authPermission` when using `Dynamic RBAC Authentication` so that you do not need to worry to keep your frontend or even keep a list synced with all your availabe db resources. You can read more about [here](/docs/advanced-guide/dynamic-rbac-authentication).

## Summary

Arkos's auto-generation system provides:

1. **Zero-configuration API**: Get a complete REST API with just your Prisma schema
2. **Consistent patterns**: All endpoints follow the same design patterns and best practices
3. **Flexible customization**: Middleware, auth configs, and DTOs let you customize any aspect
4. **Relationship handling**: Automatic handling of complex Prisma relationships
5. **Performance optimized**: Built-in pagination, filtering, and field selection

By understanding how Arkos generates these APIs, you can leverage its full power while customizing only the parts that need special behavior for your application.
