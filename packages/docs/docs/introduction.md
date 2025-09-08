---
sidebar_position: 1
---

# Introduction

**Arkos.js** is a modern JavaScript/TypeScript framework for quickly building secure and scalable [**Node.js**](https://nodejs.org) server-side [**RESTful**](https://restfulapi.net) applications. It uses progressive JavaScript (just like [**NestJS**](https://nestjs.com)), backed with and has full support for [**TypeScript**](https://typescriptlang.org) (but still allows developers to code using vanilla JavaScript). It combines the world's 2 most used programming paradigms FP (Functional Programming) and OOP (Object Oriented Programming).

Behind the scenes, Arkos uses the undisputed and most used JavaScript Server-Side Framework [**Express**](https://expressjs.com) altogether with most modern and type-safe ORM [**Prisma**](https://prisma.io) for database integration.

Arkos introduces a new way of developing RESTful APIs in JavaScript world, by combining Node.js most used framework (Express), Prisma ORM for database management and the modular architecture from NestJS, for creating a level of abstraction of well established and standardized RESTful APIs principles and offering many tools out of the box just like like [**Django**](https://djangoproject.com) in Python and [**Laravel**](https://laravel.com) in PHP.

Even though Arkos creates a level of abstraction on top of Express and Prisma, it still allows developers to fully access their APIs directly and write plain Express or Prisma code as needed. This gives developers the ability to leverage all of what Arkos offers out of the box while still being able to do everything they can do with pure Express and Prisma.

## Philosophy

For long years, thanks to [**Ryan Dahl**](https://github.com/ry) building Node.js, JavaScript has become almost the default language on the web both for Client-Side and Server-Side Applications. Then we watched Client-Side frameworks like [**Angular**](https://angular.dev), [**React**](https://react.dev), [**Vue**](https://vuejs.org) and others, and also the rise of JavaScript Server-Side frameworks such as Express and [**Fastify**](https://fastify.io) all minimalistics. Time went by and we saw the rise of frameworks just like NestJS and [**AdonisJS**](https://adonisjs.com) trying to improve the experience of the development of JavaScript Server-Side applications.

Although both succeeded very well on their own focused niches Nest with strong OOP and Angular like experience and Adonis with the Fullstack MVC vision just like PHP, **Arkos.js** introduces a different proposal for RESTful APIs by **Safeguarding ExpressJS Paradigms** and **Enhancing Developer Experience** by providing a lot of common tools that developers have been creating from scratch, simply out of the box and letting them to still write any type of code they write when using Express, despite Arkos.js tools and focus on RESTful APIs.

## Why Prisma ORM

On the past [**Uanela Como**](https://github.com/uanela) _(The creator)_ initially favored Mongoose ORM and became skeptical when first encountering Prisma's different approach. However, deeper exploration revealed Prisma's key strengths: superior separation of concerns, type safety, and intuitive querying that focuses on what an ORM should excel at.

Rather than building a custom ORM, Arkos.js strategically integrates with Prisma - one of the most modern and widely adopted ORMs in JavaScript. Combined with Arkos.js's BaseService Class, this creates what Uanela describes as "an unmatched Prisma integration" that enhances established tools while adding enterprise-level patterns for RESTful API development.

## Key Features Overview

**1. Automatic RESTful Endpoints Generation** - Generate complete CRUD operations for Prisma models with zero boilerplate code and full customize the whole flow using interceptor middlewares.

**2. Built-in Authentication System** - JWT-based auth with user management, password hashing, and role-based access control.

**3. Enterprise-Grade Middlewares** - Security headers, CORS, compression, request parsing, and error handling pre-configured.

**4. Type-Safe Data Validation** - Automatic request/response validation using [**Class-Validator**](https://www.npmjs.com/package/class-validator) or [ **Zod** ](https://zod.dev) with TypeScript and JavaScript integration.

**5. Advanced File Management** - Easy file uploads with different file type processing and image optimization.

**6. Email Service Tool** - Quickly send emails with minimal configuration, using our favorite Node.js mailing tool [**Nodemailer**](https://www.npmjs.com/package/nodemailer).

**7. Performance Optimization** - Built-in caching, rate limiting, and database query optimization with prisma.

**8. Developer Experience** - Auto-generated Swagger docs, structured logging, hot reload, and comprehensive CLI tools for scaffolding and creating components like controllers, routers, services and many more.

## Pre-requisite Knowledge

Our documentation assumes some familiarity with some web development tools, mainly those that are the core of Arkos.js. Before getting started, it'll help if you're comfortable with:

- JavaScript or TypeScript
- Express
- Prisma ORM

If you are new to Express, Prisma ORM or JavaScript backend development at all or needs a refresh, we highly recommend getting started with some of the listed courses below:

- [**Node.js and Express.js - Full Course**](https://youtu.be/Oe421EPjeBE?si=QRPJxuNRWrMo0BN9) from freeCodeCamp.org
- [**NodeJS ExpressJS PostgreSQL Prisma Course**](https://youtu.be/9BD9eK9VqXA?si=HqVVRj11iYBET_Ow) from Smoljames
- [**JavaScript Tutorial Full Course**](https://youtu.be/EerdGm-ehJQ?si=k5LmjF8nSDQ-jUtc) from SuperSimpleDev

## Next Steps

- [Getting Started](/docs/category/getting-started) - Set up your first Arkos project
- [Project Structure](/docs/getting-started/project-structure) - See the **Arkos** project structure
- [How Does It Works](/docs/how-does-arkos-works) - Learn about **Arkos** behind the scene work

> The name "Arkos" comes from the Greek word "ἀρχή" (Arkhē), meaning "beginning" or "foundation". This reflects our goal of providing a solid foundation for backend development.
