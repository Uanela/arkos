import app from "@/src/app";
import http from "node:http";

app.build();

const server = http.createServer(app);

app.listen(server);
