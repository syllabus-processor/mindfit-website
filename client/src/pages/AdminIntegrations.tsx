import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Settings, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

interface IntegrationSetting {
  id: string;
  dataType: string;
  provider: string;
  config: string;
  enabled: string;
  updatedAt: string;
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
    <div className="max-w-4xl mx-auto" data-testid="page-admin-integrations">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8" />
          Integration Settings
        </h1>
        <p className="text-muted-foreground">
          Configure how contact forms and newsletter subscriptions are forwarded to external systems
        </p>
      </div>

      <div className="space-y-6">
        <IntegrationConfigEditor dataType="contact_form" />
        <IntegrationConfigEditor dataType="newsletter" />
      </div>

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
    </div>
    </AdminLayout>
  );
}
