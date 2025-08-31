# Canary Notes v1.3.0-beta

## TODO

### Add

- Update documentation to match all new changes, make mention of old way of doing things if there where significant changes.
- add documentain about stric mode routing and update jsdocs on arkos config
- add documentain about the new `authService.permission()` method and also add under jsdocs
- allow exporting json of auth role and permissions, allows auto-updating and adding missing fields when exported to existing json file.
- add auth-actions under swagger auto documentaiton
- add hooks to generate components cli

### Change

### Fix

- strict routing only work for exported routers

### Remove

### Deprecate

--

## DOING

### Add

- add strict routing -> all routes starts disabled and must be activated one by one through `config` object under `model-name.router.ts`

### Change

### Fix

### Remove

### Deprecate

--

## DONE

### Add

- added `req.accessToken` when `authService.getAuthenticatedUser` is called inside or outsie `authService.authenticate`
- added first context data to auto generate endpoints to the service layer `req.user` and `req.accessToken`
- added `ServiceBaseContext` type `arkos/services` export
- imported file service hooks
- added exports of before/after services hooks args
- added warnings for old file naming convection suchs .prisma-query-options and .auth-configs and warning removal on 1.4.0-beta
- added support for passing array of functions into `interceptor middlewares`
- added `onActionError` (e.g: onCreateOneError ) interceptors middlewares -> allowing handling errors on module single request action level
- allowed passing array of service hook on .hooks.ts files
- added a new to check permission on code level using `authService.permission` -> allowing permissions to go beyond routers
- Added a new descriptive way of adding `accessControl` under `.auth.ts` -> instead of `{ Create: ['Author'] }` can pass `{ Create: { roles: ['Author'], name: "Create a new post", description: "Allows to create a new author post" } }` in order to generate a better roles and permissions json
- support fields like `errorMessage`, `description` for access roles defition.
- added strict routing mode into cli flags

### Change

- refactored `getModelModules` -> `getModuleComponents` because we are importing a given module components
- refactored `importPrismaModelModules` -> `importModuleComponents` because we are importing a given module components
- refactores all function containg `ModelModules` to `ModuleComponents` for better convey that are importing a module components
- changed the generate interceptors middlewares to be wrapped on array
- stopped loading controller, service files -> they weren't in use anywhere
- changed `ts-node-dev` for `tsx-strict` for faster startup, 2X faster.
- translated host localhost to 127.0.0.1 to make it available on both. (server.ts)
- add an endpoint with available actions together their own resources to easy frontend (`/api/auth-actions`)
- Enhanced importing components helper function (dynamic-loader)

### Fix

### Remove

- removed available-routes endpoint as there is already swagger docs.
- removed the middlewares checkDatabaseConnection -> prisma does it.
- removed getBaseServices function -> was not being used

### Deprecate

- deprecated and warned forseable removal of available resource route -> there will be the available actions that will be grouped by resources.
- deprecated and removed possibility of desabling database connection because it no longer exits
- Removed database connection check or allow only one check at start time for first request.

# Canary Notes v1.4.0-beta

## TODO

### Add

- add `FileUpload` model to handle files uploads kind of like in django ORM.
- separete the cli to own package cli (`arkos/cli`) -> it is basically development required.
- add dtos generation into cli
- add a configuration process to customize global context object
- mimic base service class behavior into auth service
- mimic file upload service class behavior into auth service
- Show suggestion to add invalid --model params components in folders out of module
- analyze custom forbidden error message per action
- add docker-compose file into `create-arkos`
- add automatic middleware to handle request data with files (just like native multer) and auto replace the urls on the specified field.

### Change

- separete what goes into `arkos.init()` and `arkos.config.ts`.
- change .middlewares to .interceptor - as it is basically working just like a reference (router alike) when using array of middlewares which will be used on most project. also allowing devs to use .middlewares to actually store the middlewares functions.

### Remove

- completely remove support for `.prima-query-options.{js|ts}` and `.auht-configs.{js|ts}`
