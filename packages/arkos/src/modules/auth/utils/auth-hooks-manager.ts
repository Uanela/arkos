import { ArkosSocket } from "../../../components/arkos-gateway/types";
import { ArkosRequest, User } from "../../../types";
import {
  AuthenticateAfterHookHandler,
  AuthenticateErrorHookHandler,
  AuthenticateHookHandler,
  AuthorizeAfterHookHandler,
  AuthorizeErrorHookHandler,
  AuthorizeHookHandler,
} from "../../../types/arkos-config/utils";
import { AccessAction, DetailedAccessControlRule } from "../../../types/auth";
import { getArkosConfig } from "../../../utils/helpers/arkos-config.helpers";
import { ForbiddenError } from "../../error-handler/utils/errors";
import authService from "../auth.service";
import { AuthAction } from "./services/auth-action.service";

type ArkosBaseContext = ArkosRequest | ArkosSocket;

interface ArkosMiddlewareAdapter<TContext extends ArkosBaseContext> {
  context: TContext;
  done: (error?: unknown | any) => void; // replaces next()
}

class AuthHookManager {
  /**
   * Runs the full authenticate pipeline — before hooks, core user resolution,
   * after hooks — and calls `done` when finished.
   *
   * Shared by the HTTP authenticate middleware and the WebSocket auth ns.use().
   *
   * @param adapter.context - The request or socket being authenticated.
   * @param adapter.done - Called with no args on success, or with an error to propagate.
   * @param getUser - Async function that resolves the user from the context.
   */
  async runAuthenticate<TContext extends ArkosBaseContext>(
    adapter: ArkosMiddlewareAdapter<TContext>,
    getUser: (context: TContext) => Promise<User | null>,
    keyName: "user" | "currentUser" = "user"
  ): Promise<void> {
    const { context, done } = adapter;
    const hooks = getArkosConfig()?.authentication?.hooks?.authenticate;

    const before = await this.runHooks(hooks?.before, context);
    if (before.error) {
      const onError = await this.runErrorHooks(
        hooks?.onError,
        before.error,
        context
      );
      if (onError.skipped) {
        const after = await this.runAfterHooks(hooks?.after, context);
        return after.error ? done(after.error) : done();
      }
      return done(onError.error);
    }

    if (!before.skipped) {
      try {
        const user = await getUser(context);
        (context as any)[keyName] = user ?? undefined;
      } catch (err) {
        const onError = await this.runErrorHooks(hooks?.onError, err, context);
        if (onError.skipped) {
          const after = await this.runAfterHooks(hooks?.after, context);
          return after.error ? done(after.error) : done();
        }
        return done(onError.error);
      }
    }

    const after = await this.runAfterHooks(hooks?.after, context);
    if (after.error) return done(after.error);
    done();
  }

  /**
   * Runs the full authorize pipeline — before hooks, core permission check,
   * after hooks — and calls `done` when finished.
   *
   * Shared by the HTTP `authorize()` middleware and WebSocket per-event authorization.
   *
   * @param adapter.context - The request or socket being authorized.
   * @param authAction {AuthAction}
   * @param keyName {"user" | "currentUser"}
   */
  async runAuthorize<TContext extends ArkosBaseContext>(
    adapter: ArkosMiddlewareAdapter<TContext>,
    authAction: Required<AuthAction>,
    keyName: "user" | "currentUser" = "user"
  ): Promise<void> {
    const { context, done } = adapter;
    const hooks = getArkosConfig()?.authentication?.hooks?.authorize;
    const { action, resource, ...rule } = authAction;
    const hooksMeta = { action, resource, rule };

    const before = await this.runHooks(hooks?.before, context, hooksMeta);
    if (before.error) {
      const onError = await this.runErrorHooks(
        hooks?.onError,
        before.error,
        context,
        hooksMeta
      );
      if (onError.skipped) {
        const after = await this.runAfterHooks(
          hooks?.after,
          context,
          hooksMeta
        );
        return after.error ? done(after.error) : done();
      }
      return done(onError.error);
    }

    if (!before.skipped) {
      try {
        if ((context as any)[keyName]) {
          const user = (context as any)[keyName] as User;
          const configs = getArkosConfig();
          if (!user.isSuperUser) {
            const notEnoughPermissionsError = new ForbiddenError(
              authAction.errorMessage,
              "NotEnoughPermissions"
            );
            if (configs?.authentication?.mode === "dynamic") {
              const hasPermission = await authService.checkDynamicAccessControl(
                user.id,
                action,
                resource
              );
              if (!hasPermission) throw notEnoughPermissionsError;
            } else if (configs?.authentication?.mode === "static") {
              const hasPermission = authService.checkStaticAccessControl(
                user,
                action,
                { [action]: rule }
              );
              if (!hasPermission) throw notEnoughPermissionsError;
            }
          }
        }
      } catch (err) {
        const onError = await this.runErrorHooks(
          hooks?.onError,
          err,
          context,
          hooksMeta
        );
        if (onError.skipped) {
          const after = await this.runAfterHooks(
            hooks?.after,
            context,
            hooksMeta
          );
          return after.error ? done(after.error) : done();
        }
        return done(onError.error);
      }
    }

    const after = await this.runAfterHooks(hooks?.after, context, hooksMeta);
    if (after.error) return done(after.error);
    done();
  }

