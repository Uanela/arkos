---
sidebar_position: 2
---

# Request Query Parameters

Arkos provides a sophisticated mechanism to transform URL query parameters into full-featured Prisma queries. Here's a detailed breakdown of how query parameters are translated:

### 1. Basic Filtering Transformation

```curl
GET /api/users?age=25&status=active
```

Translates to Prisma query:

```ts
const users = await prisma.user.findMay({
  where: {
    OR: [{ age: 25 }, { status: "active" }];
  }
})
```

### 2. Comparison Operators Mapping

```
GET /api/products?price[gte]=50&price[lt]=100
```

Prisma equivalent:

```ts
const products = await prisma.product.findMany({
  where: {
    price: {
      gte: 50,
      lt: 100,
    },
  },
});
```

### 3. Advanced Search Mechanism

The search functionality dynamically builds searchable fields:

```
GET /api/users?search=john
```

Generates a Prisma query that searches across all string fields but the ones that ends in id, ids, ID, IDs because they are not searchable as simple strings:

```ts
const users = await prisma.user.findMany({
  where: {
    OR: [
      { name: { contains: "john", mode: "insensitive" } },
      { email: { contains: "john", mode: "insensitive" } },
      // other string fields
    ];
  }
})
```

### 4. Pagination

This allows you to seamlessly query you endpoints with pagination

```
GET /api/products?page=4
```

Translates to:

```ts
const products = await prisma.products.findMany({
  take: 30,
  skip: 90, // limit (default 30) * page - 1
});
```

If you want to take more records or even less recors do:

```
GET /api/products?page=4&limit=100
```

Translates to:

```ts
const products = await prisma.products.findMany({
  take: 100,
  skip: 300,
});
```

### 5. Limiting

The limiting feature controls how many records are returned in the response. It works in conjunction with pagination.

By default, queries return 30 records. You can change this using the `limit` parameter:

```
GET /api/products?limit=10
```

Translates to:

```ts
const products = await prisma.product.findMany({
  take: 10,
});
```

#### Limit with Pagination

When combining limit with pagination, the limit determines how many records are returned per page:

```
GET /api/products?page=2&limit=50
```

Translates to:

```ts
const products = await prisma.product.findMany({
  take: 50,
  skip: 50, // (page - 1) * limit = (2 - 1) * 50
});
```

#### Limit Range

You can use any positive integer for the limit. Common examples:

```
GET /api/products?limit=5    // Returns 5 records
GET /api/products?limit=100  // Returns 100 records
GET /api/products?limit=1    // Returns 1 record
```

#### Combining Sorting and Limiting

These features work seamlessly together:

```
GET /api/products?sort=-price&limit=10
```

This returns the 10 most expensive products:

```ts
const products = await prisma.product.findMany({
  orderBy: [{ price: "desc" }],
  take: 10,
});
```

#### Full Example with All Features

```
GET /api/products?search=laptop&price[gte]=500&sort=-rating,-price&page=1&limit=20&fields=id,name,price,rating
```

This complex query will:

- Search for 'laptop' in string fields
- Filter products with price >= 500
- Sort by rating (descending), then price (descending)
- Get the first page with 20 items
- Return only id, name, price, and rating fields

Translates to:

```ts
const products = await prisma.product.findMany({
  where: {
    OR: [
      { name: { contains: "laptop", mode: "insensitive" } },
      { description: { contains: "laptop", mode: "insensitive" } },
      // other string fields
      { price: { gte: 500 } },
    ],
  },
  orderBy: [{ rating: "desc" }, { price: "desc" }],
  skip: 0,
  take: 20,
  select: {
    id: true,
    name: true,
    price: true,
    rating: true,
  },
});
```

### 6. Sorting

The sorting feature allows you to order results by one or more fields in ascending or descending order.

#### Basic Sorting (Ascending)

```
GET /api/products?sort=price
```

Translates to:

```ts
const products = await prisma.product.findMany({
  orderBy: [{ price: "asc" }],
});
```

#### Descending Sort

To sort in descending order, prefix the field name with a minus sign `-`:

```
GET /api/products?sort=-price
```

Translates to:

```ts
const products = await prisma.product.findMany({
  orderBy: [{ price: "desc" }],
});
```

#### Multiple Field Sorting

You can sort by multiple fields using comma separation. The order matters - the first field is the primary sort, the second is the secondary sort, and so on:

```
GET /api/products?sort=-price,name
```

This will first sort by price in descending order, then by name in ascending order:

```ts
const products = await prisma.product.findMany({
  orderBy: [{ price: "desc" }, { name: "asc" }],
});
```

#### Complex Sorting Example

```
GET /api/users?sort=-createdAt,lastName,firstName
```

Translates to:

```ts
const users = await prisma.user.findMany({
  orderBy: [{ createdAt: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
});
```

This will:

1. Sort by creation date (newest first)
2. Then by last name alphabetically
3. Finally by first name alphabetically

### 5. Selecting, Adding And Removing Fields

#### 5.1. Selecting

This allows you to whether take just some fields of the desired record, let's say a product model with `id`, `name`, `description`, `price`, `color`, `weight`, and instead of taking all the fields when querying, you can only take for example `name` and `price` depending of your needs

```
GET /api/products?fields=name,price
```

Translates to:

```ts
const products = await prisma.products.findMany({
  select: {
    name: true,
    price: true,
  },
});
```

