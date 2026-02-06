import mongoose from 'mongoose';
import BankAccount from '@/lib/mongodb/models/BankAccount';
import Card from '@/lib/mongodb/models/Card';
import Investment from '@/lib/mongodb/models/Investment';
import { AccountType } from '@/types';

interface UpdateBalanceParams {
  accountType: AccountType;
  accountId: string;
  amount: number;
  session: mongoose.ClientSession;
}

export async function updateAccountBalance({
  accountType,
  accountId,
  amount,
  session,
}: UpdateBalanceParams): Promise<void> {
  switch (accountType) {
    case AccountType.BANK: {
      const result = await BankAccount.findByIdAndUpdate(
        accountId,
        { $inc: { currentBalance: amount } },
        { session, new: true }
      );
      if (!result) {
        throw new Error(`Bank account ${accountId} not found — balance update failed`);
      }
      break;
    }

    case AccountType.CARD: {
      const result = await Card.findByIdAndUpdate(
        accountId,
        { $inc: { currentBalance: amount } },
        { session, new: true }
      );
      if (!result) {
        throw new Error(`Card ${accountId} not found — balance update failed`);
      }
      break;
    }

    case AccountType.INVESTMENT: {
      const result = await Investment.findByIdAndUpdate(
        accountId,
        { $inc: { currentValue: amount } },
        { session, new: true }
      );
      if (!result) {
        throw new Error(`Investment ${accountId} not found — balance update failed`);
      }
      break;
    }

    default:
      // CASH type - no account update needed
      break;
  }
}

export function getAccountId(
  accountType: AccountType,
  sourceBankId?: string,
  sourceCardId?: string
): string | undefined {
  switch (accountType) {
    case AccountType.BANK:
      return sourceBankId;
    case AccountType.CARD:
      return sourceCardId;
    default:
      return undefined;
  }
}

export function getDestinationAccountId(
  accountType: AccountType,
  destinationBankId?: string,
  destinationCardId?: string,
  destinationInvestmentId?: string
): string | undefined {
  switch (accountType) {
    case AccountType.BANK:
      return destinationBankId;
    case AccountType.CARD:
      return destinationCardId;
    case AccountType.INVESTMENT:
      return destinationInvestmentId;
    default:
      return undefined;
  }
}
