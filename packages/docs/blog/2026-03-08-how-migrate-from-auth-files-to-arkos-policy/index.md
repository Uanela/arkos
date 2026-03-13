---
slug: how-migrate-from-auth-files-to-arkos-policy
title: Migrating from Auth Files to ArkosPolicy
authors: [uanela]
tags: [arkosjs, superm7, webpropax, finegrained, swagger, servicehooks]
---

_Introduced in v1.6 · Prepares you for v2.0_

Starting in v1.6, Arkos introduces `ArkosPolicy` — a cleaner, more explicit way to define access control for your modules. The old `.auth.ts` files still work, but they're deprecated and **will be removed in v2.0**.

This guide walks you through migrating.

<!-- truncate -->

**Why the change?**

The old system relied on magic file scanning — Arkos would auto-load `.auth.ts` files for known modules (Prisma models, `auth`, `file-upload`). You could still use `.auth.ts` for any module, but you had to wire it up manually yourself anyway. So the auto-loading was only half the story, and the inconsistency made the system harder to reason about.

`ArkosPolicy` removes the magic entirely:

- Explicit imports — you always know where your access control is coming from
- Works consistently for every module, known or custom
- Cleaner, fluent API with less boilerplate
- Reusable anywhere — routes, services, middleware, guards

**Before (order.auth.ts)**

```typescript
import { AuthConfigs } from 'arkos/auth';
import { authService } from 'arkos/services';

export const orderAccessControl = {
  Create: { roles: ['Admin'], name: 'Create Order', description: '...' },
  View:   { roles: [],        name: 'View Order',   description: '...' },
  Update: { roles: ['Admin'], name: 'Update Order', description: '...' },
  Delete: { roles: ['Admin'], name: 'Delete Order', description: '...' },
};

export const orderPermissions = Object.keys(orderAccessControl).reduce(...)

const orderAuthConfigs: AuthConfigs = {
  authenticationControl: { Create: true, View: true, Update: true, Delete: true },
  accessControl: orderAccessControl,
};

export default orderAuthConfigs;
```

**After (order.policy.ts)**

```typescript
import { ArkosPolicy } from "arkos";

const orderPolicy = ArkosPolicy("order")
    .rule("Create", {
        roles: ["Admin"],
        name: "Create Order",
        description: "...",
    })
    .rule("View", "*")
    .rule("Update", {
        roles: ["Admin"],
        name: "Update Order",
        description: "...",
    })
    .rule("Delete", {
        roles: ["Admin"],
        name: "Delete Order",
        description: "...",
    });

export default orderPolicy;
```

> **Convention:** name your policy files `<module>.policy.ts` — e.g. `order.policy.ts`, `dashboard.policy.ts`. This keeps them easy to find and consistent across your codebase.

Then wire it into your router:

```typescript
// order.router.ts
import { ArkosRouter, RouterConfig } from "arkos";
import orderPolicy from "./order.policy";

export const config: RouterConfig = {
    createOne: { authentication: orderPolicy.Create },
    findMany: { authentication: orderPolicy.View },
    updateOne: { authentication: orderPolicy.Update },
    deleteOne: { authentication: orderPolicy.Delete },
};

const orderRouter = ArkosRouter();
export default orderRouter;
```

**Custom modules — dashboard, analytics, and friends**

`ArkosPolicy` works just as well for modules that aren't Prisma models. Define whatever actions make sense for your domain:

```typescript
// dashboard.policy.ts
const dashboardPolicy = ArkosPolicy("dashboard")
    .rule("View", { roles: ["Admin", "Manager"] })
    .rule("Export", ["Admin"]);

export default dashboardPolicy;
```

```typescript
// analytics.policy.ts
const analyticsPolicy = ArkosPolicy("analytics")
    .rule("View", "*")
    .rule("RunReport", { roles: ["Admin"] });

export default analyticsPolicy;
```

Use them in custom routes:

```typescript
router.get(
    { path: "/api/dashboard", authentication: dashboardPolicy.View },
    dashboardController.index
);
```

Or imperatively anywhere in your code:

```typescript
if (await analyticsPolicy.canRunReport(req.user)) { ... }
```

**Quick migration steps**

1. Run `arkos g policy -m <module>` to scaffold the new `.policy.ts` file
2. Copy your rules from the old `accessControl` object into `.rule()` calls
3. Import the policy into your router and wire it into the `config` export
4. Delete the old `.auth.ts` file

**Deprecation timeline**

| Version | Behavior                                                     |
| ------- | ------------------------------------------------------------ |
| v1.6    | `.auth.ts` still works, deprecation warning shown in console |
| v1.7    | Warning continues                                            |
| v2.0    | `.auth.ts` auto-loading removed — files will be ignored      |

Migrate before v2.0 and you'll have nothing to worry about.

**Summary**

|                               | `.auth.ts` (old)   | `ArkosPolicy` (new)  |
| ----------------------------- | ------------------ | -------------------- |
| Auto-loaded for known modules | ✅ magic           | ❌ explicit          |
| Works with any module         | ✅ manual wiring   | ✅ explicit wiring   |
| Imperative `can*` checks      | ❌                 | ✅                   |
| Survives v2.0                 | ❌                 | ✅                   |
| Recommended file name         | `<module>.auth.ts` | `<module>.policy.ts` |
