# Canary Notes v1.3.0-beta

## TODO

- add automatic middleware to handle request data with files (just like native multer) and auto replace the urls on the specified field.

### Add

### Change

- change .middlewares to .interceptor - as it is basically working just like a reference (router alike) when using array of middlewares which will be used on most project. also allowing devs to use .middlewares to actually store the middlewares functions.
- update places using getBaseServices function

### Fix

- Enhance importing components helper function

### Remove

### Deprecate

- deprecate and warn forseable removal of available resource route -> there will be the available actions that will be grouped by resources.

--

## DOING

### Add

- add an endpoint with available actions together their own resources to easy frontend

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
- added warnings for old file naming convection suchs .prisma-query-options and .auth-configs and warning removal on 1.5.

### Change

- refactored `getModelModules` -> `getModuleComponents` because we are importing a given module components
- refactored `importPrismaModelModules` -> `importModuleComponents` because we are importing a given module components
- refactores all function containg `ModelModules` to `ModuleComponents` for better convey that are importing a module components

### Fix

### Remove

- removed available-routes endpoint as there is already swagger docs.
- removed the middlewares checkDatabaseConnection -> prisma does it.
- removed getBaseServices function -> was not being used

### Deprecate

- deprecated and removed possibility of desabling database connection because it no longer exits
- Remove database connection check or allow only one check at start time or first request.

# Canary Notes v1.4.0-beta

## TODO

### Add

- add `FileUpload` model to handle files uploads kind of like in django ORM.
- separete what goes into `arkos.init()` and `arkos.config.ts`.
- separete the cli to own package cli (`arkos/cli`) -> it is basically development required.
- add dtos generation into cli
- add a configuration process to customize global context object
- mimic base service class behavior into auth service
- mimic file upload service class behavior into auth service

### Remove

- completely remove support for `.prima-query-options.{js|ts}` and `.auht-configs.{js|ts}`
