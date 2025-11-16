/**
 * MindFit v2 - Live Telemetry WebSocket Dashboard
 * Real-time system metrics and event streaming
 */

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Cpu, HardDrive, Zap, Clock, Wifi, WifiOff } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

interface SystemMetrics {
  cpuLoad: number;
  memMB: number;
  memTotal: number;
  memFree: number;
  memPercent: number;
  uptime: number;
  latency: number | null;
  ts: number;
}

interface WebSocketEvent {
  type: string;
  [key: string]: any;
}

export default function LiveDashboard() {
  const [connected, setConnected] = useState(false);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [events, setEvents] = useState<WebSocketEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Format uptime from seconds to readable string
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Connect to WebSocket with token authentication
  const connectWebSocket = async () => {
    try {
      // Fetch WebSocket token from API (requires authentication)
      const tokenRes = await fetch("/api/admin/ws-token", {
        credentials: "include",
      });

      if (!tokenRes.ok) {
        console.error("[LiveDashboard] Failed to get WebSocket token");
        return;
      }

      const tokenData = await tokenRes.json();
      const wsToken = tokenData.token;

      if (!wsToken) {
        console.error("[LiveDashboard] No WebSocket token received");
        return;
      }

      // Determine WebSocket URL based on environment
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}?token=${wsToken}`;

      console.log("[LiveDashboard] Connecting to WebSocket...");

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

    ws.onopen = () => {
      console.log("[LiveDashboard] WebSocket connected");
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle different message types
        if (data.type === "system_metrics") {
          setMetrics(data as SystemMetrics);
        } else if (data.type === "connection_ack") {
          console.log("[LiveDashboard] Connection acknowledged:", data.clientId);
        } else {
          // Add to event stream (keep last 50 events)
          setEvents((prev) => [data, ...prev].slice(0, 50));
        }
      } catch (error) {
        console.error("[LiveDashboard] Failed to parse message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("[LiveDashboard] WebSocket error:", error);
    };

      ws.onclose = () => {
        console.log("[LiveDashboard] WebSocket disconnected");
        setConnected(false);
        wsRef.current = null;

        // Auto-reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("[LiveDashboard] Attempting to reconnect...");
          connectWebSocket();
        }, 5000);
      };
    } catch (error) {
      console.error("[LiveDashboard] Error connecting to WebSocket:", error);
      // Retry after 5 seconds on error
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 5000);
    }
  };

  // Initialize WebSocket connection on mount
  useEffect(() => {
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="h-8 w-8 text-red-500" />
              Live Telemetry Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Real-time system metrics and event streaming
            </p>
          </div>

          {/* Connection Status */}
          <Badge
            variant={connected ? "default" : "destructive"}
            className="flex items-center gap-2 px-4 py-2"
          >
            {connected ? (
              <>
                <Wifi className="h-4 w-4" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                <span>Disconnected</span>
              </>
            )}
          </Badge>
        </div>

        {/* System Metrics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* CPU Load */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU Load</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.cpuLoad.toFixed(2) || "—"}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics?.cpuLoad && metrics.cpuLoad > 2 ? "High load" : "Normal"}
              </p>
            </CardContent>
          </Card>

          {/* Memory Usage */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics ? `${metrics.memPercent.toFixed(1)}%` : "—"}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics ? `${metrics.memMB} MB / ${(metrics.memTotal / 1024).toFixed(1)} GB` : "Waiting for data..."}
              </p>
            </CardContent>
          </Card>

          {/* API Latency */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Latency</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.latency !== null && metrics?.latency !== undefined
                  ? metrics.latency === -1
                    ? "Error"
                    : `${metrics.latency}ms`
                  : "—"}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics?.latency && metrics.latency > 0 && metrics.latency < 100
                  ? "Excellent"
                  : metrics?.latency && metrics.latency >= 100
                  ? "Degraded"
                  : "Monitoring..."}
              </p>
            </CardContent>
          </Card>

          {/* Server Uptime */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.uptime ? formatUptime(metrics.uptime) : "—"}
              </div>
              <p className="text-xs text-muted-foreground">
                Server running time
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Event Stream Console */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Event Stream
            </CardTitle>
            <CardDescription>
              Real-time events from MindFit backend (last 50 events)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg h-96 overflow-y-auto">
              {!connected && (
                <div className="text-yellow-400 mb-2">
                  [WARN] WebSocket disconnected. Reconnecting in 5s...
                </div>
              )}
              {events.length === 0 ? (
                <div className="text-gray-500">
                  Waiting for events...
                </div>
              ) : (
                events.map((event, idx) => (
                  <div key={idx} className="mb-1 hover:bg-gray-900 px-2 py-1 rounded">
                    <span className="text-blue-400">
                      [{new Date(event.ts || Date.now()).toLocaleTimeString()}]
                    </span>{" "}
                    <span className="text-purple-400">{event.type}</span>{" "}
                    <span className="text-gray-400">
                      {JSON.stringify(
                        Object.fromEntries(
                          Object.entries(event).filter(([k]) => k !== "type" && k !== "ts")
                        )
                      )}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">System Information</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <div>WebSocket Protocol: {window.location.protocol === "https:" ? "WSS (Secure)" : "WS"}</div>
            <div>Connection: {connected ? "Active" : "Reconnecting..."}</div>
            <div>Metrics Interval: 4 seconds</div>
            <div>Last Update: {metrics ? new Date(metrics.ts).toLocaleString() : "N/A"}</div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
