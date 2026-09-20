import { Money } from '../src/money';
import { TaxEngine } from '../src/tax';

describe('TaxEngine (BR-TAX-001)', () => {
  it('should calculate exclusive tax correctly', () => {
    // 100.00 with 5% exclusive tax => Net: 100.00, Tax: 5.00, Gross: 105.00
    const detail = TaxEngine.calculateLineTax(Money.from('100.00'), 5, false);

    expect(detail.netAmount.toMoneyString()).toBe('100.00');
    expect(detail.taxAmount.toMoneyString()).toBe('5.00');
    expect(detail.grossAmount.toMoneyString()).toBe('105.00');
  });

  it('should calculate inclusive tax correctly', () => {
    // 105.00 with 5% inclusive tax => Net: 100.00, Tax: 5.00, Gross: 105.00
    const detail = TaxEngine.calculateLineTax(Money.from('105.00'), 5, true);

    expect(detail.netAmount.toMoneyString()).toBe('100.00');
    expect(detail.taxAmount.toMoneyString()).toBe('5.00');
    expect(detail.grossAmount.toMoneyString()).toBe('105.00');
  });

  it('should handle zero tax rate', () => {
    const detail = TaxEngine.calculateLineTax(Money.from('50.00'), 0, false);
    expect(detail.netAmount.toMoneyString()).toBe('50.00');
    expect(detail.taxAmount.toMoneyString()).toBe('0.00');
    expect(detail.grossAmount.toMoneyString()).toBe('50.00');
  });
});
