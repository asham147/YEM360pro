"use client";
/**
 * YEM360 — realtime socket singleton (socket.io via Caddy gateway).
 */
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;
const handlers = new Map<string, Set<(data: unknown) => void>>();

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token: string): Socket {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  const s = io("/?XTransformPort=3003", {
    transports: ["websocket", "polling"],
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
    timeout: 10000,
  });

  s.on("connect", () => {
    s.emit("auth", { token });
  });

  s.onAny((event: string, data: unknown) => {
    const set = handlers.get(event);
    if (set) for (const fn of set) fn(data);
  });

  socket = s;
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function onSocketEvent(event: string, fn: (data: unknown) => void): () => void {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event)!.add(fn);
  return () => {
    handlers.get(event)?.delete(fn);
  };
}

export function emitSocket(event: string, payload?: unknown) {
  socket?.emit(event, payload);
}
