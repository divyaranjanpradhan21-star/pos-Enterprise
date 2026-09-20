import { Controller, Get, Post, Param, Body, Query, Req, UseInterceptors } from '@nestjs/common';
import { BillingService, SettleBillDto, IssuedInvoiceDto } from './billing.service';
import { IdempotencyInterceptor } from '../../core/idempotency.interceptor';
import { Request } from 'express';

@Controller('api/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('order/:orderId/preview')
  async previewBill(@Param('orderId') orderId: string) {
    return this.billingService.previewBill(orderId);
  }

  @Get('split-preview')
  async previewSplit(
    @Query('totalAmount') totalAmount: string,
    @Query('numGuests') numGuests: string,
  ) {
    return this.billingService.previewSplit(totalAmount, parseInt(numGuests || '2', 10));
  }

  @Post('settle')
  @UseInterceptors(IdempotencyInterceptor)
  async settleBill(@Body() dto: SettleBillDto, @Req() req: Request): Promise<IssuedInvoiceDto> {
    const tenantId = req.tenantId ?? '018e6a12-0000-7000-8000-tenant000001';
    const branchId = req.user?.branchId ?? '018e6a12-0000-7000-8000-branch000001';
    const userId = req.user?.userId;

    return this.billingService.settleAndIssueInvoice(tenantId, branchId, dto, userId);
  }
}
