import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  Logger,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { PodioService } from './podio.service';
import { ApiKeyGuard } from '../common/guards';

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

/**
 * REST API endpoints for Basecamp to interact with Podio
 * These endpoints abstract the Podio API and handle authentication internally
 * Protected by API key authentication
 */
@Controller('api/podio')
@UseGuards(ApiKeyGuard)
export class PodioApiController {
  private readonly logger = new Logger(PodioApiController.name);

  constructor(private readonly podioService: PodioService) {}

  /**
   * Get full item details from Podio
   * GET /api/podio/:appSlug/items/:itemId
   */
  @Get(':appSlug/items/:itemId')
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
   *
   * Body: {
   *   fields: [
   *     { "external_id": "field-name", "values": [{ "value": "new value" }] },
   *     ...
   *   ],
   *   hook: true,   // optional, default true - trigger Podio webhooks
   *   silent: false // optional, default false - don't bump in stream
   * }
   */
  @Put(':appSlug/items/:itemId')
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
   *
   * Body: {
   *   value: [{ "value": "new value" }] or "simple value" depending on field type,
   *   hook: true,   // optional
   *   silent: false // optional
   * }
   */
  @Put(':appSlug/items/:itemId/fields/:fieldId')
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
