import sheu from "../../utils/sheu";
import { ArkosNextFunction, ArkosRequest, ArkosResponse } from "../../exports";
import { getArkosConfig } from "../../server";

class DebuggerService {
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

  logRequestInfo(req: ArkosRequest, _: ArkosResponse, next: ArkosNextFunction) {
    const config = getArkosConfig();
    const debugLevel = config.debugging?.requests?.level || 0;
    const filter = config.debugging?.requests?.filter;

    function shouldLog(inputName: any) {
      const hasFilter = (filter?.length || 0) > 0;
      if (!hasFilter) return true;
      return filter?.includes(inputName);
    }

    if (debugLevel < 2) return next();

    if (req.modelName)
      sheu.debug(`Prisma Model Module\n${req.modelName}`, { timestamp: true });

    if (Object.keys(req.params).length > 0 && shouldLog("Params"))
      sheu.debug(
        `Original Request Params (req.params)\n${JSON.stringify(req.params || {}, null, 2)}`,
        { timestamp: true }
      );
    else
      sheu.debug(`Original Request Params (req.params) - Empty`, {
        timestamp: true,
      });

    if (req.body && Object.keys(req.body).length > 0 && shouldLog("Body"))
      sheu.debug(
        `Original Request Body (req.body)\n${JSON.stringify(req.body, null, 2)}`,
        { timestamp: true }
      );
    else
      sheu.debug(`Original Request Body (req.body) - Empty`, {
        timestamp: true,
      });

    if (Object.keys(req.query).length > 0 && shouldLog("Query"))
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
