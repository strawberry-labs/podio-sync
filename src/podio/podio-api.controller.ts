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
   * List items in an app
   * GET /api/podio/:appSlug/items?limit=30&offset=0&sort_by=created_on&sort_desc=true
   */
  @Get(':appSlug/items')
  @RequireAccess(ApiAccess.READ_ONLY)
  async listItems(
    @Param('appSlug') appSlug: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sort_by') sortBy?: string,
    @Query('sort_desc') sortDesc?: string,
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
        data: result,
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
        data: result,
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
