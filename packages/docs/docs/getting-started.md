---
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Getting Started

This guide will help you set up your first project with Arkos. We'll cover installation, basic configuration, and creating your first API endpoints.

## Pre-requisites

Before you begin, ensure you have:

- Node.js 16+ installed
- A package manager (npm, yarn, or pnpm)
- Basic knowledge of Express.js and Prisma

## Installation

1. First, create a new project and initialize it:

```bash
mkdir my-arkos-project
cd my-arkos-project
npm init -y
```

2. Install required dependencies including arkos itself:

<Tabs>
  <TabItem value="js" label="JavaScript" >

    ```bash
    npm install arkos
    npm install --save-dev prisma
    ```

  </TabItem>
  <TabItem value="ts" label="TypeScript" default>

    ```bash
    npm install arkos
    npm install --save-dev prisma typescript @types/node @types/express
    ```

  </TabItem>
</Tabs>

## Setting Up Prisma

1. Initialize Prisma:

```bash
npx prisma init
```

2. Configure your database connection in `.env`:

```env
DATABASE_URL="your-database-connection-string"
```

3. Create your Prisma schema under `prisma/schema/schema.prisma`:

```ts
datasource db {
  provider = "postgresql" // or "mongodb", "mysql", "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["prismaSchemaFolder"]
}

model Post {
  id        String   @id @default(uuid())
  title     String
  content   String
  authordId String
  author    Author  @relation(fields: [authorId], references: [id])
}

model Author {
  id        String   @id @default(uuid())
  name      String
  country   String
  posts     Post[]
}
```

4. Generate Prisma Client:

```bash
npx prisma generate
```

## Project Structure

Create the following directory structure:

```
my-arkos-project/
├── src/
│   ├── utils/
│   │   └── prisma.ts
│   └── app.ts
├── prisma/
    └──schema/
        └──schema.prisma
```

## Basic Configuration

1. Create the Prisma client instance (`src/utils/prisma.ts`):

```typescript
import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();
```

2. Create your main application file (`src/app.ts`):

<Tabs>
  <TabItem value="ts" label="TypeScript" default>

    ```ts
    import arkos from "arkos";

    arkos.init();
    ```

  </TabItem>
  <TabItem value="js" label="JavaScript" >

    ```js
    const arkos = require("arkos");

    arkos.init();
    ```

  </TabItem>
</Tabs>

## Testing Your API

After setting up, Arkos automatically generates these endpoints for your Post model and Author model (Including pagination, nested fields handling and more.):

### Author Endpoints

- `GET /api/authors` - List many authors
- `GET /api/authors/:id` - Get a single author
- `POST /api/authors` - Create a new author
- `PATCH /api/authors/:id` - Update a author
- `DELETE /api/authors/:id` - Delete a author

### Post Endpoins

- `GET /api/posts` - List many posts
- `GET /api/posts/:id` - Get a single post
- `POST /api/posts` - Create a new post
- `PATCH /api/posts/:id` - Update a post
- `DELETE /api/posts/:id` - Delete a post

### Test creating an author and a post:

## Testing Your API

After setting up, test your API with these examples:

<Tabs>
  <TabItem value="bash" label="Curl" default>

```ts
# Create an author
curl -X POST http://localhost:8000/api/authors \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "country": "USA"}'

# Grab the author ID from the response and create a post
curl -X POST http://localhost:8000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title": "My First Post", "content": "Hello, Arkos!", "authorId": "author-id-from-response"}'
```

  </TabItem>
  <TabItem value="js" label="JavaScript & TypeScript">

```ts
// Create an author and then a post
fetch("http://localhost:8000/api/authors", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "John Doe",
    country: "USA",
  }),
})
  .then((response) => response.json())
  .then((data) => {
    const authorId = data.data.id;
    return fetch("http://localhost:8000/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "My First Post",
        content: "Hello, Arkos!",
        author: {
          id: authorId,
        },
      }),
    });
  })
  .then((response) => response.json())
  .then((data) => console.log("Post created:", data))
  .catch((error) => console.error("Error:", error));
```

  </TabItem>
</Tabs>

:::tip Hints
If you are familiar with `Prisma` you probably wondering why was passed `{ id: authorId }` in author field instead of `{ connect: { where: { id: authorId } } }`. The point is that Arkos will handle this for you, so when you pass a relation/scalar field with only then id Arkos will understand that you want to connect to it, for more references [see more](/docs/advanced-guide/handling-relation-fields-in-prisma-body-requests).

:::

## Next Steps

Now that you have a basic setup, you might want to:

1. [Set up authentication](/docs/core-concepts/built-in-authentication-system)
2. [Add custom validation](/docs/core-concepts/request-data-validation)
3. [Implement interceptors](/docs/core-concepts/interceptor-middlewares)

## Troubleshooting

If you encounter any issues:

1. Ensure all dependencies are installed correctly
2. Check your database connection string
3. Verify your Prisma schema is valid
4. Make sure your TypeScript configuration is correct
5. Check the Arkos logs for detailed error messages

For more help, visit our [GitHub repository](https://github.com/uanela/arkos) or join our community.

---

Your API is now set up and running. Happy coding! 🚀
