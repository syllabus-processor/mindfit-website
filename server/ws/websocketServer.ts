/**
 * MindFit v2 - Live Telemetry WebSocket Server
 * Real-time event and metrics broadcasting
 */

import { WebSocketServer, WebSocket } from "ws";
import type { Server as HTTPServer } from "http";
import crypto from "crypto";

const clients = new Map<string, WebSocket>();

export function initWebSocketServer(server: HTTPServer) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    // Token-based authentication
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token || token !== process.env.WS_DASHBOARD_TOKEN) {
      console.log("[WS] Unauthorized connection attempt");
      ws.close(4001, "Unauthorized");
      return;
    }

    const clientId = crypto.randomBytes(8).toString("hex");
    clients.set(clientId, ws);

    ws.send(JSON.stringify({
      type: "connection_ack",
      clientId,
      ts: Date.now()
    }));

    console.log(`[WS] Client connected: ${clientId} (total: ${clients.size})`);

    ws.on("close", () => {
      clients.delete(clientId);
      console.log(`[WS] Client disconnected: ${clientId} (remaining: ${clients.size})`);
    });

    ws.on("error", (error) => {
      console.error(`[WS] Client error ${clientId}:`, error.message);
      clients.delete(clientId);
    });
  });

  console.log(`[WS] WebSocket server initialized on port ${process.env.PORT || 5000}`);

  return wss;
}

export function broadcast(event: any) {
  const msg = JSON.stringify(event);
  let sent = 0;

  for (const [clientId, ws] of clients.entries()) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
        sent++;
      } else {
        clients.delete(clientId);
      }
    } catch (error) {
      console.error(`[WS] Broadcast error to ${clientId}:`, error);
      clients.delete(clientId);
    }
  }

  if (sent > 0) {
    console.log(`[WS] Broadcast sent to ${sent} client(s): ${event.type}`);
  }
}

export function getConnectedClients(): number {
  return clients.size;
}
