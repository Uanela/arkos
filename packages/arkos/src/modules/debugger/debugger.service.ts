import sheu from "../../utils/sheu";
import {
  ArkosNextFunction,
  ArkosRequest,
  ArkosResponse,
  getArkosConfig,
} from "../../exports";
import { ModuleComponents } from "../../utils/dynamic-loader";
import util from "util";
import { crd } from "../../utils/helpers/fs.helpers";
import loadedComponentsLogger from "./utils/loaded-components-logger";

class DebuggerService {
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
    sheu.debug(`${sheu.bold("Loaded App Modules")}`, {
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

      sheu.debug(`-------start-of-${moduleName}-------`, {
        timestamp: true,
      });
      sheu.print(`${sheu.bold("Module:")} ${moduleName}
${sheu.bold("Path:")} ${moduleDir.replace(crd(), "")}
${sheu.bold("Files:")} ${loadedComponentsLogger.getComponentsNameList(moduleName, components).join(", ")}\n${debugLevel >= 2 ? loadedComponentsLogger.getLogText(components) : ""}
`);
      sheu.debug(`-------end-of-${moduleName}-------`, {
        timestamp: true,
      });
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

  logLevel2RequestInfo(
    req: ArkosRequest,
    _: ArkosResponse,
    next: ArkosNextFunction
  ): void {
    const config = getArkosConfig();
    const debugLevel = config.debugging?.requests?.level || 0;
    if (debugLevel < 2) return next();

    if (req.modelName) {
      sheu.debug(`Prisma Model Module\n${req.modelName}`, { timestamp: true });
    }

    if (Object.keys(req.query).length > 0) {
      sheu.debug(
        `Original Request Parameters (req.query)\n${JSON.stringify(req.query || {}, null, 2)}`,
        { timestamp: true }
      );
    } else
      sheu.debug(`Original Request Parameters (req.query) - Empty`, {
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

    next();
  }
}

const debuggerService = new DebuggerService();

export default debuggerService;
