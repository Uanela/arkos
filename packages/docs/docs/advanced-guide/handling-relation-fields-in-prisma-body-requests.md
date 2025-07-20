---
sidebar_position: 5
---

# Handling Relation Fields in Prisma Body Requests

One of the most powerful features of **Arkos** is its ability to automatically transform JSON data with nested relations into the appropriate Prisma operations. This eliminates the need to manually structure complex nested creates, updates, and connections.

When working with related entities in REST APIs or form submissions, the data structure you receive is typically flat or hierarchical JSON, not the nested operation structure Prisma expects. The `handleRelationFieldsInBody` utility bridges this gap by intelligently converting your API request data.

:::note
The `handleRelationFieldsInBody` is only used internally by **Arkos** and not exported to external usage, because let's be sincere you now how to handle this prisma stuff if not read about in [https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries](https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries).
:::

## Input And Output Example

### Input JSON (from client)

```json
{
  "name": "New Product",
  "price": 29.99,
  "description": "A fantastic product",
  "category": {
    "id": 5
  },
  "attributes": [
    { "name": "Color", "value": "Red" },
    { "name": "Size", "value": "Medium" }
  ],
  "tags": [{ "id": 1 }, { "id": 2 }],
  "images": [
    { "url": "image1.jpg", "isPrimary": true },
    { "id": 123, "isPrimary": false, "altText": "Updated alt text" },
    { "id": 456, "apiAction": "Delete" }
  ]
}
```

### Output (for Prisma)

```ts
{
  name: "New Product",
  price: 29.99,
  description: "A fantastic product",
  category: {
    connect: { id: 5 }
  },
  attributes: {
    create: [
      { name: "Color", value: "Red" },
      { name: "Size", value: "Medium" }
    ]
  },
  tags: {
    connect: [
      { id: 1 },
      { id: 2 }
    ]
  },
  images: {
    create: [
      { url: "image1.jpg", isPrimary: true }
    ],
    update: [
      { where: { id: 123 }, data: { isPrimary: false, altText: "Updated alt text" } }
    ],
    deleteMany: {
      id: { in: [456] }
    }
  }
}
```

:::tip
Even though **Arkos** have it's own helper function for hanlding relational fields data on request, you can write the it on your own as if your where sending a pure JSON for prisma adding connect, create, delete, update or ther features that prisma supports, and **Arkos** automatically notice and not try to apply nothing on it's own.
:::

:::warning
Bear in mind that if you implement your own logic for prisma relation fields operations as stated on the tip above, **Arkos** will not handle the nested fields inside the nested field (deeply nested) that you handled by yourself on the first level.
:::

### ❌ Arkos Will Not Handle Deeply Nested Fields For subCategory Automatically

```json
{
  "name": "New Product",
  "price": 29.99,
  "description": "A fantastic product",
  "subCategory": {
    "create": {
      { "name": "New Sub Category",  "category": { "id": 3 } }
    }
  },

}
// Where a new sub category must be created and be
// connected to a existing category with id 3
```

Here **Arkos** will not handle the connection of the sub category to the category you must pass this on your own as raw prisma data field, because prisma will throw an error writing like this. To assess this you must write the field entirely as an raw prisma data like the following example:

```json
{
  "name": "New Product",
  "price": 29.99,
  "description": "A fantastic product",
  "subCategory": {
    "create": {
      { "name": "New Sub Category",  "category": { "connect": { "id": 3 } } }
    }
  },
}
// Where a new sub category must be created and be
// connected to a existing category with id 3
```

