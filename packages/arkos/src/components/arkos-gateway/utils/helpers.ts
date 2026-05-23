import { Server } from "socket.io";
import {
  ArkosGatewayErrorHandler,
  ArkosGatewayPipe,
  ArkosSocket,
} from "../types";
import sheu from "../../../utils/sheu";
import { handleGatewayEventLog } from "./logger";

export default async function handleArkosGatewayErrors(
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
    socket.emit("error", err);

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
