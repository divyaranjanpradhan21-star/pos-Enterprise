import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ProblemDetailsFilter } from './core/problem-details.filter';
import { TenantAuthGuard } from './core/tenant.guard';
import { DatabaseService } from './core/database.service';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { MenuModule } from './modules/menu/menu.module';
import { TableModule } from './modules/table/table.module';
import { OrderModule } from './modules/order/order.module';
import { KitchenModule } from './modules/kitchen/kitchen.module';
import { BillingModule } from './modules/billing/billing.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    AuditModule,
    AuthModule,
    MenuModule,
    TableModule,
    OrderModule,
    KitchenModule,
    BillingModule,
  ],
  controllers: [HealthController],
  providers: [
    DatabaseService,
    {
      provide: APP_FILTER,
      useClass: ProblemDetailsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: TenantAuthGuard,
    },
  ],
})
export class AppModule {}
