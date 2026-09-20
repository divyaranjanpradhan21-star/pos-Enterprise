import { Controller, Get, Patch, Param, Body, Req } from '@nestjs/common';
import { TableService, TableDto } from './table.service';
import { Request } from 'express';

@Controller('api/tables')
export class TableController {
  constructor(private readonly tableService: TableService) {}

  @Get()
  async getTables(@Req() req: Request): Promise<TableDto[]> {
    const tenantId = req.tenantId ?? '018e6a12-0000-7000-8000-tenant000001';
    return this.tableService.getTables(tenantId, req.user?.branchId);
  }

  @Patch(':id/status')
  async updateTableStatus(
    @Param('id') id: string,
    @Body('status') status: TableDto['status'],
    @Body('orderId') orderId?: string,
  ): Promise<TableDto> {
    return this.tableService.updateStatus(id, status, orderId);
  }
}
