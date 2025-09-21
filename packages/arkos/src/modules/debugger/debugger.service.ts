import { Request } from "express";
import sheu from "../../utils/sheu";
import { ArkosConfig, getArkosConfig } from "../../exports";

class DebuggerService {
  private config: ArkosConfig;

  constructor() {
    this.config = getArkosConfig();
  }

  logLevel2RequestInfo(req: Request): void {
    const debugLevel = this.config.debugging?.requests?.level || 0;

    if (debugLevel < 2) return;

    if (Object.keys(req.query).length > 0) {
      sheu.debug(
        `Original Request Parameters (req.query):\n${JSON.stringify(req.query, null, 2)}`,
        { timestamp: true }
      );
    }

    if (req.body && Object.keys(req.body).length > 0) {
      sheu.debug(
        `Original Request Body (req.body):\n${JSON.stringify(req.body, null, 2)}`,
        { timestamp: true }
      );
    }
  }
}

const debuggerService = new DebuggerService();

export default debuggerService;
