To use your package, `arkos`, with the provided example, let's break it down into understandable steps.

### 1. **Install the Package**

Before running the code, make sure your package (`arkos`) is installed in your project. You can do this by running:

```bash
npm install arkos
```

or if you are using `pnpm`:

```bash
pnpm install arkos
```

### 2. **Setup Prisma Client**

In the code snippet, you're passing the `prisma` instance to the `arkos.init()` function. Here's how Prisma should be set up:

1. **Install Prisma and initialize it:**
   Make sure you have Prisma installed in your project. You can install it using:

   ```bash
   npm install @prisma/client
   npm install prisma --save-dev
   ```

2. **Set up your Prisma schema:**
   You should have your `prisma/schema.prisma` file properly configured and migrate the database with Prisma commands:

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

3. **Initialize Prisma client:**
   You'll need to have the `prisma` client initialized in your `src/utils/prisma.ts` file. For example:

   ```typescript
   // src/utils/prisma.ts
   import { PrismaClient } from "@prisma/client";

   export const prisma = new PrismaClient();
   ```

### 3. **Using `init` from `arkos`**

The `init` function from your `arkos` package is used to initialize the app with required configurations. Here's how you can structure it:

```typescript
// src/app.ts
import arkos from "arkos"; // Import arkos.init() from arkos package
import express from "express"; // Import express

// Initialize the Express app
const app = express();

// Call init and pass the Express app for configuration, app will listen in 8000 by default or set PORT in .env.developement or .env.production
arkos.init(app);
```

### 4. **How `arkos.init()` Works:**

- **Initialization**: The `arkos.init()` function is called with two arguments, the second being optional:
  - `app`: The Express application instance.
  - `options`: An object containing configurations for toggle `authentication` and pass the desired `port`.
- **What happens under the hood**:
  - **Authentication Setup**: The package will set (read further to learn how to prepare the environment) up authentication routes, middleware, and necessary handlers for managing user sessions and JWT tokens.
  - **Error Handling**: Automatic error handling middleware could be added.
  - **File Upload**: Arkos will configure necessary middleware to handle file uploads, image upload optimization, and route generation.
  - **Prisma Integration**: The prisma instance must be export as default or prisma under scr/utils/prisma.ts.

### 5. **Additional Configuration (Optional)**

You can customize additional settings such as routes for file uploads, email handling, and more, based on what your `arkos` package offers. The `arkos.init()` function may have additional configuration options, depending on how flexible and customizable the package is.

---

### Example Directory Structure

Here is how the directory structure might look for this project:

```
project-root/
│
├── node_modules/
│
├── src/
│   ├── utils/
│   │   └── prisma.ts          # Prisma client initialization
│   ├── app.ts                 # Express app setup with arkos.init()
│
├── package.json               # Your project dependencies
└── prisma/
    └── schema.prisma          # Your Prisma schema file
```

---

### Example of `prisma/schema.prisma`:

Ensure you have a basic Prisma schema like this:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "sqlite" // Replace with your database provider (e.g., 'mongodb', 'mysql', 'sqlite', 'postgresql')
  url      = env("DATABASE_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["prismaSchemaFolder"]
}

model Post {
  id       Int     @id @default(autoincrement())
  title    String  @unique
  content String
  createdAt DateTime @default(now())
}
```

Run the following to generate the Prisma client:

```bash
npx prisma generate
```

After all there will be routes for

- Find many, GET: /api/posts
- Find one, GET: /api/posts/:id
- Create one POST: /api/posts
- Update one, PATCH: /api/posts/:id
- Delete one, DELETE: /api/posts/:id

---

### Recap

- You need `prisma` properly set up and the `prisma` client instance passed into `arkos.init()`.
- Once `arkos.init()` is invoked with your `express` app and Prisma client, the package will handle routing, authentication, file uploads, etc., automatically.
- Ensure you have all dependencies installed (`arkos`, `prisma`, `express`, etc.) before running the app.

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📫 Contact

For any issues or questions, please open an issue or contact [Uanela Como](mailto:uanelaluiswayne@gmail.com).

## NB: More documentation coming soon
