import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { getPodioConfig } from './config/podio-apps.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  logger.log(`Server running on http://localhost:${port}`);

  const config = getPodioConfig();
  const configuredApps = config.apps.filter(a => a.appId && a.appToken);
  const missingApps = config.apps.filter(a => !a.appId || !a.appToken);

  logger.log(`Configured apps (${configuredApps.length}):`);
  for (const app of configuredApps) {
    logger.log(`  - ${app.name} (POST /webhook/${app.slug})`);
  }

  if (missingApps.length > 0) {
    logger.warn(`Apps missing credentials (${missingApps.length}):`);
    for (const app of missingApps) {
      const envPrefix = `PODIO_APP_${app.slug.toUpperCase().replace(/-/g, '_')}`;
      logger.warn(`  - ${app.name}: set ${envPrefix}_ID and ${envPrefix}_TOKEN`);
    }
  }
}
bootstrap();
