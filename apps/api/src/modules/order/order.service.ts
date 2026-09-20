import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { BillingEngine, OrderCalculationInput, OrderCalculationSnapshot } from '@pos/domain';
import { uuidv7 } from '../../core/uuid';

export interface CreateOrderDto {
  id?: string; // Client-generated UUIDv7 if created offline
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'ONLINE';
  tableId?: string;
  items: {
    lineId?: string;
    menuItemId: string;
    name: string;
    basePrice: string;
    variantId?: string;
    variantName?: string;
    variantPriceDelta?: string;
    modifiers?: { id: string; name: string; price: string }[];
    quantity: number;
    taxRatePercent: number;
    isTaxInclusive: boolean;
    notes?: string;
  }[];
  orderDiscount?: {
    type: 'PERCENTAGE' | 'FIXED';
    value: number | string;
    maxDiscountCap?: string;
  };
  serviceChargePercent?: number;
  tipAmount?: string;
  roundOffEnabled?: boolean;
}

export interface StoredOrder {
  id: string;
  tenantId: string;
  branchId: string;
  orderType: string;
  tableId?: string;
  status: string;
  calculation: OrderCalculationSnapshot;
  version: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class OrderService {
  constructor(private readonly audit: AuditService) {}

  // In-memory store for fallback/fast mock execution
  private static readonly ordersStore = new Map<string, StoredOrder>();

  async createOrder(
    tenantId: string,
    branchId: string,
    dto: CreateOrderDto,
    userId?: string,
  ): Promise<StoredOrder> {
    const orderId = dto.id || uuidv7();

    // Prepare domain calculation input
    const calcInput: OrderCalculationInput = {
      items: dto.items.map((item, idx) => ({
        lineId: item.lineId || `line-${idx + 1}`,
        menuItemId: item.menuItemId,
        name: item.name,
        basePrice: item.basePrice,
        variantPriceDelta: item.variantPriceDelta,
        modifiers: item.modifiers,
        quantity: item.quantity,
        taxRatePercent: item.taxRatePercent,
        isTaxInclusive: item.isTaxInclusive,
      })),
      orderDiscount: dto.orderDiscount,
      serviceChargePercent: dto.serviceChargePercent,
      tipAmount: dto.tipAmount,
      roundOffEnabled: dto.roundOffEnabled,
    };

    // Calculate exact totals using @pos/domain
    const calculation = BillingEngine.calculateOrder(calcInput);

    const storedOrder: StoredOrder = {
      id: orderId,
      tenantId,
      branchId,
      orderType: dto.orderType,
      tableId: dto.tableId,
      status: 'PLACED',
      calculation,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Persist in memory store
    OrderService.ordersStore.set(orderId, storedOrder);

    // Audit order creation
    await this.audit.log({
      tenantId,
      branchId,
      userId,
      action: 'ORDER_CREATED',
      resourceType: 'ORDER',
      resourceId: orderId,
      newValues: {
        totalAmount: calculation.finalTotal,
        orderType: dto.orderType,
        itemsCount: dto.items.length,
      },
    });

    return storedOrder;
  }

  async getOrder(orderId: string): Promise<StoredOrder> {
    const order = OrderService.ordersStore.get(orderId);
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }
    return order;
  }

  async listActiveOrders(tenantId: string): Promise<StoredOrder[]> {
    return Array.from(OrderService.ordersStore.values()).filter(
      (o) => o.tenantId === tenantId && o.status !== 'CLOSED' && o.status !== 'CANCELLED',
    );
  }

  async sendToKitchen(orderId: string, userId?: string): Promise<{ kotNumber: string; status: string }> {
    const order = await this.getOrder(orderId);
    order.status = 'KITCHEN_ACCEPTED';
    order.version += 1;
    order.updatedAt = new Date().toISOString();

    const kotNumber = `KOT-${new Date().getHours()}${new Date().getMinutes()}-${orderId.slice(0, 4).toUpperCase()}`;

    await this.audit.log({
      tenantId: order.tenantId,
      branchId: order.branchId,
      userId,
      action: 'ORDER_SENT_TO_KITCHEN',
      resourceType: 'KOT',
      resourceId: kotNumber,
    });

    return { kotNumber, status: order.status };
  }
}
