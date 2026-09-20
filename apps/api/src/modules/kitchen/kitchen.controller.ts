import { Controller, Get, Patch, Param, Body, Query, Req } from '@nestjs/common';
import { KitchenService, KitchenTicketDto } from './kitchen.service';
import { Request } from 'express';

@Controller('api/kitchen')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get('queue')
  async getQueue(
    @Req() req: Request,
    @Query('station') station?: string,
  ): Promise<KitchenTicketDto[]> {
    const tenantId = req.tenantId ?? '018e6a12-0000-7000-8000-tenant000001';
    return this.kitchenService.getActiveQueue(tenantId, station);
  }

  @Patch('tickets/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: KitchenTicketDto['status'],
    @Req() req: Request,
  ): Promise<KitchenTicketDto> {
    return this.kitchenService.updateTicketStatus(id, status, req.user?.userId);
  }
}
