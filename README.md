![Header Image](src/images/header.webp)

### **What is Arkos**

**Arkos** is a **lightweight backend framework** for **Express.js and Prisma** that simplifies API development by providing automatic route generation, built-in authentication, error handling, and file upload optimization. Designed to be a foundational layer for backend applications, Arkos allows developers to quickly set up a secure and scalable server with minimal configuration.

---

### **Key Features**

- 🚀 **Automatic API Generation** – Instantly create RESTful API routes for Prisma models.

- 🔐 **Built-in Authentication** – Supports JWT-based authentication with effortless setup.

- ⚡ **Express Middlewares** – Pre-configured security, request parsing, and error handling.

- 🛡️ **Built-in Data Validation** – using class-validator and class-transformer, just drop a create-post.dto.ts.

- ⬆️ **File Upload & Optimization** – Efficient image, video, docs, raw-file handling.

- 💠 **Prisma Integration** – Seamless connection with Prisma ORM for database management with relation feilds handling.

- 👨‍💻 **Interceptors Middlewares** – Tailor as you want, intercept, customize, for example using beforeCreateOne, afterSignUp.

- ✉️ **Nodemailer Integration** – Seamless nodemailer integration for sending emails.

With Arkos, developers can **bootstrap their backend in seconds**, focusing on building features rather than repetitive setup tasks.

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

Here's how Prisma should be set up to use seamlessly with arkos:

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
  - **Prisma Integration**: The prisma instance must be export as default or as prisma under scr/utils/prisma.ts.

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
    └── schema/
        └── schema.prisma          # Your Prisma schema file
        └── post.prisma          # Your Post model file
```

---

### Example of `prisma/schema.prisma`:

Ensure you have a basic Prisma schema like this:

```typescript
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

- You need `prisma` properly set up.
- Once `arkos.init()` is invoked with your `express` app the package will handle routing, authentication, file uploads, etc., automatically.
- Ensure you have all dependencies installed (`arkos`, `prisma`, `express`, etc.) before running the app.

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📫 Contact

For any issues or questions, please open an issue or contact [Uanela Como](mailto:uanelaluiswayne@gmail.com).

Feel free to reach out for questions, suggestions, or contributions ❤️.

---

### **Origin of the Name "Arkos"**

The name **"Arkos"** is derived from the Greek word **ἀρχή (Arkhē)**, which means **"beginning"** or **"foundation"**. This interpretation perfectly aligns with the core purpose of the package — to serve as a **foundational layer** for quickly setting up backend systems. Just as **ἀρχή** represents the starting point or origin, Arkos is designed to **initiate** and **structure** backend projects, providing developers with a robust base to build upon.

This makes Arkos an essential tool for **bootstrapping** and organizing backend applications, helping developers focus on features rather than repetitive setup tasks.

---

### NB: More documentation coming soon
