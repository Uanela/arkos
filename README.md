![Header Image](https://www.arkosjs.com/img/arkos-readme-header.webp?v=2)

<div align="center">

[![Socket Badge](https://badge.socket.dev/npm/package/arkos)](https://badge.socket.dev/npm/package/arkos)
![npm](https://img.shields.io/npm/v/arkos)
![npm](https://img.shields.io/npm/dt/arkos)
![GitHub](https://img.shields.io/github/license/uanela/arkos)
![GitHub Repo stars](https://img.shields.io/github/stars/uanela/arkos)

</div>

<div align="center">
<h2>The Express & Prisma RESTful Framework</h2>
<p>A tool for backend developers and teams who ship software with complex business logic under tight deadlines</p>
</div>

<div align="center">

**[Installation](https://www.arkosjs.com/docs/getting-started/installation)** •
**[Documentation](https://arkosjs.com/docs)** •
**[Website](https://arkosjs.com)** •
**[GitHub](https://github.com/uanela/arkos)** •
**[Blog](https://www.arkosjs.com/blog)** •
**[Npm](https://www.npmjs.com/package/arkos)**

</div>

## Quick Start

```bash
pnpm create arkos@latest my-project
```

Your new project already has JWT auth, CRUD routes, Swagger docs at `/api/docs`, file uploads, validation, and a full security middleware stack. No configuration needed to get started.


## See It In Action

**Define a Prisma model:**

```prisma
model Post {
  id        String   @id @default(uuid())
  title     String
  content   String
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Get a full REST API — instantly:**

```
POST   /api/posts        Create a post
GET    /api/posts        List all posts
GET    /api/posts/:id    Get a post
PATCH  /api/posts/:id    Update a post
DELETE /api/posts/:id    Delete a post
```

Authenticated, validated, and documented. Zero boilerplate.

**Your `app.ts` looks like this:**

```typescript
// src/app.ts
import arkos from "arkos";

const app = arkos();

app.listen();
```

Arkos replaces the Express `app` — but it *is* Express under the hood. You can still use `app.use()`, custom middleware, and raw Express code wherever you need it.

**Add business logic exactly where you need it:**

```typescript
// src/modules/post/post.interceptor.ts
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { AppError } from "arkos/error-handler";

export const beforeCreateOne = [
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    if (req.body.title.length < 5) 
      throw new AppError("Title is too short", 400, "TitleTooShort");

    req.body.slug = req.body.title.toLowerCase().replace(/\s/g, "-");
    req.body.authorId = req.user.id;
    next();
  },
];
```

Name the file, export the hook, and Arkos picks it up automatically. No registration needed.

## What You Stop Building From Scratch

| What you'd normally write | What Arkos gives you |
|---------------------------|----------------------|
| JWT setup, refresh tokens, bcrypt | ✅ Built-in auth system |
| 5 route handlers per Prisma model | ✅ Auto-generated CRUD |
| Zod/CV schemas per endpoint | ✅ Auto generate from your models |
| Swagger config + schema upkeep | ✅ Auto-generated OpenAPI docs |
| Multer setup + file type validation | ✅ File upload system |
| Rate limiting, CORS, Helmet, compression | ✅ Pre-configured security stack |
| **Total setup time** | **~5 minutes vs ~8–12 hours** |


## Documentation

For comprehensive guides, API reference, and examples, visit our [official documentation](https://arkosjs.com/docs).

**Quick Links:**

- [Getting Started Guide](https://arkosjs.com/docs)
- [Authentication Setup](https://arkosjs.com/docs/core-concepts/authentication/setup)
- [Using Interceptors](https://arkosjs.com/docs/core-concepts/components/interceptors)
- [File Uploads](https://arkosjs.com/docs/guides/file-uploads/setup)
- [Validation](https://arkosjs.com/docs/guides/validation/setup)
- [Email Service](https://arkosjs.com/docs/guides/email-service)

## Getting Nightly Updates

You can get the latest features we're testing before releasing them:

```bash
pnpm create arkos@canary my-project
```

## Built With

Arkos.js is built on top of industry-leading tools:

- **[Express](https://expressjs.com/)** - Fast, unopinionated, minimalist web framework for Node.js
- **[Prisma](https://www.prisma.io/)** - Next-generation ORM for Node.js and TypeScript
- **[Node.js](https://nodejs.org/)** - JavaScript runtime built on Chrome's V8 engine

## Support & Contributing

- **Documentation:** [arkosjs.com/docs](https://arkosjs.com/docs)
- **Bug Reports:** [GitHub Issues](https://github.com/uanela/arkos/issues)
- **Feature Requests:** Open a GitHub issue
- **Contact:** [uanelaluiswayne@gmail.com](mailto:uanelaluiswayne@gmail.com)

Contributions are welcome! We appreciate all contributions, from bug fixes to new features.

## What Developers Say

> "Arkos.js changed how I work on the backend: with a Prisma model I already get CRUD routes, auth, and validation out-of-the-box — I saved a lot of time and could focus on business logic."
>
> **— Gelson Matavela, Founder / Grupo Vergui**

> "It removes boilerplate and provides a clean structure to build products. Built-in auth is powerful and ready. Automatic CRUD and docs save time, while interceptors allow flexible business logic."
>
> **— Augusto Domingos, Tech Lead / DSAI For Moz**

> "With Arkos.js, I can build backends in just a few minutes. It removes the boilerplate and lets me focus entirely on the core logic. Fast, simple, and incredibly productive."
>
> **— Niuro Langa, Software Developer / SparkTech**

[See more testimonials →](https://arkosjs.com)

## Philosophy

Arkos sits between minimal frameworks like Express/Fastify and opinionated ones like NestJS/AdonisJS. It doesn't ask you to learn a new paradigm — it enhances the one most Node.js developers already use, by automating everything that's standardized and staying out of the way everywhere else.

Inspired by how Django and Laravel work in their ecosystems: batteries included, nothing forced on you.

> The name "Arkos" comes from the Greek word **ἀρχή** *(Arkhē)*, meaning "beginning" or "foundation".

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<div align="center">

**[Installation](https://www.arkosjs.com/docs/getting-started/installation)** •
**[Documentation](https://arkosjs.com/docs)** •
**[Website](https://arkosjs.com)** •
**[GitHub](https://github.com/uanela/arkos)** •
**[Blog](https://www.arkosjs.com/blog)** •
**[Npm](https://www.npmjs.com/package/arkos)**

Built with ❤️ by [Uanela Como](https://github.com/uanela) and contributors

_The name "Arkos" comes from the Greek word "ἀρχή" (Arkhē), meaning "beginning" or "foundation", reflecting our goal of providing a solid foundation for backend development._

</div>
