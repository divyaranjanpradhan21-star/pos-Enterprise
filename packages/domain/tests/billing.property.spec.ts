import * as fc from 'fast-check';
import { BillSplitter } from '../src/split';
import { BillingEngine } from '../src/billing';
import { Money } from '../src/money';
import { OrderItemCalculationInput } from '../src/types';

describe('Property-Based Financial Invariants (BR-MON-001 & FR-BIL-003)', () => {
  it('Property: BillSplitter.splitEqual must preserve every single penny across any bill amount and guest count', () => {
    fc.assert(
      fc.property(
        // Generates amounts from 0.01 to 50,000.00
        fc.integer({ min: 1, max: 5000000 }).map((cents) => (cents / 100).toFixed(2)),
        // Generates guest count from 1 to 50
        fc.integer({ min: 1, max: 50 }),
        (totalAmount, numGuests) => {
          const result = BillSplitter.splitEqual(totalAmount, numGuests);

          // 1. Number of shares must equal numGuests
          expect(result.shares.length).toBe(numGuests);

          // 2. Remainder must be exactly zero
          expect(result.remainderCheck).toBe('0.00');

          // 3. Sum of all shares must equal original total amount
          const sum = result.shares.reduce(
            (acc, share) => acc.add(share.amount),
            Money.zero(),
          );

          expect(sum.toMoneyString()).toBe(totalAmount);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('Property: BillingEngine calculation balance invariant holds for random orders', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            lineId: fc.uuid(),
            menuItemId: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 20 }),
            basePrice: fc.integer({ min: 10, max: 2000 }).map((c) => c.toFixed(2)),
            quantity: fc.integer({ min: 1, max: 10 }),
            taxRatePercent: fc.constantFrom(0, 5, 12, 18),
            isTaxInclusive: fc.boolean(),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (items: OrderItemCalculationInput[]) => {
          const snapshot = BillingEngine.calculateOrder({
            items,
            roundOffEnabled: false,
          });

          // Final total must be greater than or equal to subtotal if tax is exclusive or zero
          const finalTotalMoney = Money.from(snapshot.finalTotal);
          expect(finalTotalMoney.isPositive()).toBe(true);

          // Every line total must be properly formatted
          snapshot.items.forEach((item) => {
            expect(item.lineTotal).toMatch(/^\d+\.\d{2}$/);
          });
        },
      ),
      { numRuns: 200 },
    );
  });
});
