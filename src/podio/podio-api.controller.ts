import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  Logger,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { PodioService } from './podio.service';
import { ApiKeyGuard, ApiAccess, RequireAccess } from '../common/guards';

interface CreateItemDto {
  fields: any[];
  hook?: boolean;
  silent?: boolean;
}

interface UpdateItemDto {
  fields: any[];
  hook?: boolean;
  silent?: boolean;
}

interface UpdateFieldDto {
  value: any;
  hook?: boolean;
  silent?: boolean;
}

interface AddCommentDto {
  value: string;
  hook?: boolean;
  silent?: boolean;
  alertInvite?: boolean;
}

/**
 * REST API endpoints for interacting with Podio.
 * Protected by API key authentication with tiered access:
 *   - GET endpoints: accessible with read-only or full-access key
 *   - PUT/POST endpoints: require full-access key
 */
@Controller('api/podio')
@UseGuards(ApiKeyGuard)
export class PodioApiController {
  private readonly logger = new Logger(PodioApiController.name);

  constructor(private readonly podioService: PodioService) {}

  /**
   * Get any item by its global item_id, without needing an app slug.
   * Tries each configured app's token until one succeeds.
   *
   * GET /api/podio/items/:itemId
   */
  @Get('items/:itemId')
  @RequireAccess(ApiAccess.READ_ONLY)
  async getItemById(
    @Param('itemId') itemId: string,
  ): Promise<any> {
    this.logger.log(`GET item ${itemId} (no slug)`);

    try {
      const item = await this.podioService.getItemByIdAcrossApps(itemId);
      return { success: true, data: item };
    } catch (error) {
      this.logger.error(`Failed to get item ${itemId}:`, error.response?.data || error.message);
      throw new HttpException(
        {
          success: false,
          error: error.response?.data?.error_description || error.message,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get items that reference this item, grouped by app.
   * GET /api/podio/items/:itemId/references
   */
  @Get('items/:itemId/references')
  @RequireAccess(ApiAccess.READ_ONLY)
  async getItemReferences(
    @Param('itemId') itemId: string,
  ): Promise<any> {
    this.logger.log(`GET references for item ${itemId}`);

    try {
      const refs = await this.podioService.getItemReferences(itemId);
      return { success: true, data: refs };
    } catch (error) {
      this.logger.error(`Failed to get references for item ${itemId}:`, error.response?.data || error.message);
      throw new HttpException(
        {
          success: false,
          error: error.response?.data?.error_description || error.message,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a compact list of all items related to this one — both outgoing
   * (fields of type "app" pointing to other items) and incoming (items
   * that reference this one).
   *
   * GET /api/podio/items/:itemId/related
   */
  @Get('items/:itemId/related')
  @RequireAccess(ApiAccess.READ_ONLY)
  async getRelatedItems(
    @Param('itemId') itemId: string,
  ): Promise<any> {
    this.logger.log(`GET related items for ${itemId}`);

    try {
      const [item, incoming] = await Promise.all([
        this.podioService.getItemByIdAcrossApps(itemId),
        this.podioService.getItemReferences(itemId).catch(() => []),
      ]);

      const outgoing: any[] = [];
      for (const f of item.fields || []) {
        if (f.type !== 'app') continue;
        for (const v of f.values || []) {
          if (v.value) {
            outgoing.push({
              via_field: f.external_id,
              via_field_label: f.label,
              item_id: v.value.item_id,
              app_item_id: v.value.app_item_id,
              title: v.value.title,
              app_id: v.value.app?.app_id,
              app_name: v.value.app?.config?.name || v.value.app?.name,
              link: v.value.link,
            });
          }
        }
      }

      const incomingFlat: any[] = [];
      for (const group of incoming || []) {
        const appName = group.app?.config?.name || group.app?.name;
        const appId = group.app?.app_id;
        for (const ref of group.items || []) {
          incomingFlat.push({
            item_id: ref.item_id,
            app_item_id: ref.app_item_id,
            title: ref.title,
            app_id: appId,
            app_name: appName,
            link: ref.link,
          });
        }
      }

      return {
        success: true,
        data: {
          item_id: item.item_id,
          app_item_id: item.app_item_id,
          title: item.title,
          app_id: item.app?.app_id,
          app_name: item.app?.config?.name || item.app?.name,
          outgoing,
          incoming: incomingFlat,
          outgoing_count: outgoing.length,
          incoming_count: incomingFlat.length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get related items for ${itemId}:`, error.response?.data || error.message);
      throw new HttpException(
        {
          success: false,
          error: error.response?.data?.error_description || error.message,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get the full app schema — every field defined on the app, including empty ones.
   *
   * Item responses only include fields that have values, so clients should call
   * this endpoint first to understand the complete set of fields available.
   *
   * GET /api/podio/:appSlug/schema?slim=true
   *
   * When slim=true, the response is reduced to a compact list of
   * { external_id, field_id, label, type, status, required, options? }.
   */
  @Get(':appSlug/schema')
  @RequireAccess(ApiAccess.READ_ONLY)
  async getAppSchema(
    @Param('appSlug') appSlug: string,
    @Query('slim') slim?: string,
  ): Promise<any> {
    this.logger.log(`GET schema for app ${appSlug}`);

    this.validateAppSlug(appSlug);

    try {
      const schema = await this.podioService.getAppSchema(appSlug);
      return {
        success: true,
        data: slim === 'true' ? this.slimSchema(schema) : schema,
      };
    } catch (error) {
      this.logger.error(`Failed to get schema for ${appSlug}:`, error.response?.data || error.message);
      throw new HttpException(
        {
          success: false,
          error: error.response?.data?.error_description || error.message,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * List items in an app
   * GET /api/podio/:appSlug/items?limit=30&offset=0&sort_by=created_on&sort_desc=true&slim=true&fields=title,status
   */
  @Get(':appSlug/items')
  @RequireAccess(ApiAccess.READ_ONLY)
  async listItems(
    @Param('appSlug') appSlug: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sort_by') sortBy?: string,
    @Query('sort_desc') sortDesc?: string,
    @Query('slim') slim?: string,
    @Query('fields') fields?: string,
  ): Promise<any> {
    this.logger.log(`GET items from app ${appSlug}`);

    this.validateAppSlug(appSlug);

    try {
      const result = await this.podioService.getItems(appSlug, {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
        sortBy,
        sortDesc: sortDesc !== undefined ? sortDesc === 'true' : undefined,
      });

      return {
        success: true,
        data: this.transformResult(result, slim === 'true', fields),
      };
    } catch (error) {
      this.logger.error(`Failed to list items for ${appSlug}:`, error.response?.data || error.message);
      throw new HttpException(
        {
          success: false,
          error: error.response?.data?.error_description || error.message,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Filter items in an app
   * POST /api/podio/:appSlug/items/filter
   */
  @Post(':appSlug/items/filter')
  @RequireAccess(ApiAccess.READ_ONLY)
  async filterItems(
    @Param('appSlug') appSlug: string,
    @Body() body: {
      filters?: Record<string, any>;
      limit?: number;
      offset?: number;
      sort_by?: string;
      sort_desc?: boolean;
      slim?: boolean;
      fields?: string;
    },
  ): Promise<any> {
    this.logger.log(`POST filter items in app ${appSlug}`);

    this.validateAppSlug(appSlug);

    try {
      const result = await this.podioService.filterItems(
        appSlug,
        body.filters || {},
        {
          limit: body.limit,
          offset: body.offset,
          sortBy: body.sort_by,
          sortDesc: body.sort_desc,
        },
      );

      return {
        success: true,
        data: this.transformResult(result, body.slim, body.fields),
      };
    } catch (error) {
      this.logger.error(`Failed to filter items for ${appSlug}:`, error.response?.data || error.message);
      throw new HttpException(
        {
          success: false,
          error: error.response?.data?.error_description || error.message,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a new item in an app
   * POST /api/podio/:appSlug/items
   */
  @Post(':appSlug/items')
  @RequireAccess(ApiAccess.FULL_ACCESS)
  async createItem(
    @Param('appSlug') appSlug: string,
    @Body() body: CreateItemDto,
  ): Promise<any> {
    this.logger.log(`POST create item in app ${appSlug}`);

    this.validateAppSlug(appSlug);

    if (!body.fields || !Array.isArray(body.fields)) {
      throw new HttpException(
        {
          success: false,
          error: 'fields array is required',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.podioService.createItem(
        appSlug,
        body.fields,
        { hook: body.hook, silent: body.silent },
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to create item in ${appSlug}:`, error.response?.data || error.message);
      throw new HttpException(
        {
          success: false,
          error: error.response?.data?.error_description || error.message,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get full item details from Podio
   * GET /api/podio/:appSlug/items/:itemId
   */
  @Get(':appSlug/items/:itemId')
  @RequireAccess(ApiAccess.READ_ONLY)
  async getItem(
    @Param('appSlug') appSlug: string,
    @Param('itemId') itemId: string,
  ): Promise<any> {
    this.logger.log(`GET item ${itemId} from app ${appSlug}`);

    this.validateAppSlug(appSlug);

    try {
      const item = await this.podioService.getItem(appSlug, itemId);
      return {
        success: true,
        data: item,
      };
    } catch (error) {
      this.logger.error(`Failed to get item ${itemId}:`, error.response?.data || error.message);
      throw new HttpException(
        {
          success: false,
          error: error.response?.data?.error_description || error.message,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get item field values only (lighter response)
   * GET /api/podio/:appSlug/items/:itemId/values
   */
  @Get(':appSlug/items/:itemId/values')
  @RequireAccess(ApiAccess.READ_ONLY)
  async getItemValues(
    @Param('appSlug') appSlug: string,
    @Param('itemId') itemId: string,
  ): Promise<any> {
    this.logger.log(`GET item values for ${itemId} from app ${appSlug}`);

    this.validateAppSlug(appSlug);

    try {
      const values = await this.podioService.getItemValues(appSlug, itemId);
      return {
        success: true,
        data: values,
      };
    } catch (error) {
      this.logger.error(`Failed to get item values ${itemId}:`, error.response?.data || error.message);
      throw new HttpException(
        {
          success: false,
          error: error.response?.data?.error_description || error.message,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update an item with new field values
   * PUT /api/podio/:appSlug/items/:itemId
   */
  @Put(':appSlug/items/:itemId')
  @RequireAccess(ApiAccess.FULL_ACCESS)
  async updateItem(
    @Param('appSlug') appSlug: string,
    @Param('itemId') itemId: string,
    @Body() body: UpdateItemDto,
  ): Promise<any> {
    this.logger.log(`PUT update item ${itemId} in app ${appSlug}`);
    this.logger.debug('Update payload:', JSON.stringify(body, null, 2));

    this.validateAppSlug(appSlug);

    if (!body.fields || !Array.isArray(body.fields)) {
      throw new HttpException(
        {
          success: false,
          error: 'fields array is required',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.podioService.updateItem(
        appSlug,
        itemId,
        body.fields,
        { hook: body.hook, silent: body.silent },
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to update item ${itemId}:`, error.response?.data || error.message);
      throw new HttpException(
        {
          success: false,
          error: error.response?.data?.error_description || error.message,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update a single field on an item
   * PUT /api/podio/:appSlug/items/:itemId/fields/:fieldId
   */
  @Put(':appSlug/items/:itemId/fields/:fieldId')
  @RequireAccess(ApiAccess.FULL_ACCESS)
  async updateItemField(
    @Param('appSlug') appSlug: string,
    @Param('itemId') itemId: string,
    @Param('fieldId') fieldId: string,
    @Body() body: UpdateFieldDto,
  ): Promise<any> {
    this.logger.log(`PUT update field ${fieldId} on item ${itemId} in app ${appSlug}`);
    this.logger.debug('Update payload:', JSON.stringify(body, null, 2));

    this.validateAppSlug(appSlug);

    if (body.value === undefined) {
      throw new HttpException(
        {
          success: false,
          error: 'value is required',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.podioService.updateItemField(
        appSlug,
        itemId,
        fieldId,
        body.value,
        { hook: body.hook, silent: body.silent },
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to update field ${fieldId}:`, error.response?.data || error.message);
      throw new HttpException(
        {
          success: false,
          error: error.response?.data?.error_description || error.message,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get revision diff between two revisions
   * GET /api/podio/:appSlug/items/:itemId/revisions/:from/:to
   */
  @Get(':appSlug/items/:itemId/revisions/:from/:to')
  @RequireAccess(ApiAccess.READ_ONLY)
  async getRevisionDiff(
    @Param('appSlug') appSlug: string,
    @Param('itemId') itemId: string,
    @Param('from') from: string,
    @Param('to') to: string,
  ): Promise<any> {
    this.logger.log(`GET revision diff for item ${itemId}: ${from} -> ${to}`);

    this.validateAppSlug(appSlug);

    try {
      const diff = await this.podioService.getRevisionDiff(
        appSlug,
        itemId,
        parseInt(from, 10),
        parseInt(to, 10),
      );

      return {
        success: true,
        data: diff,
      };
    } catch (error) {
      this.logger.error(`Failed to get revision diff:`, error.response?.data || error.message);
      throw new HttpException(
        {
          success: false,
          error: error.response?.data?.error_description || error.message,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Add a comment to a Podio item
   * POST /api/podio/:appSlug/items/:itemId/comments
   */
  @Post(':appSlug/items/:itemId/comments')
  @RequireAccess(ApiAccess.FULL_ACCESS)
  async addComment(
    @Param('appSlug') appSlug: string,
    @Param('itemId') itemId: string,
    @Body() body: AddCommentDto,
  ): Promise<any> {
    this.logger.log(`POST comment on item ${itemId} in app ${appSlug}`);

    this.validateAppSlug(appSlug);

    if (!body.value || typeof body.value !== 'string') {
      throw new HttpException(
        {
          success: false,
          error: 'value (string) is required',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.podioService.addComment(
        appSlug,
        itemId,
        body.value,
        {
          hook: body.hook,
          silent: body.silent,
          alertInvite: body.alertInvite,
        },
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to add comment to item ${itemId}:`, error.response?.data || error.message);
      throw new HttpException(
        {
          success: false,
          error: error.response?.data?.error_description || error.message,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Reduce an app schema response to just the field list metadata.
   * Keeps category options (since they're small and useful for writes) but
   * drops description/default_value/mapping/etc.
   */
  private slimSchema(schema: any): any {
    const fields = (schema.fields || []).map((f: any) => ({
      external_id: f.external_id,
      field_id: f.field_id,
      label: f.label,
      type: f.type,
      status: f.status,
      required: f.config?.required ?? false,
      ...(f.config?.settings?.options
        ? { options: f.config.settings.options.map((o: any) => ({ id: o.id, text: o.text, status: o.status })) }
        : {}),
    }));

    return {
      app_id: schema.app_id,
      name: schema.config?.name,
      item_name: schema.config?.item_name,
      status: schema.status,
      field_count: fields.length,
      fields,
    };
  }

  /**
   * Strip bloat from a Podio item for lighter responses.
   * - Removes field configs, avatar images, created_via, etc.
   * - Optionally filters to specific fields by external_id.
   */
  private slimItem(item: any, fieldFilter?: string[]): any {
    const fields = (item.fields || [])
      .filter((f: any) => !fieldFilter || fieldFilter.includes(f.external_id))
      .map((f: any) => ({
        external_id: f.external_id,
        label: f.label,
        type: f.type,
        values: f.values,
      }));

    return {
      item_id: item.item_id,
      app_item_id: item.app_item_id,
      title: item.title,
      created_on: item.created_on,
      last_event_on: item.last_event_on,
      link: item.link,
      fields,
    };
  }

  /**
   * Apply slim/fields transforms to a list/filter response.
   */
  private transformResult(result: any, slim?: boolean, fields?: string): any {
    if (!slim && !fields) return result;

    const fieldFilter = fields
      ? fields.split(',').map((f) => f.trim())
      : undefined;

    return {
      ...result,
      items: (result.items || []).map((item: any) =>
        this.slimItem(item, fieldFilter),
      ),
    };
  }

  /**
   * Validate that the app slug is configured
   */
  private validateAppSlug(appSlug: string): void {
    const appConfig = this.podioService.getAppConfig(appSlug);
    if (!appConfig) {
      throw new HttpException(
        {
          success: false,
          error: `Unknown app: ${appSlug}. Valid apps: ${this.podioService.getAllApps().map(a => a.slug).join(', ')}`,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
