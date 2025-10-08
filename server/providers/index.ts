// Provider factory and registry
import type { IProvider, ProviderConfig } from "./base";
import { StandaloneProvider } from "./standalone";
import { EMRMProvider } from "./emrm";
import { GenericWebhookProvider } from "./generic-webhook";

export type ProviderType = "standalone" | "emrm" | "simplysafe" | "generic_webhook";

export function createProvider(type: ProviderType, config: ProviderConfig): IProvider {
  switch (type) {
    case "standalone":
      return new StandaloneProvider(config);
    case "emrm":
      return new EMRMProvider(config);
    case "simplysafe":
      // SimplySafe would be implemented similarly to EMRM
      // For now, fallback to standalone
      console.warn("SimplySafe provider not yet implemented, using standalone");
      return new StandaloneProvider(config);
    case "generic_webhook":
      return new GenericWebhookProvider(config);
    default:
      console.warn(`Unknown provider type: ${type}, using standalone`);
      return new StandaloneProvider(config);
  }
}

export * from "./base";
export { StandaloneProvider } from "./standalone";
export { EMRMProvider } from "./emrm";
export { GenericWebhookProvider } from "./generic-webhook";
