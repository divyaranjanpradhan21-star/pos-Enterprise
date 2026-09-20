import { Module } from '@nestjs/common';
import { KitchenService } from './kitchen.service';
import { KitchenController } from './kitchen.controller';
import { DatabaseService } from '../../core/database.service';

@Module({
  controllers: [KitchenController],
  providers: [KitchenService, DatabaseService],
  exports: [KitchenService],
})
export class KitchenModule {}
