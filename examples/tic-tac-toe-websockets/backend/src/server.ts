import app from "@/src/app";
import http from "node:http";
import { Server } from "socket.io";
import gateway from "./gateway";

await app.build();

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: true, credentials: true, methods: ["GET", "POST"] },
});

gateway.register(io);

app.listen(server);
