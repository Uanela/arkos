---
sidebar_position: 3
---

# Base Controller Class

The `BaseController` class provides standardized RESTful API endpoints for any given prisma model in your application. It follows a standard controller pattern that handles common CRUD operations through a consistent interface, reducing code duplication across the application.

:::note
By default it is an **Arkos** internal utility class for handling the auto generated api endpoints, but this is exposed through `arkos` so that you can customize the end handler of your CRUD operations.
:::

As stated on the note above this is a class used internally by **Arkos** and also exposed for you if you want to override and customize the end handler. Hence the next texts is about how **Arkos** uses it behind the scenes to handle the auto generated endpoints.

### Purpose

This class provides a reusable set of controller methods that can be used for any model in the system, implementing standard REST operations.

### Constructor

```ts
constructor(modelName: string)
```

- **Parameters**:
    - `modelName`: The name of the model for which this controller will handle operations.
- **Behavior**:
    - Initializes a new `BaseService` instance for the specified model, [read more here](/docs/api-reference/the-base-service-class).
    - Loads any model-specific interceptor middlewares from the model modules, [see more here](/docs/core-concepts/interceptor-middlewares).

### Methods

#### **createOne**

Creates a single resource instance.

- **HTTP Method**: `POST`
- **Response**:
    - Status Code: `201 Created`
    - Body: `{ data: <created resource> }`
- **Interceptor Middleware Support**:
    - Can use `beforeCreateOne` middleware for pre-processing.
    - Can use `afterCreateOne` middleware for post-processing.

#### **createMany**

Creates multiple resource instances in a single operation.

- **HTTP Method**: `POST`
- **Response**:
    - Status Code: `201 Created`
    - Body: `{ total: <total count>, results: <count of created resources>, data: <array of created resources> }`
- **Interceptor Middleware Support**:
    - Can use `beforeCreateMany` middleware for pre-processing.
    - Can use `afterCreateMany` middleware for post-processing.

#### **findMany**

Retrieves multiple resources with filtering, sorting, pagination, and field selection.

- **HTTP Method**: `GET`
- **Query Parameters**:
    - Supports filtering, sorting, field limiting, and pagination via `APIFeatures`.
- **Response**:
    - Status Code: `200 OK`
    - Body: `{ total: <total count>, results: <count of returned resources>, data: <array of resources> }`
- **Interceptor Middleware Support**:
    - Can use `beforeFindMany` middleware for pre-processing.
    - Can use `afterFindMany` middleware for post-processing.

#### **findOne**

Retrieves a single resource by its identifier.

- **HTTP Method**: `GET`
- **URL Parameters**:
    - `id`: The ID of the resource to retrieve.
- **Query Parameters**:
    - `prismaQueryOptions`: Optional Prisma query options as a string.
- **Response**:
    - Status Code: `200 OK`
    - Body: `{ data: <retrieved resource> }`
- **Interceptor Middleware Support**:
    - Can use `beforeFindOne` middleware for pre-processing.
    - Can use `afterFindOne` middleware for post-processing.

#### **updateOne**

Updates a single resource by its identifier.

- **HTTP Method**: `PUT` or `PATCH`
- **URL Parameters**:
    - `id`: The ID of the resource to update.
- **Query Parameters**:
    - `prismaQueryOptions`: Optional Prisma query options as a string.
- **Response**:
    - Status Code: `200 OK`
    - Body: `{ data: <updated resource> }`
- **Interceptor Middleware Support**:
    - Can use `beforeUpdateOne` middleware for pre-processing.
    - Can use `afterUpdateOne` middleware for post-processing.

#### **updateMany**

Updates multiple resources that match the given criteria.

- **HTTP Method**: `PUT` or `PATCH`
- **Query Parameters**:
    - Requires at least one filter criterion.
    - Supports filtering and sorting via `APIFeatures`.
- **Response**:
    - Status Code: `200 OK`
    - Body: `{ total: <total count>, results: <count of updated resources>, data: <array of updated resources> }`
- **Interceptor Middleware Support**:
    - Can use `beforeUpdateMany` middleware for pre-processing.
    - Can use `afterUpdateMany` middleware for post-processing.
- **Error Handling**: Returns `400 Bad Request` if no filter criteria are provided.

#### **deleteOne**

Deletes a single resource by its identifier.

- **HTTP Method**: `DELETE`
- **URL Parameters**:
    - `id`: The ID of the resource to delete.
- **Response**:
    - Status Code: `204 No Content`
- **Interceptor Middleware Support**:
    - Can use `beforeDeleteOne` middleware for pre-processing.
    - Can use `afterDeleteOne` middleware for post-processing.

#### **deleteMany**

Deletes multiple resources that match the given criteria.

- **HTTP Method**: `DELETE`
- **Query Parameters**:
    - Requires at least one filter criterion.
    - Supports filtering and sorting via `APIFeatures`.
- **Response**:
    - Status Code: `200 OK`
    - Body: `{ total: <total count>, results: <count of deleted resources>, data: <array of deleted resources> }`
- **Interceptor Middleware Support**:
    - Can use `beforeDeleteMany` middleware for pre-processing.
    - Can use `afterDeleteMany` middleware for post-processing.
- **Error Handling**: Returns `400 Bad Request` if no filter criteria are provided.

## Default Endpoints When Auto Generated

**Format**: `/api/[pluralized-model-name]`

- For bulk operations (createMany, updateMany, deleteMany), append /many.

- For single operations, use the base path and optionally /:id for operations requiring a resource ID.

## Function: getAvalibleRoutes

### Purpose

Returns a list of all registered API routes in the Express application.

### Parameters

- `req`: The Express request object.
- `res`: The Express response object.
- `next`: The Express next function.

### Response

- A JSON array containing objects with `method` and `path` properties for each registered route.

## Function: getAvailableResources

### Purpose

Returns a list of all available resource endpoints based on the application's models.

### Response

- Status Code: 200 (OK)
- Body: `{ data: <array of kebab-cased model names plus "file-upload"> }`

## Overriding Default Handlers

#### Creating a Controller for a Specific Model

```ts
// src/modules/user/user.controller.ts
import {
    ArkosRequest,
    ArkosResponse,
    ArkosNextFunction,
    BaseController,
} from "arkos";

class UserController extends BaseController {
    constructor() {
        super("user"); // model-name in kebab-case
        // Add any user-specific controller methods or override base methods here

        // ✅ Will override the default createOne handler method
        createOne: catchAsync(
            async (
                req: ArkosRequest,
                res: ArkosResponse,
                next: ArkosNextFunction
            ) => {
                // this.service is made available on `BaseController`
                const data = await this.service.createOne(req.body, {
                    include: {
                        password: false,
                    },
                });

                res.status(201).json({ data });
            }
        );
    }
}

const userController = new UserController();

export default userController;
```

:::danger caution
Be carreful when overriding the defaults controller handlers as shown above, just do it if you know what you are really doing. Because this way you lose some **Arkos** built-in features such as (depending on the overridden handler): `request query paramaters handling`, `auto relation fields handling`, `standardized responses it all endpoints`, `must create your swagger docs for the endpoints`, `intercepetor middlewares injections` and others.
:::

When using `before` or `after` interceptor middlewares defined in the model's module file, they will be automatically loaded and executed after the corresponding operation but before sending the response even for `after` interceptor middlewares, there you can call `next()` and **Arkos** will send the responpse or you can send it youself using the `res` object.

You can read more about those interceptor middlewares [here](/docs/core-concepts/interceptor-middlewares).
