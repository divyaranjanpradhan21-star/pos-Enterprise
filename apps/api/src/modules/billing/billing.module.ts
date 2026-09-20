import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { OrderModule } from '../order/order.module';
import { TableModule } from '../table/table.module';
import { DatabaseService } from '../../core/database.service';

@Module({
  imports: [OrderModule, TableModule],
  controllers: [BillingController],
  providers: [BillingService, DatabaseService],
  exports: [BillingService],
})
export class BillingModule {}
