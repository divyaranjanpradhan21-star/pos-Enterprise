import Decimal from 'decimal.js';
import { Money } from './money';
import { TaxSummaryLine } from './types';

export interface TaxCalculationDetail {
  netAmount: Money;
  taxAmount: Money;
  grossAmount: Money;
}

export class TaxEngine {
  /**
   * Calculates net, tax, and gross amounts for a line amount and given tax rate percentage.
   * Handles both tax-inclusive and tax-exclusive calculations.
   */
  public static calculateLineTax(
    amount: Money,
    taxRatePercent: number,
    isInclusive: boolean,
  ): TaxCalculationDetail {
    if (taxRatePercent < 0) {
      throw new Error(`Tax rate cannot be negative: ${taxRatePercent}`);
    }

    if (taxRatePercent === 0) {
      return {
        netAmount: amount.roundToCurrency(),
        taxAmount: Money.zero(),
        grossAmount: amount.roundToCurrency(),
      };
    }

    const rate = new Decimal(taxRatePercent).dividedBy(100);

    if (isInclusive) {
      // Gross is known. Net = Gross / (1 + rate)
      const divisor = new Decimal(1).plus(rate);
      const net = amount.toDecimal().dividedBy(divisor);
      const netMoney = Money.from(net).roundToCurrency();
      const taxMoney = amount.subtract(netMoney);

      return {
        netAmount: netMoney,
        taxAmount: taxMoney,
        grossAmount: amount.roundToCurrency(),
      };
    } else {
      // Net is known. Tax = Net * rate. Gross = Net + Tax
      const netMoney = amount.roundToCurrency();
      const tax = netMoney.toDecimal().times(rate);
      const taxMoney = Money.from(tax).roundToCurrency();
      const grossMoney = netMoney.add(taxMoney);

      return {
        netAmount: netMoney,
        taxAmount: taxMoney,
        grossAmount: grossMoney,
      };
    }
  }

  /**
   * Aggregates tax components across items into standardized tax summary lines (e.g. for invoices).
   */
  public static aggregateTaxBreakdown(
    taxRecords: { name: string; ratePercent: number; taxableAmount: Money; taxAmount: Money }[],
  ): TaxSummaryLine[] {
    const map = new Map<string, { ratePercent: number; taxable: Money; tax: Money }>();

    for (const record of taxRecords) {
      const key = `${record.name}_${record.ratePercent}`;
      const existing = map.get(key);
      if (existing) {
        existing.taxable = existing.taxable.add(record.taxableAmount);
        existing.tax = existing.tax.add(record.taxAmount);
      } else {
        map.set(key, {
          ratePercent: record.ratePercent,
          taxable: record.taxableAmount,
          tax: record.taxAmount,
        });
      }
    }

    return Array.from(map.entries()).map(([key, data]) => {
      const name = key.split('_')[0] ?? 'Tax';
      return {
        name,
        ratePercent: data.ratePercent,
        taxableAmount: data.taxable.toMoneyString(),
        taxAmount: data.tax.toMoneyString(),
      };
    });
  }
}
