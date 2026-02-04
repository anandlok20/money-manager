/**
 * Money Manager - Business Logic Tests
 * Tests for core business logic and calculations
 */

import { describe, it, expect } from 'vitest';
import { TransactionType, AccountType, Frequency } from '@/types';

// Helper function to calculate net worth (simulating what dashboard does)
function calculateNetWorth(
  bankBalance: number,
  cardBalance: number,
  investmentValue: number
): number {
  return bankBalance - cardBalance + investmentValue;
}

// Helper function to calculate savings rate
function calculateSavingsRate(income: number, expense: number): number {
  if (income === 0) return 0;
  const savings = income - expense;
  return Math.round((savings / income) * 100);
}

// Helper function to calculate next run date for scheduled payments
function calculateNextRunDate(
  currentDate: Date,
  frequency: Frequency
): Date {
  const nextDate = new Date(currentDate);
  
  switch (frequency) {
    case Frequency.DAILY:
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case Frequency.WEEKLY:
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case Frequency.MONTHLY:
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case Frequency.QUARTERLY:
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case Frequency.YEARLY:
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  
  return nextDate;
}

// Helper function to check if budget is exceeded
function isBudgetExceeded(spent: number, budget: number): boolean {
  return spent > budget;
}

// Helper function to calculate budget percentage
function calculateBudgetPercentage(spent: number, budget: number): number {
  if (budget === 0) return 0;
  return Math.min(Math.round((spent / budget) * 100), 100);
}

describe('Financial Calculations', () => {
  describe('Net Worth Calculation', () => {
    it('should calculate positive net worth correctly', () => {
      const result = calculateNetWorth(100000, 10000, 50000);
      expect(result).toBe(140000); // 100000 - 10000 + 50000
    });

    it('should handle zero values', () => {
      const result = calculateNetWorth(0, 0, 0);
      expect(result).toBe(0);
    });

    it('should calculate negative net worth (debt)', () => {
      const result = calculateNetWorth(10000, 50000, 0);
      expect(result).toBe(-40000);
    });

    it('should handle large balances', () => {
      const result = calculateNetWorth(10000000, 500000, 5000000);
      expect(result).toBe(14500000);
    });
  });

  describe('Savings Rate Calculation', () => {
    it('should calculate positive savings rate', () => {
      const result = calculateSavingsRate(100000, 70000);
      expect(result).toBe(30); // 30% savings
    });

    it('should calculate zero savings rate when income equals expense', () => {
      const result = calculateSavingsRate(50000, 50000);
      expect(result).toBe(0);
    });

    it('should calculate negative savings rate when overspending', () => {
      const result = calculateSavingsRate(50000, 60000);
      expect(result).toBe(-20); // -20% (overspending)
    });

    it('should return 0 when income is zero', () => {
      const result = calculateSavingsRate(0, 1000);
      expect(result).toBe(0);
    });

    it('should calculate 100% savings rate when no expenses', () => {
      const result = calculateSavingsRate(50000, 0);
      expect(result).toBe(100);
    });
  });

  describe('Scheduled Payment Next Run Date', () => {
    it('should calculate daily frequency correctly', () => {
      const start = new Date('2024-01-15');
      const result = calculateNextRunDate(start, Frequency.DAILY);
      expect(result.getDate()).toBe(16);
    });

    it('should calculate weekly frequency correctly', () => {
      const start = new Date('2024-01-15');
      const result = calculateNextRunDate(start, Frequency.WEEKLY);
      expect(result.getDate()).toBe(22);
    });

    it('should calculate monthly frequency correctly', () => {
      const start = new Date('2024-01-15');
      const result = calculateNextRunDate(start, Frequency.MONTHLY);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(15);
    });

    it('should calculate quarterly frequency correctly', () => {
      const start = new Date('2024-01-15');
      const result = calculateNextRunDate(start, Frequency.QUARTERLY);
      expect(result.getMonth()).toBe(3); // April
    });

    it('should calculate yearly frequency correctly', () => {
      const start = new Date('2024-01-15');
      const result = calculateNextRunDate(start, Frequency.YEARLY);
      expect(result.getFullYear()).toBe(2025);
    });

    it('should handle month rollover', () => {
      const start = new Date('2024-01-31');
      const result = calculateNextRunDate(start, Frequency.MONTHLY);
      expect(result.getMonth()).toBe(2); // March (Feb doesn't have 31)
    });
  });

  describe('Budget Calculations', () => {
    it('should detect exceeded budget', () => {
      expect(isBudgetExceeded(15000, 10000)).toBe(true);
    });

    it('should detect within budget', () => {
      expect(isBudgetExceeded(8000, 10000)).toBe(false);
    });

    it('should detect exactly at budget', () => {
      expect(isBudgetExceeded(10000, 10000)).toBe(false);
    });

    it('should calculate budget percentage correctly', () => {
      expect(calculateBudgetPercentage(5000, 10000)).toBe(50);
    });

    it('should cap percentage at 100', () => {
      expect(calculateBudgetPercentage(15000, 10000)).toBe(100);
    });

    it('should return 0 for zero budget', () => {
      expect(calculateBudgetPercentage(5000, 0)).toBe(0);
    });
  });
});

describe('Transaction Type Handling', () => {
  it('should have all required transaction types', () => {
    expect(TransactionType.INCOME).toBeDefined();
    expect(TransactionType.EXPENSE).toBeDefined();
    expect(TransactionType.TRANSFER_SELF).toBeDefined();
    expect(TransactionType.INVESTMENT_CONTRIBUTION).toBeDefined();
  });

  it('should have all required account types', () => {
    expect(AccountType.BANK).toBeDefined();
    expect(AccountType.CARD).toBeDefined();
    expect(AccountType.CASH).toBeDefined();
    expect(AccountType.INVESTMENT).toBeDefined();
  });

  it('should have all required frequencies', () => {
    expect(Frequency.DAILY).toBeDefined();
    expect(Frequency.WEEKLY).toBeDefined();
    expect(Frequency.MONTHLY).toBeDefined();
    expect(Frequency.QUARTERLY).toBeDefined();
    expect(Frequency.YEARLY).toBeDefined();
  });
});

describe('Balance Update Logic', () => {
  // Simulate balance updates for different transaction types
  function updateBalance(
    currentBalance: number,
    amount: number,
    transactionType: TransactionType,
    isSource: boolean
  ): number {
    switch (transactionType) {
      case TransactionType.INCOME:
        return isSource ? currentBalance + amount : currentBalance;
      case TransactionType.EXPENSE:
        return isSource ? currentBalance - amount : currentBalance;
      case TransactionType.TRANSFER_SELF:
        return isSource ? currentBalance - amount : currentBalance + amount;
      case TransactionType.INVESTMENT_CONTRIBUTION:
        return isSource ? currentBalance - amount : currentBalance + amount;
      default:
        return currentBalance;
    }
  }

  it('should increase balance for income', () => {
    const result = updateBalance(10000, 5000, TransactionType.INCOME, true);
    expect(result).toBe(15000);
  });

  it('should decrease balance for expense', () => {
    const result = updateBalance(10000, 3000, TransactionType.EXPENSE, true);
    expect(result).toBe(7000);
  });

  it('should decrease source balance for transfer', () => {
    const result = updateBalance(10000, 5000, TransactionType.TRANSFER_SELF, true);
    expect(result).toBe(5000);
  });

  it('should increase destination balance for transfer', () => {
    const result = updateBalance(10000, 5000, TransactionType.TRANSFER_SELF, false);
    expect(result).toBe(15000);
  });

  it('should decrease source for investment contribution', () => {
    const result = updateBalance(10000, 2000, TransactionType.INVESTMENT_CONTRIBUTION, true);
    expect(result).toBe(8000);
  });

  it('should increase investment for contribution', () => {
    const result = updateBalance(50000, 2000, TransactionType.INVESTMENT_CONTRIBUTION, false);
    expect(result).toBe(52000);
  });
});
