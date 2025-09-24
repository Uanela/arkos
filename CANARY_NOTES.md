# Canary Notes v1.3.4-beta

## TODO

### Add

- add documentain about stric mode routing and update jsdocs on arkos config

### Change

### Fix

- strict routing only work for exported routers on swagger documenation
- fix windows path handling when dealing with file uploads

### Remove

### Deprecate

--

## DOING

### Add

- add batch update and delete on services and control
- make first stable debugging workable

### Change

### Fix

### Remove

### Deprecate

--

## DONE

### Add

### Change

- fix functions names at service hooks template

### Fix

### Remove

### Deprecate

# Canary Notes v1.4.0-beta

## TODO

### Add

- add dtos generation into cli
- mimic base service class behavior into auth service
- mimic file upload service class behavior into auth service
- analyze custom forbidden error message per action
- add docker-compose file into `create-arkos`
- add automatic middleware to handle request data with files (just like native multer) and auto replace the urls on the specified field.
- allow exporting json of auth role and permissions, allows auto-updating and adding missing fields when exported to existing json file.
- add question about unknow modules when generating compoents -> like to generate in another place
- add custom validation options under arkos configuration.
- add stable `debugging` with all levels correctly working

### Change

### Remove

### Deprecate

### Annoucment

- Announce the batch and delete methods
- Announce debugging

## DONE

### Deprecated

- deprecated .middlewares.ts files in favor of .interceptors.ts, add warnings to change, and also warn when find .middlewares.ts and .interceptors.ts with same structure tell which one will be used

### Removed

- completely removed support for `.prima-query-options.{js|ts}` and `.auht-configs.{js|ts}` in favor of `.query.ts` and `.auth.ts`

# Canary Notes v1.5.0-beta

### Add

- add a configuration process to customize global context object (`analyze very well because can fall into FAT MODELS trap (using service layer)`)
- add `FileUpload` model to handle files uploads kind of like in django ORM.

### Change

- separete what goes into `arkos.init()` and `arkos.config.ts`.
- separete the cli to own package cli (`arkos/cli`) -> it is basically development required.
