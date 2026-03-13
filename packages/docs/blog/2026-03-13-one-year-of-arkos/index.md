---
slug: one-year-of-arkos
title: "One Year of Arkos.js: From a Single Commit to v2"
authors: [uanela]
tags: [arkos, anniversary, v2, retrospective]
date: 2026-03-13
---

March 10, 2025. One line in a git history: _"first commit"_. Back then Arkos.js was just an idea — a framework that would let you build a full RESTful API on top of Express and Prisma with almost no boilerplate. One year later, five beta releases are in the wild, a first stable version is on the horizon, and the architecture has been rebuilt from the ground up. This is the story of that year.

<!-- truncate -->

## Where It Started

The first commit was a single function: `return app`. Not much to look at. But the idea behind it was clear — stop writing the same controllers, routers, validation, authentication, and swagger setup over and over again across every project. Let Prisma be the source of truth for your data model, and let the framework do the rest.

The early versions of Arkos were honest about being rough. The `1.0-beta` tag was more of a stake in the ground than a polished release. But it worked: point it at a Prisma schema, run the dev server, and you had a full CRUD API with zero hand-written routes.

## The Beta Journey

### 1.2-beta — Developer Experience

The first release worth telling people about. This version focused on making the day-to-day feel good: better query parsing, a smarter CLI, and the first real documentation. It was the point where building with Arkos stopped feeling like fighting the framework.

### 1.3-beta — Security By Default

Enterprise-grade access control, role-based permissions, and automatic OpenAPI documentation arrived here. The `accessControl` config let you protect any endpoint with a few lines — no middleware spaghetti. This was also the release where Arkos first started to feel like something you could ship to production.

We wrote [a dedicated post about our favourite feature in 1.3](/blog/2025/09/15/favourite-feature-in-1.3-beta) — fine-grained permission checks that slot right into your route config.

### 1.4-beta — ArkosRouter

The biggest DX leap of the beta era. `ArkosRouter` brought a declarative config layer on top of Express's router: OpenAPI metadata, validation, authentication — all co-located with the route definition. No more hunting across five files to understand what a single endpoint does.

```ts
router.get(
    {
        path: "/users/:id",
        authentication: { action: "View", resource: "user" },
        openapi: { summary: "Get user by ID", tags: ["Users"] },
    },
    controller.findOne
);
```

File upload handling got a serious upgrade too, and TypeScript types got much tighter across the board.

### 1.5-beta — Type Safety All The Way Down

The most recent stable beta doubled down on everything that had been working. Prisma return types are now inferred directly from query options — the return type of `findMany` narrows based on the `select` and `include` you pass in. Code generation got smarter, validation integration got simpler, and service hooks gave you clean before/after/onError lifecycle points without touching the framework internals.

### 1.6-canary — Preparing for the Handoff

Right now, in the canary channel, `ArkosPolicy` is shipping — a fluent, typed access control builder that replaces the scattered `.auth.ts` files:

```ts
const userPolicy = ArkosPolicy("user")
    .rule("Create", ["Admin"])
    .rule("View", "*")
    .rule("Delete", ["Admin"]);
```

Pass `userPolicy.Create` to a route config or call `userPolicy.canCreate(req.user)` inline. The same object does both. This is the last major API introduced before v1 goes stable.

## And Now, v2

Today — exactly one year after that first commit — `v2.0.0-next.1` landed.

v2 is a rethink of the startup model. The core insight is that magic auto-loading, while convenient to get started, makes apps hard to reason about as they grow. v2 replaces it with explicit registration.

```ts
import arkos from "arkos";

const app = arkos();

app.use(reportsRouter);

app.listen();
```

You can check the full release notes on [Github](https://github.com/Uanela/arkos/releases/tag/v2.0.0-next.1).

That `arkos()` call should feel familiar. It works like `express()` — because under the hood, it is Express. You get the full Express API plus a small set of Arkos lifecycle methods on top.

### Route Hooks — One File Per Module

The `.interceptors.ts`, `.query.ts`, `.hooks.ts`, and `.auth.ts` files that used to live in every module directory are gone. Everything that customises a module's behaviour now lives in a single `.route-hook.ts`:

```ts
const userRouteHook = ArkosRouteHook("user")
    .findMany({
        authentication: userPolicy.View,
        prismaArgs: { omit: { password: true } },
    })
    .createOne({
        authentication: userPolicy.Create,
        before: [sanitizeInput],
        prismaArgs: { omit: { password: true } },
    });

export default userRouteHook;
```

### Explicit Loadables

Nothing is auto-loaded. You declare what your app uses:

```ts
// src/loadables.ts
const loadables: ArkosLoadable[] = [
    userRouteHook,
    authRouteHook,
    fileUploadRouteHook,
];

export default loadables;
```

### Explicit Router

```ts
// src/router.ts
const router = ArkosRouter();

router.use(userRouter);
router.use(authRouter);
router.use(fileUploadRouter);

export default router;
```

Two files. You know exactly what your app loads and what routes it exposes. No surprises.

## What's Coming

v2 is a first preview — the APIs are still settling. The plan is to spend the next 8 to 12 months hardening it, writing the full v2 documentation at [arkosjs.com](https://arkosjs.com), building the `arkos migrate` CLI to automate the v1 → v2 upgrade, and collecting real-world feedback from the community.

If you're starting a new project today and want to experiment, you can try the preview with:

```bash
npm create arkos@next
```

If you're on v1, stay on the latest v1.x release for now. A migration guide is in progress and will land before the stable v2 release.

## Thank You

A year ago this was a side project with one commit and zero users. Today there are developers building real products with it — in Mozambique, and further afield. That means more than any version number.

If you've filed an issue, sent a message, or just quietly used Arkos in something you're building: thank you. The best is still ahead.

— Uanela and Contributors
