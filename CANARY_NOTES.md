# Canary Notes v1.3.5-beta

## TODO

### Add

- add documentain about stric mode routing and update jsdocs on arkos config

### Change

### Fix

- fix windows path handling when dealing with file uploads
- strict routing only work for exported routers on swagger documenation
- make res.locals.someData on after middlewares work

### Remove

### Deprecate

--

## DOING

### Add

- add batch update and delete on services and control

### Change

### Fix

### Remove

### Deprecate

--

## DONE

### Add

- make first stable debugging workable

### Change

- fix functions names at service hooks template

### Fix

- strict routing only work for exported routers on swagger documenation (fixed)

### Remove

### Deprecate

# Canary Notes v1.4.0-beta

## TODO

### Add

- mimic base service class behavior into auth service
- mimic file upload service class behavior into auth service
- analyze custom forbidden error message per action
- add docker-compose file into `create-arkos`
- add automatic middleware to handle request data with files (just like native multer) and auto replace the urls on the specified field.
- allow exporting json of auth role and permissions, allows auto-updating and adding missing fields when exported to existing json file.
- add `FileUpload` model to handle files uploads kind of like in django ORM.

### Change

### Remove

### Deprecate

### Annoucment

- Announce the batch and delete methods
- Announce debugging

## DOING

### Add

- add dtos generation into cli
- add stable `debugging` with all levels correctly working

## Add

## DONE

### Deprecated

- deprecated .middlewares.ts files in favor of .interceptors.ts, add warnings to change, and also warn when find .middlewares.ts and .interceptors.ts with same structure tell which one will be used
- no need to wrap handlers into catchAsync when using `ArkosRouter()`
- added a new `ArkosRouter` a simple `Router` wrapper to enhance features

### Changed

- improved base service and base controller classes by identifying common behaviors among the methods (refactor).

### Removed

- completely removed support for `.prima-query-options.{js|ts}` and `.auht-configs.{js|ts}` in favor of `.query.ts` and `.auth.ts`

# Canary Notes v1.5.0-beta

### Add

- add a configuration process to customize global context object (`analyze very well because can fall into FAT MODELS trap (using service layer)`)
- add custom validation options under arkos configuration.
- add question about unknow modules when generating compoents -> like to generate in another place

### Change

- separete what goes into `arkos.init()` and `arkos.config.ts`.
- separete the cli to own package cli (`arkos/cli`) -> it is basically development required.
- tell about the new support for usernameFields, `user.profile.nickname` can now be written like `user__profile__nickname` to match pattern used in `req.query`
