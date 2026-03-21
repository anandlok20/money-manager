import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { Frequency, TransactionType, AccountType } from '@/types';
import { IScheduledPayment } from '@/lib/mongodb/models/ScheduledPayment';
import { createTransaction } from './transactionService';

export function calculateNextRunDate(currentDate: Date, frequency: Frequency): Date {
  switch (frequency) {
    case Frequency.DAILY:
      return addDays(currentDate, 1);
    case Frequency.WEEKLY:
      return addWeeks(currentDate, 1);
    case Frequency.MONTHLY:
      return addMonths(currentDate, 1);
    case Frequency.QUARTERLY:
      return addMonths(currentDate, 3);
    case Frequency.YEARLY:
      return addYears(currentDate, 1);
    default:
      return addMonths(currentDate, 1);
  }
}

/**
 * Determines the transaction type for a scheduled payment based on destination.
 * - Investment destination → INVESTMENT_CONTRIBUTION
 * - Bank/Card destination → TRANSFER_SELF
 * - No destination (expense like a bill) → EXPENSE
 */
function resolveTransactionType(payment: IScheduledPayment): TransactionType {
  if (payment.destinationInvestmentId) return TransactionType.INVESTMENT_CONTRIBUTION;
  if (payment.destinationBankId || payment.destinationCardId) return TransactionType.TRANSFER_SELF;
  return TransactionType.EXPENSE;
}

/**
 * Executes a single scheduled payment by creating the corresponding transaction
 * and returning the next run date.
 */
export async function executeScheduledPayment(payment: IScheduledPayment): Promise<Date> {
  const transactionType = resolveTransactionType(payment);

  await createTransaction({
    userId: payment.userId.toString(),
    type: transactionType,
    amount: payment.amount,
    dateTime: new Date(),
    note: payment.note || `Scheduled payment`,
    memberId: payment.memberId?.toString(),
    sourceType: payment.sourceType as AccountType,
    sourceBankId: payment.sourceBankId?.toString(),
    sourceCardId: payment.sourceCardId?.toString(),
    destinationType: payment.destinationType as AccountType | undefined,
    destinationBankId: payment.destinationBankId?.toString(),
    destinationCardId: payment.destinationCardId?.toString(),
    destinationInvestmentId: payment.destinationInvestmentId?.toString(),
  });

  return calculateNextRunDate(new Date(), payment.frequency);
}
