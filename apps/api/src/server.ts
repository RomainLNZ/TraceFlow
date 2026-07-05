import http from "node:http";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { createSocketServer } from "./realtime/socket.js";

const app = createApp();
const server = http.createServer(app);
const io = createSocketServer(server);

app.set("io", io);

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${env.PORT} deja utilise. L'API semble deja lancee sur http://localhost:${env.PORT}`);
    process.exit(1);
  }

  throw error;
});

server.listen(env.PORT, () => {
  console.log(`Qualis API running on http://localhost:${env.PORT}`);
});
