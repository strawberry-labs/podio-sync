import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios, { AxiosInstance } from 'axios';
import { PodioAppConfig, getPodioConfig } from '../config/podio-apps.config';

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

@Injectable()
export class PodioService implements OnModuleInit {
  private readonly logger = new Logger(PodioService.name);
  private readonly baseUrl = 'https://api.podio.com';
  private tokens: Map<string, TokenData> = new Map();
  private clientId: string;
  private clientSecret: string;
  private apps: PodioAppConfig[];

  constructor(private configService: ConfigService) {
    const config = getPodioConfig();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.apps = config.apps;
  }

  async onModuleInit() {
    // Authenticate all apps on startup
    for (const app of this.apps) {
      if (app.appId && app.appToken) {
        try {
          await this.authenticateApp(app);
          this.logger.log(`Authenticated app: ${app.name}`);
        } catch (error) {
          this.logger.error(`Failed to authenticate app ${app.name}:`, error.message);
        }
      }
    }
  }

  private async authenticateApp(app: PodioAppConfig): Promise<void> {
    try {
      const response = await axios.post(`${this.baseUrl}/oauth/token/v2`, {
        grant_type: 'app',
        app_id: app.appId,
        app_token: app.appToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      const { access_token, refresh_token, expires_in } = response.data;

      this.tokens.set(app.slug, {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: Date.now() + (expires_in * 1000) - 60000, // Refresh 1 min before expiry
      });

      this.logger.log(`Token obtained for ${app.name}, expires in ${expires_in}s`);
    } catch (error) {
      this.logger.error(`Auth failed for ${app.name}:`, error.response?.data || error.message);
      throw error;
    }
  }

  private async refreshToken(appSlug: string): Promise<void> {
    const tokenData = this.tokens.get(appSlug);
    const app = this.apps.find(a => a.slug === appSlug);

    if (!tokenData || !app) {
      throw new Error(`No token data found for app: ${appSlug}`);
    }

    try {
      const response = await axios.post(`${this.baseUrl}/oauth/token/v2`, {
        grant_type: 'refresh_token',
        refresh_token: tokenData.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      const { access_token, refresh_token, expires_in } = response.data;

      this.tokens.set(appSlug, {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: Date.now() + (expires_in * 1000) - 60000,
      });

      this.logger.log(`Token refreshed for ${app.name}`);
    } catch (error) {
      this.logger.error(`Token refresh failed for ${app.name}, re-authenticating...`);
      await this.authenticateApp(app);
    }
  }

  // Refresh tokens every 30 minutes
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleTokenRefresh() {
    this.logger.log('Running scheduled token refresh...');
    for (const app of this.apps) {
      if (app.appId && app.appToken) {
        const tokenData = this.tokens.get(app.slug);
        if (tokenData && Date.now() >= tokenData.expiresAt) {
          await this.refreshToken(app.slug);
        }
      }
    }
  }

  private async getAccessToken(appSlug: string): Promise<string> {
    const tokenData = this.tokens.get(appSlug);

    if (!tokenData) {
      const app = this.apps.find(a => a.slug === appSlug);
      if (app) {
        await this.authenticateApp(app);
        return this.tokens.get(appSlug)!.accessToken;
      }
      throw new Error(`No app found with slug: ${appSlug}`);
    }

    // Refresh if expired
    if (Date.now() >= tokenData.expiresAt) {
      await this.refreshToken(appSlug);
      return this.tokens.get(appSlug)!.accessToken;
    }

    return tokenData.accessToken;
  }

  async verifyWebhook(appSlug: string, hookId: string, code: string): Promise<void> {
    const accessToken = await this.getAccessToken(appSlug);

    await axios.post(
      `${this.baseUrl}/hook/${hookId}/verify/validate`,
      { code },
      {
        headers: {
          'Authorization': `OAuth2 ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    this.logger.log(`Webhook ${hookId} verified for ${appSlug}`);
  }

  async getItem(appSlug: string, itemId: string): Promise<any> {
    const accessToken = await this.getAccessToken(appSlug);

    const response = await axios.get(`${this.baseUrl}/item/${itemId}`, {
      headers: { 'Authorization': `OAuth2 ${accessToken}` },
    });

    return response.data;
  }

  async getRevisionDiff(
    appSlug: string,
    itemId: string,
    fromRevision: number,
    toRevision: number,
  ): Promise<any[]> {
    const accessToken = await this.getAccessToken(appSlug);

    const response = await axios.get(
      `${this.baseUrl}/item/${itemId}/revision/${fromRevision}/${toRevision}`,
      {
        headers: { 'Authorization': `OAuth2 ${accessToken}` },
      }
    );

    return response.data;
  }

  /**
   * Get item values only (lighter response than full item)
   * GET /item/{item_id}/value
   */
  async getItemValues(appSlug: string, itemId: string): Promise<any[]> {
    const accessToken = await this.getAccessToken(appSlug);

    const response = await axios.get(
      `${this.baseUrl}/item/${itemId}/value`,
      {
        headers: { 'Authorization': `OAuth2 ${accessToken}` },
      }
    );

    return response.data;
  }

  /**
   * Update an item with new field values
   * PUT /item/{item_id}
   *
   * @param appSlug - The app slug for authentication
   * @param itemId - The Podio item ID
   * @param fields - Array of field values to update
   * @param options - Optional settings (hook, silent)
   * @returns The new revision and title
   */
  async updateItem(
    appSlug: string,
    itemId: string,
    fields: any[],
    options: { hook?: boolean; silent?: boolean } = {},
  ): Promise<{ revision: number; title: string }> {
    const accessToken = await this.getAccessToken(appSlug);
    const { hook = true, silent = false } = options;

    const response = await axios.put(
      `${this.baseUrl}/item/${itemId}`,
      { fields },
      {
        headers: {
          'Authorization': `OAuth2 ${accessToken}`,
          'Content-Type': 'application/json',
        },
        params: { hook, silent },
      }
    );

    this.logger.log(`Item ${itemId} updated, new revision: ${response.data.revision}`);
    return response.data;
  }

  /**
   * Update a single field on an item
   * PUT /item/{item_id}/value/{field_or_external_id}
   *
   * @param appSlug - The app slug for authentication
   * @param itemId - The Podio item ID
   * @param fieldId - The field ID or external_id
   * @param value - The new value(s) for the field
   * @param options - Optional settings (hook, silent)
   * @returns The new revision and title
   */
  async updateItemField(
    appSlug: string,
    itemId: string,
    fieldId: string,
    value: any,
    options: { hook?: boolean; silent?: boolean } = {},
  ): Promise<{ revision: number; title: string }> {
    const accessToken = await this.getAccessToken(appSlug);
    const { hook = true, silent = false } = options;

    const response = await axios.put(
      `${this.baseUrl}/item/${itemId}/value/${fieldId}`,
      value,
      {
        headers: {
          'Authorization': `OAuth2 ${accessToken}`,
          'Content-Type': 'application/json',
        },
        params: { hook, silent },
      }
    );

    this.logger.log(`Field ${fieldId} on item ${itemId} updated, new revision: ${response.data.revision}`);
    return response.data;
  }

  /**
   * Add a comment to a Podio item
   * POST /comment/item/{item_id}
   *
   * @param appSlug - The app slug for authentication
   * @param itemId - The Podio item ID
   * @param value - The comment text
   * @param options - Optional settings (hook, silent, alertInvite)
   * @returns The comment ID and any granted users
   */
  async addComment(
    appSlug: string,
    itemId: string,
    value: string,
    options: { hook?: boolean; silent?: boolean; alertInvite?: boolean } = {},
  ): Promise<{ comment_id: number; granted_users?: any[] }> {
    const accessToken = await this.getAccessToken(appSlug);
    const { hook = true, silent = false, alertInvite = false } = options;

    const response = await axios.post(
      `${this.baseUrl}/comment/item/${itemId}`,
      { value },
      {
        headers: {
          'Authorization': `OAuth2 ${accessToken}`,
          'Content-Type': 'application/json',
        },
        params: {
          hook,
          silent,
          alert_invite: alertInvite,
        },
      }
    );

    this.logger.log(`Comment added to item ${itemId}, comment_id: ${response.data.comment_id}`);
    return response.data;
  }

  /**
   * Get the full app schema (definition) from Podio, including every field
   * configured on the app — even ones that no item has ever set.
   *
   * Useful because item responses (list/filter/get) only include fields that
   * have values on that specific item, so they can't be relied on to discover
   * the complete set of fields.
   *
   * GET /app/{app_id}
   */
  async getAppSchema(appSlug: string): Promise<any> {
    const app = this.getAppConfig(appSlug);
    if (!app) throw new Error(`No app found with slug: ${appSlug}`);

    const accessToken = await this.getAccessToken(appSlug);

    const response = await axios.get(
      `${this.baseUrl}/app/${app.appId}`,
      {
        headers: { 'Authorization': `OAuth2 ${accessToken}` },
      },
    );

    return response.data;
  }

  /**
   * Get items for an app
   * GET /item/app/{app_id}
   */
  async getItems(
    appSlug: string,
    options: { limit?: number; offset?: number; sortBy?: string; sortDesc?: boolean } = {},
  ): Promise<any> {
    const app = this.getAppConfig(appSlug);
    if (!app) throw new Error(`No app found with slug: ${appSlug}`);

    const accessToken = await this.getAccessToken(appSlug);
    const { limit = 30, offset = 0, sortBy, sortDesc } = options;

    const params: Record<string, any> = { limit, offset };
    if (sortBy) params.sort_by = sortBy;
    if (sortDesc !== undefined) params.sort_desc = sortDesc;

    const response = await axios.get(
      `${this.baseUrl}/item/app/${app.appId}`,
      {
        headers: { 'Authorization': `OAuth2 ${accessToken}` },
        params,
      },
    );

    return response.data;
  }

  /**
   * Filter items in an app
   * POST /item/app/{app_id}/filter/
   */
  async filterItems(
    appSlug: string,
    filters: Record<string, any> = {},
    options: { limit?: number; offset?: number; sortBy?: string; sortDesc?: boolean } = {},
  ): Promise<any> {
    const app = this.getAppConfig(appSlug);
    if (!app) throw new Error(`No app found with slug: ${appSlug}`);

    const accessToken = await this.getAccessToken(appSlug);
    const { limit = 30, offset = 0, sortBy, sortDesc } = options;

    const body: Record<string, any> = {
      filters,
      limit,
      offset,
    };
    if (sortBy) body.sort_by = sortBy;
    if (sortDesc !== undefined) body.sort_desc = sortDesc;

    const response = await axios.post(
      `${this.baseUrl}/item/app/${app.appId}/filter/`,
      body,
      {
        headers: {
          'Authorization': `OAuth2 ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  /**
   * Create a new item in an app
   * POST /item/app/{app_id}
   */
  async createItem(
    appSlug: string,
    fields: any[],
    options: { hook?: boolean; silent?: boolean } = {},
  ): Promise<{ item_id: number; title: string }> {
    const app = this.getAppConfig(appSlug);
    if (!app) throw new Error(`No app found with slug: ${appSlug}`);

    const accessToken = await this.getAccessToken(appSlug);
    const { hook = true, silent = false } = options;

    const response = await axios.post(
      `${this.baseUrl}/item/app/${app.appId}`,
      { fields },
      {
        headers: {
          'Authorization': `OAuth2 ${accessToken}`,
          'Content-Type': 'application/json',
        },
        params: { hook, silent },
      }
    );

    this.logger.log(`Item created in ${appSlug}, item_id: ${response.data.item_id}`);
    return response.data;
  }

  getAppConfig(appSlug: string): PodioAppConfig | undefined {
    return this.apps.find(a => a.slug === appSlug);
  }

  getAllApps(): PodioAppConfig[] {
    return this.apps;
  }
}
