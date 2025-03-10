To use your package, `omni`, with the provided example, let's break it down into understandable steps.

### 1. **Install the Package**

Before running the code, make sure your package (`omni`) is installed in your project. You can do this by running:

```bash
npm install omni
```

or if you are using `pnpm`:

```bash
pnpm install omni
```

### 2. **Setup Prisma Client**

In the code snippet, you're passing the `prisma` instance to the `initApp` function. Here's how Prisma should be set up:

1. **Install Prisma and initialize it:**
   Make sure you have Prisma installed in your project. You can install it using:

   ```bash
   npm install @prisma/client
   npm install prisma --save-dev
   ```

2. **Set up your Prisma schema:**
   You should have your `prisma/schema.prisma` file properly configured and migrate the database with Prisma commands:

   ```bash
   npx prisma migrate dev
   ```

3. **Initialize Prisma client:**
   You'll need to have the `prisma` client initialized in your `src/utils/prisma.ts` file. For example:

   ```typescript
   // src/utils/prisma.ts
   import { PrismaClient } from "@prisma/client";

   export const prisma = new PrismaClient();
   ```

### 3. **Using `initApp` from `omni`**

The `initApp` function from your `omni` package is used to initialize the app with required configurations. Here's how you can structure it:

```typescript
// src/app.ts
import { initApp } from "omni"; // Import initApp from omni package
import express from "express"; // Import express
import { prisma } from "./utils/prisma"; // Import the prisma client

// Initialize the Express app
const app = express();

// Call initApp and pass the Express app and prisma instance for configuration, app will listen in 8000 by default or set PORT in .env.developement or .env.production
initApp(app, { prisma });
```

### 4. **How `initApp` Works:**

- **Initialization**: The `initApp` function is called with two arguments:
  - `app`: The Express application instance.
  - `options`: An object containing configurations for `prisma`, which can be used for Prisma database interactions.
- **What happens under the hood**:
  - **Authentication Setup**: The package will set (read further to learn how to prepare the environment) up authentication routes, middleware, and necessary handlers for managing user sessions and JWT tokens.
  - **Error Handling**: Automatic error handling middleware could be added.
  - **File Upload**: Omin will configure necessary middleware to handle file uploads, image upload optimization, and route generation.
  - **Prisma Integration**: The Prisma client will be passed and made available for your app to interact with your database.

### 5. **Additional Configuration (Optional)**

You can customize additional settings such as routes for file uploads, email handling, and more, based on what your `omni` package offers. The `initApp` function may have additional configuration options, depending on how flexible and customizable the package is.

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
│   ├── app.ts                 # Express app setup with initApp
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
  provider = "postgresql" // Replace with your database provider (e.g., 'mongodb', 'mysql', 'sqlite')
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
  createdAt Datetime @default(now())
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

- You need `prisma` properly set up and the `prisma` client instance passed into `initApp`.
- Once `initApp` is invoked with your `express` app and Prisma client, the package will handle routing, authentication, file uploads, etc., automatically.
- Ensure you have all dependencies installed (`omni`, `prisma`, `express`, etc.) before running the app.

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## NB: Most clear documentation coming soon

---

## 📫 Contact

For any issues or questions, please open an issue or contact [Uanela Como](mailto:uanelaluiswayne@gmail.com).
