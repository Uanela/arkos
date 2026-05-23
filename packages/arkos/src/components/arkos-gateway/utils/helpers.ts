import { Server } from "socket.io";
import {
  ArkosGatewayErrorHandler,
  ArkosGatewayPipe,
  ArkosSocket,
} from "../types";
import sheu from "../../../utils/sheu";
import { isProduction } from "../../../utils/helpers/arkos-config.helpers";

export async function handleArkosGatewayErrors(
  err: any,
  socket: ArkosSocket,
  io: Server,
  errorHandlers: ArkosGatewayErrorHandler[] = [],
  loggerMeta: {
    namespace: string;
    event: string;
    startTime: number;
  },
  ack?: (response: any) => void
) {
  let emitCalled = false;
  const originalEmit: any = socket.emit.bind(socket);

  socket.emit = (...args: any[]) => {
    emitCalled = true;
    return originalEmit(...args);
  };

  if (errorHandlers.length) {
    try {
      for (const handler of errorHandlers) await handler(err, socket, io);
    } catch (catchedErr: any) {
      err = catchedErr;
      emitCalled = false;
    }
  }

  socket.emit = originalEmit;

  if (!emitCalled) {
    sheu.error(err);
    const payload = {
      message: err?.message ?? "Internal server error",
      ...(err.isOperational
        ? err
        : { code: "InternalServerError", statusCode: 500 }),
    };
    socket.emit("error", payload);

    ack?.({ error: payload.message, ...(payload.meta || {}) });

    handleGatewayEventLog(
      loggerMeta.namespace,
      loggerMeta.event,
      payload.statusCode,
      loggerMeta.startTime
    );
  }
}

export async function runArkosGatewayPipes(
  pipes: ArkosGatewayPipe[],
  socket: ArkosSocket,
  data: any,
  io: Server
) {
  for (const pipe of pipes) {
    await pipe(socket, data, io);
  }
}

export function handleGatewayEventLog(
  namespace: string,
  event: string,
  statusCode: number,
  startTime: number
) {
  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 100 && statusCode < 200) return "\x1b[36m";
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

export function handleGatewayLifecycleLog(
  namespace: string,
  event: "connected" | "disconnected" | "error",
  socketId: string,
  errorType?: string
) {
  const isProduction = process.env.ARKOS_BUILD == "true";
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0];
  const timestamp = isProduction ? `${date} ${time}` : time;

  const eventColors = {
    connected: "\x1b[32m",
    disconnected: "\x1b[33m",
    error: "\x1b[31m",
  };

  const eventColor = eventColors[event];
  const extra = errorType ? ` ${errorType}` : "";

  console.info(
    `[\x1b[36mInfo\x1b[0m] \x1b[90m${timestamp}\x1b[0m \x1b[35mWS\x1b[0m ${namespace} ${eventColor}${event}\x1b[0m ${socketId}${extra}`
  );
}
