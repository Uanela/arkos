import {
  ArkosModuleType,
  ArkosRouteHookReturn,
  ArkosRouteHookMethodConfig,
} from "./types";

interface InterceptorStore {
  [methodName: string]: ArkosRouteHookMethodConfig;
}

/**
 * Creates an interceptor for a built-in Arkos module or a generated model route.
 *
 * The returned instance exposes only the methods relevant to that module,
 * and is registered into the app via `app.load()`.
 *
 * @param moduleName - The module to intercept. Use `"auth"` or `"file-upload"`
 * for built-in modules, or any prisma model name string for generated CRUD routes.
 *
 * @example
 * ```ts
 * const userInterceptor = ArkosRouteHook("user");
 *
 * userInterceptor.createOne({
 *   validation: { body: CreateUserSchema },
 *   before: [sanitize],
 *   after: [notify]
 * });
 *
 * app.load(userInterceptor);
 * ```
 * @see {@link https://www.arkosjs.com/docs/core-concepts/components/interceptors}
 */
export function ArkosRouteHook<T extends ArkosModuleType>(
  moduleName: T
): ArkosRouteHookReturn<T> {
  const store: InterceptorStore = {};

  const makeMethod =
    (name: string) => (config: ArkosRouteHookMethodConfig) => {
      store[name] = config;
      return proxy;
    };

  const base = {
    __type: "ArkosRouteHook" as const,
    moduleName,
    _store: store,
  };

  const methods: Record<
    string,
    (config: ArkosRouteHookMethodConfig) => unknown
  > = {};

  if (moduleName === "auth") {
    for (const name of [
      "getMe",
      "login",
      "logout",
      "signup",
      "updateMe",
      "updatePassword",
    ]) {
      methods[name] = makeMethod(name);
    }
  } else if (moduleName === "file-upload" || moduleName === "fileUpload") {
    for (const name of ["findFile", "uploadFile", "updateFile", "deleteFile"]) {
      methods[name] = makeMethod(name);
    }
  } else {
    for (const name of [
      "createOne",
      "findOne",
      "findMany",
      "updateOne",
      "deleteOne",
      "createMany",
      "updateMany",
      "deleteMany",
    ]) {
      methods[name] = makeMethod(name);
    }
  }

  const proxy = Object.assign(base, methods);

  return proxy as unknown as ArkosRouteHookReturn<T>;
}
