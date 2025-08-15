# create-arkos

The official CLI tool to quickly scaffold new Arkos.js API projects with interactive setup and best practices out of the box.

## Overview

`create-arkos` is the scaffolding tool for the Arkos.js framework. It provides an interactive setup experience to generate a complete, production-ready RESTful API project with automatic CRUD operations, authentication, validation, and more - all built on top of Express.js and Prisma.

## Requirements

- Node.js 20 or higher
- npm, yarn, or pnpm

## Quick Start

```bash
# Using npm
npm create arkos@latest

# Using yarn
yarn create arkos@latest

# Using pnpm
pnpm create arkos@latest
```

## Interactive Setup

The CLI will guide you through an interactive setup process:

```bash
> create-arkos@1.0

? What is the name of your project? my-arkos-project
? Would you like to use TypeScript? Yes
? What db provider will be used for Prisma? mongodb
? Would you like to set up Validation? Yes
? Choose validation library: class-validator
? Would you like to set up Authentication? Yes
? Choose authentication type: dynamic
? Would you like to use authentication with Multiple Roles? Yes
? Choose default username field for login: email
```

## Configuration Options

### Database Providers

- **PostgreSQL** - Production-ready relational database
- **MongoDB** - NoSQL document database
- **MySQL** - Popular relational database
- **SQLite** - Lightweight file-based database
- **SQL Server** - Microsoft's enterprise database
- **CockroachDB** - Distributed SQL database

### Validation Libraries

- **class-validator** - Decorator-based validation
- **zod** - TypeScript-first schema validation

### Authentication Types

- **Static** - Uses configuration files for roles and permissions
- **Dynamic** - Database-level authentication with `auth-role` and `auth-permission` tables
- **Define Later** - Skip authentication setup for now

### Username Field Options

- **Email** - Use email as login identifier
- **Username** - Use username as login identifier
- **Define Later** - Configure custom field later

## Generated Project Structure

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
├── pnpm-lock.yaml            # Lock file
└── tsconfig.json             # TypeScript configuration
```

## Getting Started After Creation

1. **Navigate to your project**:

    ```bash
    cd my-arkos-project
    ```

2. **Set up your database**:

    ```bash
    # Edit .env file with your DATABASE_URL
    # Example: DATABASE_URL="mongodb://localhost:27017/my-arkos-project"
    ```

3. **Set up Prisma**:

    ```bash
    npx prisma db push
    ```

4. **Start development**:
    ```bash
    npm run dev
    ```

## Environment Variables

The generated project requires these environment variables in `.env`:

```env
DATABASE_URL="your-database-connection-string"
```

Example for different databases:

```env
# PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/mydb"

# MongoDB
DATABASE_URL="mongodb://localhost:27017/mydb"

# MySQL
DATABASE_URL="mysql://username:password@localhost:3306/mydb"

# SQLite
DATABASE_URL="file:../../file.db"
```

## Authentication Setup

### Dynamic Authentication

When you choose "dynamic" authentication, the CLI generates:

- `auth-role` table for role management
- `auth-permission` table for permission management
- Database-level authentication system
- Multiple roles support

### Static Authentication

When you choose "static" authentication:

- Uses configuration files for roles and permissions
- Simpler setup for smaller projects
- File-based permission management

## Available Framework Commands

Once your project is created, you can use these Arkos.js commands:

```bash
arkos dev      # Start development server
arkos start    # Start production server
arkos build    # Build for production
arkos generate component-name -m model-name # generate components like controller, routers, services
```

## Support & Community

- **Documentation**: [www.arkosjs.com](https://www.arkosjs.com)
- **GitHub**: [uanela/arkos](https://github.com/uanela/arkos)
- **WhatsApp Community**: [Join our WhatsApp group](https://chat.whatsapp.com/EJ8cjb9hxau0EcOnI4fdpD)

## License

MIT License

---

**Built with ❤️ by Uanela Como and the Arkos.js Contribuitors**

_From the Greek "ἀρχή" (Arkhē) - your foundation for Express and Prisma backend development_
