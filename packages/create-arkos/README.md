![Header Image](https://www.arkosjs.com/img/arkos-readme-header.webp?v=3)

<div align="center">

[![Socket Badge](https://badge.socket.dev/npm/package/create-arkos)](https://badge.socket.dev/npm/package/create-arkos)
![npm](https://img.shields.io/npm/v/create-arkos)
![npm](https://img.shields.io/npm/dt/create-arkos)
![GitHub](https://img.shields.io/github/license/uanela/arkos)
![GitHub Repo stars](https://img.shields.io/github/stars/uanela/arkos)

</div>

<div align="center">
<h2>Scaffold Your Arkos Project in Seconds</h2>
<p>The official CLI scaffolding tool for Arkos.js</p>
</div>

<div align="center">

**[Installation](https://www.arkosjs.com/docs/getting-started/installation)** •
**[Documentation](https://arkosjs.com/docs)** •
**[Website](https://arkosjs.com)** •
**[Tutorial](https://arkosjs.com/learn)** •
**[GitHub](https://github.com/uanela/arkos)** •
**[Blog](https://www.arkosjs.com/blog)** •
**[Npm](https://www.npmjs.com/package/create-arkos)**

</div>

## Quick Start

```bash
pnpm create arkos@latest my-project
```

Follow the interactive prompts. Your project comes with JWT auth, customizable CRUD routes, Swagger docs at `/api/docs`, file uploads, validation, and a full security middleware stack. Understand the generated [Project Structure](https://www.arkosjs.com/docs/getting-started/project-structure).

## Interactive Setup

```bash
? What is the name of your project? my-project
? Would you like to use TypeScript? Yes
? What db provider will be used for Prisma? postgresql
? Which Validation library would you like to use? zod
? Which Authentication mode would you like to use? static
? Enter the Prisma field name to use as the login username: email
? Would you like to use Strict Routing? No
```

## From Zero to Running API

```bash
# 1. Create your project
pnpm create arkos@latest my-project

# 2. Navigate to it
cd my-project

# 3. Configure your database
# Edit .env with your DATABASE_URL

# 4. Push the schema
npx prisma db push

# 5. Start building
npm run dev
```

Your API is now running at `http://localhost:8000` — OpenAPI at `/api/docs`.

## Configuration Options

**Database providers:** PostgreSQL · MongoDB · MySQL · SQLite · SQL Server · CockroachDB

**Validation:** Zod · class-validator

**Authentication types:**

- **Static** — file-based, roles defined in code via `ArkosPolicy`
- **Dynamic** — database-level, roles and permissions stored in tables
- **None** — skip for now, add when ready

## Generated Project Structure

```
my-project/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── modules
│   ├── utils/
│   │   └── prisma/
│   │       └── index.ts
│   └── app.ts
├── .env
├── arkos.config.ts
├── package.json
└── tsconfig.json
```

## Getting Nightly Updates

```bash
pnpm create arkos@next my-project
```

## Requirements

- Node.js 20 or higher
- npm, yarn, or pnpm

## Support & Contributing

- **Documentation:** [arkosjs.com/docs](https://arkosjs.com/docs)
- **Bug Reports:** [GitHub Issues](https://github.com/uanela/arkos/issues)
- **Feature Requests:** Open a GitHub issue
- **Contact:** [uanelaluiswayne@gmail.com](mailto:uanelaluiswayne@gmail.com)

Contributions are welcome! We appreciate all contributions, from bug fixes to new features.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<div align="center">

**[Installation](https://www.arkosjs.com/docs/getting-started/installation)** •
**[Documentation](https://arkosjs.com/docs)** •
**[Website](https://arkosjs.com)** •
**[Tutorial](https://arkosjs.com/learn)** •
**[GitHub](https://github.com/uanela/arkos)** •
**[Blog](https://www.arkosjs.com/blog)** •
**[Npm](https://www.npmjs.com/package/create-arkos)**

Built with ❤️ by [Uanela Como](https://github.com/uanela) and contributors

_The name "Arkos" comes from the Greek word "ἀρχή" (Arkhē), meaning "beginning" or "foundation", reflecting our goal of providing a solid foundation for backend development._

</div>
