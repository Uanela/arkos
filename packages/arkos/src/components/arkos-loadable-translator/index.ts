// import { ModuleComponents } from "../../utils/dynamic-loader";
import loadableRegistry from "../arkos-loadable-registry";
import { routeHookReader } from "../arkos-route-hook/reader";
import { ArkosModuleType } from "../arkos-route-hook/types";

type ModuleComponents = any;

const PRISMA_OPERATIONS = [
  "createOne",
  "createMany",
  "findOne",
  "findMany",
  "updateOne",
  "updateMany",
  "deleteOne",
  "deleteMany",
] as const;

const AUTH_OPERATIONS = [
  "login",
  "logout",
  "signup",
  "getMe",
  "updateMe",
  "updatePassword",
  "refreshToken",
] as const;

const FILE_UPLOAD_OPERATIONS = [
  "uploadFile",
  "updateFile",
  "deleteFile",
  "findFile",
] as const;

const VALIDATION_OPERATIONS = [
  "createOne",
  "updateOne",
  "login",
  "signup",
  "updateMe",
  "updatePassword",
] as const;

type ValidationOperation = (typeof VALIDATION_OPERATIONS)[number];

/**
 * Translates from the new `ArkosRouteHook` and `ArkosServiceHook` loadable
 * instances in the global registry back to the old `ModuleComponents` shape
 * that the rest of the codebase still consumes.
 *
 * This is a compatibility bridge between v1 dynamic-loader and v2 explicit
 * registry — it allows call sites that still use `getModuleComponents()` to
 * keep working without changes while the migration to the new API is in progress.
 *
 * @example
 * ```ts
 * // Before (dynamic loader)
 * const { interceptors, hooks, router } = getModuleComponents("user");
 *
 * // Now transparently backed by the registry translator
 * const { interceptors, hooks, router } = loadableDynamicTranslator.translate("user");
 * ```
 */
class LoadableDynamicTranslator {
  private getOperations(moduleName: ArkosModuleType): readonly string[] {
    if (moduleName === "auth") return AUTH_OPERATIONS;
    if (moduleName === "file-upload") return FILE_UPLOAD_OPERATIONS;
    return PRISMA_OPERATIONS;
  }

  /**
   * Translates the route hook for a given module into the old `interceptors` shape.
   * Maps `{ before, after, onError }` per operation to flat `beforeX`, `afterX`, `onXError` keys.
   */
  private translateInterceptors(
    moduleName: ArkosModuleType
  ): Record<string, Function[]> {
    const interceptors: Record<string, Function[]> = {};

    for (const operation of this.getOperations(moduleName)) {
      const hooks = routeHookReader.getHooks(moduleName, operation as any);
      if (!hooks) continue;

      const pascal = operation.charAt(0).toUpperCase() + operation.slice(1);

      if (hooks.before?.length) interceptors[`before${pascal}`] = hooks.before;
      if (hooks.after?.length) interceptors[`after${pascal}`] = hooks.after;
      if (hooks.onError?.length)
        interceptors[`on${pascal}Error`] = hooks.onError;
    }

    return interceptors;
  }

  /**
   * Translates the service hook for a given module into the old `hooks` shape.
   * Maps `{ before, after, onError }` per operation to flat `beforeX`, `afterX`, `onXError` keys.
   */
  private translateHooks(
    moduleName: ArkosModuleType
  ): Record<string, Function[]> {
    const serviceHook = loadableRegistry.getItem(
      "ArkosServiceHook",
      moduleName
    );
    if (!serviceHook) return {};

    const hooks: Record<string, Function[]> = {};
    const store = (serviceHook as any)._store ?? {};

    for (const [operation, config] of Object.entries(store) as any) {
      const pascal = operation.charAt(0).toUpperCase() + operation.slice(1);

      if (config?.before?.length) hooks[`before${pascal}`] = config.before;
      if (config?.after?.length) hooks[`after${pascal}`] = config.after;
      if (config?.onError?.length) hooks[`on${pascal}Error`] = config.onError;
    }

    return hooks;
  }

  /**
   * Translates the route hook for a given module into the old `router.config` shape.
   * Maps per-operation route configs into a flat `RouterConfig` object.
   */
  private translateRouterConfig(
    moduleName: ArkosModuleType
  ): Record<string, any> {
    const config: Record<string, any> = {};

    for (const operation of this.getOperations(moduleName)) {
      const routeConfig = routeHookReader.getRouteConfig(
        moduleName,
        operation as any
      );
      if (routeConfig && Object.keys(routeConfig).length > 0) {
        config[operation] = routeConfig;
      }
    }

    return config;
  }

  /**
   * Translates validation body from route hook configs into the old `schemas`/`dtos` shape.
   * Only cares about: createOne, updateOne, login, signup, updateMe, updatePassword.
   *
   * Auth operations map 1:1 by operation name.
   * Prisma: createOne → create, updateOne → update.
   */
  private translateValidation(moduleName: ArkosModuleType): {
    schemas: Record<string, any>;
    dtos: Record<string, any>;
  } {
    const schemas: Record<string, any> = {};
    const dtos: Record<string, any> = {};
    const isAuth = moduleName === "auth";

    for (const operation of VALIDATION_OPERATIONS) {
      // only process operations relevant to this module type
      const isAuthOp = [
        "login",
        "signup",
        "updateMe",
        "updatePassword",
      ].includes(operation);
      if (isAuth && !isAuthOp) continue;
      if (!isAuth && isAuthOp) continue;

      const config = routeHookReader.getFullConfig(
        moduleName,
        operation as any
      );
      const body = (config as any)?.validation?.body;
      if (!body) continue;

      const key = isAuth
        ? operation
        : operation === "createOne"
          ? "create"
          : operation === "updateOne"
            ? "update"
            : operation;

      // determine if it's a zod schema or class-validator dto
      const isZod = body?._def?.typeName?.startsWith("Zod");
      if (isZod) schemas[key] = body;
      else dtos[key] = body;
    }

    return { schemas, dtos };
  }

  /**
   * Returns the resolved `ModuleComponents` for a given module name,
   * translated from the global loadable registry.
   */
  translate(moduleName: ArkosModuleType): ModuleComponents {
    const interceptors = this.translateInterceptors(moduleName);
    const hooks = this.translateHooks(moduleName);
    const routerConfig = this.translateRouterConfig(moduleName);
    const { schemas, dtos } = this.translateValidation(moduleName);

    return {
      ...(Object.keys(interceptors).length && { interceptors }),
      ...(Object.keys(hooks).length && { hooks }),
      ...(Object.keys(routerConfig).length && {
        router: { config: routerConfig, default: routerConfig },
      }),
      ...(Object.keys(schemas).length && { schemas }),
      ...(Object.keys(dtos).length && { dtos }),
    };
  }
}

export const loadableDynamicTranslator = new LoadableDynamicTranslator();
