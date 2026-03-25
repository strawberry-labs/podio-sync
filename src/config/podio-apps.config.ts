import { appDefinitions } from './apps';

/**
 * App definition — field metadata, version-controlled.
 * Does NOT include credentials (those come from env vars).
 */
export interface PodioAppDefinition {
  name: string;
  slug: string;
  monitoredFields: string[];
  monitoredFieldLabels?: string[];
  labelContainsTriggers?: string[];
  eventCreationTriggerField?: string;
  eventCreationTriggerValue?: string;
}

/**
 * Full app config — definition + resolved credentials.
 */
export interface PodioAppConfig extends PodioAppDefinition {
  appId: string;
  appToken: string;
}

export interface PodioConfig {
  clientId: string;
  clientSecret: string;
  apps: PodioAppConfig[];
}

/**
 * Derives env var names from a slug using a naming convention:
 *   slug "camp-sales" → PODIO_APP_CAMP_SALES_ID + PODIO_APP_CAMP_SALES_TOKEN
 *
 * To add a new app, just add two env vars following this pattern.
 */
function resolveCredentials(slug: string): { appId: string; appToken: string } {
  const envPrefix = `PODIO_APP_${slug.toUpperCase().replace(/-/g, '_')}`;
  const appId = process.env[`${envPrefix}_ID`] || '';
  const appToken = process.env[`${envPrefix}_TOKEN`] || '';
  return { appId, appToken };
}

export const getPodioConfig = (): PodioConfig => ({
  clientId: process.env.PODIO_CLIENT_ID || '',
  clientSecret: process.env.PODIO_CLIENT_SECRET || '',
  apps: appDefinitions.map((def) => ({
    ...def,
    ...resolveCredentials(def.slug),
  })),
});
