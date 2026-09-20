import Decimal from 'decimal.js';
import { MoneyString } from './types';

// Configure Decimal globally for currency mathematics
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -7,
  toExpPos: 21,
});

/**
 * Immutable Money value object conforming strictly to BR-MON-001.
 * Prevents floating point errors and guarantees exact scale.
 */
export class Money {
  private readonly val: Decimal;

  private constructor(value: Decimal) {
    this.val = value;
  }

  public static zero(): Money {
    return new Money(new Decimal(0));
  }

  public static from(value: string | number | Decimal | Money): Money {
    if (value instanceof Money) {
      return value;
    }
    if (value instanceof Decimal) {
      return new Money(value);
    }
    if (typeof value === 'number') {
      // Numbers must be finite
      if (!Number.isFinite(value)) {
        throw new Error(`Invalid non-finite number provided to Money: ${value}`);
      }
      return new Money(new Decimal(value));
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '' || isNaN(Number(trimmed))) {
        throw new Error(`Invalid string provided to Money: "${value}"`);
      }
      return new Money(new Decimal(trimmed));
    }
    throw new Error(`Unsupported type for Money: ${typeof value}`);
  }

  public add(other: Money | string | number): Money {
    const o = Money.from(other);
    return new Money(this.val.plus(o.val));
  }

  public subtract(other: Money | string | number): Money {
    const o = Money.from(other);
    return new Money(this.val.minus(o.val));
  }

  public multiply(factor: string | number | Decimal): Money {
    const decFactor = new Decimal(factor);
    return new Money(this.val.times(decFactor));
  }

  public divide(divisor: string | number | Decimal): Money {
    const decDivisor = new Decimal(divisor);
    if (decDivisor.isZero()) {
      throw new Error('Division by zero in Money calculation');
    }
    return new Money(this.val.dividedBy(decDivisor));
  }

  public roundToCurrency(): Money {
    return new Money(this.val.toDecimalPlaces(2, Decimal.ROUND_HALF_UP));
  }

  public toMoneyString(): MoneyString {
    return this.val.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
  }

  public toDecimal(): Decimal {
    return new Decimal(this.val);
  }

  public isZero(): boolean {
    return this.val.isZero();
  }

  public isPositive(): boolean {
    return this.val.isPositive() && !this.val.isZero();
  }

  public isNegative(): boolean {
    return this.val.isNegative();
  }

  public equals(other: Money | string | number): boolean {
    const o = Money.from(other);
    return this.val.equals(o.val);
  }

  public greaterThan(other: Money | string | number): boolean {
    const o = Money.from(other);
    return this.val.greaterThan(o.val);
  }

  public greaterThanOrEqualTo(other: Money | string | number): boolean {
    const o = Money.from(other);
    return this.val.greaterThanOrEqualTo(o.val);
  }

  public lessThan(other: Money | string | number): boolean {
    const o = Money.from(other);
    return this.val.lessThan(o.val);
  }

  public lessThanOrEqualTo(other: Money | string | number): boolean {
    const o = Money.from(other);
    return this.val.lessThanOrEqualTo(o.val);
  }

  /**
   * Distribute an amount across N equal shares without losing pennies.
   * e.g. $10.00 / 3 => [$3.34, $3.33, $3.33], sum = $10.00
   */
  public allocateEqual(parts: number): Money[] {
    if (parts <= 0 || !Number.isInteger(parts)) {
      throw new Error(`Invalid parts for allocation: ${parts}`);
    }

    const totalCents = this.val
      .times(100)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      .toNumber();

    const baseCents = Math.floor(totalCents / parts);
    let remainderCents = totalCents % parts;

    const result: Money[] = [];
    for (let i = 0; i < parts; i++) {
      const shareCents = baseCents + (remainderCents > 0 ? 1 : 0);
      if (remainderCents > 0) remainderCents--;
      result.push(new Money(new Decimal(shareCents).dividedBy(100)));
    }

    return result;
  }
}