You can read more about nested fields operations on Prisma Official documenation [clicking here](https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries#nested-writes).

### ✅ Arkos Will Handle Nested Fields For subCategory Automatically

```json
{
  "name": "New Product",
  "price": 29.99,
  "description": "A fantastic product",
  "subCategory": {
    "name": "New Sub Category",
    "category": { "id": 3 }
  }
}
// Where a new sub category must be created and be
// connected to a existing category with id 3.
```

Here **Arkos** will scan the nested fields on subCategory to handle this for you and automaticlly transform this to a valid prisma raw data like below:

```json
{
  "name": "New Product",
  "price": 29.99,
  "description": "A fantastic product",
  "subCategory": {
    "create": {
      { "name": "New Sub Category",  "category": { "connect": { "id": 3 } } }
    }
  },
}
// Where a new sub category must be created and be
// connected to a existing category with id 3
```

## How Operations Are Determined

The utility `handleRelationFieldsInBody` function examines the structure of each relation field to determine the appropriate Prisma operation:

1. **Connect Operation**

   - Input: `{ "fieldName": { "id": 5 } }`
   - Result: `{ fieldName: { connect: { id: 5 } } }`
   - Note: Works with any @unique field for connecting.

2. **Connect with Unique Field**

   - Input: `{ "fieldName": { "email": "user@example.com" } }`
   - Result: `{ fieldName: { connect: { email: "user@example.com" } } }`
   - Note: Field must be defined as @unique in schema.

3. **Create Operation**

   - Input: `{ "fieldName": { "name": "New Item" } }`
   - Result: `{ fieldName: { create: { name: "New Item" } } }`
   - Note: Field must NOT be @unique or Arkos will try to connect instead.

4. **Update Operation**

   - Input: `{ "fieldName": { "id": 5, "name": "Updated" } }`
   - Result: `{ fieldName: { update: { where: {id: 5}, data: { name: "Updated" } } } }`
   - Note: Can use any @unique field instead of id.

5. **Delete Operation**

   - Input: `{ "fieldName": { "id": 5, "apiAction": "Delete" } }`
   - Result: `{ fieldName: { `Delete`: { where: { id: 5 } } } }` (or deleteMany for arrays)
   - Note: Can use any @unique field with `"apiAction": "Delete"`.

6. **Disconnect Operation**
   - Input: `{ "fieldName": { "id": 5, "apiAction": "disconnect" } }`
   - Result: `{ fieldName: { `disconnect`: { where: { id: 5 } } } }`
   - Note: Can use any @unique field with `"apiAction": "disconnect"`.

:::warning important
Bear in mind that to connect you can use any field that is @unique under your model schema or otherwise **Arkos** will try to create by default.

By default when you want to update nested relation fields **Arkos** will automatically look for an `id` on the nested data if not found then a @unique field will be searched if not found also **Arkos** will judge it as a data to be created.
:::

## Common JSON Patterns and Their Transformations

### Creating a New Entity with Relations

```json
// Input JSON
{
  "title": "New Blog Post",
  "content": "This is the content",
  "author": { "id": 123 },
  "tags": [
    { "name": "Technology" },
    { "name": "Programming" }
  ]
}

// Transformed for Prisma
{
  "title": "New Blog Post",
  "content": "This is the content",
  "author": {
    "connect": { "id": 123 }
  },
  "tags": {
    "create": [
      { "name": "Technology" },
      { "name": "Programming" }
    ]
  }
}
```

### Updating an Entity with Mixed Relation Operations

```json
// Input JSON
{
  "id": 456,
  "title": "Updated Blog Post",
  "comments": [
    { "id": 1, "text": "Updated comment" },
    { "content": "New comment" },
    { "id": 3, "apiAction": "Delete" }
  ]
}

// Transformed for Prisma
{
  "id": 456,
  "title": "Updated Blog Post",
  "comments": {
    "update": [
      { "where": { "id": 1 }, "data": { "text": "Updated comment" } }
    ],
    "create": [
      { "content": "New comment" }
    ],
    "deleteMany": {
      "id": { "in": [3] }
    }
  }
}
```

### Connecting by Unique Fields

```json
// Input JSON
{
  "name": "New Order",
  "customer": { "email": "customer@example.com" },
  "products": [
    { "sku": "PROD-123" },
    { "sku": "PROD-456" }
  ]
}

// Transformed for Prisma (assuming email and sku are unique fields)
{
  "name": "New Order",
  "customer": {
    "connect": { "email": "customer@example.com" }
  },
  "products": {
    "connect": [
      { "sku": "PROD-123" },
      { "sku": "PROD-456" }
    ]
  }
}
```

:::note
Note that this behavior is handled on the service layer of **Arkos** request handling pipeline for each prisma model, you can read more about the Request Handling Pipeline [clicking here](/docs/api-reference/request-handling-pipeline).
:::

## The `apiAction` Property

You can include an `apiAction` property to explicitly specify the operation:

```json
{
  "items": [
    { "id": 1, "quantity": 3, "apiAction": "update" },
    { "productId": 42, "quantity": 1 },
    { "id": 3, "apiAction": "delete" },
    { "id": 4, "apiAction": "disconnect" },
    { "id": 5, "apiAction": "connect" }
  ]
}
```

Valid `apiAction` values:

- `"create"`: Force create operation
- `"connect"`: Force connect operation even with additional fields
- `"update"`: Explicitly mark for update
- `"delete"`: Remove relation (uses `deleteMany` for arrays automatically)
- `"disconnect"`: Disconnect without deleting

## Integration with Arkos

This utility is automatically integrated into Arkos' base services. If you're using the framework's default base services methods, the relation handling happens automatically:

:::warning
The following code snippet is just a mere example of something done by **Arkos** behind the scenes on the auto generated api endpoints for your prisma models.
:::

```ts
import { BaseService } from "arkos/services";
import { BaseController } from "arkos";

export class ProductController extends BaseController {
  private productService: BaseService;

  constructor() {
    this.service = new BaseService("product"); // Automatically handles relations for Product model
  }

  // Create a product with relations
  async createProduct(req, res) {
    try {
      // BaseService.createOne already uses handleRelationFieldsInBody internally
      const product = await this.service.createOne(req.body);
      res.status(201).json({ data: product });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Update a product with relations
  async updateProduct(req, res) {
    try {
      // BaseService.updateOne also uses handleRelationFieldsInBody internally
      const product = await this.service.updateOne(
        { id: parseInt(req.params.id) },
        req.body
      );
      res.status(200).json({ data: product });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

## Best Practices

1. **Document API Structure**: Ensure your frontend developers understand the expected structure
2. **Validate Input**: Always validate input data before passing to relation handlers
3. **Consider Depth**: For very deep nesting, consider separate API endpoints
4. **Use Explicit Actions**: When the default behavior isn't sufficient, use `apiAction`
5. **Handling Files**: For relations that include file uploads, process uploads first then add file references to your data
