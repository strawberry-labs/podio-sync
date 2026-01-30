import { Module } from '@nestjs/common';
import { PodioService } from './podio.service';
import { PodioApiController } from './podio-api.controller';

@Module({
  controllers: [PodioApiController],
  providers: [PodioService],
  exports: [PodioService],
})
export class PodioModule {}
