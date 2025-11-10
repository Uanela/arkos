# Changelog

All notable changes to Arkos.js will be documented in this file.

## [Unreleased - Canary]

### Added

### Changed

### Fixed

### Removed

### Deprecated

---

## [1.3.8-beta] - 2025-11-10

### Added

- **CLI Enhancements**
    - Added built-in CLI for generating Arkos and Express components (controllers, routers, services, middlewares, query options, auth configs)
    - Added `create-arkos` CLI for quickly scaffolding new Arkos.js projects with interactive setup
    - Added smart detection for TypeScript vs JavaScript based on project configuration
    - Added file existence checking and import adjustments in CLI generation
    - Added support for multiple naming conventions (camelCase, PascalCase, kebab-case) in CLI
    - Added specialized templates for `auth` and `fileUpload` models in CLI
- **File Upload System**
    - Added file upload interceptor middlewares (`beforeUploadFile`, `afterUploadFile`, `beforeUpdateFile`, `afterUpdateFile`, `beforeDeleteFile`, `afterDeleteFile`, `beforeFindFile`)
    - Added `PATCH /api/uploads/:fileType/:fileName` endpoint for auto-updating uploaded files with complete file replacement workflow
- **Prisma Query Options**
    - Added simplified grouped query options: `find`, `save`, `create`, `update`, `delete`, `saveOne`, `saveMany` for controlling related operations together
    - Added simplified naming convention from `model.prisma-query-options.ts` to `model.query.ts`
    - Added backward compatibility for old naming convention
- **Authentication**
    - Added `authService.isPasswordHashed` method to prevent double password encryption
    - Added simplified naming convention from `model.auth-configs.ts` to `model.auth.ts`
- **Development Experience**
    - Added automatic file watcher for hot reload on file creation/deletion under src directory
    - Added environment file change detection (.env, .env.local, .env.development, etc.)
    - Added package.json and configuration file change detection (tsconfig.json, arkos.config.\*)
    - Added timestamped restart messages for better development feedback
- **API Exports**
    - Added `getArkosConfig()` function to access running ArkosConfig instance

### Changed

- Renamed `queryOptions` property to `global` in PrismaQueryOptions for better clarity
- Enhanced CLI to automatically wrap generated code with required patterns (e.g., no manual `catchAsync` needed for middlewares)

### Fixed

### Removed

### Deprecated

---

## [1.3.3-beta] - 2025-09-21

### Add

- option to skip all hooks at once at service hooks by passing skip : "all", under the context.
- added npx arkos prisma generate in order to correctly infer types for base service. (only be offically announced on 1.4-beta)
- added error message when trying to gnerate existing component.
- started working on debugging. (To be offically announced on 1.4-beta)

---

## [1.3.0-beta] - 2025-09-09

### Added

- **Authentication Enhancements**
    - Added `req.accessToken` when `authService.getAuthenticatedUser` is called inside or outside `authService.authenticate`
    - Added first context data to auto generate endpoints to the service layer: `req.user` and `req.accessToken`
    - Added `ServiceBaseContext` type export from `arkos/services`
    - Added new `authService.permission()` method for code-level permission checking, allowing permissions to go beyond routers
    - Added `/api/auth-actions` endpoint with available actions and their resources for easier frontend integration

- **Access Control & Permissions**
    - Added descriptive way of defining `accessControl` under `.auth.ts` files - instead of `{ Create: ['Author'] }` can now pass `{ Create: { roles: ['Author'], name: "Create a new post", description: "Allows to create a new author post" } }` for better roles and permissions generation
    - Added support for `errorMessage` and `description` fields in access roles definition
    - Added auth-actions under swagger auto documentation

- **Routing & Configuration**
    - Added strict routing mode - all routes start disabled and must be activated one by one through `config` object under `model-name.router.ts`
    - Added strict routing mode into CLI flags

- **Middleware & Hooks**
    - Added support for passing array of functions into interceptor middlewares
    - Added `onActionError` (e.g: `onCreateOneError`) interceptor middlewares for handling errors at module single request action level
    - Added support for passing array of service hooks in `.hooks.ts` files
    - Imported file service hooks
    - Added exports of before/after service hooks args
    - Added hooks to generate components CLI

- **Development & Warnings**
    - Added warnings for old file naming conventions such as `.prisma-query-options` and `.auth-configs` with removal warning for v1.4.0-beta

### Changed

- **Performance Improvements**
    - Changed from `ts-node-dev` to `tsx-strict` for faster startup (2x faster)
    - Translated host localhost to 127.0.0.1 to make it available on both environments (server.ts)

- **Code Refactoring**
    - Refactored `getModelModules` → `getModuleComponents` for better clarity that we're importing module components
    - Refactored `importPrismaModelModules` → `importModuleComponents` for consistency
    - Refactored all functions containing `ModelModules` to `ModuleComponents` for better naming convention
    - Changed generated interceptor middlewares to be wrapped in arrays
    - Enhanced importing components helper function (dynamic-loader)

- **Application Architecture**
    - Stopped loading controller and service files as they weren't being used anywhere

### Fixed

- Fixed strict routing to only work for exported routers

### Removed

- Removed `/available-routes` endpoint as swagger docs already provide this functionality
- Removed `checkDatabaseConnection` middleware as Prisma handles this internally
- Removed `getBaseServices` function as it was not being used
- Removed database connection check configuration option

### Deprecated

- Deprecated available resource route in favor of available actions grouped by resources
- Deprecated possibility of disabling database connection as the feature no longer exists
