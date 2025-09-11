# Canary Notes v1.3.2-beta

## TODO

### Add

- add documentain about stric mode routing and update jsdocs on arkos config

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

- option to skip all hooks at once at service hooks by passing skip : "all"

### Change

### Fix

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

### Change

- separete what goes into `arkos.init()` and `arkos.config.ts`.
- change .middlewares to .interceptor - as it is basically working just like a reference (router alike) when using array of middlewares which will be used on most project. also allowing devs to use .middlewares to actually store the middlewares functions.

### Remove

- completely remove support for `.prima-query-options.{js|ts}` and `.auht-configs.{js|ts}`
