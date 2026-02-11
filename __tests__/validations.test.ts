/**
 * Money Manager - Validation Schema Tests
 * Tests for Zod validation schemas
 */

import { describe, it, expect } from 'vitest';
import { 
  memberSchema, 
  updateMemberSchema 
} from '@/lib/validations/member';
import { 
  transactionSchema, 
  transactionFiltersSchema 
} from '@/lib/validations/transaction';
import { 
  investmentSchema 
} from '@/lib/validations/investment';
import { 
  categorySchema 
} from '@/lib/validations/category';
import { 
  bankAccountSchema, 
  cardSchema 
} from '@/lib/validations/account';
import { TransactionType, MemberType, InvestmentType, CategoryType } from '@/types';

describe('Member Validation Schema', () => {
  describe('memberSchema', () => {
    it('should validate a valid member with minimum fields', () => {
      const validMember = {
        name: 'John Doe',
        type: MemberType.SELF,
      };
      const result = memberSchema.safeParse(validMember);
      expect(result.success).toBe(true);
    });

    it('should validate a member with all optional fields', () => {
      const validMember = {
        name: 'Jane Doe',
        type: MemberType.FAMILY,
        email: 'jane@example.com',
        phone: '1234567890',
        relationship: 'Spouse',
        notes: 'Primary account holder',
      };
      const result = memberSchema.safeParse(validMember);
      expect(result.success).toBe(true);
    });

    it('should reject member with name too short', () => {
      const invalidMember = {
        name: 'J',
        type: MemberType.SELF,
      };
      const result = memberSchema.safeParse(invalidMember);
      expect(result.success).toBe(false);
    });

    it('should reject member with invalid email', () => {
      const invalidMember = {
        name: 'John Doe',
        type: MemberType.SELF,
        email: 'invalid-email',
      };
      const result = memberSchema.safeParse(invalidMember);
      expect(result.success).toBe(false);
    });

    it('should accept empty string for optional email', () => {
      const validMember = {
        name: 'John Doe',
        type: MemberType.SELF,
        email: '',
      };
      const result = memberSchema.safeParse(validMember);
      expect(result.success).toBe(true);
    });

    it('should reject invalid member type', () => {
      const invalidMember = {
        name: 'John Doe',
        type: 'INVALID_TYPE',
      };
      const result = memberSchema.safeParse(invalidMember);
      expect(result.success).toBe(false);
    });
  });

  describe('updateMemberSchema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        name: 'Updated Name',
      };
      const result = updateMemberSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow empty update', () => {
      const result = updateMemberSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

describe('Transaction Validation Schema', () => {
  describe('transactionSchema', () => {
    it('should validate expense transaction with category', () => {
      const validExpense = {
        type: TransactionType.EXPENSE,
        amount: 100.50,
        dateTime: new Date(),
        categoryId: '507f1f77bcf86cd799439011',
      };
      const result = transactionSchema.safeParse(validExpense);
      expect(result.success).toBe(true);
    });

    it('should validate income transaction with category', () => {
      const validIncome = {
        type: TransactionType.INCOME,
        amount: 5000,
        dateTime: new Date(),
        categoryId: '507f1f77bcf86cd799439011',
      };
      const result = transactionSchema.safeParse(validIncome);
      expect(result.success).toBe(true);
    });

    it('should reject transaction with negative amount', () => {
      const invalidTransaction = {
        type: TransactionType.EXPENSE,
        amount: -100,
        dateTime: new Date(),
        categoryId: '507f1f77bcf86cd799439011',
      };
      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });

    it('should reject transaction with zero amount', () => {
      const invalidTransaction = {
        type: TransactionType.EXPENSE,
        amount: 0,
        dateTime: new Date(),
        categoryId: '507f1f77bcf86cd799439011',
      };
      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });

    it('should reject expense without category', () => {
      const invalidExpense = {
        type: TransactionType.EXPENSE,
        amount: 100,
        dateTime: new Date(),
      };
      const result = transactionSchema.safeParse(invalidExpense);
      expect(result.success).toBe(false);
    });

    it('should validate transaction with optional note', () => {
      const validTransaction = {
        type: TransactionType.EXPENSE,
        amount: 50,
        dateTime: new Date(),
        categoryId: '507f1f77bcf86cd799439011',
        note: 'Coffee at Starbucks',
      };
      const result = transactionSchema.safeParse(validTransaction);
      expect(result.success).toBe(true);
    });

    it('should reject note exceeding 500 characters', () => {
      const invalidTransaction = {
        type: TransactionType.EXPENSE,
        amount: 50,
        dateTime: new Date(),
        categoryId: '507f1f77bcf86cd799439011',
        note: 'A'.repeat(501),
      };
      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });

    it('should validate transaction with tags', () => {
      const validTransaction = {
        type: TransactionType.EXPENSE,
        amount: 100,
        dateTime: new Date(),
        categoryId: '507f1f77bcf86cd799439011',
        tags: ['food', 'lunch', 'work'],
      };
      const result = transactionSchema.safeParse(validTransaction);
      expect(result.success).toBe(true);
    });

    it('should reject more than 10 tags', () => {
      const invalidTransaction = {
        type: TransactionType.EXPENSE,
        amount: 100,
        dateTime: new Date(),
        categoryId: '507f1f77bcf86cd799439011',
        tags: Array(11).fill('tag'),
      };
      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });
  });

  describe('transactionFiltersSchema', () => {
    it('should accept empty filters with defaults', () => {
      const result = transactionFiltersSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should validate date range filters', () => {
      const filters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };
      const result = transactionFiltersSchema.safeParse(filters);
      expect(result.success).toBe(true);
    });

    it('should validate amount range filters', () => {
      const filters = {
        minAmount: 100,
        maxAmount: 1000,
      };
      const result = transactionFiltersSchema.safeParse(filters);
      expect(result.success).toBe(true);
    });

    it('should reject negative amounts in filters', () => {
      const filters = {
        minAmount: -100,
      };
      const result = transactionFiltersSchema.safeParse(filters);
      expect(result.success).toBe(false);
    });
  });
});

describe('Investment Validation Schema', () => {
  it('should validate investment with minimum fields', () => {
    const validInvestment = {
      name: 'HDFC Equity Fund',
      type: InvestmentType.MUTUAL_FUND,
      currentValue: 50000,
    };
    const result = investmentSchema.safeParse(validInvestment);
    expect(result.success).toBe(true);
  });

  it('should reject investment with short name', () => {
    const invalidInvestment = {
      name: 'A',
      type: InvestmentType.MUTUAL_FUND,
      currentValue: 50000,
    };
    const result = investmentSchema.safeParse(invalidInvestment);
    expect(result.success).toBe(false);
  });

  it('should reject negative current value', () => {
    const invalidInvestment = {
      name: 'HDFC Fund',
      type: InvestmentType.MUTUAL_FUND,
      currentValue: -1000,
    };
    const result = investmentSchema.safeParse(invalidInvestment);
    expect(result.success).toBe(false);
  });

  it('should accept zero current value', () => {
    const validInvestment = {
      name: 'New Investment',
      type: InvestmentType.OTHER,
      currentValue: 0,
    };
    const result = investmentSchema.safeParse(validInvestment);
    expect(result.success).toBe(true);
  });
});

describe('Category Validation Schema', () => {
  it('should validate category with minimum fields', () => {
    const validCategory = {
      name: 'Food & Dining',
      type: CategoryType.EXPENSE,
    };
    const result = categorySchema.safeParse(validCategory);
    expect(result.success).toBe(true);
  });

  it('should validate category with icon and color', () => {
    const validCategory = {
      name: 'Transportation',
      type: CategoryType.EXPENSE,
      icon: '🚗',
      color: '#FF5733',
    };
    const result = categorySchema.safeParse(validCategory);
    expect(result.success).toBe(true);
  });

  it('should reject category with empty name', () => {
    const invalidCategory = {
      name: '',
      type: CategoryType.EXPENSE,
    };
    const result = categorySchema.safeParse(invalidCategory);
    expect(result.success).toBe(false);
  });
});

describe('Account Validation Schemas', () => {
  describe('bankAccountSchema', () => {
    it('should validate bank account with minimum fields', () => {
      const validAccount = {
        bankName: 'HDFC Bank',
        accountHolderName: 'John Doe',
        accountNumber: '1234567890',
        openingBalance: 10000,
      };
      const result = bankAccountSchema.safeParse(validAccount);
      expect(result.success).toBe(true);
    });

    it('should reject bank account without bank name', () => {
      const invalidAccount = {
        accountHolderName: 'John Doe',
        accountNumber: '1234567890',
        openingBalance: 10000,
      };
      const result = bankAccountSchema.safeParse(invalidAccount);
      expect(result.success).toBe(false);
    });

    it('should allow negative opening balance (overdraft)', () => {
      const validAccount = {
        bankName: 'HDFC Bank',
        accountHolderName: 'John Doe',
        accountNumber: '1234567890',
        openingBalance: -5000,
      };
      const result = bankAccountSchema.safeParse(validAccount);
      expect(result.success).toBe(true);
    });
  });

  describe('cardSchema', () => {
    it('should validate credit card with minimum fields', () => {
      const validCard = {
        cardName: 'HDFC Regalia',
        cardType: 'CREDIT',
      };
      const result = cardSchema.safeParse(validCard);
      expect(result.success).toBe(true);
    });

    it('should validate card with all optional fields', () => {
      const validCard = {
        cardName: 'HDFC Regalia',
        cardType: 'CREDIT',
        cardNetwork: 'VISA',
        last4Digits: '1234',
        creditLimit: 500000,
        billingCycleDay: 15,
      };
      const result = cardSchema.safeParse(validCard);
      expect(result.success).toBe(true);
    });

    it('should reject invalid card type', () => {
      const invalidCard = {
        cardName: 'My Card',
        cardType: 'INVALID',
      };
      const result = cardSchema.safeParse(invalidCard);
      expect(result.success).toBe(false);
    });

    it('should reject billing cycle day > 31', () => {
      const invalidCard = {
        cardName: 'My Card',
        cardType: 'CREDIT',
        billingCycleDay: 32,
      };
      const result = cardSchema.safeParse(invalidCard);
      expect(result.success).toBe(false);
    });
  });
});
