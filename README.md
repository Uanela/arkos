![Header Image](https://www.arkosjs.com/img/arkos-readme-header.webp)

# Arkos

## The Express And Prisma Framework For RESTful API

Used to simplify the development of a secure and scalable RESTful API with minimal configuration, allowing developers to focus on what really matters for the business

## Features

- 🚀 **Automatic API Generation** - Instantly create RESTful routes from Prisma models
- 🔐 **Built-in Authentication** - JWT-based authentication with minimal setup
- ⚡ **Express Middlewares** - Pre-configured security, parsing, and error handling
- 🛡️ **Data Validation** - Using class-validator/class-transformer or zod
- 💠 **Prisma Integration** - Seamless database management with relation fields support
- ⬆️ **File Upload & Optimization** - Efficient handling of images, videos, and documents
- 👨‍💻 **Interceptors Middlewares** - Customize request/response flow with hooks
- ✉️ **Nodemailer Integration** - Easy email sending functionality
- 📝 **Swagger API Documentation** - Automatically generate API documentation

**BETA VERSION**

## Getting Started

### 1. Install

```bash
npm install arkos
# or
pnpm install arkos
```

### 2. Set up Prisma

```bash
npm install @prisma/client
npm install prisma --save-dev

# Initialize and generate
npx prisma generate
npx prisma migrate dev
```

### 3. Start your API in one line

```ts
// src/app.ts
import arkos from "arkos";

arkos.init({ port: 3000 });
```

That's it! Your RESTful API is ready to use.

## Documentation

For detailed documentation, visit our [official docs](https://arkos.dev/docs/intro).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For questions or issues, please open a GitHub issue or contact [Uanela Como](mailto:uanelaluiswayne@gmail.com).

---

_The name "Arkos" comes from the Greek word "ἀρχή" (Arkhē), meaning "beginning" or "foundation", reflecting our goal of providing a solid foundation for backend development._
