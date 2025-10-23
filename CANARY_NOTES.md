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

- add batch update and delete on services and control

### Change

- make first stable debugging workable

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
- allow exporting json of auth role and permissions, allows auto-updating and adding missing fields when exported to existing json file.
- change the paramter type of ServiceHookArgs to receive data type as second parameter "BeforeCreateOneHookArgs<Prisma.ProductDelegate, CreateProductDto>"
- add question about unknow modules when generating compoents -> like to generate in another place
- add custom validation options under arkos configuration.

### Change

- separete what goes into `arkos.init()` and `arkos.config.ts`.
- change .middlewares to .interceptor - as it is basically working just like a reference (router alike) when using array of middlewares which will be used on most project. also allowing devs to use .middlewares to actually store the middlewares functions.

### Remove

- completely remove support for `.prima-query-options.{js|ts}` and `.auht-configs.{js|ts}`

### Deprecate

- deprecate .middlewares.ts files in favor of .interceptors.ts, add warnings to change, and also warn when find .middlewares.ts and .interceptors.ts with same structure tell which one will be used

### Annoucment

- Announce the batch and delete methods
- tell about the new support for usernameFields, `user.profile.nickname` can now be written like `user__profile__nickname` to match pattern used in `req.query`
