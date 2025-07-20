---
sidebar_position: 4
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# How Does Arkos Works

To understand how **Arkos** works behind the scenes we need to once more read its definition and the origin of its name.

### Definition

**Arkos** is a powerful, lightweight backend framework built on top of Express.js and Prisma that revolutionizes API development. It automates common backend tasks while providing the flexibility developers need for custom solutions.

### Origin of the Name

The name "Arkos" comes from the Greek word "ἀρχή" (Arkhē), meaning "beginning" or "foundation". This reflects our goal of providing a solid foundation for backend development.

As it states, **Arkos** was created to speed up the development process by eliminating repetitive boilerplate code that you most of the time need to generate for your models and some other API tasks. This way you can work faster and really focus on what matters: the `Application Business Logic`.

As found by the creator `Uanela Como` and Arkos' `Contributors`, when you start a new JavaScript/TypeScript app with Express you need to setup many repetitive components, such as:

- **Routers** - Creating endpoints for CRUD operations for each entity
- **Controllers** - Handling request/response logic for each endpoint
- **Services** - Implementing business logic for each model
- **Data validation** - Ensuring incoming data meets your requirements
- **Error handling** - Consistent error responses across your API
- **Relation handling** - Managing complex operations when creating or updating related entities
- **Pagination** - Implementing limit/offset or cursor-based pagination
- **Filtering and sorting** - Adding query parameters for data manipulation
- **File uploads** - Setting up storage, validation, and processing
- **Image optimization** - Resizing, compressing, and formatting uploaded images
- **Authentication** - User registration, login, and token management
- **Role-based access control** - Controlling what actions different users can perform
- **Documentation** - Generating API docs that stay in sync with your code
- **Testing infrastructure** - Setting up the environment for API testing

All of these tasks require significant time and effort, and they're largely the same across different projects, each models also, and let's be real we're all tired of having to repeat code all the time.

With Arkos, these common backend patterns are automatically generated based on your Prisma schema, allowing you to:

1. **Focus on business logic** - Spend time on what makes your application unique
2. **Maintain consistent patterns** - Follow best practices across your entire API
3. **Reduce bugs** - Avoid common mistakes in repetitive code
4. **Iterate faster** - Make schema changes without rewriting API code

Arkos analyzes your Prisma schema definitions and automatically generates the appropriate routes, controllers, and services for your models while still giving you the flexibility to customize any part of the system when needed.

:::important
Arkos doesn't replace Express or Prisma - it enhances them by automating repetitive tasks while giving you full access to their powerful features when you need them.
:::
