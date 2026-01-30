import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  logger.log(`Server running on http://localhost:${port}`);
  logger.log(`Webhook endpoints:`);
  logger.log(`  - POST /webhook/camp-sales`);
  logger.log(`  - POST /webhook/ia-sales`);
  logger.log(`  - POST /webhook/overseas-camp-sales`);
  logger.log(`  - POST /webhook/opportunities`);
}
bootstrap();
