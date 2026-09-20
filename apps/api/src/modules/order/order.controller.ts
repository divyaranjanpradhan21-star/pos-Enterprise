import { Controller, Get, Post, Param, Body, Req, UseInterceptors } from '@nestjs/common';
import { OrderService, CreateOrderDto, StoredOrder } from './order.service';
import { IdempotencyInterceptor } from '../../core/idempotency.interceptor';
import { Request } from 'express';

@Controller('api/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  async listOrders(@Req() req: Request): Promise<StoredOrder[]> {
    const tenantId = req.tenantId ?? '018e6a12-0000-7000-8000-tenant000001';
    return this.orderService.listActiveOrders(tenantId);
  }

  @Get(':id')
  async getOrder(@Param('id') id: string): Promise<StoredOrder> {
    return this.orderService.getOrder(id);
  }

  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  async createOrder(@Body() dto: CreateOrderDto, @Req() req: Request): Promise<StoredOrder> {
    const tenantId = req.tenantId ?? '018e6a12-0000-7000-8000-tenant000001';
    const branchId = req.user?.branchId ?? '018e6a12-0000-7000-8000-branch000001';
    const userId = req.user?.userId;

    return this.orderService.createOrder(tenantId, branchId, dto, userId);
  }

  @Post(':id/send-to-kitchen')
  @UseInterceptors(IdempotencyInterceptor)
  async sendToKitchen(@Param('id') id: string, @Req() req: Request) {
    return this.orderService.sendToKitchen(id, req.user?.userId);
  }
}
