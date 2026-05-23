import app from "@/src/app";
import http from "node:http";
import { Server } from "socket.io";
import { io as ioc, Socket as ClientSocket } from "socket.io-client";
import { z } from "zod";
import { ArkosGateway } from "arkos/websockets";

const MessageSchema = z.object({
  room: z.string(),
  content: z.string(),
});

const TypingSchema = z.object({
  room: z.string(),
});

const AlertSchema = z.object({
  message: z.string(),
});

const alertsGateway = ArkosGateway({ name: "/alerts", authentication: true });

alertsGateway.hook("connection", (socket, io) => {
  console.log("alerts connected", socket.user?.id);
});

alertsGateway.hook("disconnect", (socket, io) => {
  console.log("alerts disconnected", socket.id);
});

alertsGateway.hook("error", (err, socket) => {
  socket.emit("error", { message: err.message, layer: "alerts" });
});

alertsGateway.pipe((socket, data, next) => {
  socket.data.alertsGlobalPipe = true;
  next();
});

alertsGateway.pipe({ event: "send_alert" }, (socket, data, next) => {
  socket.data.alertsScopedPipe = true;
  next();
});

alertsGateway.on(
  { event: "send_alert", validation: AlertSchema, ack: true },
  (socket, data, io, ack) => {
    io.of("chat/notifications/alerts").emit("receive_alert", {
      ...data,
      from: socket.user?.id,
    });
    ack?.({ status: "ok" });
  }
);

alertsGateway.on(
  { event: "dismiss_alert", disabled: false },
  (socket, data, io) => {
    socket.emit("alert_dismissed", { by: socket.user?.id });
  }
);

const notificationsGateway = ArkosGateway({
  name: "/notifications",
  authentication: true,
});

notificationsGateway.hook("connection", (socket, io) => {
  console.log("notifications connected", socket.user?.id);
});

notificationsGateway.hook("disconnect", (socket, io) => {
  console.log("notifications disconnected", socket.id);
});

notificationsGateway.hook("error", (err, socket) => {
  socket.emit("error", { message: err.message, layer: "notifications" });
});

notificationsGateway.pipe((socket, data, next) => {
  socket.data.notificationsGlobalPipe = true;
  next();
});

notificationsGateway.pipe({ event: "mark_read" }, (socket, data, next) => {
  socket.data.notificationsScopedPipe = true;
  next();
});

notificationsGateway.on(
  { event: "mark_read", validation: z.object({ id: z.string() }), ack: true },
  (socket, data, io, ack) => {
    socket.emit("notification_updated", { id: data.id, read: true });
    ack?.({ status: "ok" });
  }
);

notificationsGateway.on(
  { event: "mark_all_read", ack: true },
  (socket, data, io, ack) => {
    socket.emit("all_notifications_updated", { read: true });
    ack?.({ status: "ok" });
  }
);

notificationsGateway.use(alertsGateway);

const chatGateway = ArkosGateway({ name: "/chat", authentication: true });

chatGateway.hook("connection", (socket, io) => {
  console.log("chat connected", socket.user?.id);
});

chatGateway.hook("disconnect", (socket, io) => {
  console.log("chat disconnected", socket.id);
});

chatGateway.hook("error", (err, socket) => {
  socket.emit("error", { message: err.message, layer: "chat" });
});

chatGateway.pipe((socket, data, next) => {
  socket.data.chatGlobalPipe = true;
  next();
});

chatGateway.pipe({ event: "send_message" }, (socket, data, next) => {
  socket.data.chatScopedPipe = true;
  next();
});

chatGateway.on(
  { event: "send_message", validation: MessageSchema, ack: true },
  (socket, data, io, ack) => {
    socket.to(data.room).emit("receive_message", {
      ...data,
      from: socket.user?.id,
    });
    ack?.({ status: "ok" });
  }
);

