import { Controller, Get } from '@nestjs/common';
import { PodioService } from './podio/podio.service';

@Controller()
export class AppController {
  constructor(private readonly podioService: PodioService) {}

  @Get()
  getStatus() {
    const apps = this.podioService.getAllApps();
    return {
      status: 'running',
      service: 'podio-sync',
      webhookEndpoints: apps.map(app => ({
        name: app.name,
        endpoint: `/webhook/${app.slug}`,
        monitoredFields: app.monitoredFields,
      })),
    };
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
