# Contributing to Arkos.js

Thank you for your interest in contributing to Arkos.js! We're building a framework that simplifies RESTful API development, and we welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Branch Strategy](#branch-strategy)
- [Version Support Policy](#version-support-policy)
- [Communication](#communication)
- [Recognition](#recognition)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. We expect:

- Respectful communication
- Constructive feedback
- Focus on what's best for the project and community
- Empathy towards other contributors

## How Can I Contribute?

There are many ways to contribute to Arkos.js:

### Report Bugs

Found a bug? [Open a bug report](../../issues/new?template=bug_report.yml)

### Suggest Features

Have an idea? [Submit a feature request](../../issues/new?template=feature_request.yml)

### Improve Documentation

Documentation improvements are always welcome! This includes:

- Fixing typos or clarifying explanations
- Adding examples
- Improving API documentation
- Writing tutorials or guides

### Submit QOL Improvements

Small improvements that enhance developer experience

### Code Contributions

- Fix bugs
- Implement new features
- Optimize performance
- Add tests

### Testing

Help test new features and beta releases

## Getting Started

### Prerequisites

- **Node.js**: >= 22.09 (we recommend using the latest LTS version)
- **pnpm**: We use pnpm for package management
- **Git**: For version control
- **Database** (for integration tests): PostgreSQL, MySQL, SQLite, or MongoDB

### Installation

1. **Fork the repository** on GitHub

2. **Clone your fork**:

```bash
git clone https://github.com/YOUR_USERNAME/arkos.git
cd arkos
```

3. **Add upstream remote**:

```bash
git remote add upstream https://github.com/Uanela/arkos.git
```

4. **Install dependencies**:

```bash
pnpm install
```

5. **Build the project**:

```bash
pnpm run build
```

6. **Run tests**:

```bash
pnpm test
```

If all tests pass, you're ready to start contributing!

## Development Setup

### Setting Up for Development

```bash
# Watch mode for development
pnpm run dev

# Run tests in watch mode
pnpm run test:watch

# Check test coverage
pnpm run test:coverage

# Lint code
pnpm run lint
```

### Database Setup for Integration Tests

Some integration tests require a database. You can use any Prisma-supported database:

```bash
# Example with PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/arkos_test"

# Or SQLite for simplicity
DATABASE_URL="file:./dev.db"
```

## Project Structure

```
packages/
├── arkos/                    # Core framework package
│   ├── src/
│   │   ├── exports/          # Public API exports
│   │   │   ├── auth/         # Authentication module exports
│   │   │   ├── controllers/  # Base controller exports
│   │   │   ├── services/     # Base service exports
│   │   │   ├── middlewares/  # Middleware exports
│   │   │   ├── validation/   # Validation helpers
│   │   │   ├── error-handler/# Error handling exports
│   │   │   ├── prisma/       # Prisma utilities
│   │   │   └── utils/        # General utilities
│   │   ├── modules/          # Internal modules
│   │   │   ├── base/         # Base classes and helpers
│   │   │   ├── auth/         # Auth implementation
│   │   │   ├── email/        # Email service
│   │   │   ├── file-upload/  # File upload service
│   │   │   ├── swagger/      # API documentation
│   │   │   ├── debugger/     # Debugging utilities
│   │   │   └── error-handler/# Error handling
│   │   ├── components/       # Shared components
│   │   │   └── arkos-policy/ # RBAC policy system
│   │   ├── types/            # TypeScript type definitions
│   │   ├── utils/            # Utility functions
│   │   │   ├── arkos-router/ # Enhanced Express router
│   │   │   ├── cli/          # CLI tools (dev, build, generate)
│   │   │   ├── features/     # Feature management
│   │   │   ├── prisma/       # Prisma schema parsing
│   │   │   └── helpers/      # Internal helpers
│   │   ├── generated.ts      # Auto-generated exports
│   │   ├── app.ts            # Main app factory
│   │   └── server.ts         # Server bootstrap
│   ├── scripts/              # Build and utility scripts
│   │   ├── generate-post-build-types.ts
│   │   ├── write-correction-version-after-build.ts
│   │   └── fix-esm-imports.ts
│   ├── coverage/             # Test coverage reports (gitignored)
│   ├── dist/                 # Build output (gitignored)
│   ├── .github/workflows/    # CI/CD pipelines
│   ├── jest.config.ts        # Jest test configuration
│   ├── tsconfig.json         # TypeScript configuration
│   ├── package.json
│   └── cli.js                # CLI entry point
│
├── create-arkos/             # Project scaffolding tool
│   ├── src/
│   │   ├── index.ts          # CLI entry point
│   │   ├── utils/
│   │   │   ├── project-config-inquirer.ts
│   │   │   ├── template-compiler.ts
│   │   │   └── helpers/
│   │   └── __tests__/
│   ├── templates/            # Project templates
│   │   └── basic/            # Basic template files (.hbs)
│   │       ├── prisma/schema/    # Prisma schema templates
│   │       ├── src/modules/      # Module templates
│   │       └── __tests__/        # Template tests
│   ├── scripts/              # Post-build scripts
│   ├── package.json
│   └── tsconfig.json
│
└── shared/                   # Shared utilities between packages
    ├── src/
    │   └── utils/helpers/
    └── package.json

documentation/                # Website and docs (separate repository)
├── src/
│   ├── components/           # React components
│   ├── routes/               # Page routes
│   ├── lib/                  # Utilities
│   └── styles/               # CSS styles
├── content/blog/             # Blog posts
├── public/img/               # Static images
├── package.json
└── vite.config.ts

.github/                      # GitHub configuration
├── workflows/                # GitHub Actions
└── ISSUE_TEMPLATE/           # Issue templates

LICENSE
package.json                  # Root package.json (workspace)
```

### Key Directories Explained:

| Directory                                    | Purpose                                           |
| -------------------------------------------- | ------------------------------------------------- |
| **`packages/arkos/src/exports/`**            | Public API - everything here is user-facing       |
| **`packages/arkos/src/modules/`**            | Internal implementation (not directly exported)   |
| **`packages/arkos/src/components/`**         | Reusable internal components like `arkos-policy`  |
| **`packages/arkos/src/utils/`**              | Utility functions and helpers                     |
| **`packages/arkos/src/utils/arkos-router/`** | Enhanced Express router with OpenAPI support      |
| **`packages/arkos/src/utils/cli/`**          | CLI commands: `dev`, `build`, `generate`, `start` |
| **`packages/arkos/src/utils/prisma/`**       | Prisma schema parsing and JSON schema generation  |
| **`packages/arkos/scripts/`**                | Build scripts (type generation, ESM/CJS handling) |
| **`packages/create-arkos/templates/`**       | Handlebars templates for new projects             |
| **`packages/shared/`**                       | Code shared between `arkos` and `create-arkos`    |

### Important Files:

| File                                 | Purpose                                        |
| ------------------------------------ | ---------------------------------------------- |
| `packages/arkos/src/app.ts`          | Main `arkos()` factory function                |
| `packages/arkos/src/server.ts`       | Server bootstrap and initialization            |
| `packages/arkos/src/generated.ts`    | Auto-generated exports (models, configs)       |
| `packages/arkos/cli.js`              | CLI entry point (symlinked to `arkos` command) |
| `packages/create-arkos/src/index.ts` | `create-arkos` CLI entry point                 |

### Testing Structure:

Tests live alongside the code they test in `__tests__/` directories:

```
src/modules/auth/
├── auth.service.ts
├── auth.controller.ts
├── auth.router.ts
└── __tests__/
    ├── auth.service.test.ts
    ├── auth.controller.test.ts
    └── auth.router.test.ts
```

## Coding Standards

### TypeScript Configuration

We use strict TypeScript settings:

- `strict: true`
- ES2021 target
- ESNext modules
- Experimental decorators enabled

### Code Style

- **Formatter**: Prettier (automatically formats on save)
- **Linter**: ESLint with TypeScript plugin
- **Naming Conventions**:
  - `camelCase` for variables and functions
  - `PascalCase` for classes, types, interfaces and enums
  - `SCREAMING_SNAKE_CASE` for constants
  - Files match their export: `base.service.ts` exports `BaseService`

### Documentation Requirements

#### JSDoc Comments Required For:

**All exported code** (anything in `src/exports/`):

````typescript
/**
 * Creates a new Arkos application instance
 *
 * @param configs - Configuration options for the application
 *
 * @see https://arkosjs.com/docs/getting-started/configuration
 *
 * @example
 * ```typescript
 * arkos.init({
 *   authentiation: { mode: "static" },
 *   fileUpload: { baseUploadDir: './uploads' }
 * });
 * ```
 */
export function init(configs: ArkosConfig) {
  // implementation
}
````

**Include:**

- Description of what the function/class does
- `@param` for each parameter
- `@returns` for return value
- `@see` link to documentation when explanation is complex
- `@example` for non-obvious usage
- `@throws` for thrown errors

#### Comments Required For:

- **Complex business logic**: Explain the "why", not the "what"
- **Non-obvious algorithms**: Why this approach was chosen
- **Workarounds**: Link to issue or explain why needed
- **Performance considerations**: Why specific implementation was chosen

```typescript
// ✅ Good comment
// Using Set instead of Array for O(1) lookup performance with large datasets
const seenIds = new Set<string>();

// ❌ Bad comment (obvious)
// Loop through items
items.forEach(item => {
```

## Testing Requirements

### Test Coverage

- **Minimum coverage**: 85% overall
- **New features**: Must include tests
- **Bug fixes**: Add regression test

### Writing Tests

We use **Jest** for testing:

```typescript
// src/modules/auth/__tests__/auth.service.test.ts
import { AuthService } from "../auth.service";

describe("AuthService", () => {
  describe("generateToken", () => {
    it("should generate a valid JWT token", () => {
      const authService = new AuthService();
      const token = authService.signJwtToken({ userId: 1 });

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
    });
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage

# Run specific test file
pnpm test auth.service.test.ts
```

### Test Types

- **Unit tests**: Test individual functions/classes in isolation
- **Integration tests**: Test multiple components working together (may require database)

Place tests in `__tests__/` directories next to the code they test.

## Commit Guidelines

We follow **Conventional Commits** specification:

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no logic change)
- **refactor**: Code refactoring (no feature change or bug fix)
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Build process, dependency updates, etc.

### Examples

```bash
feat(auth): add refresh token rotation

Implements automatic refresh token rotation for improved security.
Tokens now expire after 7 days and can be rotated once.

Closes #123
```

```bash
fix(file-upload): handle Windows path separators correctly

Converts backslashes to forward slashes on Windows to ensure
consistent path handling across platforms.

Fixes #456
```

```bash
docs(readme): update installation instructions

Added prerequisites section and clarified pnpm usage.
```

### Scope

Optional but recommended. Use the module name:

- `auth`
- `file-upload`
- `validation`
- `services`
- `cli`
- `docs`

## Pull Request Process

### Before Opening a PR

#### For Small Changes (No Issue Required):

- Typos, formatting
- Small documentation improvements
- Obvious bugs with clear fixes

#### For Larger Changes (Open Issue First):

- New features
- Breaking changes
- Architectural changes
- Anything taking >2 hours

**Why?** Discussing first prevents wasted effort if the approach needs adjustment.

### Opening a Pull Request

1. **Update from upstream**:

```bash
git fetch upstream
git rebase upstream/canary
```

2. **Create a feature branch**:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

3. **Make your changes**:

- Write clean, documented code
- Add tests (85% coverage minimum)
- Update documentation if needed
- Follow coding standards

4. **Test thoroughly**:

```bash
pnpm run lint
pnpm test
pnpm run test:coverage
pnpm run build
```

5. **Commit with conventional commits**:

```bash
git add .
git commit -m "feat(scope): your change description"
```

6. **Push to your fork**:

```bash
git push origin feature/your-feature-name
```

7. **Open PR on GitHub**:

- Use clear title following conventional commits format
- Fill out the PR template completely
- Link related issues

### PR Title Format

```
<type>(<scope>): <description>
```

Examples:

- `feat(auth): add OAuth2 provider support`
- `fix(file-upload): resolve Windows path issues`
- `docs(contributing): update testing guidelines`

### PR Description Template

```markdown
## Description

Brief description of what this PR does

## Related Issue

Closes #123

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Version Compatibility Check

- [ ] This fix can be applied to the previous supported minor version (if applicable)
- [ ] This is a major version change (requires different approach)

## Testing

- [ ] Added unit tests
- [ ] Added integration tests (if applicable)
- [ ] All tests pass locally
- [ ] Test coverage remains above 85%

## Documentation

- [ ] Updated JSDoc comments
- [ ] Updated README (if applicable)
- [ ] Updated documentation site (if applicable)
- [ ] Added code examples

## Checklist

- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented complex logic
- [ ] My changes generate no new warnings
- [ ] New and existing tests pass locally
- [ ] I have rebased on latest canary branch
```

### Review Process

1. **Automated Checks**: GitHub Actions will run tests and linting
2. **Code Review**: Maintainer will review within **3 business days**
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, maintainer will merge

### After Review

- **Requested Changes**: Push additional commits to your branch
- **Squashing**: Don't worry about squashing - we'll squash all commits when merging
- **Conflicts**: Rebase on latest `canary` if conflicts arise

## Branch Strategy

### Main Branches

- **`main`**: Stable releases only (production-ready)
- **`canary`**: Active development (default branch)

### Version Branches

We maintain long-lived branches for version lines:

- **`canary-1.x`**: Support branch for v1.x series (receives patches and critical fixes)
- **`canary-2.x`**: Support branch for v2.x series (receives patches and critical fixes)
- **`canary-3.x`**: Active development branch for next major version

### Version Support Policy

Arkos.js follows a **2 majors, 2 minors** support policy:

- **2 major versions** are supported simultaneously
- **2 minor versions** within each supported major are maintained

#### Major Version Support

- Major versions receive **patches only** (no minor releases)
- Each major version is supported for its lifecycle
- When a new major is released, the oldest supported major enters maintenance mode (patches only)

#### Minor Version Support

- Within each supported major, we maintain **current + previous** minor versions
- The **current minor** receives both features and fixes
- The **previous minor** receives only:
  - **Bug fixes**
  - **Small features that resemble fixes** (e.g., missing config options that should be there)
  - Security patches
  - Documentation updates

### Backporting Contributions

When contributing a **fix** or **small feature that behaves like a fix**:

1. **Target `canary`** (current development branch) first
2. **Determine if it should be backported** to the previous supported minor:
   - ✅ **Yes**: Bug fixes that affect users
   - ✅ **Yes**: Missing configuration options
   - ✅ **Yes**: Small DX improvements
   - ❌ **No**: New features requiring API changes
   - ❌ **No**: Breaking changes
   - ❌ **No**: Performance optimizations requiring refactoring

3. **If backporting is appropriate**:
   - The maintainer will check if the change applies cleanly
   - Backports are applied to the `canary-{major}.x` branch (e.g., `canary-1.x` for v1 support)
   - You may be asked to create a separate PR against the version branch

**Example flow:**

```
User reports missing config option in v1.4.2
  ↓
Contributor fixes on canary (v1.5)
  ↓
Maintainer checks if fix applies to v1.4 (previous minor)
  ↓
If yes → Backport to canary-1.x branch
  ↓
Patch releases: v1.4.3 and v1.5.1
```

### Branch Naming Conventions

- `canary` - Active development (default)
- `canary-1.x` - Support branch for v1.x (patches only after v1.5)
- `canary-2.x` - Support branch for v2.x
- `feature/feature-name` - New features (target canary)
- `fix/bug-description` - Bug fixes (target canary)
- `backport/fix-description` - Backports to version branches
- `docs/what-changed` - Documentation
- `refactor/what-refactored` - Refactoring
- `test/what-tested` - Tests only

Examples:

- `feature/oauth-providers`
- `fix/windows-path-handling`
- `backport/missing-config-option`
- `docs/contributing-guide`

### Which Branch Should You Target?

| Change Type                             | Target Branch | Backport Needed?                 |
| --------------------------------------- | ------------- | -------------------------------- |
| New feature                             | `canary`      | No (will be in next minor/major) |
| Breaking change                         | `canary`      | No (major version)               |
| Bug fix                                 | `canary`      | Sometimes (to previous minor)    |
| Missing config option (small, fix-like) | `canary`      | Yes (to previous minor)          |
| Security patch                          | `canary`      | Yes (to all supported versions)  |
| Documentation                           | `canary`      | Maybe (docs often cross-version) |
| Performance optimization (non-breaking) | `canary`      | Rarely                           |
| Tests only                              | `canary`      | No                               |

### When You Need to Backport

If your PR has the "backport" label or a maintainer asks:

1. **Create a separate branch** from the target version branch:

   ```bash
   git checkout -b backport/your-fix canary-1.x
   ```

2. **Cherry-pick or re-apply your changes**:

   ```bash
   git cherry-pick <commit-hash-from-canary>
   # Or manually apply if conflicts exist
   ```

3. **Open PR against the version branch** (e.g., `canary-1.x`)

### Release Process

**We handle releases** - contributors don't need to worry about this:

1. Changes merged to `canary`
2. Testing and validation
3. Version bump and CHANGELOG update based on semver
4. Patch releases to version branches as needed
5. Merge `canary` → `main` for major/minor releases
6. Publish to npm with appropriate dist-tags

## Version Support Policy

### Summary Table

| Version                                       | Status           | Receives                             |
| --------------------------------------------- | ---------------- | ------------------------------------ |
| Current major + 2 minors (e.g., v1.5)         | Active (current) | Features + fixes                     |
| Current major + 1 previous minor (e.g., v1.4) | Maintenance      | Fixes only + small fix-like features |
| Current major + older minors (e.g., v1.3)     | End of life      | Nothing (upgrade required)           |
| Previous major (e.g., v0.x)                   | End of life      | Nothing (upgrade required)           |

### Example Timeline

```
v1.5 released (current)
├── v1.5.x: Features + fixes
├── v1.4.x: Fixes + small fix-like features only
└── v1.3.x and below: End of life

When v1.6 releases:
├── v1.6.x: Features + fixes (new current)
├── v1.5.x: Fixes + small fix-like features only (moves to maintenance)
└── v1.4.x: End of life
```

### Why This Policy?

- **Stability**: Users can stay one minor behind without missing critical fixes
- **Innovation**: New features can move forward without waiting
- **Practicality**: Most bug fixes apply cleanly to the previous minor
- **User-friendly**: Teams don't feel forced to upgrade every week

## Communication

### Where to Ask Questions

- **GitHub Discussions**: General questions, ideas, showcase
  - Link: [Discussions](https://github.com/Uanela/arkos/discussions)
- **GitHub Issues**: Bug reports, feature requests, QOL improvements
  - Use issue templates
- **WhatsApp Community**: Real-time chat with community
  - Link: https://chat.whatsapp.com/EJ8cjb9hxau0EcOnI4fdpD
- **Email**: Security issues only
  - uanela.como@formulawebpromax.com

### During Development

- Comment on the related issue to share progress
- Ask questions in GitHub Discussions
- Join WhatsApp for quick questions

### Getting Help

Stuck? Here's how to get unblocked:

1. Check existing documentation
2. Search closed issues/PRs
3. Ask in GitHub Discussions
4. Reach out on WhatsApp

We're friendly and happy to help!

## Recognition

We value every contribution, no matter how small!

### How We Recognize Contributors

1. **Contributors List**: Added to CONTRIBUTORS.md
2. **Release Notes**: Mentioned in CHANGELOG.md
3. **All Contributors Bot**: Automatic recognition with emoji badges
4. **GitHub Profile**: Contributions show on your GitHub profile

### Types of Contributions We Recognize

Not just code! We recognize:

- 💻 Code contributions
- 📖 Documentation improvements
- 🐛 Bug reports
- 💡 Ideas and feature requests
- 🧪 Testing and QA
- 💬 Answering questions
- 🎨 Design contributions
- 🌍 Translations (when we add i18n)

## License

By contributing to Arkos.js, you agree that your contributions will be licensed under the [MIT License](LICENSE).

This means:

- Your code becomes part of the project
- It will be distributed under MIT license
- You retain copyright to your contributions
- No Contributor License Agreement (CLA) required

## Beta Status & Roadmap

Arkos.js is currently in **beta** (v1.3.x). We're working toward:

- v1.4 - v1.10: Feature additions and refinement
- v2.0: First stable release

**What this means for contributors:**

- APIs may change (we'll communicate clearly)
- Breaking changes are acceptable in beta
- Your feedback shapes the stable release
- Early contributors help define best practices

## Questions?

Still have questions? Feel free to:

- Open a [Discussion](https://github.com/Uanela/arkos/discussions)
- Join our [WhatsApp community](https://chat.whatsapp.com/EJ8cjb9hxau0EcOnI4fdpD)
- Check our [Documentation](https://arkosjs.com)

---

**Thank you for contributing to Arkos.js!**

Every contribution, big or small, helps make RESTful API development better for everyone.
