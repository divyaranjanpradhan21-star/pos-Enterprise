import { Money } from './money';
import { MoneyString, SplitBillResult, SplitShare } from './types';

export class BillSplitter {
  /**
   * Splits a bill amount equally across N patrons.
   * Guarantees exact Penny-Preserving invariant: sum(shares) === totalBillAmount.
   */
  public static splitEqual(totalAmount: MoneyString, numGuests: number): SplitBillResult {
    if (numGuests <= 0 || !Number.isInteger(numGuests)) {
      throw new Error(`Number of guests must be a positive integer, received: ${numGuests}`);
    }

    const totalMoney = Money.from(totalAmount);
    const allocated = totalMoney.allocateEqual(numGuests);

    let runningSum = Money.zero();
    const shares: SplitShare[] = allocated.map((money, index) => {
      runningSum = runningSum.add(money);
      return {
        shareIndex: index + 1,
        label: `Guest ${index + 1}`,
        amount: money.toMoneyString(),
      };
    });

    const remainder = totalMoney.subtract(runningSum).toMoneyString();

    return {
      splitType: 'EQUAL',
      totalBillAmount: totalMoney.toMoneyString(),
      shares,
      remainderCheck: remainder,
    };
  }

  /**
   * Validates and normalizes custom amount splits.
   * Checks that sum of specified shares matches total bill amount.
   */
  public static splitCustom(
    totalAmount: MoneyString,
    customShares: { label: string; amount: MoneyString }[],
  ): SplitBillResult {
    const totalMoney = Money.from(totalAmount);
    let runningSum = Money.zero();

    const shares: SplitShare[] = customShares.map((share, index) => {
      const shareMoney = Money.from(share.amount);
      if (shareMoney.isNegative()) {
        throw new Error(`Custom split amount cannot be negative for share ${share.label}`);
      }
      runningSum = runningSum.add(shareMoney);
      return {
        shareIndex: index + 1,
        label: share.label,
        amount: shareMoney.toMoneyString(),
      };
    });

    const diff = totalMoney.subtract(runningSum);
    if (!diff.isZero()) {
      throw new Error(
        `Custom split amounts sum to ${runningSum.toMoneyString()} which does not equal total bill ${totalMoney.toMoneyString()} (Difference: ${diff.toMoneyString()})`,
      );
    }

    return {
      splitType: 'CUSTOM',
      totalBillAmount: totalMoney.toMoneyString(),
      shares,
      remainderCheck: diff.toMoneyString(),
    };
  }
}
