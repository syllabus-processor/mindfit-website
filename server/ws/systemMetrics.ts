/**
 * MindFit v2 - System Metrics Streaming
 * Real-time CPU, memory, uptime, and latency monitoring
 */

import os from "os";
import { broadcast } from "./websocketServer";

let metricsInterval: NodeJS.Timeout | null = null;

export function startSystemMetricsStream() {
  if (metricsInterval) {
    console.log("[METRICS] Stream already running");
    return;
  }

  console.log("[METRICS] Starting system metrics stream (every 4s)");

  metricsInterval = setInterval(async () => {
    const cpuLoad = os.loadavg()[0];
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    // Test latency by hitting health endpoint
    let latency: number | null = null;
    try {
      const t0 = Date.now();
      await fetch(`http://localhost:${process.env.PORT || 5000}/api/events/public`);
      latency = Date.now() - t0;
    } catch (error) {
      latency = -1; // Error indicator
    }

    broadcast({
      type: "system_metrics",
      cpuLoad: Number(cpuLoad.toFixed(2)),
      memMB: Number((memUsage.rss / (1024 * 1024)).toFixed(1)),
      memTotal: Number((totalMem / (1024 * 1024)).toFixed(0)),
      memFree: Number((freeMem / (1024 * 1024)).toFixed(0)),
      memPercent: Number((((totalMem - freeMem) / totalMem) * 100).toFixed(1)),
      uptime: Number(uptime.toFixed(0)),
      latency,
      ts: Date.now()
    });
  }, 4000);
}

export function stopSystemMetricsStream() {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
    console.log("[METRICS] System metrics stream stopped");
  }
}
