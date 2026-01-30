import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { PodioModule } from './podio/podio.module';
import { BasecampModule } from './basecamp/basecamp.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PodioModule,
    BasecampModule,
    WebhooksModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
