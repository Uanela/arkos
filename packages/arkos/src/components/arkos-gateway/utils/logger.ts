import { isProduction } from "../../../utils/helpers/arkos-config.helpers";

export function handleGatewayEventLog(
  namespace: string,
  event: string,
  statusCode: number,
  startTime: number
) {
  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return "\x1b[32m";
    if (statusCode >= 300 && statusCode < 400) return "\x1b[33m";
    if (statusCode >= 400 && statusCode < 500) return "\x1b[33m";
    if (statusCode >= 500) return "\x1b[31m";
    return "\x1b[0m";
  };

  const duration = Date.now() - startTime;
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0];
  const timestamp = isProduction() ? `${date} ${time}` : time;
  const statusColor = getStatusColor(statusCode);

  console.info(
    `[\x1b[36mInfo\x1b[0m] \x1b[90m${timestamp}\x1b[0m \x1b[35mWS\x1b[0m ${namespace} ${event} ${statusColor}${statusCode}\x1b[0m \x1b[35m${duration}ms\x1b[0m`
  );
}
