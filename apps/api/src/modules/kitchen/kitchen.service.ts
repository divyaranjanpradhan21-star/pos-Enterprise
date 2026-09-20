import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';

export interface KitchenTicketDto {
  id: string;
  tenantId?: string;
  orderId: string;
  kotNumber: string;
  tableNumber?: string;
  orderType: string;
  status: 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED';
  station: string;
  items: {
    name: string;
    quantity: number;
    notes?: string;
  }[];
  elapsedMinutes: number;
  createdAt: string;
}

@Injectable()
export class KitchenService {
  constructor(private readonly audit: AuditService) {}

  private demoTickets: KitchenTicketDto[] = [
    {
      id: 'kds-101',
      tenantId: '018e6a12-0000-7000-8000-tenant000001',
      orderId: '018e6a12-70b1-7a8f-8f81-cb7f017830b1',
      kotNumber: 'KOT-1402-A9F1',
      tableNumber: 'T02',
      orderType: 'DINE_IN',
      status: 'PREPARING',
      station: 'KITCHEN',
      items: [
        { name: 'Chicken Pepperoni Pizza (Medium)', quantity: 1, notes: 'Extra crispy crust' },
        { name: 'Peri Peri French Fries', quantity: 2 },
      ],
      elapsedMinutes: 8,
      createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    },
    {
      id: 'kds-102',
      tenantId: '018e6a12-0000-7000-8000-tenant000001',
      orderId: '018e6a12-70b1-7a8f-8f81-cb7f017830b2',
      kotNumber: 'KOT-1405-C3D2',
      tableNumber: 'T05',
      orderType: 'DINE_IN',
      status: 'ACCEPTED',
      station: 'KITCHEN',
      items: [
        { name: 'Classic Chicken Burger', quantity: 2, notes: 'No pickles' },
        { name: 'Molten Lava Cake', quantity: 1 },
      ],
      elapsedMinutes: 4,
      createdAt: new Date(Date.now() - 4 * 60000).toISOString(),
    },
  ];

  async getActiveQueue(tenantId: string, station?: string): Promise<KitchenTicketDto[]> {
    return this.demoTickets.filter(
      (t) =>
        t.status !== 'SERVED' &&
        (!t.tenantId || t.tenantId === tenantId) &&
        (!station || t.station === station),
    );
  }

  async updateTicketStatus(
    ticketId: string,
    status: KitchenTicketDto['status'],
    userId?: string,
  ): Promise<KitchenTicketDto> {
    const ticket = this.demoTickets.find((t) => t.id === ticketId);
    if (!ticket) {
      throw new NotFoundException(`Kitchen ticket with ID ${ticketId} not found`);
    }

    const oldStatus = ticket.status;
    ticket.status = status;

    await this.audit.log({
      tenantId: ticket.tenantId || '018e6a12-0000-7000-8000-tenant000001',
      userId,
      action: 'KDS_STATUS_CHANGED',
      resourceType: 'KOT',
      resourceId: ticket.kotNumber,
      oldValues: { status: oldStatus },
      newValues: { status },
    });

    return ticket;
  }
}
