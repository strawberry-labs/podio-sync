import { Module } from '@nestjs/common';
import { BasecampService } from './basecamp.service';

@Module({
  providers: [BasecampService],
  exports: [BasecampService],
})
export class BasecampModule {}