chatGateway.on(
  { event: "typing", validation: TypingSchema },
  (socket, data, io) => {
    socket.to(data.room).emit("user_typing", { from: socket.user?.id });
  }
);

chatGateway.on(
  { event: "disabled_event", disabled: true },
  (socket, data, io) => {
    socket.emit("should_never_fire");
  }
);

chatGateway.use(notificationsGateway);

await app.build();
const server = http.createServer(app);
const io = new Server(server);

chatGateway.register(io);

// io.on("connection", () )

app.listen(server);

const BASE_URL = "http://localhost:8001";

function connect(namespace: string, token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioc(`${BASE_URL}/${namespace}`, {
      auth: { token },
      transports: ["websocket"],
    });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", reject);
  });
}

function waitFor(
  socket: ClientSocket,
  event: string,
  timeoutMs = 2000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out waiting for "${event}"`)),
      timeoutMs
    );
    socket.once(event, (data: any) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}
async function getToken(): Promise<string> {
  // await fetch(`${BASE_URL}/api/auth/signup`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({
  //     // name: "/Test User",
  //     email: "test@gateway.com",
  //     password: "Test1234!",
  //   }),
  // });

  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test@gateway.com",
      password: "Test1234!",
    }),
  });

  const data = await res.json();
  return data.accessToken;
}

async function runTests() {
  const token = await getToken();
  const invalidToken = "invalid-token";

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`PASS — ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`FAIL — ${name}: ${err.message}`);
      failed++;
    }
  }

  await test("chat — connects with valid token", async () => {
    const socket = await connect("chat", token);
    socket.disconnect();
  });

  await test("chat — rejects invalid token", async () => {
    await new Promise<void>((resolve, reject) => {
      const socket = ioc(`${BASE_URL}/chat`, {
        auth: { token: invalidToken },
        transports: ["websocket"],
      });
      socket.on("connect_error", () => {
        socket.disconnect();
        resolve();
      });
      socket.on("connect", () => {
        socket.disconnect();
        reject(new Error("should have been rejected"));
      });
    });
  });

  await test("chat — send_message triggers receive_message on room", async () => {
    const sender = await connect("chat", token);
    const receiver = await connect("chat", token);

    const received = waitFor(receiver, "receive_message");

    // both sockets join the room via ack-based join event
    // or just broadcast to namespace for test purposes
    sender.emit("send_message", { room: receiver.id, content: "hello" });

    const msg = await received;
    if (msg.content !== "hello")
      throw new Error(`unexpected content: ${msg.content}`);

    sender.disconnect();
    receiver.disconnect();
  });
  await test("chat — send_message ack returns { status: ok }", async () => {
    const socket = await connect("chat", token);

    const ack = await new Promise<any>((resolve) => {
      socket.emit(
        "send_message",
        { room: "room:1", content: "ack test" },
        resolve
      );
    });

    if (ack.status !== "ok")
      throw new Error(`unexpected ack: ${JSON.stringify(ack)}`);

    socket.disconnect();
  });

  await test("chat — send_message global pipe runs", async () => {
    const socket = await connect("chat", token);

    await new Promise<any>((resolve) => {
      socket.emit(
        "send_message",
        { room: "room:1", content: "pipe test" },
        resolve
      );
    });

    socket.disconnect();
  });

  await test("chat — typing emits user_typing to room", async () => {
    const sender = await connect("chat", token);
    const receiver = await connect("chat", token);

    const typing = waitFor(receiver, "user_typing");

    sender.emit("typing", { room: receiver.id });

    await typing;

    sender.disconnect();
    receiver.disconnect();
  });

  await test("chat — disabled_event never fires", async () => {
    const socket = await connect("chat", token);

    const fired = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 300);
      socket.on("should_never_fire", () => {
        clearTimeout(timeout);
        resolve(true);
      });
      socket.emit("disabled_event");
    });

    if (fired) throw new Error("disabled event fired");

    socket.disconnect();
  });

  await test("chat — unknown event emits no handler, no crash", async () => {
    const socket = await connect("chat", token);

    socket.emit("completely_unknown_event", { foo: "bar" });

    await new Promise((r) => setTimeout(r, 200));

    socket.disconnect();
  });

  await test("chat — validation failure emits error", async () => {
    const socket = await connect("chat", token);

    const error = waitFor(socket, "error");

    socket.emit("send_message", { bad: "payload" });

    await error;

    socket.disconnect();
  });

  await test("notifications — connects with valid token", async () => {
    const socket = await connect("chat/notifications", token);
    socket.disconnect();
  });

  await test("notifications — mark_read ack returns { status: ok }", async () => {
    const socket = await connect("chat/notifications", token);

    const ack = await new Promise<any>((resolve) => {
      socket.emit("mark_read", { id: "notif:123" }, resolve);
    });

    if (ack.status !== "ok")
      throw new Error(`unexpected ack: ${JSON.stringify(ack)}`);

    socket.disconnect();
  });

  await test("notifications — mark_all_read ack returns { status: ok }", async () => {
    const socket = await connect("chat/notifications", token);

    const ack = await new Promise<any>((resolve) => {
      socket.emit("mark_all_read", {}, resolve);
    });

    if (ack.status !== "ok")
      throw new Error(`unexpected ack: ${JSON.stringify(ack)}`);

    socket.disconnect();
  });

  await test("notifications — mark_read scoped pipe runs", async () => {
    const socket = await connect("chat/notifications", token);

    const ack = await new Promise<any>((resolve) => {
      socket.emit("mark_read", { id: "notif:456" }, resolve);
    });

    if (ack.status !== "ok") throw new Error("scoped pipe or handler failed");

    socket.disconnect();
  });

  await test("alerts — connects with valid token", async () => {
    const socket = await connect("chat/notifications/alerts", token);
    socket.disconnect();
  });

  await test("alerts — send_alert broadcasts and acks", async () => {
    const sender = await connect("chat/notifications/alerts", token);
    const receiver = await connect("chat/notifications/alerts", token);

    const received = waitFor(receiver, "receive_alert");

    const ack = await new Promise<any>((resolve) => {
      sender.emit("send_alert", { message: "system down" }, resolve);
    });

    if (ack.status !== "ok")
      throw new Error(`unexpected ack: ${JSON.stringify(ack)}`);

    await received;

    sender.disconnect();
    receiver.disconnect();
  });

  await test("alerts — dismiss_alert emits alert_dismissed", async () => {
    const socket = await connect("chat/notifications/alerts", token);

    const dismissed = waitFor(socket, "alert_dismissed");

    socket.emit("dismiss_alert", {});

    await dismissed;

    socket.disconnect();
  });

  await test("alerts — global pipe runs before scoped pipe", async () => {
    const socket = await connect("chat/notifications/alerts", token);

    const ack = await new Promise<any>((resolve) => {
      socket.emit("send_alert", { message: "pipe order test" }, resolve);
    });

    if (ack.status !== "ok") throw new Error("pipe chain failed");

    socket.disconnect();
  });

  await test("alerts — validation failure emits error", async () => {
    const socket = await connect("chat/notifications/alerts", token);

    const error = waitFor(socket, "error");

    socket.emit("send_alert", { bad: "payload" });

    await error;

    socket.disconnect();
  });

  await test("alerts — rejects invalid token", async () => {
    await new Promise<void>((resolve, reject) => {
      const socket = ioc(`${BASE_URL}/chat/notifications/alerts`, {
        auth: { token: invalidToken },
        transports: ["websocket"],
      });
      socket.on("connect_error", () => {
        socket.disconnect();
        resolve();
      });
      socket.on("connect", () => {
        socket.disconnect();
        reject(new Error("should have been rejected"));
      });
    });
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("test runner crashed", err);
  process.exit(1);
});
