import { Money } from '../src/money';

describe('Money Domain Class (BR-MON-001)', () => {
  it('should eliminate classic IEEE 754 floating point drift', () => {
    // 0.1 + 0.2 in standard JS float is 0.30000000000000004
    const m1 = Money.from('0.10');
    const m2 = Money.from('0.20');
    const sum = m1.add(m2);

    expect(sum.toMoneyString()).toBe('0.30');

    // 1.00 - 0.90 in standard JS float is 0.09999999999999998
    const m3 = Money.from('1.00');
    const m4 = Money.from('0.90');
    expect(m3.subtract(m4).toMoneyString()).toBe('0.10');
  });

  it('should handle addition, subtraction, multiplication, and division accurately', () => {
    const base = Money.from('199.50');
    const addon = Money.from('49.75');

    expect(base.add(addon).toMoneyString()).toBe('249.25');
    expect(base.subtract(addon).toMoneyString()).toBe('149.75');
    expect(base.multiply(3).toMoneyString()).toBe('598.50');
    expect(base.divide(2).toMoneyString()).toBe('99.75');
  });

  it('should allocate pennies evenly without losing cents', () => {
    const total = Money.from('10.00');
    const splits = total.allocateEqual(3);

    expect(splits.length).toBe(3);
    expect(splits[0]!.toMoneyString()).toBe('3.34');
    expect(splits[1]!.toMoneyString()).toBe('3.33');
    expect(splits[2]!.toMoneyString()).toBe('3.33');

    // Invariant: sum of parts must equal total
    const sum = splits.reduce((acc, m) => acc.add(m), Money.zero());
    expect(sum.toMoneyString()).toBe('10.00');
  });

  it('should reject invalid non-numeric inputs', () => {
    expect(() => Money.from('invalid')).toThrow();
    expect(() => Money.from('')).toThrow();
    expect(() => Money.from(NaN)).toThrow();
  });
});