  /**
   * Runs a chain of `after` hooks in sequence.
   *
   * - If a hook throws — chain aborts, error is forwarded to the global error handler.
   * - If a hook returns — next hook in chain runs.
   *
   * @returns Promise resolving to `{ error? }`
   */
  private async runAfterHooks(
    hooks:
      | AuthenticateAfterHookHandler
      | AuthenticateAfterHookHandler[]
      | AuthorizeAfterHookHandler
      | AuthorizeAfterHookHandler[]
      | undefined,
    req: ArkosBaseContext,
    ctx?: {
      action?: AccessAction;
      resource?: string;
      rule?: string[] | DetailedAccessControlRule | "*";
    }
  ): Promise<{ error?: unknown }> {
    if (!hooks) return {};

    const hookArray = Array.isArray(hooks) ? hooks : [hooks];

    for (const hook of hookArray) {
      try {
        await (hook as any)({ req, ...ctx });
      } catch (err) {
        return { error: err };
      }
    }

    return {};
  }

  /**
   * Runs a chain of `before` hooks in sequence.
   *
   * - If a hook throws — chain aborts, error is forwarded to `onError` hooks.
   * - If a hook calls `skip()` — chain stops, core logic is bypassed, jumps to `after` hooks.
   * - If a hook returns — next hook in chain runs.
   *
   * @returns Promise resolving to `{ skipped, error? }`
   */
  private async runHooks(
    hooks:
      | AuthenticateHookHandler
      | AuthenticateHookHandler[]
      | AuthorizeHookHandler
      | AuthorizeHookHandler[]
      | undefined,
    req: ArkosBaseContext,
    ctx?: {
      action?: AccessAction;
      resource?: string;
      rule?: string[] | DetailedAccessControlRule | "*";
    }
  ): Promise<{ skipped: boolean; error?: unknown }> {
    if (!hooks) return { skipped: false };

    const hookArray = Array.isArray(hooks) ? hooks : [hooks];

    for (const hook of hookArray) {
      let skipCalled = false;

      try {
        await (hook as any)({
          req,
          skip: () => {
            skipCalled = true;
          },
          ...ctx,
        });
      } catch (err) {
        return { skipped: false, error: err };
      }

      if (skipCalled) return { skipped: true };
    }

    return { skipped: false };
  }

  /**
   * Runs a chain of `onError` hooks in sequence.
   *
   * - If a hook throws — chain aborts, error is forwarded to the global error handler.
   * - If a hook calls `skip()` — suppresses the error and jumps to `after` hooks.
   * - If a hook returns — next hook in chain runs.
   *
   * @returns Promise resolving to `{ skipped, error? }`
   */
  private async runErrorHooks(
    hooks:
      | AuthenticateErrorHookHandler
      | AuthenticateErrorHookHandler[]
      | AuthorizeErrorHookHandler
      | AuthorizeErrorHookHandler[]
      | undefined,
    error: unknown,
    req: ArkosBaseContext,
    ctx?: {
      action?: AccessAction;
      resource?: string;
      rule?: string[] | DetailedAccessControlRule | "*";
    }
  ): Promise<{ skipped: boolean; error?: unknown }> {
    if (!hooks) return { skipped: false, error };

    const hookArray = Array.isArray(hooks) ? hooks : [hooks];

    for (const hook of hookArray) {
      let skipCalled = false;

      try {
        await (hook as any)({
          req,
          error,
          skip: () => {
            skipCalled = true;
          },
          ...ctx,
        });
      } catch (err) {
        return { skipped: false, error: err };
      }

      if (skipCalled) return { skipped: true };
    }

    return { skipped: false, error };
  }
}

const authHookManager = new AuthHookManager();

export default authHookManager;
