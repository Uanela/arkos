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

---

<div align="center">

**[Installation](https://www.arkosjs.com/docs/getting-started/installation)** •
**[Documentation](https://arkosjs.com/docs/intro)** •
**[Website](https://arkosjs.com)** •
**[GitHub](https://github.com/uanela/arkos)** •
**[Blog](https://www.arkosjs.com/blog)** •
**[Npm](https://www.npmjs.com/package/arkos)**

</div>

---

## Why Arkos?

Every line of boilerplate code is a missed opportunity for innovation. Arkos.js gives developers back their time so they can focus on building what truly matters—**the core business logic**.

**Perfect for:**

- Backend developers shipping complex features under tight deadlines
- Teams who want to scale fast without reinventing standard patterns
- Projects that need production-ready auth, validation, and docs from day one

## Quick Start

Get started with Arkos.js in seconds:

```bash
pnpm create arkos@latest my-project
```

**That's it!** You now have:

- Production-ready REST API
- JWT authentication
- Auto-generated Swagger docs at `/api/docs`
- File upload handling
- Input validation

## See It In Action

**1. Define your Prisma model:**

```prisma
model Post {
  id        String   @id @default(uuid())
  title     String
  content   String
  authorId  String
  author    User   @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**2. Get instant REST endpoints:**

```
POST   /api/posts           Create a new post
GET    /api/posts           List all posts
GET    /api/posts/:id       Get a specific post
PATCH  /api/posts/:id       Update a post
DELETE /api/posts/:id       Delete a post
```

All with built-in **authentication**, **validation**, and **documentation**. **Zero boilerplate.**

**3. Add custom business logic with interceptors:**

```typescript
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { AppError } from "arkos/error-handler";

export const beforeCreateOne = [
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        // Add custom validation
        if (req.body.title.length < 5) {
            throw new AppErr("Title is too short", 400, "TitleTooShort");
        }

        // Enrich data
        req.body.slug = req.body.title.toLowerCase().replace(/\s/g, "-");
        req.body.authorId = req.user.id;

        next();
    },
];
```

## What You Get Out of the Box

### **Enterprise-Ready Authentication**

- JWT token management with secure refresh tokens
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Production-ready from day one

### **Smart Data Validation**

- Automatic validation from Prisma models
- Zod schema integration
- Class-validator support
- Zero configuration required

### **Bulletproof Security Stack**

- Rate limiting to prevent abuse
- CORS configuration
- Input sanitization with helmet.js
- Comprehensive error handling

### **Self-Documenting APIs**

- Auto-generated OpenAPI/Swagger specifications
- Beautiful interactive Scalar UI
- Auto-sync with your routes
- JSON schemas from Zod or Prisma models

### **Intelligent File Processing**

- Multer-powered file uploads
- Automatic image and video optimization
- Smart type validation
- Easy local storage configuration

### **Effortless Email Integration**

- Built-in Nodemailer service
- Template support
- Clean, simple API
- Just focus on your content

### **Powerful Interceptors**

- Before/after request hooks
- Custom validation logic
- Data transformation
- Flexible middleware system

### **Unmatched Prisma Integration**

- Seamless ORM integration
- Automatic relation handling
- Write less Prisma, build more data
- Built on Prisma's rock-solid foundation

## Arkos vs Traditional Setup

| Task                     | Traditional Approach        | With Arkos             |
| ------------------------ | --------------------------- | ---------------------- |
| Setup JWT authentication | 2-3 hours of config         | ✅ Built-in & ready    |
| Create CRUD routes       | 30 min per model            | ✅ Auto-generated      |
| Add input validation     | Manual for each endpoint    | ✅ Zod/Class-validator |
| Setup API documentation  | Install + configure Swagger | ✅ Auto-generated      |
| Configure file uploads   | Multer setup + validation   | ✅ Ready to use        |
| Add security middleware  | Research + implement        | ✅ Pre-configured      |
| **Total setup time**     | **~8-12 hours**             | **~5 minutes**         |

## Features

- **Automatic API Generation** - Instantly create RESTful routes from Prisma models
- **Built-in Authentication** - JWT-based authentication with minimal setup
- **Express Middlewares** - Pre-configured security, parsing, and error handling
- **Data Validation** - Input validation and transformation capabilities
- **Prisma Integration** - Seamless database management with relation fields support
- **File Upload & Optimization** - Efficient handling of images, videos, and documents
- **Interceptors Middlewares** - Customize request/response flow with hooks
- **Nodemailer Integration** - Easy email sending functionality
- **Swagger API Documentation** - Automatically generate API documentation

**BETA VERSION**

## Trusted By Developers Building Daily

> "Arkos.js changed how I work on the backend: with a Prisma model I already get CRUD routes, auth, and validation out-of-the-box — I saved a lot of time and could focus on business logic."  
> **— Gelson Matavela, Founder / Grupo Vergui**

> "It removes boilerplate and provides a clean structure to build products. Built-in auth is powerful and ready. Automatic CRUD and docs save time, while interceptors allow flexible business logic."  
> **— Augusto Domingos, Tech Lead / DSAI For Moz**

> "With Arkos.js, I can build backends in just a few minutes. It removes the boilerplate and lets me focus entirely on the core logic. Fast, simple, and incredibly productive."  
> **— Niuro Langa, Software Developer / SparkTech**

[See more testimonials →](https://arkosjs.com)

## Documentation

For comprehensive guides, API reference, and examples, visit our [official documentation](https://arkosjs.com/docs/intro).

**Quick Links:**

- [Getting Started Guide](https://arkosjs.com/docs/intro)
- [Authentication Setup](https://arkosjs.com/docs/core-concepts/authentication-system)
- [Using Interceptors](https://arkosjs.com/docs/core-concepts/interceptors)
- [File Uploads](https://arkosjs.com/docs/core-concepts/file-uploads)
- [Validation](https://arkosjs.com/docs/core-concepts/request-data-validation)
- [Email Service](https://arkosjs.com/docs/core-concepts/sending-emails)

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

- **Documentation:** [arkosjs.com/docs](https://arkosjs.com/docs/intro)
- **Bug Reports:** [GitHub Issues](https://github.com/uanela/arkos/issues)
- **Feature Requests:** Open a GitHub issue
- **Contact:** [uanelaluiswayne@gmail.com](mailto:uanelaluiswayne@gmail.com)

Contributions are welcome! We appreciate all contributions, from bug fixes to new features.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**[Installation](https://www.arkosjs.com/docs/getting-started/installation)** •
**[Documentation](https://arkosjs.com/docs/intro)** •
**[Website](https://arkosjs.com)** •
**[GitHub](https://github.com/uanela/arkos)** •
**[Blog](https://www.arkosjs.com/blog)** •
**[Npm](https://www.npmjs.com/package/arkos)**

Built with ❤️ by [Uanela Como](https://github.com/uanela) and contributors

---

_The name "Arkos" comes from the Greek word "ἀρχή" (Arkhē), meaning "beginning" or "foundation", reflecting our goal of providing a solid foundation for backend development._

</div>
