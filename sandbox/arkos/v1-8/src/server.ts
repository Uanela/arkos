import app from "@/src/app";
import http from "node:http";
import { ArkosGateway } from "arkos/websockets";
import z from "zod";
import { Server } from "socket.io";

await app.build();

const server = http.createServer(app);

const io = new Server(server);

const gateway = ArkosGateway({ name: "hello" });

gateway.on(
  { event: "greetings", validation: z.object({ good: z.number() }) },
  (socket, data) => {
    data.good;
  },
);

gateway.register(io);

app.listen(server);

