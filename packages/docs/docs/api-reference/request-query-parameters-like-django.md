---
sidebar_position: 1
---

# Request Query Parameters Like Django

## **Using Double Underscore (`__`) for Filtering**

In **Arkos**, we've added the option of using a different filtering convention inspired by Django's ORM (It does not removes the normal one), where you use **double underscores (`__`)** in query parameters to specify complex filtering conditions. This makes querying more intuitive and consistent, while also simplifying how the backend processes these queries.

### **How Does It Work?**

When a request is made with a query parameter like `price__gte=50`, the framework translates this into a nested structure, allowing it to map directly to a Prisma query.

For example:

```
GET /api/products?price__gte=50&price__lt=200
```

In this case:

- `price__gte=50` tells the framework that we want to filter products where the price is **greater than or equal to 50**.
- `price__lt=200` means we want products with a price **less than 200**.

### **How It’s Translated Internally:**

The framework reads the query parameters, and for each condition using `__`, it wraps the field in an object to match Prisma's query structure. So, for the example above:

- `price__gte=50` is translated into:

  ```ts
  {
    price: {
      gte: 50;
    }
  }
  ```

- `price__lt=200` is translated into:
  ```ts
  {
    price: {
      lt: 200;
    }
  }
  ```

Thus, when combined, the framework generates:

```ts
{
  price: {
    gte: 50,
    lt: 200
  }
}
```

This nested structure matches what Prisma expects when querying the database.

### **Why Is This Useful?**

- **Cleaner Queries**: Using `__` makes it easier to pass complex conditions in URLs without manually managing deeply nested query objects.
- **Flexible Conditions**: You can chain multiple conditions for any field, like `price__gte`, `price__lt`, or `name__contains`, and they’ll be wrapped accordingly to create the correct nested structure for the Prisma query.
