import sheu from "../../utils/sheu";
import { ArkosNextFunction, ArkosRequest, ArkosResponse } from "../../exports";
import { ModuleComponents } from "../../utils/dynamic-loader";
import util from "util";
import { crd } from "../../utils/helpers/fs.helpers";
import loadedComponentsLogger from "./utils/loaded-components-logger";
import { Router } from "express";
import { getArkosConfig } from "../../server";

class DebuggerService {
  logModuleFinalRouter(moduleName: string, router: Router) {
    const config = getArkosConfig();
    const debugLevel = config.debugging?.dynamicLoader?.level || 0;
    if (debugLevel < 3) return;

    const moduleNameFilter = config.debugging?.dynamicLoader?.filters?.modules;
    if (
      (moduleNameFilter?.[0]?.length || 0) > 0 &&
      !moduleNameFilter?.some((name) =>
        moduleName.toLowerCase().startsWith(name.toLowerCase())
      )
    )
      return;

    sheu.debug(`${sheu.bold("Final Router Module:")} ${moduleName}`);
    sheu.print(util.inspect(router, { depth: 2, colors: true }));
  }

  logDynamicLoadedModulesComponents(
    appModules: {
      moduleName: string;
      moduleDir: string;
      components: ModuleComponents;
    }[]
  ) {
    const config = getArkosConfig();
    const debugLevel = config.debugging?.dynamicLoader?.level || 0;

    if (debugLevel < 1) return;
    sheu.debug(`${sheu.bold("Dynamic Loader Components")}`, {
      timestamp: true,
    });

    const moduleNameFilter = config.debugging?.dynamicLoader?.filters?.modules;

    appModules.forEach(({ moduleName, moduleDir, components }) => {
      if (
        (moduleNameFilter?.[0]?.length || 0) > 0 &&
        !moduleNameFilter?.some((name) =>
          moduleName.toLowerCase().startsWith(name.toLowerCase())
        )
      )
        return;

      sheu.print(`\n${sheu.bold("Module:")} ${moduleName}
${sheu.bold("Path:")} ${moduleDir.replace(crd(), "")}
${sheu.bold("Components:")} ${loadedComponentsLogger.getComponentsNameList(moduleName, components).join(", ")}${debugLevel >= 2 ? `\n${loadedComponentsLogger.getLogText(components)}` : ""}
${sheu.bold("Ending:")} ${moduleName}\n`);
    });
  }

  handleTransformedQueryLog(transformedQuery: Record<string, any>) {
    const config = getArkosConfig();
    const debugLevel = config.debugging?.requests?.level || 0;
    if (debugLevel < 2) return;

    if (transformedQuery && Object.keys(transformedQuery).length > 0) {
      sheu.debug(
        `Transformed Request Parameters\n${JSON.stringify(transformedQuery, null, 2)}`,
        { timestamp: true }
      );
    } else
      sheu.debug(`Transformed Request Parameters - Empty`, {
        timestamp: true,
      });
  }

  logRequestInfo(
    req: ArkosRequest,
    _: ArkosResponse,
    next: ArkosNextFunction
  ): void {
    const config = getArkosConfig();
    const debugLevel = config.debugging?.requests?.level || 0;
    if (debugLevel < 2) return next();

    if (req.modelName)
      sheu.debug(`Prisma Model Module\n${req.modelName}`, { timestamp: true });

    if (Object.keys(req.params).length > 0)
      sheu.debug(
        `Original Request Params (req.params)\n${JSON.stringify(req.params || {}, null, 2)}`,
        { timestamp: true }
      );
    else
      sheu.debug(`Original Request Params (req.params) - Empty`, {
        timestamp: true,
      });

    if (req.body && Object.keys(req.body).length > 0)
      sheu.debug(
        `Original Request Body (req.body)\n${JSON.stringify(req.body, null, 2)}`,
        { timestamp: true }
      );
    else
      sheu.debug(`Original Request Body (req.body) - Empty`, {
        timestamp: true,
      });

    if (Object.keys(req.query).length > 0)
      sheu.debug(
        `Original Request Query (req.query)\n${JSON.stringify(req.query || {}, null, 2)}`,
        { timestamp: true }
      );
    else
      sheu.debug(`Original Request Query (req.query) - Empty`, {
        timestamp: true,
      });

    next();
  }
}

const debuggerService = new DebuggerService();

export default debuggerService;