#### 5.2. Adding

To add fields that are not default selected to the end result, we must simple prefix the desired field with plus symbol `+`:

```
GET /api/products?fields=+reviews
```

Will select all default fields + `reviews`. Translates to:

```ts
const products = await prisma.products.findMany({
  include: {
    reviews: true,
  },
});
```

#### 5.3. Removing

To remove some fields from the end result, let's instead of naming all the fields you want you can just takeout the one you don't want:

```
GET /api/products?fields=-name,-price
```

Will select all the other fields but `name` and `price`. Translates to:

```ts
const products = await prisma.products.findMany({
  include: {
    name: false,
    price: false,
  },
});
```

## Complex Querying Capabilities

### 6. Nested and Relational Filtering

```

GET /api/posts?author[age]=30&comments[some][content][contains]=interesting

```

Translates to:

```ts
const posts = await prisma.post.findMany({
  where: {
    OR: [
      {
        author: {
          age: "30",
        },
      },
      {
        comments: {
          some: {
            content: {
              contains: "interesting",
            },
          },
        },
      },
    ],
  },
});
```

### 7. Logical Operator Control

The `filterMode` parameter allows switching between `OR` and `AND` logic:

```
GET /api/users?filterMode=AND&age=25&status=active
```

Produces:

```ts
const users = await prisma.user.findMany({
  where: {
    AND: [{ age: 25 }, { status: "active" }];
  }
})
```

## Advanced Query Composition

### 8. Combining Multiple Query Features

```
GET /api/products?search=wireless&price[gte]=50&price[lt]=200&sort=-price&page=2&limit=10&fields=id,name,price,+reviews
```

This complex query would:

- Search for 'wireless' across string fields
- Filter products between 50 and 200
- Sort by price in descending order
- Paginate to the second page
- Limit to 10 results
- Return only specific fields: id, name and price. Noticed `+reviews` is because it is not default selected so we're adding it.

And it produces:

```ts
const products = await prisma.product.findMany({
  where: {
    OR: [
      {
        name: {
          contains: "wireless",
          mode: "insensitive",
        },
      },
      {
        description: {
          // Let's say our Product model have description
          // field which is String search=wireless will
          // search the text in all string fields but
          // id fields.
          contains: "wireless",
          mode: "insensitive",
        },
      },
      {
        price: {
          gte: 50,
          lt: 200,
        },
      },
    ],
    orderBy: {
      price: "desc",
    },
    skip: 10,
    take: 10,
    select: {
      id: true,
      name: true,
      price: true,
      reviews: true,
    },
  },
});
```

### 9. Custom Prisma Query Extension

You can extend queries with raw Prisma options:

```
GET /api/users?prismaQueryOptions={"include":{"posts":true}}&age=25
```

Generates:

```ts
const users = await prisma.user.findMany({
  where: {
    where: { age: 25 },
    include: { posts: true },
  },
});
```

:::danger
This is `disabled` by default for securites reasons because it allows end users not make raw prisma query which can be dangeours to your application, you is it if you really now what you are doing. `We Recommend Not To Enabled This Option`.
:::

A better way to use this is trough `prisma-query-options` files that will only use this parameter on your code level for you to customize the default behavior of your prisma queries that are handled automatically by **Arkos**, you can [read more about](/docs/guide/custom-prisma-query-options).

By the way, if you would like to activate the request query paramenter `allowDangerousPrismaQueryOptions` do the following under your `src/app.ts`:

```ts
import arkos from "arkos";
// your other codes
arkos.init({
  request: {
    parameters: {
      allowDangerousPrismaQueryOptions: true, // (default is false)
    },
  },
  // other configurations
});
```

### 10. Querying Like Django

As **Arkos** to easy developers lifes, there is a easier way to write the all this query parameters we've seen so far, this was inspired from the `Django Framework`:

So instead of writing the query params as we did before in all previous examples we can write it differently, example translating the [8. Combining Multiple Query Features](/docs/guide/request-query-parameters#8-combining-multiple-query-features) to this other style:

Instead of this:

```
GET /api/products?search=wireless&price[gte]=50&price[lt]=200&sort=-price&page=2&limit=10&fields=id,name,price,+reviews
```

You can write like this:

```
GET api/products?search=wireless&price__gte=50&price__lt=200&sort=-price&page=2&limit=10&fields=id,name,price,+reviews

```

And it will produce the same query as in [8. Combining Multiple Query Features](/docs/guide/request-query-parameters#8-combining-multiple-query-features).

How this actually works? [see here](/docs/api-reference/guide/request-query-parameters-like-django).

:::info
You can use both approaches at the same time, it will work seamlessly.
:::

## Security and Performance Considerations

- All query parameters are securely parsed
- Unexpected parameters are safely filtered
- The system prevents potential injection attacks
- Supports complex querying with minimal to no performance overhead

## Supported Query Parameters

- `search`: Full-text search across string fields
- everything goes in `where prisma query`
- `sort`: Multi-field sorting
- `page`, `limit`: Pagination
- `fields`: Fields selecting, adding and removing
- `filterMode`: Logical operator control
- `prismaQueryOptions`: Raw Prisma query extension

## Best Practices

1. Always use filtering for precise data retrieval
2. Leverage search for flexible content finding
3. Use pagination to manage large datasets
4. Select only required fields to optimize performance
