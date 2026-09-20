import Decimal from 'decimal.js';
import { Money } from './money';
import { TaxEngine } from './tax';
import {
  CalculatedOrderItem,
  OrderCalculationInput,
  OrderCalculationSnapshot,
  TaxSummaryLine,
} from './types';

export class BillingEngine {
  /**
   * Pure order calculation algorithm creating an immutable calc_snapshot conforming to BR-MON-001.
   */
  public static calculateOrder(input: OrderCalculationInput): OrderCalculationSnapshot {
    let rawSubtotal = Money.zero();
    let itemDiscountsTotal = Money.zero();
    let taxTotal = Money.zero();
    const calculatedItems: CalculatedOrderItem[] = [];
    const taxRecords: { name: string; ratePercent: number; taxableAmount: Money; taxAmount: Money }[] = [];

    for (const item of input.items) {
      if (item.quantity <= 0) {
        throw new Error(`Item ${item.name} quantity must be greater than 0`);
      }

      // Unit Base Price
      let unitPrice = Money.from(item.basePrice);

      // Add variant price delta
      if (item.variantPriceDelta) {
        unitPrice = unitPrice.add(item.variantPriceDelta);
      }

      // Add modifier costs
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          unitPrice = unitPrice.add(mod.price);
        }
      }

      // Line Subtotal (Unit Price * Quantity)
      const lineGrossBeforeDiscount = unitPrice.multiply(item.quantity).roundToCurrency();
      rawSubtotal = rawSubtotal.add(lineGrossBeforeDiscount);

      // Item level discount
      let itemDiscountMoney = Money.zero();
      if (item.itemDiscountPercent && item.itemDiscountPercent > 0) {
        const discRate = new Decimal(item.itemDiscountPercent).dividedBy(100);
        itemDiscountMoney = Money.from(
          lineGrossBeforeDiscount.toDecimal().times(discRate),
        ).roundToCurrency();
        itemDiscountsTotal = itemDiscountsTotal.add(itemDiscountMoney);
      }

      const lineAmountAfterItemDiscount = lineGrossBeforeDiscount.subtract(itemDiscountMoney);

      // Tax calculation for the line
      const taxDetail = TaxEngine.calculateLineTax(
        lineAmountAfterItemDiscount,
        item.taxRatePercent,
        item.isTaxInclusive,
      );

      taxTotal = taxTotal.add(taxDetail.taxAmount);

      taxRecords.push({
        name: item.isTaxInclusive ? 'GST/VAT (Inc)' : 'GST/VAT (Exc)',
        ratePercent: item.taxRatePercent,
        taxableAmount: taxDetail.netAmount,
        taxAmount: taxDetail.taxAmount,
      });

      calculatedItems.push({
        lineId: item.lineId,
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        unitNetPrice: taxDetail.netAmount.divide(item.quantity).toMoneyString(),
        unitGrossPrice: unitPrice.toMoneyString(),
        lineNetSubtotal: lineGrossBeforeDiscount.toMoneyString(),
        lineDiscountAmount: itemDiscountMoney.toMoneyString(),
        lineTaxableAmount: taxDetail.netAmount.toMoneyString(),
        lineTaxAmount: taxDetail.taxAmount.toMoneyString(),
        lineTotal: taxDetail.grossAmount.toMoneyString(),
      });
    }

    // Order-Level Discount
    let orderDiscountMoney = Money.zero();
    if (input.orderDiscount) {
      if (input.orderDiscount.type === 'PERCENTAGE') {
        const pct = new Decimal(input.orderDiscount.value).dividedBy(100);
        let calcDisc = Money.from(rawSubtotal.toDecimal().times(pct)).roundToCurrency();
        if (input.orderDiscount.maxDiscountCap) {
          const cap = Money.from(input.orderDiscount.maxDiscountCap);
          if (calcDisc.greaterThan(cap)) {
            calcDisc = cap;
          }
        }
        orderDiscountMoney = calcDisc;
      } else if (input.orderDiscount.type === 'FIXED') {
        let fixedDisc = Money.from(input.orderDiscount.value).roundToCurrency();
        if (fixedDisc.greaterThan(rawSubtotal)) {
          fixedDisc = rawSubtotal;
        }
        orderDiscountMoney = fixedDisc;
      }
    }

    const totalDiscounts = itemDiscountsTotal.add(orderDiscountMoney);
    const subtotalAfterDiscounts = rawSubtotal.subtract(totalDiscounts);

    // Service Charge Calculation (e.g. 5% on subtotal after discount)
    let serviceChargeMoney = Money.zero();
    if (input.serviceChargePercent && input.serviceChargePercent > 0) {
      const scRate = new Decimal(input.serviceChargePercent).dividedBy(100);
      serviceChargeMoney = Money.from(
        subtotalAfterDiscounts.toDecimal().times(scRate),
      ).roundToCurrency();
    }

    // Tips
    const tipMoney = input.tipAmount ? Money.from(input.tipAmount).roundToCurrency() : Money.zero();

    // Tax Breakdown
    const taxBreakdown: TaxSummaryLine[] = TaxEngine.aggregateTaxBreakdown(taxRecords);

    // Preliminary Total
    // Gross Total = (Subtotal - Total Discounts) + Tax (if exclusive) + Service Charge + Tip
    // If tax is inclusive, tax is already part of subtotalAfterDiscounts.
    // Calculate sum of exclusive taxes
    let exclusiveTaxTotal = Money.zero();
    input.items.forEach((item, index) => {
      if (!item.isTaxInclusive) {
        const itemTax = Money.from(calculatedItems[index]?.lineTaxAmount ?? '0.00');
        exclusiveTaxTotal = exclusiveTaxTotal.add(itemTax);
      }
    });

    let computedTotal = subtotalAfterDiscounts
      .add(exclusiveTaxTotal)
      .add(serviceChargeMoney)
      .add(tipMoney);

    // Round-off handling (to nearest whole rupee/dollar)
    let roundOffMoney = Money.zero();
    let finalTotalMoney = computedTotal;

    if (input.roundOffEnabled) {
      const roundedVal = computedTotal
        .toDecimal()
        .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
      finalTotalMoney = Money.from(roundedVal);
      roundOffMoney = finalTotalMoney.subtract(computedTotal);
    }

    return {
      subtotal: rawSubtotal.toMoneyString(),
      discountTotal: totalDiscounts.toMoneyString(),
      serviceCharge: serviceChargeMoney.toMoneyString(),
      taxableAmount: subtotalAfterDiscounts.toMoneyString(),
      taxTotal: taxTotal.toMoneyString(),
      taxBreakdown,
      tipAmount: tipMoney.toMoneyString(),
      roundOff: roundOffMoney.toMoneyString(),
      finalTotal: finalTotalMoney.toMoneyString(),
      items: calculatedItems,
      computedAt: new Date().toISOString(),
    };
  }
}
