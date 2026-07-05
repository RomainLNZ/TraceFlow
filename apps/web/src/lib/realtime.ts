import { io } from "socket.io-client";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export const realtime = io(API_BASE_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"]
});

export function ensureRealtimeConnected() {
  if (!realtime.connected) {
    realtime.connect();
  }
}
