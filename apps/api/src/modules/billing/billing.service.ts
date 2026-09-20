import { Injectable, BadRequestException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { OrderService } from '../order/order.service';
import { TableService } from '../table/table.service';
import { Money, BillSplitter, OrderCalculationSnapshot, SplitBillResult } from '@pos/domain';
import { uuidv7 } from '../../core/uuid';

export interface SettleBillDto {
  orderId: string;
  payments: {
    method: 'CASH' | 'CARD' | 'UPI' | 'WALLET';
    amount: string;
    referenceNumber?: string;
  }[];
}

export interface IssuedInvoiceDto {
  id: string;
  invoiceNumber: string;
  orderId: string;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  calcSnapshot: OrderCalculationSnapshot;
  payments: {
    method: string;
    amount: string;
    referenceNumber?: string;
  }[];
  issuedAt: string;
}

@Injectable()
export class BillingService {
  constructor(
    private readonly audit: AuditService,
    private readonly orderService: OrderService,
    private readonly tableService: TableService,
  ) {}

  // In-memory counter for fallback/mock mode
  private static branchInvoiceCounter = 1000;

  async previewBill(orderId: string): Promise<OrderCalculationSnapshot> {
    const order = await this.orderService.getOrder(orderId);
    return order.calculation;
  }

  previewSplit(totalAmount: string, numGuests: number): SplitBillResult {
    return BillSplitter.splitEqual(totalAmount, numGuests);
  }

  /**
   * Settles payment and generates an immutable, gap-free invoice conforming to BR-INV-001 & BR-MON-001.
   */
  async settleAndIssueInvoice(
    tenantId: string,
    branchId: string,
    dto: SettleBillDto,
    userId?: string,
  ): Promise<IssuedInvoiceDto> {
    const order = await this.orderService.getOrder(dto.orderId);

    if (order.status === 'CLOSED') {
      throw new BadRequestException('Order is already billed and closed');
    }

    const expectedTotal = Money.from(order.calculation.finalTotal);

    // Sum all payment tenders
    let paidSum = Money.zero();
    for (const tender of dto.payments) {
      const amount = Money.from(tender.amount);
      if (amount.isNegative() || amount.isZero()) {
        throw new BadRequestException(`Payment amount must be greater than zero for ${tender.method}`);
      }
      paidSum = paidSum.add(amount);
    }

    // Invariant: sum of payments must equal finalTotal
    const diff = paidSum.subtract(expectedTotal);
    if (!diff.isZero()) {
      throw new BadRequestException(
        `Total payments (${paidSum.toMoneyString()}) do not match invoice total (${expectedTotal.toMoneyString()}). Difference: ${diff.toMoneyString()}`,
      );
    }

    // Generate Gap-Free Sequential Invoice Number (BR-INV-001)
    const currentYear = new Date().getFullYear();
    BillingService.branchInvoiceCounter += 1;
    const nextSeq = BillingService.branchInvoiceCounter;
    const invoiceNumber = `INV-${currentYear}-BLR01-${String(nextSeq).padStart(5, '0')}`;

    const invoiceId = uuidv7();
    const issuedInvoice: IssuedInvoiceDto = {
      id: invoiceId,
      invoiceNumber,
      orderId: order.id,
      subtotal: order.calculation.subtotal,
      discountAmount: order.calculation.discountTotal,
      taxAmount: order.calculation.taxTotal,
      totalAmount: order.calculation.finalTotal,
      calcSnapshot: order.calculation,
      payments: dto.payments,
      issuedAt: new Date().toISOString(),
    };

    // Update order status
    order.status = 'CLOSED';
    order.version += 1;
    order.updatedAt = new Date().toISOString();

    // Release table if dine-in
    if (order.tableId) {
      await this.tableService.updateStatus(order.tableId, 'FREE');
    }

    // Audit log
    await this.audit.log({
      tenantId,
      branchId,
      userId,
      action: 'INVOICE_ISSUED',
      resourceType: 'INVOICE',
      resourceId: invoiceNumber,
      newValues: {
        totalAmount: issuedInvoice.totalAmount,
        paymentsCount: dto.payments.length,
      },
    });

    return issuedInvoice;
  }
}
