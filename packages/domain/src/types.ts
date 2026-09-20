/**
 * Domain types for POS Financials, Tax Engines, and Invoicing.
 * In accordance with BR-MON-001, all monetary values in payloads are exact decimal strings.
 */

export type MoneyString = string;

export interface TaxComponent {
  id: string;
  name: string;
  rate: number; // e.g., 2.5 for 2.5% CGST, 5.0 for 5% VAT
  isInclusive: boolean;
}

export interface ModifierItem {
  id: string;
  name: string;
  price: MoneyString;
}

export interface OrderItemCalculationInput {
  lineId: string;
  menuItemId: string;
  name: string;
  basePrice: MoneyString;
  variantPriceDelta?: MoneyString;
  modifiers?: ModifierItem[];
  quantity: number;
  taxRatePercent: number; // e.g. 5.0 for 5%
  isTaxInclusive: boolean;
  itemDiscountPercent?: number; // e.g. 10 for 10%
}

export interface CalculatedOrderItem {
  lineId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitNetPrice: MoneyString;
  unitGrossPrice: MoneyString;
  lineNetSubtotal: MoneyString;
  lineDiscountAmount: MoneyString;
  lineTaxableAmount: MoneyString;
  lineTaxAmount: MoneyString;
  lineTotal: MoneyString;
}

export interface TaxSummaryLine {
  name: string;
  ratePercent: number;
  taxableAmount: MoneyString;
  taxAmount: MoneyString;
}

export interface DiscountPolicy {
  type: 'PERCENTAGE' | 'FIXED';
  value: number | MoneyString; // e.g. 10 for 10%, or "100.00" for fixed 100
  maxDiscountCap?: MoneyString;
}

export interface OrderCalculationInput {
  items: OrderItemCalculationInput[];
  orderDiscount?: DiscountPolicy;
  serviceChargePercent?: number; // e.g. 5 for 5%
  tipAmount?: MoneyString;
  roundOffEnabled?: boolean;
}

export interface OrderCalculationSnapshot {
  subtotal: MoneyString;
  discountTotal: MoneyString;
  serviceCharge: MoneyString;
  taxableAmount: MoneyString;
  taxTotal: MoneyString;
  taxBreakdown: TaxSummaryLine[];
  tipAmount: MoneyString;
  roundOff: MoneyString;
  finalTotal: MoneyString;
  items: CalculatedOrderItem[];
  computedAt: string; // ISO 8601
}

export type SplitType = 'EQUAL' | 'ITEMIZED' | 'CUSTOM';

export interface SplitShare {
  shareIndex: number;
  label: string;
  amount: MoneyString;
  itemLineIds?: string[];
}

export interface SplitBillResult {
  splitType: SplitType;
  totalBillAmount: MoneyString;
  shares: SplitShare[];
  remainderCheck: MoneyString; // Must be "0.00"
}
