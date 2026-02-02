// Enum Types
export enum MemberType {
  SELF = 'SELF',
  FAMILY = 'FAMILY',
  OTHER = 'OTHER',
}

export enum CategoryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
  TRANSFER_SELF = 'TRANSFER_SELF',
  INVESTMENT_CONTRIBUTION = 'INVESTMENT_CONTRIBUTION',
}

export enum AccountType {
  BANK = 'BANK',
  CARD = 'CARD',
  CASH = 'CASH',
  INVESTMENT = 'INVESTMENT',
}

export enum InvestmentType {
  MUTUAL_FUND = 'MUTUAL_FUND',
  INSURANCE = 'INSURANCE',
  SHARE_MARKET = 'SHARE_MARKET',
  PROPERTY = 'PROPERTY',
  VEHICLE = 'VEHICLE',
  GOLD_JEWELRY = 'GOLD_JEWELRY',
  FIXED_DEPOSIT = 'FIXED_DEPOSIT',
  PPF = 'PPF',
  NPS = 'NPS',
  CRYPTO = 'CRYPTO',
  OTHER = 'OTHER',
}

export enum Frequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

// Base Types
export interface BaseDocument {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Model Types
export interface User extends BaseDocument {
  email: string;
  name: string;
  currency: string;
  lockEnabled: boolean;
  pinHash?: string;
}

export interface Member extends BaseDocument {
  userId: string;
  name: string;
  type: MemberType;
  isActive: boolean;
}

export interface BankAccount extends BaseDocument {
  userId: string;
  bankName: string;
  accountHolderName: string;
  accountNumber?: string;
  openingBalance: number;
  currentBalance: number;
  minimumBalance?: number;
  minimumBalanceAlert: boolean;
  linkedMemberIds: string[];
  isActive: boolean;
}

export interface Card extends BaseDocument {
  userId: string;
  cardName: string;
  last4Digits?: string;
  billingCycleDay?: number;
  currentBalance: number;
  spendingLimit?: number;
  spendingLimitAlert: boolean;
  linkedBankId?: string;
  linkedMemberId?: string;
  isActive: boolean;
}

export interface Category extends BaseDocument {
  userId: string;
  name: string;
  type: CategoryType;
  isActive: boolean;
  icon?: string;
  color?: string;
}

export interface Transaction extends BaseDocument {
  userId: string;
  dateTime: Date;
  amount: number;
  note?: string;
  type: TransactionType;
  categoryId?: string;
  memberId?: string;
  sourceType?: AccountType;
  sourceBankId?: string;
  sourceCardId?: string;
  destinationType?: AccountType;
  destinationBankId?: string;
  destinationCardId?: string;
  destinationInvestmentId?: string;
}

export interface Investment extends BaseDocument {
  userId: string;
  name: string;
  type: InvestmentType;
  currentValue: number;
  isActive: boolean;
}

export interface ScheduledPayment extends BaseDocument {
  userId: string;
  isActive: boolean;
  frequency: Frequency;
  startDate: Date;
  nextRunDate: Date;
  lastRunDate?: Date;
  amount: number;
  note?: string;
  memberId?: string;
  sourceType: AccountType;
  sourceBankId?: string;
  sourceCardId?: string;
  destinationType: AccountType;
  destinationBankId?: string;
  destinationCardId?: string;
  destinationInvestmentId?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Dashboard Types
export interface DashboardSummary {
  totalBankBalance: number;
  totalCardBalance: number;
  totalInvestmentValue: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpense: number;
  recentTransactions: Transaction[];
}

// Form Types
export interface TransactionFormData {
  type: TransactionType;
  amount: number;
  dateTime: Date;
  categoryId?: string;
  memberId?: string;
  sourceType?: AccountType;
  sourceBankId?: string;
  sourceCardId?: string;
  destinationType?: AccountType;
  destinationBankId?: string;
  destinationCardId?: string;
  destinationInvestmentId?: string;
  note?: string;
}

export interface BankAccountFormData {
  bankName: string;
  accountHolderName: string;
  accountNumber?: string;
  openingBalance: number;
  linkedMemberIds?: string[];
}

export interface CardFormData {
  cardName: string;
  last4Digits?: string;
  billingCycleDay?: number;
  linkedBankId?: string;
  linkedMemberId?: string;
}

export interface MemberFormData {
  name: string;
  type: MemberType;
}

export interface InvestmentFormData {
  name: string;
  type: InvestmentType;
  currentValue?: number;
}

export interface CategoryFormData {
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
}

export interface ScheduledPaymentFormData {
  frequency: Frequency;
  startDate: Date;
  amount: number;
  note?: string;
  memberId?: string;
  sourceType: AccountType;
  sourceBankId?: string;
  sourceCardId?: string;
  destinationType: AccountType;
  destinationBankId?: string;
  destinationCardId?: string;
  destinationInvestmentId?: string;
}

// Filter Types
export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  memberId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}
