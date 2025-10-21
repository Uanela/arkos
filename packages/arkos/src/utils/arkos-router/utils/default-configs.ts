import { getArkosConfig } from "../../../exports";
import { ArkosRouteConfig } from "../types";

const defaultConfigs: Partial<ArkosRouteConfig> = {
  rateLimit: {
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_, res) => {
      res.status(429).json({
        message: "Too many requests, please try again later",
      });
    },
  },
  cors: {
    options: {
      origin: ((
        origin: string,
        cb: (err: Error | null, allow?: boolean) => void
      ) => {
        const arkosConfig = getArkosConfig();
        const allowed = arkosConfig?.cors?.allowedOrigins;

        if (allowed === "*") cb(null, true);
        else if (Array.isArray(allowed))
          cb(null, !origin || allowed?.includes?.(origin));
        else if (typeof allowed === "string")
          cb(null, !origin || allowed === origin);
        else cb(null, false);
      }) as any,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Connection"],
      credentials: true,
    },
  },
};

export default defaultConfigs;
