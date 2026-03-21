import mongoose from 'mongoose';
import Transaction, { ITransaction } from '@/lib/mongodb/models/Transaction';
import Goal from '@/lib/mongodb/models/Goal';
import { dashboardCache, userCacheKey } from '@/lib/cache/lru-cache';
import { TransactionType, AccountType } from '@/types';
import {
  updateAccountBalance,
  getAccountId,
  getDestinationAccountId,
} from './balanceService';

interface CreateTransactionParams {
  userId: string;
  type: TransactionType;
  amount: number;
  dateTime: Date;
  note?: string;
  categoryId?: string;
  memberId?: string;
  tripId?: string;
  goalId?: string;
  sourceType?: AccountType;
  sourceBankId?: string;
  sourceCardId?: string;
  destinationType?: AccountType;
  destinationBankId?: string;
  destinationCardId?: string;
  destinationInvestmentId?: string;
  paymentMode?: 'upi' | 'neft' | 'rtgs' | 'imps' | 'cash' | 'cheque' | 'card' | 'netbanking' | 'other';
  referenceNumber?: string;
}

export async function createTransaction(
  params: CreateTransactionParams
): Promise<ITransaction> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create the transaction record
    const [transaction] = await Transaction.create(
      [
        {
          userId: params.userId,
          type: params.type,
          amount: params.amount,
          dateTime: params.dateTime,
          note: params.note,
          categoryId: params.categoryId,
          memberId: params.memberId,
          tripId: params.tripId,
          goalId: params.goalId,
          sourceType: params.sourceType,
          sourceBankId: params.sourceBankId,
          sourceCardId: params.sourceCardId,
          destinationType: params.destinationType,
          destinationBankId: params.destinationBankId,
          destinationCardId: params.destinationCardId,
          destinationInvestmentId: params.destinationInvestmentId,
          paymentMode: params.paymentMode,
          referenceNumber: params.referenceNumber,
        },
      ],
      { session }
    );

    // Update balances based on transaction type
    await applyTransactionToBalances(params, session);

    // Auto-update goal progress when a transaction is tagged with a goal
    if (params.goalId) {
      await Goal.findByIdAndUpdate(
        params.goalId,
        { $inc: { currentAmount: params.amount } },
        { session }
      );
    }

    await session.commitTransaction();
    dashboardCache.delete(userCacheKey(params.userId, 'dashboard'));
    return transaction;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function deleteTransaction(
  transactionId: string,
  userId: string
): Promise<void> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get the transaction
    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId,
    }).session(session);

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Reverse the balance changes
    await reverseTransactionFromBalances(transaction, session);

    // Reverse goal progress if this transaction was tagged with a goal
    if (transaction.goalId) {
      await Goal.findByIdAndUpdate(
        transaction.goalId,
        { $inc: { currentAmount: -transaction.amount } },
        { session }
      );
    }

    // Delete the transaction
    await Transaction.findByIdAndDelete(transactionId).session(session);

    await session.commitTransaction();
    dashboardCache.delete(userCacheKey(userId, 'dashboard'));
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function updateTransaction(
  transactionId: string,
  userId: string,
  updates: Partial<CreateTransactionParams>
): Promise<ITransaction> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get the original transaction
    const originalTransaction = await Transaction.findOne({
      _id: transactionId,
      userId,
    }).session(session);

    if (!originalTransaction) {
      throw new Error('Transaction not found');
    }

    // Reverse the original balance changes
    await reverseTransactionFromBalances(originalTransaction, session);

    // Reverse original goal progress
    if (originalTransaction.goalId) {
      await Goal.findByIdAndUpdate(
        originalTransaction.goalId,
        { $inc: { currentAmount: -originalTransaction.amount } },
        { session }
      );
    }

    // Update the transaction
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transactionId,
      { $set: updates },
      { new: true, session }
    );

    if (!updatedTransaction) {
      throw new Error('Failed to update transaction');
    }

    // Apply new goal progress
    if (updatedTransaction.goalId) {
      await Goal.findByIdAndUpdate(
        updatedTransaction.goalId,
        { $inc: { currentAmount: updatedTransaction.amount } },
        { session }
      );
    }

    // Apply new balance changes
    await applyTransactionToBalances(
      {
        userId,
        type: updatedTransaction.type,
        amount: updatedTransaction.amount,
        dateTime: updatedTransaction.dateTime,
        sourceType: updatedTransaction.sourceType,
        sourceBankId: updatedTransaction.sourceBankId?.toString(),
        sourceCardId: updatedTransaction.sourceCardId?.toString(),
        destinationType: updatedTransaction.destinationType,
        destinationBankId: updatedTransaction.destinationBankId?.toString(),
        destinationCardId: updatedTransaction.destinationCardId?.toString(),
        destinationInvestmentId: updatedTransaction.destinationInvestmentId?.toString(),
      },
      session
    );

    await session.commitTransaction();
    dashboardCache.delete(userCacheKey(userId, 'dashboard'));
    return updatedTransaction;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

