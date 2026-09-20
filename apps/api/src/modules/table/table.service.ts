import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../core/database.service';

export interface TableDto {
  id: string;
  floorId: string;
  floorName: string;
  tableNumber: string;
  capacity: number;
  status: 'FREE' | 'BUSY' | 'RESERVED' | 'BILLED';
  currentOrderId?: string;
  version: number;
}

@Injectable()
export class TableService {
  constructor(private readonly db: DatabaseService) {}

  private demoTables: TableDto[] = [
    { id: 'tab-1', floorId: 'fl-1', floorName: 'Main Dining Floor', tableNumber: 'T01', capacity: 2, status: 'FREE', version: 1 },
    { id: 'tab-2', floorId: 'fl-1', floorName: 'Main Dining Floor', tableNumber: 'T02', capacity: 4, status: 'BUSY', currentOrderId: '018e6a12-70b1-7a8f-8f81-cb7f017830b1', version: 2 },
    { id: 'tab-3', floorId: 'fl-1', floorName: 'Main Dining Floor', tableNumber: 'T03', capacity: 4, status: 'FREE', version: 1 },
    { id: 'tab-4', floorId: 'fl-1', floorName: 'Main Dining Floor', tableNumber: 'T04', capacity: 6, status: 'RESERVED', version: 1 },
    { id: 'tab-5', floorId: 'fl-1', floorName: 'Main Dining Floor', tableNumber: 'T05', capacity: 8, status: 'BILLED', version: 3 },
    { id: 'tab-6', floorId: 'fl-2', floorName: 'Rooftop Lounge', tableNumber: 'R01', capacity: 4, status: 'FREE', version: 1 },
    { id: 'tab-7', floorId: 'fl-2', floorName: 'Rooftop Lounge', tableNumber: 'R02', capacity: 4, status: 'BUSY', version: 1 },
    { id: 'tab-8', floorId: 'fl-2', floorName: 'Rooftop Lounge', tableNumber: 'R03', capacity: 2, status: 'FREE', version: 1 },
  ];

  async getTables(tenantId: string, branchId?: string): Promise<TableDto[]> {
    try {
      if (this.db.restaurantTable) {
        const tables = await this.db.restaurantTable.findMany({
          where: {
            tenantId,
            ...(branchId ? { branchId } : {}),
          },
          include: { floor: true },
          orderBy: { tableNumber: 'asc' },
        });

        if (tables.length > 0) {
          return tables.map((t: any) => ({
            id: t.id,
            floorId: t.floorId,
            floorName: t.floor.name,
            tableNumber: t.tableNumber,
            capacity: t.capacity,
            status: t.status as TableDto['status'],
            currentOrderId: t.currentOrderId ?? undefined,
            version: t.version,
          }));
        }
      }
    } catch {
      // Fallback
    }

    return this.demoTables;
  }

  async updateStatus(
    tableId: string,
    status: TableDto['status'],
    orderId?: string,
  ): Promise<TableDto> {
    const table = this.demoTables.find((t) => t.id === tableId);
    if (!table) {
      throw new NotFoundException(`Table with ID ${tableId} not found`);
    }

    table.status = status;
    table.currentOrderId = status === 'FREE' ? undefined : (orderId ?? table.currentOrderId);
    table.version += 1;

    return table;
  }
}
