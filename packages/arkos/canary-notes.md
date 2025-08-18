# Canary Notes

## TODO

### Add

- mimic base service class behavior into auth service
- mimic file upload service class behavior into auth service
- add warnings for old file naming convection suchs .prisma-query-options and .auth-configs and warning removal on 1.5.
- add exports of before/after services hooks args

### Change

- change .middlewares to .interceptor - as it is basically working just like a reference (router alike) when using array of middlewares which will be used on most project. also allowing devs to use .middlewares to actually store the middlewares functions.
- update places using getBaseServices function

### Fix

- Enhance importing components helper function

### Remove

### Deprecate

- deprecate and warn forseable removal of available resource route -> there will be the available actions that will be grouped by resources.
- deprecate and warn forseable removal of getBaseServices function

--

## DOING

### Add

- add context ({req, res, next}) to base service instances on auto generated api endpoints (with tests)
- add an endpoint with available actions together their own resources to easy frontend
- added ServiceContext type `arkos/services`

### Change

### Fix

### Remove

### Deprecate

--

## DONE

### Add

### Change

### Fix

### Remove

- removed available-routes endpoint as there is already swagger docs.
- removed the middlewares checkDatabaseConnection -> prisma does it.

### Deprecate

- deprecated and removed possibility of desabling database connection because it no longer exits
- Remove database connection check or allow only one check at start time or first request.
