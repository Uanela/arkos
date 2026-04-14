import fs from "fs";
import { crd, getUserFileExtension as ext } from "./fs.helpers";
import { importModule } from "./global.helpers";
import { getArkosConfig } from "./arkos-config.helpers";
import sheu from "../sheu";

export let prismaInstance: any = null;

export async function loadPrismaModule() {
  if (!prismaInstance) {
    try {
      let prismaPath = `${crd()}/src/utils/prisma.${ext()}`;

      if (!fs.existsSync(prismaPath))
        prismaPath = `${crd()}/src/utils/prisma/index.${ext()}`;

      if (!fs.existsSync(prismaPath)) throw new Error(`Prisma not found`);

      const prismaModule = await importModule(prismaPath, {
        fixExtension: false,
      });
      prismaInstance = prismaModule.default;

      if (!prismaInstance || typeof prismaInstance?.["$connect"] !== "function")
        throw new Error("Prisma not found");
    } catch (error: any) {
      if (error.message === "Prisma not found") {
        if (
          getArkosConfig()?.warnings?.suppress?.prisma?.noInstanceFound !== true
        )
          sheu.warn(
            `Could not find your prisma instance under src/utils/prisma/index.${ext()}, see https://www.arkosjs.com/docs/core-concepts/prisma-orm/setup`,
            { timestamp: true }
          );

        return;
      }
      throw error;
    }
  }
  return prismaInstance;
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
  if (!prismaInstance) return null;

  return new Proxy(prismaInstance, {
    get: handlePrismaGet,
  });
}
