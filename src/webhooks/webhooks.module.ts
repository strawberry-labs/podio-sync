import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { PodioModule } from '../podio/podio.module';
import { BasecampModule } from '../basecamp/basecamp.module';

@Module({
  imports: [PodioModule, BasecampModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
