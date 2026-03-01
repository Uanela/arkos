---
sidebar_position: 4
---


# How It Works

To understand how **Arkos** works behind the scenes, we need to explore what makes it revolutionary in RESTful API development and how it transforms your development experience.

Imagine writing a single Prisma model and instantly having a complete, production-ready REST API. That's exactly what Arkos does. When you define a model like `UserProfile` in your Prisma schema, Arkos automatically transforms it into a full REST API at `/api/user-profiles` with all standard CRUD operations, validation, error handling, and relationship management built-in.

```ts
model UserProfile {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  posts     Post[]
  createdAt DateTime @default(now())
}
```

This single model definition instantly becomes:

- `GET /api/user-profiles` - List all profiles with pagination and filtering
- `GET /api/user-profiles/:id` - Get a specific profile
- `POST /api/user-profiles` - Create a new profile
- `PATCH /api/user-profiles/:id` - Update a profile
- `DELETE /api/user-profiles/:id` - Delete a profile

## Three-Step Process

### Step 1: Schema Reading

Arkos automatically detects your Prisma schema changes during development. Whether you're running `npm run dev` or `npm run start`, any modifications to your models are instantly recognized and processed.

### Step 2: API Generation

Creates standardized RESTful endpoints with full CRUD operations following industry best practices. Each model becomes a complete resource with proper HTTP methods, status codes, and response structures.

### Step 3: Smart Defaults

Adds validation, error handling, and relationship management out of the box. Arkos handles complex operations like nested relations, query parameters for filtering and sorting, and consistent error responses across your entire API.

## Built for Flexibility

Think of Arkos as a collection of smart light switches - each endpoint can be controlled independently. You have complete freedom to customize any part of the system while keeping everything else automated.

**Interceptor Middlewares**: Use [**Interceptors Middlewares**](/docs/core-concepts/interceptor-middlewares) as your customization toolkit to modify request/response behavior at the endpoint level. Chain multiple interceptors, add custom validation, transform data, or even add specialized error handling to individual endpoints.

**The Core Philosophy**: You get basically all the setup handled, allowing you to simply focus on adding business logic which makes your application what it is, without needing to worry about standardized RESTful concepts. This is our core mission - eliminating repetitive work so you can concentrate on what truly matters.

## Developer Experience Focus

**Automatic Hot Reload**: Changes to your Prisma schema are reflected immediately in your API during development, creating a seamless development workflow.

**Enterprise-Grade Authentication**: Built-in JWT authentication system with Role-Based Access Control (RBAC) that works out of the box. Choose between Static RBAC for predefined roles or Dynamic RBAC for database-level role management.

**Seamless Validation**: Whether you prefer Zod or class-validator, validation works automatically based on your Prisma model definitions. Type safety is preserved throughout the entire stack.

**Smart Relationship Handling**: The [**BaseService class**](/docs/api-reference/the-base-service-class) manages complex relationship operations automatically and Arkos.js handles query parameters gracefully for nested data access.

**Clean Error Responses**: Consistent, informative error messages across your API with proper HTTP status codes and detailed error information for debugging.

## What Makes It Different

**From Scratch vs. Arkos**: Traditional Express development requires setting up routers, controllers, services, validation, error handling, and documentation for each model. With Arkos, you write the model once and get everything else automatically.

**Foundation, Not Cage**: Unlike other frameworks that lock you into specific patterns, Arkos provides a solid foundation while giving you complete access to Express and Prisma when you need to break free from conventions.

**Business Logic Focus**: Instead of spending weeks setting up basic CRUD operations, authentication systems, and API infrastructure, you can immediately start building the features that make your application unique and valuable.

## The Arkos Advantage

Arkos analyzes your Prisma schema definitions and automatically generates the appropriate routes, controllers, and services for your models while still giving you the flexibility to customize any part of the system when needed. It's not about replacing Express or Prisma - it's about enhancing them by automating repetitive tasks and providing enterprise-level patterns out of the box.

:::important
Arkos doesn't replace Express or Prisma - it enhances them by automating repetitive tasks while giving you full access to their powerful features when you need them.
:::

This approach allows you to maintain consistent patterns across your entire API, reduce common bugs found in repetitive code, and iterate faster by making schema changes without rewriting API code. Focus on what makes your application special, not on the infrastructure that every API needs.
