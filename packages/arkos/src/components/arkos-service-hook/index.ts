import { ServiceHookContext } from "../../exports/services";
import { PrismaModels } from "../../generated";
import {
  ArkosServiceHookMethodConfigs,
  ArkosServiceHookInstance,
  ServiceHookOperationConfig,
} from "./types";

type Models = PrismaModels<any>;

/**
 * Creates a service hook for a generated Prisma model service.
 *
 * The returned instance exposes a method per service operation.
 * Each method accepts typed `before`, `after`, and `onError` handler arrays
 * that run around the corresponding `BaseService` method call.
 *
 * Unlike `ArkosRouteHook`, handlers here are **not** Express middlewares —
 * they receive a typed args object specific to each operation.
 *
 * Register via `app.load()` before calling `app.build()`.
 *
 * @param moduleName - The Prisma model name in kebab-case (e.g. `"user"`, `"blog-post"`)
 *
 * @example
 * ```ts
 * const userServiceHook = ArkosServiceHook("user");
 *
 * userServiceHook.createOne({
 *   before: [async ({ data, context }) => {
 *     data.createdBy = context?.user?.id;
 *   }],
 *   after: [async ({ result }) => {
 *     await notifyAdmins(result);
 *   }],
 *   onError: [async ({ error, data }) => {
 *     await logFailure(error, data);
 *   }],
 * });
 *
 * app.load(userServiceHook);
 * ```
 *
 * @see {@link https://www.arkosjs.com/docs/core-concepts/components/service-hooks}
 */
export function ArkosServiceHook<
  TModelName extends keyof Models = keyof Models,
  Context = ServiceHookContext,
>(moduleName: TModelName): ArkosServiceHookInstance<TModelName, Context> {
  const store: Partial<ArkosServiceHookMethodConfigs<TModelName, Context>> = {};

  const makeMethod =
    (name: string) => (config: ServiceHookOperationConfig<any, any, any>) => {
      (store as any)[name] = config;
      return proxy;
    };

  const base = {
    __type: "ArkosServiceHook" as const,
    moduleName,
    _store: store,
  };

  const methods: Record<
    string,
    (config: ServiceHookOperationConfig<any, any, any>) => unknown
  > = {};

  for (const name of [
    "createOne",
    "createMany",
    "count",
    "findMany",
    "findOne",
    "findById",
    "updateOne",
    "updateById",
    "updateMany",
    "deleteOne",
    "deleteById",
    "deleteMany",
  ]) {
    methods[name] = makeMethod(name);
  }

  const proxy = Object.assign(base, methods);
  return proxy as unknown as ArkosServiceHookInstance<TModelName, Context>;
}
