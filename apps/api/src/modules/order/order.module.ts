import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { DatabaseService } from '../../core/database.service';

@Module({
  controllers: [OrderController],
  providers: [OrderService, DatabaseService],
  exports: [OrderService],
})
export class OrderModule {}
