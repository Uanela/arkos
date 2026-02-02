---
sidebar_position: 13
title: Create Arkos CLI
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# create-arkos

The official scaffolding tool for Arkos.js projects, providing an interactive setup experience to generate production-ready RESTful APIs with zero configuration. Get up and running with automatic CRUD operations, authentication, validation, and more - all built on top of Express.js and Prisma.

## Quick Start

Get started with a new Arkos.js project in seconds using your preferred package manager:

<Tabs>
<TabItem value="npm" label="npm" default>

```bash
npm create arkos@latest my-arkos-project
```

</TabItem>
<TabItem value="yarn" label="Yarn">

```bash
yarn create arkos@latest my-arkos-project
```

</TabItem>
<TabItem value="pnpm" label="pnpm">

```bash
pnpm create arkos@latest my-arkos-project
```

</TabItem>
</Tabs>

:::tip
Make sure you have Node.js 20 or higher installed before running the command.
:::

## Interactive Setup Experience

The CLI guides you through an intuitive setup process, asking questions about your project preferences:

```bash
? Would you like to use TypeScript? Yes
? What db provider will be used for Prisma? mongodb
? Would you like to set up Validation? Yes
? Choose validation library: class-validator
? Would you like to set up Authentication? Yes
? Choose authentication type: dynamic
? Would you like to use authentication with Multiple Roles? Yes
? Choose default username field for login: email
```

Each question is designed to configure your project exactly how you need it and get you up running as fast as it can be with your Arkos.js project doesn't matter whether you are an experienced web developer or a simple beginner.

## Configuration Options

### Database Providers

Choose from multiple production-ready database options:

| Provider        | Description                          | Use Case                                |
| --------------- | ------------------------------------ | --------------------------------------- |
| **PostgreSQL**  | Production-ready relational database | Complex applications with relationships |
| **MongoDB**     | NoSQL document database              | Flexible schema requirements            |
| **MySQL**       | Popular relational database          | Traditional web applications            |
| **SQLite**      | Lightweight file-based database      | Development and small projects          |
| **SQL Server**  | Microsoft's enterprise database      | Enterprise environments                 |
| **CockroachDB** | Distributed SQL database             | High-scale, distributed applications    |

### Validation Libraries

**Arkos** supports two powerful validation approaches:

- **class-validator**: Decorator-based validation with TypeScript support - perfect for those who love clean, annotated code
- **zod**: TypeScript-first schema validation - ideal for functional programming enthusiasts

### Authentication Types

Choose the authentication strategy that fits your project:

- **Static**: Uses configuration files for roles and permissions - simple and fast for smaller projects
- **Dynamic**: Database-level authentication with `auth-role` and `auth-permission` tables - scalable for complex applications
- **Define Later**: Skip authentication setup during scaffolding - configure it when you're ready

### Username Field Options

Customize how users log into your application:

- **Email**: Use email as login identifier (recommended for most applications)
- **Username**: Use username as login identifier (great for social platforms)
- **Define Later**: Configure custom field later in development

## Generated Project Structure

**Arkos** creates a well-organized project structure that follows best practices:

```
my-arkos-project/
├── prisma/
│   └── schema.prisma          # Database schema with auth tables (if dynamic)
├── src/
│   ├── utils/
│   │   └── prisma/
│   │       └── index.ts       # Prisma client configuration
│   ├── app.ts                 # Main application file
│   ├── arkos.config.ts        # Arkos framework configuration
│   └── package.json           # Dependencies and scripts
├── .env                       # Environment variables
├── .gitignore                 # Git ignore rules
├── package.json               # Project configuration
├── pnpm-lock.yaml            # Lock file (or package-lock.json/yarn.lock)
└── tsconfig.json             # TypeScript configuration (if TypeScript selected)
```

## Getting Your Project Running

After the CLI finishes scaffolding, follow these steps to get your API up and running:

### 1. Navigate to Your Project

```bash
cd my-arkos-project
```

### 2. Configure Your Database

Edit the `.env` file with your database connection string:

<Tabs>
<TabItem value="postgresql" label="PostgreSQL" default>

```env
DATABASE_URL="postgresql://username:password@localhost:5432/mydb"
```

</TabItem>
<TabItem value="mongodb" label="MongoDB">

```env
DATABASE_URL="mongodb://localhost:27017/mydb"
```

</TabItem>
<TabItem value="mysql" label="MySQL">

```env
DATABASE_URL="mysql://username:password@localhost:3306/mydb"
```

</TabItem>
<TabItem value="sqlite" label="SQLite">

```env
DATABASE_URL="file:./dev.db"
```

</TabItem>
</Tabs>

### 3. Set Up Prisma

Initialize your database schema:

```bash
npx prisma generate
npx prisma db push
npx prisma generate
```

### 4. Start Development

Launch your development server:

```bash
npm run dev
```

🎉 **Congratulations!** Your Arkos.js API is now running and ready to handle requests.

## Authentication Setup Deep Dive

### Dynamic Authentication

When you choose "dynamic" authentication, **Arkos** generates a complete database-driven auth system:

- **`auth-role` table**: Manages user roles with hierarchical permissions
- **`auth-permission` table**: Fine-grained permission management
- **Multiple roles support**: Users can have multiple roles simultaneously
- **Database-level security**: All permissions stored and validated against the database

This approach is perfect for applications that need:

- User role management interfaces
- Dynamic permission assignment
- Scalable multi-tenant systems

### Static Authentication

When you choose "static" authentication, **Arkos** uses configuration-based auth:

- **File-based permissions**: Roles and permissions defined in config files
- **Simpler deployment**: No additional database tables required
- **Fast performance**: No database queries for permission checks

This approach works great for:

- Smaller applications with fixed roles
- APIs with predictable permission patterns
- Projects where simplicity is preferred over flexibility

## Beyond Scaffolding

Once your project is created, you have access to **Arkos**'s powerful built-in CLI commands for ongoing development. You can generate controllers, services, and other components on-demand. Explore this incredible tool by reading [built-in CLI Guide](/docs/cli/arkos-cli).

## What's Generated Out of the Box

Your scaffolded project includes:

1. **Complete RESTful API**: Automatic CRUD endpoints for all Prisma models
2. **Authentication System**: Ready-to-use auth with JWT tokens (if selected)
3. **Validation Pipeline**: Request validation using your chosen library
4. **Error Handling**: Consistent error responses across all endpoints
5. **Database Integration**: Fully configured Prisma setup
6. **Development Scripts**: Hot-reload development server
7. **Production Ready**: Optimized build configuration

## Environment Variables

The generated `.env` file includes all necessary variables:

```env
# Database connection
DATABASE_URL=your-database-connection-string

# JWT secrets (if authentication enabled)
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=90d

# Server configuration
PORT=8000
```

## Summary

The `create-arkos` CLI eliminates the tedious setup process and gets you building features immediately. Whether you're a beginner looking for a guided setup or an expert who wants to skip boilerplate, the interactive CLI adapts to your needs.

Key benefits:

1. **Zero Configuration**: Complete API setup with intelligent defaults
2. **Flexible Choices**: Multiple database, auth, and validation options
3. **Best Practices**: Generated code follows industry standards
4. **Production Ready**: Built-in security, validation, and error handling
5. **Developer Experience**: Hot-reload, TypeScript support, and clear project structure

Start building your next API project with confidence - **Arkos** handles the foundation so you can focus on what makes your application unique.
