# Canary Notes v1.3.7-beta

## TODO

### Add

- add documentain about stric mode routing and update jsdocs on arkos config

### Change

- Always pass the data of service to hooks functions already with relation fields handled

### Fix

### Remove

### Deprecate

--

## DOING

### Add

### Change

### Fix

### Remove

### Deprecate

--

## DONE

### Add

- make first stable debugging workable
- add batch update and delete on services and control

### Change

### Fix

- Fixed empty authConfigs.authenticationControl|accessControl object deactivates autentication
- Manually added messae and stack on development to ensure those in non production env.
- Send same error codes in production and development to easy frontend error mapping
- fixed strict routing only work for exported routers on swagger documenation

### Remove

### Deprecate

# Canary Notes v1.4.0-beta

## TODO

### Add

- add automatic middleware to handle request data with files (just like native multer) and auto replace the urls on the specified field.
- add `FileUpload` model to handle files uploads kind of like in django ORM.
- add the api features options under `ArkosRouter`
- add rate limiting in `ArkosRouter`
- Throw an error when trying to generate component for unknow modules
- add correct logic to only allowedOrigins from ArkosConfig if there is nothing in the RouteConfig
- Add depth search operation under models endpoints.

### Change

### Remove

### Deprecate

### Annoucment

- Announce the batch and delete methods
- Announce debugging

## DOING

### Add

- add stable `debugging` with all levels correctly working

## DONE

### Add

- add dtos generation into cli
- Automatic wrap handlers into catchAsync when using `ArkosRouter()`
- added a new `ArkosRouter` a simple `Router` wrapper to enhance features
- allowed nested update without id field

### Deprecated

- deprecated .middlewares.ts files in favor of .interceptors.ts, add warnings to change, and also warn when find .middlewares.ts and .interceptors.ts with same structure tell which one will be used

### Changed

- improved base service and base controller classes by identifying common behaviors among the methods (refactor).
- changed router template to use ArkosRouter by default
- no need to wrap handlers into catchAsync when using `ArkosRouter()`
- order of `ArkosRequest<Params, Body, Query>` types

### Removed

- completely removed support for `.prima-query-options.{js|ts}` and `.auht-configs.{js|ts}` in favor of `.query.ts` and `.auth.ts`

# Canary Notes v1.5.0-beta

### Add

- add a configuration process to customize global context object (`analyze very well because can fall into FAT MODELS trap (using service layer)`)
- add custom validation options under arkos configuration.
- add docker-compose file into `create-arkos`
- allow exporting json of auth role and permissions, allows auto-updating and adding missing fields when exported to existing json file.
- add question about unknow modules when generating compoents -> like to generate in another place

### Change

- separete what goes into `arkos.init()` and `arkos.config.ts`.
- separete the cli to own package cli (`arkos/cli`) -> it is basically development required.
- tell about the new support for usernameFields, `user.profile.nickname` can now be written like `user__profile__nickname` to match pattern used in `req.query`
