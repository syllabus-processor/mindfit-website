import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Settings, CheckCircle2, XCircle, Loader2, Activity, Cpu, HardDrive, Zap, Clock, Wifi, WifiOff } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

interface IntegrationSetting {
  id: string;
  dataType: string;
  provider: string;
  config: string;
  enabled: string;
  updatedAt: string;
}

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

const integrationFormSchema = z.object({
  dataType: z.enum(["contact_form", "newsletter"]),
  provider: z.enum(["standalone", "emrm", "simplysafe", "generic_webhook"]),
  config: z.string().refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Config must be valid JSON" }
  ),
  enabled: z.enum(["true", "false"]),
});

type IntegrationFormValues = z.infer<typeof integrationFormSchema>;

const providerDescriptions = {
  standalone: "Store data locally only, no external integration",
  emrm: "Send to EMRM system for client onboarding and CRM",
  simplysafe: "Send to SimplySafe EHR system",
  generic_webhook: "Send to any custom webhook URL (configure JSON in settings)",
};

const dataTypeLabels = {
  contact_form: "Contact Form Submissions",
  newsletter: "Newsletter Subscriptions",
};

function IntegrationConfigEditor({ dataType }: { dataType: "contact_form" | "newsletter" }) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: settings } = useQuery<{ success: boolean; data: IntegrationSetting[] }>({
    queryKey: ["/api/admin/integrations"],
  });

  const currentSetting = settings?.data.find((s) => s.dataType === dataType);

  const form = useForm<IntegrationFormValues>({
    resolver: zodResolver(integrationFormSchema),
    values: currentSetting
      ? {
          dataType: currentSetting.dataType as any,
          provider: currentSetting.provider as any,
          config: currentSetting.config || "{}",
          enabled: currentSetting.enabled as any,
        }
      : {
          dataType,
          provider: "standalone",
          config: "{}",
          enabled: "true",
        },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: IntegrationFormValues) => {
      return apiRequest("POST", "/api/admin/integrations", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/integrations"] });
      toast({
        title: "Settings saved",
        description: "Integration settings updated successfully",
      });
      setIsExpanded(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const provider = form.watch("provider");
  const enabled = form.watch("enabled");

  const getConfigTemplate = (provider: string): string => {
    switch (provider) {
      case "emrm":
        return JSON.stringify(
          {
            apiUrl: "https://emrm.mindfithealth.com/api",
            apiKey: "emrm_live_sk_...",
          },
          null,
          2
        );
      case "generic_webhook":
        return JSON.stringify(
          {
            contactWebhookUrl: "https://example.com/webhooks/contact",
            newsletterWebhookUrl: "https://example.com/webhooks/newsletter",
            authHeader: "Bearer your_api_key_here",
          },
          null,
          2
        );
      case "simplysafe":
        return JSON.stringify(
          {
            apiUrl: "https://api.simplysafe.com",
            apiKey: "your_simplysafe_key",
          },
          null,
          2
        );
      default:
        return "{}";
    }
  };

  return (
    <Card data-testid={`card-integration-${dataType}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {dataTypeLabels[dataType]}
              {enabled === "true" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" data-testid={`status-enabled-${dataType}`} />
              ) : (
                <XCircle className="h-5 w-5 text-gray-400" data-testid={`status-disabled-${dataType}`} />
              )}
            </CardTitle>
            <CardDescription>
              Current: <span className="font-medium">{currentSetting?.provider || "Not configured"}</span>
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid={`button-configure-${dataType}`}
          >
            {isExpanded ? "Cancel" : "Configure"}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))} className="space-y-6">
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid={`select-provider-${dataType}`}>
                          <SelectValue placeholder="Select a provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standalone">Standalone (Local Only)</SelectItem>
                        <SelectItem value="emrm">EMRM</SelectItem>
                        <SelectItem value="simplysafe">SimplySafe</SelectItem>
                        <SelectItem value="generic_webhook">Custom Webhook</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>{providerDescriptions[provider as keyof typeof providerDescriptions]}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="config"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Configuration (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={getConfigTemplate(provider)}
                        className="font-mono text-sm min-h-32"
                        {...field}
                        data-testid={`textarea-config-${dataType}`}
                        onBlur={(e) => {
                          // Auto-format JSON on blur if valid
                          try {
                            const parsed = JSON.parse(e.target.value);
                            form.setValue("config", JSON.stringify(parsed, null, 2));
                          } catch {
                            // Let form validation handle the error
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Provider-specific configuration in JSON format.
                      {provider !== "standalone" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto ml-1"
                          onClick={() => form.setValue("config", getConfigTemplate(provider), { shouldValidate: true })}
                          data-testid={`button-load-template-${dataType}`}
                        >
                          Load template
                        </Button>
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Integration</FormLabel>
                      <FormDescription>
                        When enabled, data will be forwarded to the selected provider
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === "true"}
                        onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                        data-testid={`switch-enabled-${dataType}`}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button type="submit" disabled={updateMutation.isPending} data-testid={`button-save-${dataType}`}>
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Settings
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsExpanded(false)}
                  data-testid={`button-cancel-${dataType}`}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      )}
    </Card>
  );
}

function LiveTelemetryDashboard() {
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
        console.error("[LiveTelemetry] Failed to get WebSocket token");
        return;
      }

      const tokenData = await tokenRes.json();
      const wsToken = tokenData.token;

      if (!wsToken) {
        console.error("[LiveTelemetry] No WebSocket token received");
        return;
      }

      // Determine WebSocket URL based on environment
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}?token=${wsToken}`;

      console.log("[LiveTelemetry] Connecting to WebSocket...");

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

    ws.onopen = () => {
      console.log("[LiveTelemetry] WebSocket connected");
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle different message types
        if (data.type === "system_metrics") {
          setMetrics(data as SystemMetrics);
        } else if (data.type === "connection_ack") {
          console.log("[LiveTelemetry] Connection acknowledged:", data.clientId);
        } else {
          // Add to event stream (keep last 50 events)
          setEvents((prev) => [data, ...prev].slice(0, 50));
        }
      } catch (error) {
        console.error("[LiveTelemetry] Failed to parse message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("[LiveTelemetry] WebSocket error:", error);
    };

      ws.onclose = () => {
        console.log("[LiveTelemetry] WebSocket disconnected");
        setConnected(false);
        wsRef.current = null;

        // Auto-reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("[LiveTelemetry] Attempting to reconnect...");
          connectWebSocket();
        }, 5000);
      };
    } catch (error) {
      console.error("[LiveTelemetry] Error connecting to WebSocket:", error);
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
    <div className="space-y-6">
      {/* Connection Status Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-red-500" />
            Real-time System Metrics
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Live monitoring of MindFit backend performance
          </p>
        </div>
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
  );
}

export default function AdminIntegrations() {
  const { data, isLoading } = useQuery<{ success: boolean; data: IntegrationSetting[] }>({
    queryKey: ["/api/admin/integrations"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="max-w-6xl mx-auto" data-testid="page-admin-integrations">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Configure integrations and monitor system performance
        </p>
      </div>

      <Tabs defaultValue="integrations" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="telemetry" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live Telemetry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          <IntegrationConfigEditor dataType="contact_form" />
          <IntegrationConfigEditor dataType="newsletter" />

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong>Standalone Mode:</strong> All data is stored locally in the database only. No external integration.
              </p>
              <p>
                <strong>EMRM:</strong> Contact submissions create client intake records in EMRM. Newsletter subscriptions sync to EMRM marketing lists.
              </p>
              <p>
                <strong>Generic Webhook:</strong> Send data to any custom webhook URL. Configure the endpoint URLs and auth headers in JSON config.
              </p>
              <p className="pt-2 border-t">
                <strong>Note:</strong> All data is always stored locally first, then forwarded to the selected provider. If provider integration fails, the data is still saved locally.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="telemetry">
          <LiveTelemetryDashboard />
        </TabsContent>
      </Tabs>
    </div>
    </AdminLayout>
  );
}
