import { getArkosConfig } from "./arkos-config.helpers";
import sheu from "../sheu";
import { getUserFileExtension } from "./fs.helpers";

export let prismaInstance: any = null;

export function loadPrismaModule() {
  const instance = getArkosConfig()?.prisma?.instance;
  if (!instance)
    sheu.warn(
      `Prisma client instance not passed to arkos.config.${getUserFileExtension()}, see https://www.arkosjs.com/docs/core-concepts/prisma-orm/setup`,
      { timestamp: true }
    );
  return instance;
}

export function handlePrismaGet(target: any, prop: string, receiver: any) {
  const originalProperty = (Reflect.get(target, prop, receiver) || {}) as any;

  const isModel = "findMany" in originalProperty;

  if (isModel && originalProperty) {
    return new Proxy(originalProperty, {
      get(modelTarget, methodName, modelReceiver) {
        const originalMethod = Reflect.get(
          modelTarget,
          methodName,
          modelReceiver
        );

        if (typeof originalMethod === "function") {
          return function (...args: any[]) {
            const config = getArkosConfig();
            const debugLevel = config.debugging?.requests?.level || 0;

            if (debugLevel >= 3) {
              const queryArgs = args[0];

              if (queryArgs && Object.keys(queryArgs).length > 0) {
                sheu.debug(
                  `Final Prisma Args\n${JSON.stringify(queryArgs, null, 2)}`,
                  { timestamp: true }
                );
              } else {
                sheu.debug(`Final Prisma Args - Empty`, { timestamp: true });
              }
            }

            return originalMethod.apply(modelTarget, args);
          };
        }

        return originalMethod;
      },
    });
  }

  return originalProperty;
}

export function getPrismaInstance() {
  return new Proxy(getArkosConfig()?.prisma?.instance || {}, {
    get: handlePrismaGet,
  });
}