async function applyTransactionToBalances(
  params: CreateTransactionParams,
  session: mongoose.ClientSession
): Promise<void> {
  const { type, amount, sourceType, destinationType } = params;

  switch (type) {
    case TransactionType.EXPENSE:
      // Deduct from source account
      if (sourceType && sourceType !== AccountType.CASH) {
        const sourceAccountId = getAccountId(
          sourceType,
          params.sourceBankId,
          params.sourceCardId
        );
        if (sourceAccountId) {
          // For cards, expenses INCREASE the balance (debt grows)
          // For banks, expenses DECREASE the balance (money spent)
          const balanceChange = sourceType === AccountType.CARD ? amount : -amount;
          await updateAccountBalance({
            accountType: sourceType,
            accountId: sourceAccountId,
            amount: balanceChange,
            session,
          });
        }
      }
      break;

    case TransactionType.INCOME:
      // Add to source account
      if (sourceType && sourceType !== AccountType.CASH) {
        const sourceAccountId = getAccountId(
          sourceType,
          params.sourceBankId,
          params.sourceCardId
        );
        if (sourceAccountId) {
          await updateAccountBalance({
            accountType: sourceType,
            accountId: sourceAccountId,
            amount: amount,
            session,
          });
        }
      }
      break;

    case TransactionType.TRANSFER_SELF:
      // Deduct from source
      if (sourceType && sourceType !== AccountType.CASH) {
        const sourceAccountId = getAccountId(
          sourceType,
          params.sourceBankId,
          params.sourceCardId
        );
        if (sourceAccountId) {
          // For source card (paying off card debt), card balance decreases
          // For source bank, bank balance decreases
          const sourceChange = -amount;
          await updateAccountBalance({
            accountType: sourceType,
            accountId: sourceAccountId,
            amount: sourceChange,
            session,
          });
        }
      }

      // Add to destination
      if (destinationType && destinationType !== AccountType.CASH) {
        const destAccountId = getDestinationAccountId(
          destinationType,
          params.destinationBankId,
          params.destinationCardId,
          params.destinationInvestmentId
        );
        if (destAccountId) {
          // For destination card (paying off card), debt DECREASES
          // For destination bank/investment, balance increases
          const destChange = destinationType === AccountType.CARD ? -amount : amount;
          await updateAccountBalance({
            accountType: destinationType,
            accountId: destAccountId,
            amount: destChange,
            session,
          });
        }
      }
      break;

    case TransactionType.INVESTMENT_CONTRIBUTION:
      // Deduct from source
      if (sourceType && sourceType !== AccountType.CASH) {
        const sourceAccountId = getAccountId(
          sourceType,
          params.sourceBankId,
          params.sourceCardId
        );
        if (sourceAccountId) {
          await updateAccountBalance({
            accountType: sourceType,
            accountId: sourceAccountId,
            amount: -amount,
            session,
          });
        }
      }

      // Add to investment
      if (params.destinationInvestmentId) {
        await updateAccountBalance({
          accountType: AccountType.INVESTMENT,
          accountId: params.destinationInvestmentId,
          amount: amount,
          session,
        });
      }
      break;
  }
}

async function reverseTransactionFromBalances(
  transaction: ITransaction,
  session: mongoose.ClientSession
): Promise<void> {
  const { type, amount, sourceType, destinationType } = transaction;

  switch (type) {
    case TransactionType.EXPENSE:
      // Reverse expense: for card, debt was increased, so decrease it back
      // For bank, balance was decreased, so increase it back
      if (sourceType && sourceType !== AccountType.CASH) {
        const sourceAccountId = getAccountId(
          sourceType,
          transaction.sourceBankId?.toString(),
          transaction.sourceCardId?.toString()
        );
        if (sourceAccountId) {
          const reverseAmount = sourceType === AccountType.CARD ? -amount : amount;
          await updateAccountBalance({
            accountType: sourceType,
            accountId: sourceAccountId,
            amount: reverseAmount,
            session,
          });
        }
      }
      break;

    case TransactionType.INCOME:
      // Deduct from source account
      if (sourceType && sourceType !== AccountType.CASH) {
        const sourceAccountId = getAccountId(
          sourceType,
          transaction.sourceBankId?.toString(),
          transaction.sourceCardId?.toString()
        );
        if (sourceAccountId) {
          await updateAccountBalance({
            accountType: sourceType,
            accountId: sourceAccountId,
            amount: -amount, // Deduct
            session,
          });
        }
      }
      break;

    case TransactionType.TRANSFER_SELF:
      // Reverse: Add back to source
      if (sourceType && sourceType !== AccountType.CASH) {
        const sourceAccountId = getAccountId(
          sourceType,
          transaction.sourceBankId?.toString(),
          transaction.sourceCardId?.toString()
        );
        if (sourceAccountId) {
          // Reverse: source was decreased, so increase it back
          const reverseSourceAmount = amount;
          await updateAccountBalance({
            accountType: sourceType,
            accountId: sourceAccountId,
            amount: reverseSourceAmount,
            session,
          });
        }
      }

      // Reverse: Deduct from destination
      if (destinationType && destinationType !== AccountType.CASH) {
        const destAccountId = getDestinationAccountId(
          destinationType,
          transaction.destinationBankId?.toString(),
          transaction.destinationCardId?.toString(),
          transaction.destinationInvestmentId?.toString()
        );
        if (destAccountId) {
          // For card destination, debt was decreased, so increase it back
          // For bank destination, balance was increased, so decrease it back
          const reverseDestAmount = destinationType === AccountType.CARD ? amount : -amount;
          await updateAccountBalance({
            accountType: destinationType,
            accountId: destAccountId,
            amount: reverseDestAmount,
            session,
          });
        }
      }
      break;

    case TransactionType.INVESTMENT_CONTRIBUTION:
      // Add back to source
      if (sourceType && sourceType !== AccountType.CASH) {
        const sourceAccountId = getAccountId(
          sourceType,
          transaction.sourceBankId?.toString(),
          transaction.sourceCardId?.toString()
        );
        if (sourceAccountId) {
          await updateAccountBalance({
            accountType: sourceType,
            accountId: sourceAccountId,
            amount: amount, // Add back
            session,
          });
        }
      }

      // Deduct from investment
      if (transaction.destinationInvestmentId) {
        await updateAccountBalance({
          accountType: AccountType.INVESTMENT,
          accountId: transaction.destinationInvestmentId.toString(),
          amount: -amount, // Deduct
          session,
        });
      }
      break;
  }
}
