import {
  ArkosModuleType,
  ArkosInterceptorReturn,
  ArkosInterceptorMethodConfig,
} from "./types";

interface InterceptorStore {
  [methodName: string]: ArkosInterceptorMethodConfig;
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
 * const userInterceptor = ArkosInterceptor("user");
 *
 * userInterceptor.findMany({
 *   validation: { query: QueryUserSchema },
 *   before: [authGuard]
 * });
 *
 * userInterceptor.createOne({
 *   validation: { body: CreateUserSchema },
 *   before: [sanitize],
 *   after: [notify]
 * });
 * ```
 *
 * @example
 *
 * ```ts
 * const authInterceptor = ArkosInterceptor("auth");
 * authInterceptor.login({ before: [rateLimiter] });
 * ```
 *
 * @example
 * app.load(userInterceptor);
 * app.load(authInterceptor)
 *
 * @see {@link https://www.arkosjs.com/docs/core-concepts/components/interceptors}
 */
export function ArkosInterceptor<T extends ArkosModuleType>(
  moduleName: T
): ArkosInterceptorReturn<T> {
  const store: InterceptorStore = {};

  const makeMethod =
    (name: string) => (config: ArkosInterceptorMethodConfig) => {
      store[name] = config;
      return proxy;
    };

  const base = {
    __type: "ArkosInterceptor" as const,
    moduleName,
    _store: store,
  };

  const methods: Record<
    string,
    (config: ArkosInterceptorMethodConfig) => unknown
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

  return proxy as unknown as ArkosInterceptorReturn<T>;
}
