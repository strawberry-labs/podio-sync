import { Controller, Post, Body, Param, Logger, HttpCode } from '@nestjs/common';
import { PodioService } from '../podio/podio.service';
import { BasecampService, FieldChange } from '../basecamp/basecamp.service';

interface WebhookPayload {
  type: string;
  hook_id?: string;
  code?: string;
  item_id?: string;
  item_revision_id?: string;
  external_id?: string;
}

@Controller('webhook')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly podioService: PodioService,
    private readonly basecampService: BasecampService,
  ) {}

  @Post(':appSlug')
  @HttpCode(200)
  async handleWebhook(
    @Param('appSlug') appSlug: string,
    @Body() payload: WebhookPayload,
  ): Promise<string> {
    this.logger.log(`\n========== WEBHOOK RECEIVED ==========`);
    this.logger.log(`App: ${appSlug}`);
    this.logger.log(`Type: ${payload.type}`);
    this.logger.log(`Payload: ${JSON.stringify(payload, null, 2)}`);
    this.logger.log(`=======================================\n`);

    const appConfig = this.podioService.getAppConfig(appSlug);

    if (!appConfig) {
      this.logger.warn(`Unknown app slug: ${appSlug}`);
      return 'OK';
    }

    switch (payload.type) {
      case 'hook.verify':
        await this.handleVerification(appSlug, payload);
        break;

      case 'item.update':
        await this.handleItemUpdate(appSlug, payload, appConfig.monitoredFields);
        break;

      case 'item.create':
        this.logger.log(`New item created: ${payload.item_id}`);
        break;

      case 'item.delete':
        this.logger.log(`Item deleted: ${payload.item_id}`);
        break;

      default:
        this.logger.log(`Unhandled webhook type: ${payload.type}`);
    }

    return 'OK';
  }

  private async handleVerification(appSlug: string, payload: WebhookPayload): Promise<void> {
    if (!payload.hook_id || !payload.code) {
      this.logger.error('Missing hook_id or code for verification');
      return;
    }

    try {
      await this.podioService.verifyWebhook(appSlug, payload.hook_id, payload.code);
      this.logger.log(`Webhook verified successfully for ${appSlug}`);
    } catch (error) {
      this.logger.error(`Webhook verification failed: ${error.message}`);
    }
  }

  private async handleItemUpdate(
    appSlug: string,
    payload: WebhookPayload,
    monitoredFields: string[],
  ): Promise<void> {
    if (!payload.item_id || !payload.item_revision_id) {
      this.logger.error('Missing item_id or item_revision_id');
      return;
    }

    const currentRevision = parseInt(payload.item_revision_id, 10);
    const previousRevision = currentRevision - 1;

    if (previousRevision < 1) {
      this.logger.log('First revision, skipping diff check');
      return;
    }

    try {
      // Get revision diff to see what changed
      const diff = await this.podioService.getRevisionDiff(
        appSlug,
        payload.item_id,
        previousRevision,
        currentRevision,
      );

      this.logger.log(`Revision diff for item ${payload.item_id}:`);
      this.logger.log(JSON.stringify(diff, null, 2));

      // Check for monitored field changes
      const monitoredChanges: FieldChange[] = [];

      for (const fieldDiff of diff) {
        const externalId = fieldDiff.external_id?.toLowerCase();

        // Check if this is a monitored field
        if (monitoredFields.includes(externalId)) {
          monitoredChanges.push({
            fieldId: fieldDiff.field_id,
            externalId: externalId,
            label: fieldDiff.label,
            type: fieldDiff.type,
            from: fieldDiff.from,
            to: fieldDiff.to,
          });
        }
      }

      // Notify Basecamp of monitored field changes
      if (monitoredChanges.length > 0) {
        this.logger.log(`>>> MONITORED FIELD CHANGES DETECTED:`);
        for (const change of monitoredChanges) {
          this.logger.log(`  - ${change.label}: ${JSON.stringify(change.from)} -> ${JSON.stringify(change.to)}`);
        }

        await this.basecampService.notifyFieldChanges(
          payload.item_id,
          appSlug,
          monitoredChanges,
          currentRevision,
        );
      } else {
        this.logger.log('No monitored field changes detected');
      }
    } catch (error) {
      this.logger.error(`Failed to process item update: ${error.message}`);
    }
  }
}
