You are rewriting Arkos.js documentation. The goal is to improve the mental model for both new and existing users by eliminating scattered per-feature per-component pages and instead teaching each feature once, showing it works across all relevant components together.

**The core principle:** If a feature works in `ArkosRouter`, it also works in `RouteHook`. Instead of having separate pages like "Validation in Auth Routes" or "Authentication in Prisma Routes", each feature guide (validation, authentication, rate limiting, etc.) should show both `ArkosRouter` and `RouteHook` examples side by side in the same place.

---

### Key Concepts

#### ArkosRouter

Arkos's enhanced Express Router used for custom routes:

```ts
router.post({ path: "/api/posts", validation: { body: Schema } }, handler);
```

#### RouteHook

A named export from `*.router.ts` that configures auto-generated built-in routes (Prisma model routes, authentication routes, file upload routes). It was previously called `RouterConfig` and exported as `config`. Since v1.6 it is called `RouteHook` and exported as `hook`. The old name still works but logs a deprecation warning in the format:

```
[Warn] 10:35:24 `export const config: RouterConfig` in post.router.ts is deprecated. Use `export const hook: RouteHook` instead.
```

The three RouteHook variants and their available keys are:

- **Prisma Model Route Hook** — `findMany`, `findOne`, `createOne`, `updateOne`, `deleteOne`, `createMany`, `updateMany`, `deleteMany`. See full details at [Route Hook — Prisma Model Route Hook](/docs/core-concepts/components/route-hook#prisma-model-route-hook)
- **Authentication Route Hook** — `login`, `signup`, `logout`, `updatePassword`, `getMe`, `updateMe`, `deleteMe`. See full details at [Route Hook — Authentication Route Hook](/docs/core-concepts/components/route-hook#authentication-route-hook)
- **File Upload Route Hook** — `findFile`, `uploadFile`, `updateFile`, `deleteFile`. See full details at [Route Hook — File Upload Route Hook](/docs/core-concepts/components/route-hook#file-upload-route-hook)

#### Controllers

Controllers are classes that export a singleton instance. For Prisma model routes, controllers extend `BaseController`, which already provides built-in CRUD method implementations. The method names on `BaseController` match the route hook keys exactly — `createOne`, `createMany`, `findMany`, `findOne`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany`. Custom route controllers are also classes exported as singletons but do not need to extend `BaseController`.

```ts title="src/modules/post/post.controller.ts"
import { BaseController } from "arkos";
import postService from "./post.service";

class PostController extends BaseController {
    // BaseController already handles createOne, findMany, etc.
    // Add custom methods here
}

export default new PostController(postService);
```

#### Interceptors

For built-in routes (Prisma model, auth, file upload), if you want to hook into the request lifecycle without dropping Arkos's core logic, you use interceptors instead of overriding the controller. Interceptors are arrays of middleware exported by name from `*.interceptors.ts` and follow the naming convention `before<OperationName>` and `after<OperationName>`, matching the route hook keys (e.g. `beforeCreateOne`, `afterFindMany`, `beforeUpdateMe`).

```ts title="src/modules/post/post.interceptors.ts"
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";

export const beforeCreateOne = [
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        // runs before Arkos's built-in createOne logic
        next();
    },
];
```

#### Permissions — Two Approaches

When showing role-based access control examples, there are two approaches. Only show both when the topic is specifically about authentication/permissions. For all other features (validation, rate limiting, etc.) just use `ArkosPolicy` since it is the recommended approach:

**ArkosPolicy (v1.6+, recommended)** — a fluent interface for defining permissions:

```ts
import postPolicy from "@/src/modules/post/post.policy";
createOne: { authentication: postPolicy.Create },
```

**Auth Config Files (`.auth.ts`, still supported)** — only show this as a secondary tab when the page is specifically about authentication or permissions:

```ts
import postAuthConfigs from "@/src/modules/post/post.auth";
createOne: {
  authentication: {
    resource: "post",
    action: "Create",
    rule: postAuthConfigs.accessControl.Create,
  },
},
```

---

### Rules for Rewriting

1. Every feature guide that applies to both `ArkosRouter` and `RouteHook` must show both. Use `<Tabs>` with tabs labeled `ArkosRouter` and `RouteHook`. Inside each of those tabs, always nest a second `<Tabs>` with `Zod` and `Class Validator` tabs. The structure is always: outer tabs = `ArkosRouter | RouteHook`, inner tabs = `Zod | Class Validator`. No example block for either component should ever appear without both validator options present. When naming the router instance inside a module file, always use the module name as a prefix: `const userRouter = ArkosRouter()`, `const postRouter = ArkosRouter()`, etc. Never use the generic `const router = ArkosRouter()` in module files. Always leave one blank line between the router declaration and `export default`:

```ts
const userRouter = ArkosRouter();

export default userRouter;
```

2. Every time `RouteHook` appears with a code example, add a `<Callout type="info">` nearby stating: `RouteHook` is the new name for `export const config: RouterConfig`. If you have existing code using the old name it still works but will log a deprecation warning. Link to the Route Hook guide at `/docs/core-concepts/components/route-hook`. The `<Callout type="info">` about the `RouteHook` deprecation must always be placed **outside and above** the `<Tabs>` block — never inside a `<Tab value="RouteHook">` or any other tab. It applies to the whole example, not to one tab variant.

3. This applies for the logic that runs the same way on custom routes and built-in routes, such as route configs, auth configs, validation. Do not create separate pages for "Validation in Auth Routes", "Authentication in Prisma Routes", or any other feature+component combination. One feature, one page, both components shown.

4. Do not use aligned spacing on object keys (no `key:          { }` to align values). Each key gets normal single-space formatting: `key: { }`.

5. When an object value is too long for one line, break it across multiple lines:

```ts
createOne: {
  authentication: {
    resource: "post",
    action: "Create",
    rule: postAuthConfigs.accessControl.Create,
  },
},
```

6. Never use `getMany` — the correct key is `findMany`. Always verify operation key names against the Route Hook variants listed above before using them.

7. Links to related components must always use the format [Route Hook](/docs/core-concepts/components/route-hook) and [ArkosRouter](/docs/core-concepts/components/arkos-router).

8. The docs use Fumadocs MDX with these components available: `<Callout type="info|warn|error">`, `<Tabs items={[...]}>` , `<Tab value="...">`. Import them at the top of every file:

```mdx
import { Callout } from "fumadocs-ui/components/callout";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";

;
```

9. When showing `RouteHook` examples, do not always use the same route category. Mix them — sometimes show a Prisma model route hook example, sometimes an auth route hook example, sometimes a file upload route hook example. The goal is to make it clear to the reader that `RouteHook` works for all built-in route categories, not just one.

10. Any existing page that references "For full RouteHook/RouterConfig options see Prisma Model Routes / Auth Routes / File Upload Routes" must be updated to point to [Route Hook](/docs/core-concepts/components/route-hook) instead.

11. Any existing page that only exists to show a single feature+component combination (e.g. "Validation in Auth Routes") should be removed and its content merged into the main feature page.

12. Controllers are always classes exported as singletons. For Prisma model routes, the controller extends `BaseController`. Never write controllers as plain objects or collections of functions.

13. Whenever a feature needs to be shown in both a controller and an interceptor context, use a `Controller | Interceptor` tab pair. **Controller always comes first.** This tab pair is independent from the `ArkosRouter | RouteHook` pair — use it specifically when the distinction being shown is about where imperative logic lives, not about which routing system is being used. The Controller tab applies to custom routes; the Interceptor tab applies to built-in routes where you must not drop core logic.

14. Every page must prioritize the custom route side of things first (controller, `ArkosRouter`), then show the built-in route equivalent. Neither side should overshadow the other. When explaining something on the custom route side, include a short inline sentence in the prose — not a callout — that naturally points the reader toward the built-in route equivalent, for example: "If you're working with built-in routes, you can achieve the same thing via a `RouteHook` or an interceptor." Do the same in reverse when the page starts from the built-in side. The goal is that no reader has to dig through unrelated pages just to find how to do the same thing on the other side.

15. Do not guess, invent, or assume anything about Arkos APIs, config options, method signatures, or behavior that is not explicitly present in the content you have been given to rewrite. If something is unclear, flag it rather than filling in the gap.

16. Version-specific configuration tabs must always include all three versions in this exact order: `v1.6+ (defineConfig)`, `v1.4–v1.5`, `v1.3`. The correct pattern for each:

- **v1.6+**: imports `defineConfig` from `"arkos/config"` in `arkos.config.ts`, uses `export default defineConfig({ ... })`
- **v1.4–v1.5**: imports the typed config interface (e.g. `ArkosConfig`) from `"arkos"` in `arkos.config.ts`, assigns `const config: ArkosConfig = { ... }`, then `export default config`
- **v1.3**: no config file — options are passed directly to `arkos.init({ ... })` inside `src/app.ts`

17. Split Long Guides When Helpful - When a guide becomes lengthy and covers multiple distinct subtopics that can stand alone, split it into smaller, focused sub-guides. This improves navigation, searchability, and readability.

- **When to split:**
    - The guide covers several independent concepts or advanced patterns
    - Different sections serve different reader needs (basic vs. advanced usage)
    - The page requires excessive scrolling to find specific information
- **When NOT to split:**
    - The subtopics are rarely used without each other
    - Splitting would violate the "one feature, one page" principle
    - The content is inherently cohesive and brief
- **How to split:**
    - Create a main overview page introducing the feature with common use cases
    - Create sub-pages for advanced patterns, edge cases, or specific scenarios
    - Each sub-page must remain self-contained following all existing rules
    - Add "Related Guides" navigation links at the bottom of each sub-page
- **Exception:** Never split solely to increase page count. Prioritize completeness and discoverability over fragmentation.
