# create-arkos

<div align="center">

![npm](https://img.shields.io/npm/v/create-arkos)
![npm](https://img.shields.io/npm/dt/create-arkos)
![GitHub](https://img.shields.io/github/license/uanela/arkos)

</div>

<div align="center">
<h2>Scaffold Production-Ready APIs in Seconds</h2>
<p>The official CLI tool for Arkos.js - Get from zero to authenticated REST API faster than your coffee gets cold</p>
</div>

---

## Why create-arkos?

Skip the hours of boilerplate setup. Get a production-ready API with authentication, validation, and auto-generated docs in **under 5 minutes**.

**Perfect for:**

- Starting new backend projects without the setup headache
- Prototyping APIs that need to scale later
- Teams who want consistent project structure from day one

## Quick Start

```bash
# Using pnpm (recommended)
pnpm create arkos@latest my-project

# Using npm
npm create arkos@latest my-project

# Using yarn
yarn create arkos@latest my-project
```

**That's it!** Follow the interactive prompts and you'll have a running API.

## What You Get

✅ **Production-ready REST API** with Express.js  
✅ **JWT authentication** configured and ready  
✅ **Auto-generated Swagger docs** at `/api/docs`  
✅ **Database setup** with Prisma ORM  
✅ **Input validation** (Zod or class-validator)  
✅ **TypeScript support** (optional)  
✅ **Best practices** and security middleware

## Interactive Setup Experience

The CLI guides you through a friendly setup process:

```bash
? What is the name of your project? my-arkos-project
? Would you like to use TypeScript? Yes
? What db provider will be used for Prisma? mongodb
? Would you like to set up Validation? Yes
? Choose validation library: zod
? Would you like to set up Authentication? Yes
? Choose authentication type: dynamic
? Would you like to use authentication with Multiple Roles? Yes
? Choose default username field for login: email
```

### Configuration Options

**Database Providers:**

- PostgreSQL (recommended for production)
- MongoDB
- MySQL
- SQLite (great for prototyping)
- SQL Server
- CockroachDB

**Validation Libraries:**

- **Zod** - TypeScript-first schema validation
- **class-validator** - Decorator-based validation

**Authentication Types:**

- **Dynamic** - Database-level auth with roles and permissions tables
- **Static** - File-based configuration for simpler projects
- **Define Later** - Skip for now, add when ready

## From Scaffold to Running API

```bash
# 1. Create your project
pnpm create arkos@latest my-project

# 2. Navigate to it
cd my-project

# 3. Configure your database
# Edit .env with your DATABASE_URL

# 4. Initialize the database
npx prisma db push

# 5. Start building
npm run dev
```

**Your API is now running at `http://localhost:3000`** with:

- Swagger docs at `/api/docs`
- Health check at `/api/health`
- Authentication endpoints ready to use

## Generated Project Structure

```
my-arkos-project/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── utils/
│   │   └── prisma/
│   │       └── index.ts       # Prisma client
│   ├── app.ts                 # Main application
│   ├── arkos.config.ts        # Framework configuration
│   └── server.ts              # Server entry point
├── .env                       # Environment variables
├── .gitignore
├── package.json
└── tsconfig.json              # TypeScript config (if selected)
```

## Environment Setup

Example `.env` configurations for different databases:

```env
# PostgreSQL (recommended for production)
DATABASE_URL="postgresql://username:password@localhost:5432/mydb"

# MongoDB
DATABASE_URL="mongodb://localhost:27017/mydb"

# MySQL
DATABASE_URL="mysql://username:password@localhost:3306/mydb"

# SQLite (great for local development)
DATABASE_URL="file:./dev.db"
```

## Authentication Out of the Box

### Dynamic Authentication (Recommended)

Perfect for apps that need user management and role-based access:

- `auth-role` table for managing roles
- `auth-permission` table for granular permissions
- Multi-role support
- Database-level flexibility

### Static Authentication

Great for simpler projects or when roles are predefined:

- Configuration file-based
- Faster setup
- Easy to understand and modify

## Next Steps

Once your project is created:

1. **Define your data models** in `prisma/schema.prisma`
2. **Run migrations** with `npx prisma db push`
3. **Start coding** - Arkos handles the CRUD operations automatically
4. **Add custom logic** with interceptors when needed

```bash
# Generate CRUD for a new model
arkos generate posts -m Post

# Start development
npm run dev

# Build for production
npm run build
```

## Get Cutting-Edge Features

Try our canary releases for the latest features:

```bash
pnpm create arkos@canary my-project
```

## Requirements

- Node.js 20 or higher
- npm, yarn, or pnpm

## Learn More

- **Documentation:** [arkosjs.com/docs](https://arkosjs.com/docs/intro)
- **Main Framework:** [github.com/uanela/arkos](https://github.com/uanela/arkos)
- **Community:** [Join our WhatsApp group](https://chat.whatsapp.com/EJ8cjb9hxau0EcOnI4fdpD)
- **Examples:** [arkosjs.com/docs/examples](https://arkosjs.com/docs/examples)

## Support

- **Bug Reports:** [GitHub Issues](https://github.com/uanela/arkos/issues)
- **Feature Requests:** Open a GitHub issue
- **Email:** [uanelaluiswayne@gmail.com](mailto:uanelaluiswayne@gmail.com)

## License

MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**[Documentation](https://arkosjs.com/docs/intro)** •
**[Website](https://arkosjs.com)** •
**[GitHub](https://github.com/uanela/arkos)** •
**[npm](https://www.npmjs.com/package/create-arkos)**

Built with ❤️ by [Uanela Como](https://github.com/uanela) and contributors

---

_From the Greek "ἀρχή" (Arkhē) - meaning "beginning" - your foundation for Express and Prisma backend development_

</div>
