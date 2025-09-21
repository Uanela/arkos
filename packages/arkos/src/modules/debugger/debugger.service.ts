import sheu from "../../utils/sheu";
import {
  ArkosNextFunction,
  ArkosRequest,
  ArkosResponse,
  getArkosConfig,
} from "../../exports";

class DebuggerService {
  handleTransformedQueryLog(transformedQuery: Record<string, any>) {
    const config = getArkosConfig();
    const debugLevel = config.debugging?.level || 0;
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
    const debugLevel = config.debugging?.level || 0;
    if (debugLevel < 2) return;

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
