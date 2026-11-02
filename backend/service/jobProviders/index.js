import { config } from "../../config/index.js";
import adzuna from "./adzuna.js";
import remotive from "./remotive.js";

// Every provider the agent knows; JOB_PROVIDERS picks which ones run.
const PROVIDERS = { adzuna, remotive };

// Adds a provider by name. Used by tests to plug in a fake source.
export function registerProvider(provider) {
  PROVIDERS[provider.name] = provider;
}

// The providers named in JOB_PROVIDERS that have their keys set.
export function enabledProviders() {
  return config.jobProviders.flatMap((name) => {
    const provider = PROVIDERS[name];
    if (!provider) {
      console.warn(`Unknown job provider "${name}" in JOB_PROVIDERS; known: ${Object.keys(PROVIDERS).join(", ")}.`);
      return [];
    }
    return provider.isConfigured() ? [provider] : [];
  });
}

// What /api/health reports: each provider named in JOB_PROVIDERS and whether it can run.
export function providerStatus() {
  return config.jobProviders.map((name) => ({ name, configured: Boolean(PROVIDERS[name]?.isConfigured()) }));
}
