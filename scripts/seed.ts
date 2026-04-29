/**
 * Seed Script for Money Manager
 * 
 * Run with: npx tsx scripts/seed.ts
 * 
 * Make sure you have the correct MONGODB_URI in your .env.local
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// ============ Schema Definitions ============

// Enums
enum MemberType {
  SELF = 'SELF',
  FAMILY = 'FAMILY',
  OTHER = 'OTHER',
}

enum CategoryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
  TRANSFER_SELF = 'TRANSFER_SELF',
  INVESTMENT_CONTRIBUTION = 'INVESTMENT_CONTRIBUTION',
}

enum InvestmentType {
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

enum Frequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

enum TripStatus {
  PLANNED = 'planned',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Schemas
const UserSchema = new mongoose.Schema({
  email: String,
  name: String,
  password: String,
  currency: { type: String, default: 'INR' },
  lockEnabled: { type: Boolean, default: false },
}, { timestamps: true });

const MemberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  type: { type: String, enum: Object.values(MemberType) },
  relationship: String,
  phone: String,
  email: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const CategorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  type: { type: String, enum: Object.values(CategoryType) },
  icon: String,
  color: String,
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

const BankAccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bankName: String,
  accountHolderName: String,
  accountNumber: String,
  ifscCode: String,
  upiId: String,
  openingBalance: { type: Number, default: 0 },
  currentBalance: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const CardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cardName: String,
  last4Digits: String,
  cardType: { type: String, default: 'credit' },
  billingCycleDay: Number,
  creditLimit: Number,
  currentBalance: { type: Number, default: 0 },
  linkedBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const InvestmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  type: { type: String, enum: Object.values(InvestmentType) },
  currentValue: { type: Number, default: 0 },
  investedAmount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dateTime: Date,
  amount: Number,
  type: { type: String, enum: Object.values(TransactionType) },
  note: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
  cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  tags: [String],
}, { timestamps: true });

const BudgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  amount: Number,
  period: { type: String, enum: ['monthly', 'yearly'] },
  alertThreshold: { type: Number, default: 80 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const GoalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  targetAmount: Number,
  currentAmount: { type: Number, default: 0 },
  deadline: Date,
  icon: String,
  color: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const TripSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  destination: String,
  description: String,
  startDate: Date,
  endDate: Date,
  budget: Number,
  status: { type: String, enum: Object.values(TripStatus), default: TripStatus.PLANNED },
  travelers: [{
    name: String,
    phone: String,
    email: String,
    isOrganizer: Boolean,
  }],
  tickets: [{
    type: { type: String, enum: ['flight', 'train', 'bus', 'other'] },
    title: String,
    departureLocation: String,
    arrivalLocation: String,
    departureTime: Date,
    price: Number,
  }],
  hotels: [{
    name: String,
    address: String,
    checkIn: Date,
    checkOut: Date,
    price: Number,
  }],
  placesToVisit: [{
    name: String,
    category: String,
    priority: String,
    visited: Boolean,
  }],
}, { timestamps: true });

const ScheduledPaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  amount: Number,
  frequency: { type: String, enum: Object.values(Frequency) },
  nextDueDate: Date,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
  isActive: { type: Boolean, default: true },
  autoProcess: { type: Boolean, default: false },
}, { timestamps: true });

const VehicleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  type: { type: String, enum: ['car', 'motorcycle', 'scooter', 'bicycle', 'other'] },
  make: String,
  model: String,
  year: Number,
  registrationNumber: String,
  fuelType: String,
  purchaseDate: Date,
  purchasePrice: Number,
  currentValue: Number,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const DocumentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  type: String,
  category: String,
  description: String,
  fileUrl: String,
  expiryDate: Date,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Models
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Member = mongoose.models.Member || mongoose.model('Member', MemberSchema);
const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
const BankAccount = mongoose.models.BankAccount || mongoose.model('BankAccount', BankAccountSchema);
const Card = mongoose.models.Card || mongoose.model('Card', CardSchema);
const Investment = mongoose.models.Investment || mongoose.model('Investment', InvestmentSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
const Budget = mongoose.models.Budget || mongoose.model('Budget', BudgetSchema);
const Goal = mongoose.models.Goal || mongoose.model('Goal', GoalSchema);
const Trip = mongoose.models.Trip || mongoose.model('Trip', TripSchema);
const ScheduledPayment = mongoose.models.ScheduledPayment || mongoose.model('ScheduledPayment', ScheduledPaymentSchema);
const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);
const Document = mongoose.models.Document || mongoose.model('Document', DocumentSchema);

// ============ Seed Data ============

async function seed() {
  try {
    console.info('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.info('✅ Connected to MongoDB');

    // Get or create test user
    let user = await User.findOne({ email: 'test@example.com' });
    if (!user) {
      console.info('📝 Creating test user...');
      user = await User.create({
        email: 'test@example.com',
        name: 'Test User',
        password: '$2b$10$hashedpassword', // In real app, use bcrypt
        currency: 'INR',
      });
    }
    const userId = user._id;
    console.info(`👤 Using user: ${user.email} (${userId})`);

    // Clear existing data for this user
    console.info('🧹 Clearing existing test data...');
    await Promise.all([
      Member.deleteMany({ userId }),
      Category.deleteMany({ userId }),
      BankAccount.deleteMany({ userId }),
      Card.deleteMany({ userId }),
      Investment.deleteMany({ userId }),
      Transaction.deleteMany({ userId }),
      Budget.deleteMany({ userId }),
      Goal.deleteMany({ userId }),
      Trip.deleteMany({ userId }),
      ScheduledPayment.deleteMany({ userId }),
      Vehicle.deleteMany({ userId }),
      Document.deleteMany({ userId }),
    ]);

    // ============ Members ============
    console.info('👥 Creating members...');
    const members = await Member.insertMany([
      { userId, name: 'Self', type: MemberType.SELF, isActive: true },
      { userId, name: 'Priya Sharma', type: MemberType.FAMILY, relationship: 'Spouse', phone: '+91 98765 43210', email: 'priya@email.com' },
      { userId, name: 'Rohan Sharma', type: MemberType.FAMILY, relationship: 'Child', phone: '+91 98765 43211' },
      { userId, name: 'Parents', type: MemberType.FAMILY, relationship: 'Parent' },
      { userId, name: 'Rahul Kumar', type: MemberType.OTHER, relationship: 'Friend', phone: '+91 98765 43212' },
    ]);
    console.info(`   ✅ Created ${members.length} members`);

    // ============ Categories ============
    console.info('🏷️ Creating categories...');
    const expenseCategories = await Category.insertMany([
      { userId, name: 'Food & Dining', type: CategoryType.EXPENSE, icon: 'Utensils', color: '#ef4444' },
      { userId, name: 'Groceries', type: CategoryType.EXPENSE, icon: 'ShoppingCart', color: '#f97316' },
      { userId, name: 'Transportation', type: CategoryType.EXPENSE, icon: 'Car', color: '#eab308' },
      { userId, name: 'Fuel', type: CategoryType.EXPENSE, icon: 'Fuel', color: '#84cc16' },
      { userId, name: 'Shopping', type: CategoryType.EXPENSE, icon: 'ShoppingBag', color: '#22c55e' },
      { userId, name: 'Entertainment', type: CategoryType.EXPENSE, icon: 'Film', color: '#14b8a6' },
      { userId, name: 'Health & Medical', type: CategoryType.EXPENSE, icon: 'Heart', color: '#06b6d4' },
      { userId, name: 'Education', type: CategoryType.EXPENSE, icon: 'GraduationCap', color: '#3b82f6' },
      { userId, name: 'Bills & Utilities', type: CategoryType.EXPENSE, icon: 'Zap', color: '#8b5cf6' },
      { userId, name: 'Rent', type: CategoryType.EXPENSE, icon: 'Home', color: '#a855f7' },
      { userId, name: 'Insurance', type: CategoryType.EXPENSE, icon: 'Shield', color: '#d946ef' },
      { userId, name: 'Travel', type: CategoryType.EXPENSE, icon: 'Plane', color: '#ec4899' },
      { userId, name: 'Personal Care', type: CategoryType.EXPENSE, icon: 'Sparkles', color: '#f43f5e' },
      { userId, name: 'Gifts', type: CategoryType.EXPENSE, icon: 'Gift', color: '#fb7185' },
      { userId, name: 'Subscriptions', type: CategoryType.EXPENSE, icon: 'CreditCard', color: '#64748b' },
      { userId, name: 'Other Expense', type: CategoryType.EXPENSE, icon: 'MoreHorizontal', color: '#94a3b8' },
    ]);

    const incomeCategories = await Category.insertMany([
      { userId, name: 'Salary', type: CategoryType.INCOME, icon: 'Briefcase', color: '#22c55e' },
      { userId, name: 'Freelance', type: CategoryType.INCOME, icon: 'Laptop', color: '#10b981' },
      { userId, name: 'Business', type: CategoryType.INCOME, icon: 'Building2', color: '#14b8a6' },
      { userId, name: 'Investment Returns', type: CategoryType.INCOME, icon: 'TrendingUp', color: '#06b6d4' },
      { userId, name: 'Rental Income', type: CategoryType.INCOME, icon: 'Home', color: '#0ea5e9' },
      { userId, name: 'Dividends', type: CategoryType.INCOME, icon: 'PiggyBank', color: '#3b82f6' },
      { userId, name: 'Interest', type: CategoryType.INCOME, icon: 'Percent', color: '#6366f1' },
      { userId, name: 'Cashback', type: CategoryType.INCOME, icon: 'BadgePercent', color: '#8b5cf6' },
      { userId, name: 'Gift Received', type: CategoryType.INCOME, icon: 'Gift', color: '#a855f7' },
      { userId, name: 'Other Income', type: CategoryType.INCOME, icon: 'Plus', color: '#64748b' },
    ]);
    console.info(`   ✅ Created ${expenseCategories.length + incomeCategories.length} categories`);

    // ============ Bank Accounts ============
    console.info('🏦 Creating bank accounts...');
    const bankAccounts = await BankAccount.insertMany([
      { userId, bankName: 'HDFC Bank', accountHolderName: 'Test User', accountNumber: '1234567890', ifscCode: 'HDFC0001234', upiId: 'testuser@hdfcbank', openingBalance: 150000, currentBalance: 185000 },
      { userId, bankName: 'ICICI Bank', accountHolderName: 'Test User', accountNumber: '9876543210', ifscCode: 'ICIC0001234', upiId: 'testuser@icici', openingBalance: 75000, currentBalance: 92500 },
      { userId, bankName: 'SBI', accountHolderName: 'Test User', accountNumber: '5555666677', ifscCode: 'SBIN0001234', openingBalance: 50000, currentBalance: 48000 },
      { userId, bankName: 'Kotak Mahindra', accountHolderName: 'Test User', accountNumber: '1111222233', ifscCode: 'KKBK0001234', upiId: 'testuser@kotak', openingBalance: 25000, currentBalance: 31000 },
    ]);
    console.info(`   ✅ Created ${bankAccounts.length} bank accounts`);

    // ============ Cards ============
    console.info('💳 Creating cards...');
    const cards = await Card.insertMany([
      { userId, cardName: 'HDFC Regalia', last4Digits: '4567', cardType: 'credit', billingCycleDay: 15, creditLimit: 300000, currentBalance: 45000, linkedBankId: bankAccounts[0]._id },
      { userId, cardName: 'Amazon Pay ICICI', last4Digits: '8901', cardType: 'credit', billingCycleDay: 1, creditLimit: 150000, currentBalance: 12500, linkedBankId: bankAccounts[1]._id },
      { userId, cardName: 'SBI SimplyCLICK', last4Digits: '2345', cardType: 'credit', billingCycleDay: 20, creditLimit: 100000, currentBalance: 8000, linkedBankId: bankAccounts[2]._id },
      { userId, cardName: 'HDFC Debit Card', last4Digits: '6789', cardType: 'debit', linkedBankId: bankAccounts[0]._id },
    ]);
    console.info(`   ✅ Created ${cards.length} cards`);

    // ============ Investments ============
    console.info('📈 Creating investments...');
    const investments = await Investment.insertMany([
      { userId, name: 'HDFC Flexi Cap Fund', type: InvestmentType.MUTUAL_FUND, currentValue: 250000, investedAmount: 200000 },
      { userId, name: 'Axis Bluechip Fund', type: InvestmentType.MUTUAL_FUND, currentValue: 180000, investedAmount: 150000 },
      { userId, name: 'Reliance Industries', type: InvestmentType.SHARE_MARKET, currentValue: 85000, investedAmount: 70000 },
      { userId, name: 'Infosys', type: InvestmentType.SHARE_MARKET, currentValue: 62000, investedAmount: 55000 },
      { userId, name: 'TCS', type: InvestmentType.SHARE_MARKET, currentValue: 48000, investedAmount: 45000 },
      { userId, name: 'LIC Policy', type: InvestmentType.INSURANCE, currentValue: 500000, investedAmount: 450000 },
      { userId, name: 'Term Insurance - HDFC', type: InvestmentType.INSURANCE, currentValue: 0, investedAmount: 25000 },
      { userId, name: 'PPF Account', type: InvestmentType.PPF, currentValue: 350000, investedAmount: 300000 },
      { userId, name: 'NPS Account', type: InvestmentType.NPS, currentValue: 180000, investedAmount: 150000 },
      { userId, name: 'SBI FD - 3 Year', type: InvestmentType.FIXED_DEPOSIT, currentValue: 115000, investedAmount: 100000 },
      { userId, name: 'Gold - Physical', type: InvestmentType.GOLD_JEWELRY, currentValue: 200000, investedAmount: 150000 },
      { userId, name: 'Bitcoin', type: InvestmentType.CRYPTO, currentValue: 45000, investedAmount: 30000 },
      { userId, name: 'Ethereum', type: InvestmentType.CRYPTO, currentValue: 25000, investedAmount: 20000 },
    ]);
    console.info(`   ✅ Created ${investments.length} investments`);

    // ============ Transactions ============
    console.info('💸 Creating transactions...');
    const today = new Date();
    const transactions = [];

    // Generate transactions for the last 6 months
    for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
      
      // Salary income (1st of every month)
      transactions.push({
        userId,
        dateTime: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 10, 0),
        amount: 150000,
        type: TransactionType.INCOME,
        note: 'Monthly Salary',
        categoryId: incomeCategories[0]._id,
        bankAccountId: bankAccounts[0]._id,
        memberId: members[0]._id,
      });

      // Rent (5th of every month)
      transactions.push({
        userId,
        dateTime: new Date(monthDate.getFullYear(), monthDate.getMonth(), 5, 11, 0),
        amount: 25000,
        type: TransactionType.EXPENSE,
        note: 'Monthly Rent',
        categoryId: expenseCategories.find(c => c.name === 'Rent')?._id,
        bankAccountId: bankAccounts[0]._id,
      });

      // Utility bills
      transactions.push({
        userId,
        dateTime: new Date(monthDate.getFullYear(), monthDate.getMonth(), 8, 14, 30),
        amount: 2500 + Math.random() * 1000,
        type: TransactionType.EXPENSE,
        note: 'Electricity Bill',
        categoryId: expenseCategories.find(c => c.name === 'Bills & Utilities')?._id,
        bankAccountId: bankAccounts[0]._id,
        tags: ['bills', 'electricity'],
      });

      transactions.push({
        userId,
        dateTime: new Date(monthDate.getFullYear(), monthDate.getMonth(), 10, 15, 0),
        amount: 800 + Math.random() * 200,
        type: TransactionType.EXPENSE,
        note: 'Internet Bill - Jio Fiber',
        categoryId: expenseCategories.find(c => c.name === 'Bills & Utilities')?._id,
        bankAccountId: bankAccounts[1]._id,
        tags: ['bills', 'internet'],
      });

      // Groceries (multiple times)
      for (let i = 0; i < 4; i++) {
        transactions.push({
          userId,
          dateTime: new Date(monthDate.getFullYear(), monthDate.getMonth(), 7 + i * 7, 11, 30),
          amount: 3000 + Math.random() * 2000,
          type: TransactionType.EXPENSE,
          note: ['DMart Shopping', 'BigBasket Order', 'Zepto Groceries', 'Local Market'][i],
          categoryId: expenseCategories.find(c => c.name === 'Groceries')?._id,
          bankAccountId: bankAccounts[Math.floor(Math.random() * 2)]._id,
          cardId: Math.random() > 0.5 ? cards[0]._id : undefined,
          tags: ['groceries'],
        });
      }

      // Food & Dining
      for (let i = 0; i < 8; i++) {
        const day = Math.floor(Math.random() * 28) + 1;
        transactions.push({
          userId,
          dateTime: new Date(monthDate.getFullYear(), monthDate.getMonth(), day, 13 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60)),
          amount: 200 + Math.random() * 1500,
          type: TransactionType.EXPENSE,
          note: ['Swiggy Order', 'Zomato Order', 'Restaurant Dinner', 'Cafe Coffee Day', 'Dominos Pizza', 'KFC', 'McDonalds', 'Local Restaurant'][i],
          categoryId: expenseCategories.find(c => c.name === 'Food & Dining')?._id,
          bankAccountId: bankAccounts[Math.floor(Math.random() * 2)]._id,
          cardId: Math.random() > 0.6 ? cards[Math.floor(Math.random() * 3)]._id : undefined,
          memberId: Math.random() > 0.7 ? members[Math.floor(Math.random() * 3)]._id : undefined,
          tags: ['food'],
        });
      }

      // Fuel
      for (let i = 0; i < 3; i++) {
        transactions.push({
          userId,
          dateTime: new Date(monthDate.getFullYear(), monthDate.getMonth(), 5 + i * 10, 8, 30),
          amount: 2000 + Math.random() * 1500,
          type: TransactionType.EXPENSE,
          note: 'Petrol - HP',
          categoryId: expenseCategories.find(c => c.name === 'Fuel')?._id,
          bankAccountId: bankAccounts[0]._id,
          tags: ['fuel', 'car'],
        });
      }

      // Shopping (1-2 times per month)
      if (Math.random() > 0.3) {
        transactions.push({
          userId,
          dateTime: new Date(monthDate.getFullYear(), monthDate.getMonth(), 15 + Math.floor(Math.random() * 10), 16, 0),
          amount: 2000 + Math.random() * 8000,
          type: TransactionType.EXPENSE,
          note: ['Amazon Purchase', 'Flipkart Order', 'Myntra Shopping', 'Mall Shopping'][Math.floor(Math.random() * 4)],
          categoryId: expenseCategories.find(c => c.name === 'Shopping')?._id,
          cardId: cards[Math.floor(Math.random() * 3)]._id,
          tags: ['shopping', 'online'],
        });
      }

      // Entertainment
      transactions.push({
        userId,
        dateTime: new Date(monthDate.getFullYear(), monthDate.getMonth(), 20, 19, 0),
        amount: 500 + Math.random() * 1000,
        type: TransactionType.EXPENSE,
        note: 'Netflix Subscription',
        categoryId: expenseCategories.find(c => c.name === 'Subscriptions')?._id,
        cardId: cards[1]._id,
        tags: ['subscription', 'entertainment'],
      });

      // Medical (occasional)
      if (Math.random() > 0.5) {
        transactions.push({
          userId,
          dateTime: new Date(monthDate.getFullYear(), monthDate.getMonth(), Math.floor(Math.random() * 28) + 1, 10, 0),
          amount: 500 + Math.random() * 2000,
          type: TransactionType.EXPENSE,
          note: ['Apollo Pharmacy', 'Doctor Consultation', 'Lab Tests', 'Medicine'][Math.floor(Math.random() * 4)],
          categoryId: expenseCategories.find(c => c.name === 'Health & Medical')?._id,
          bankAccountId: bankAccounts[0]._id,
          tags: ['health', 'medical'],
        });
      }

      // Investment income (dividends, interest)
      if (monthOffset % 3 === 0) {
        transactions.push({
          userId,
          dateTime: new Date(monthDate.getFullYear(), monthDate.getMonth(), 25, 12, 0),
          amount: 5000 + Math.random() * 3000,
          type: TransactionType.INCOME,
          note: 'Dividend - Reliance Industries',
          categoryId: incomeCategories.find(c => c.name === 'Dividends')?._id,
          bankAccountId: bankAccounts[0]._id,
        });
      }

      // Freelance income (occasional)
      if (Math.random() > 0.6) {
        transactions.push({
          userId,
          dateTime: new Date(monthDate.getFullYear(), monthDate.getMonth(), 15 + Math.floor(Math.random() * 10), 14, 0),
          amount: 15000 + Math.random() * 25000,
          type: TransactionType.INCOME,
          note: 'Freelance Project Payment',
          categoryId: incomeCategories.find(c => c.name === 'Freelance')?._id,
          bankAccountId: bankAccounts[1]._id,
        });
      }

      // Cashback
      transactions.push({
        userId,
        dateTime: new Date(monthDate.getFullYear(), monthDate.getMonth(), 28, 10, 0),
        amount: 200 + Math.random() * 500,
        type: TransactionType.INCOME,
        note: 'Credit Card Cashback',
        categoryId: incomeCategories.find(c => c.name === 'Cashback')?._id,
        bankAccountId: bankAccounts[0]._id,
      });
    }

    await Transaction.insertMany(transactions);
    console.info(`   ✅ Created ${transactions.length} transactions`);

    // ============ Budgets ============
    console.info('📊 Creating budgets...');
    const budgets = await Budget.insertMany([
      { userId, name: 'Food Budget', categoryId: expenseCategories.find(c => c.name === 'Food & Dining')?._id, amount: 15000, period: 'monthly', alertThreshold: 80 },
      { userId, name: 'Groceries Budget', categoryId: expenseCategories.find(c => c.name === 'Groceries')?._id, amount: 12000, period: 'monthly', alertThreshold: 75 },
      { userId, name: 'Shopping Budget', categoryId: expenseCategories.find(c => c.name === 'Shopping')?._id, amount: 10000, period: 'monthly', alertThreshold: 90 },
      { userId, name: 'Entertainment Budget', categoryId: expenseCategories.find(c => c.name === 'Entertainment')?._id, amount: 5000, period: 'monthly', alertThreshold: 80 },
      { userId, name: 'Transportation Budget', categoryId: expenseCategories.find(c => c.name === 'Transportation')?._id, amount: 8000, period: 'monthly', alertThreshold: 85 },
      { userId, name: 'Fuel Budget', categoryId: expenseCategories.find(c => c.name === 'Fuel')?._id, amount: 7000, period: 'monthly', alertThreshold: 80 },
    ]);
    console.info(`   ✅ Created ${budgets.length} budgets`);

    // ============ Goals ============
    console.info('🎯 Creating goals...');
    const goals = await Goal.insertMany([
      { userId, name: 'Emergency Fund', targetAmount: 500000, currentAmount: 185000, deadline: new Date('2026-12-31'), icon: '🏦', color: '#22c55e' },
      { userId, name: 'New Car', targetAmount: 1500000, currentAmount: 450000, deadline: new Date('2027-06-30'), icon: '🚗', color: '#3b82f6' },
      { userId, name: 'Europe Trip', targetAmount: 300000, currentAmount: 85000, deadline: new Date('2026-06-30'), icon: '✈️', color: '#8b5cf6' },
      { userId, name: 'Home Down Payment', targetAmount: 2000000, currentAmount: 750000, deadline: new Date('2028-12-31'), icon: '🏠', color: '#f59e0b' },
      { userId, name: 'Kids Education', targetAmount: 1000000, currentAmount: 200000, deadline: new Date('2030-04-01'), icon: '🎓', color: '#ec4899' },
    ]);
    console.info(`   ✅ Created ${goals.length} goals`);

    // ============ Trips ============
    console.info('✈️ Creating trips...');
    const trips = await Trip.insertMany([
      {
        userId,
        name: 'Goa Beach Vacation',
        destination: 'Goa, India',
        description: 'Annual family beach vacation',
        startDate: new Date('2026-03-15'),
        endDate: new Date('2026-03-20'),
        budget: 80000,
        status: TripStatus.PLANNED,
        travelers: [
          { name: 'Test User', phone: '+91 98765 43210', isOrganizer: true },
          { name: 'Priya Sharma', phone: '+91 98765 43211' },
          { name: 'Rohan Sharma' },
        ],
        tickets: [
          { type: 'flight', title: 'Delhi to Goa', departureLocation: 'Delhi', arrivalLocation: 'Goa', departureTime: new Date('2026-03-15T06:00:00'), price: 8500 },
          { type: 'flight', title: 'Goa to Delhi', departureLocation: 'Goa', arrivalLocation: 'Delhi', departureTime: new Date('2026-03-20T18:00:00'), price: 9000 },
        ],
        hotels: [
          { name: 'Taj Exotica', address: 'Benaulim Beach, South Goa', checkIn: new Date('2026-03-15'), checkOut: new Date('2026-03-20'), price: 45000 },
        ],
        placesToVisit: [
          { name: 'Baga Beach', category: 'nature', priority: 'must-visit', visited: false },
          { name: 'Fort Aguada', category: 'cultural', priority: 'must-visit', visited: false },
          { name: 'Dudhsagar Falls', category: 'nature', priority: 'nice-to-have', visited: false },
          { name: 'Anjuna Flea Market', category: 'shopping', priority: 'optional', visited: false },
        ],
      },
      {
        userId,
        name: 'Manali Adventure',
        destination: 'Manali, Himachal Pradesh',
        description: 'Weekend adventure trip',
        startDate: new Date('2025-12-20'),
        endDate: new Date('2025-12-25'),
        budget: 50000,
        status: TripStatus.COMPLETED,
        travelers: [
          { name: 'Test User', isOrganizer: true },
          { name: 'Rahul Kumar', phone: '+91 98765 43212' },
        ],
        placesToVisit: [
          { name: 'Solang Valley', category: 'nature', priority: 'must-visit', visited: true },
          { name: 'Rohtang Pass', category: 'nature', priority: 'must-visit', visited: true },
          { name: 'Hadimba Temple', category: 'cultural', priority: 'must-visit', visited: true },
        ],
      },
      {
        userId,
        name: 'Thailand Trip',
        destination: 'Bangkok & Phuket, Thailand',
        description: 'International vacation',
        startDate: new Date('2026-11-10'),
        endDate: new Date('2026-11-18'),
        budget: 200000,
        status: TripStatus.PLANNED,
        travelers: [
          { name: 'Test User', isOrganizer: true },
          { name: 'Priya Sharma' },
        ],
      },
    ]);
    console.info(`   ✅ Created ${trips.length} trips`);

    // ============ Scheduled Payments ============
    console.info('📅 Creating scheduled payments...');
    const scheduledPayments = await ScheduledPayment.insertMany([
      { userId, name: 'House Rent', amount: 25000, frequency: Frequency.MONTHLY, nextDueDate: new Date('2026-02-05'), categoryId: expenseCategories.find(c => c.name === 'Rent')?._id, bankAccountId: bankAccounts[0]._id, isActive: true },
      { userId, name: 'Electricity Bill', amount: 3000, frequency: Frequency.MONTHLY, nextDueDate: new Date('2026-02-08'), categoryId: expenseCategories.find(c => c.name === 'Bills & Utilities')?._id, bankAccountId: bankAccounts[0]._id, isActive: true },
      { userId, name: 'Internet Bill', amount: 999, frequency: Frequency.MONTHLY, nextDueDate: new Date('2026-02-10'), categoryId: expenseCategories.find(c => c.name === 'Bills & Utilities')?._id, bankAccountId: bankAccounts[1]._id, isActive: true },
      { userId, name: 'Netflix', amount: 649, frequency: Frequency.MONTHLY, nextDueDate: new Date('2026-02-15'), categoryId: expenseCategories.find(c => c.name === 'Subscriptions')?._id, cardId: cards[1]._id, isActive: true, autoProcess: true },
      { userId, name: 'Amazon Prime', amount: 1499, frequency: Frequency.YEARLY, nextDueDate: new Date('2026-08-01'), categoryId: expenseCategories.find(c => c.name === 'Subscriptions')?._id, cardId: cards[1]._id, isActive: true },
      { userId, name: 'Car Insurance', amount: 15000, frequency: Frequency.YEARLY, nextDueDate: new Date('2026-06-15'), categoryId: expenseCategories.find(c => c.name === 'Insurance')?._id, bankAccountId: bankAccounts[0]._id, isActive: true },
      { userId, name: 'SIP - HDFC Flexi Cap', amount: 10000, frequency: Frequency.MONTHLY, nextDueDate: new Date('2026-02-05'), categoryId: expenseCategories.find(c => c.name === 'Other Expense')?._id, bankAccountId: bankAccounts[0]._id, isActive: true, autoProcess: true },
      { userId, name: 'SIP - Axis Bluechip', amount: 5000, frequency: Frequency.MONTHLY, nextDueDate: new Date('2026-02-10'), categoryId: expenseCategories.find(c => c.name === 'Other Expense')?._id, bankAccountId: bankAccounts[1]._id, isActive: true, autoProcess: true },
    ]);
    console.info(`   ✅ Created ${scheduledPayments.length} scheduled payments`);

    // ============ Vehicles ============
    console.info('🚗 Creating vehicles...');
    const vehicles = await Vehicle.insertMany([
      { userId, name: 'My Honda City', type: 'car', make: 'Honda', model: 'City', year: 2022, registrationNumber: 'DL 01 AB 1234', fuelType: 'Petrol', purchaseDate: new Date('2022-03-15'), purchasePrice: 1200000, currentValue: 950000 },
      { userId, name: 'Royal Enfield Classic', type: 'motorcycle', make: 'Royal Enfield', model: 'Classic 350', year: 2021, registrationNumber: 'DL 02 CD 5678', fuelType: 'Petrol', purchaseDate: new Date('2021-08-20'), purchasePrice: 195000, currentValue: 150000 },
      { userId, name: 'TVS Jupiter', type: 'scooter', make: 'TVS', model: 'Jupiter 125', year: 2023, registrationNumber: 'DL 03 EF 9012', fuelType: 'Petrol', purchaseDate: new Date('2023-05-10'), purchasePrice: 85000, currentValue: 70000 },
    ]);
    console.info(`   ✅ Created ${vehicles.length} vehicles`);

    // ============ Documents ============
    console.info('📄 Creating documents...');
    const documents = await Document.insertMany([
      { userId, name: 'Passport', type: 'identity', category: 'Personal', description: 'Indian Passport', expiryDate: new Date('2032-06-15') },
      { userId, name: 'Aadhar Card', type: 'identity', category: 'Personal', description: 'UIDAI Aadhar Card' },
      { userId, name: 'PAN Card', type: 'identity', category: 'Personal', description: 'Income Tax PAN' },
      { userId, name: 'Driving License', type: 'identity', category: 'Personal', description: 'DL for LMV', expiryDate: new Date('2028-03-20') },
      { userId, name: 'Car RC', type: 'vehicle', category: 'Vehicle', description: 'Honda City Registration Certificate' },
      { userId, name: 'Car Insurance', type: 'insurance', category: 'Vehicle', description: 'Comprehensive Insurance', expiryDate: new Date('2026-06-15') },
      { userId, name: 'Health Insurance', type: 'insurance', category: 'Insurance', description: 'Family Floater - 10L Cover', expiryDate: new Date('2026-09-30') },
      { userId, name: 'Home Rent Agreement', type: 'legal', category: 'Property', description: '11 Month Rent Agreement', expiryDate: new Date('2026-04-30') },
      { userId, name: 'Employment Contract', type: 'legal', category: 'Work', description: 'Current Job Offer Letter' },
      { userId, name: 'Degree Certificate', type: 'education', category: 'Education', description: 'B.Tech Degree Certificate' },
    ]);
    console.info(`   ✅ Created ${documents.length} documents`);

    // ============ Summary ============
    console.info('\n🎉 Seed completed successfully!');
    console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.info(`   👤 User: test@example.com`);
    console.info(`   👥 Members: ${members.length}`);
    console.info(`   🏷️ Categories: ${expenseCategories.length + incomeCategories.length}`);
    console.info(`   🏦 Bank Accounts: ${bankAccounts.length}`);
    console.info(`   💳 Cards: ${cards.length}`);
    console.info(`   📈 Investments: ${investments.length}`);
    console.info(`   💸 Transactions: ${transactions.length}`);
    console.info(`   📊 Budgets: ${budgets.length}`);
    console.info(`   🎯 Goals: ${goals.length}`);
    console.info(`   ✈️ Trips: ${trips.length}`);
    console.info(`   📅 Scheduled Payments: ${scheduledPayments.length}`);
    console.info(`   🚗 Vehicles: ${vehicles.length}`);
    console.info(`   📄 Documents: ${documents.length}`);
    console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.info('\n💡 Login with: test@example.com (create this user via registration)');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.info('\n🔌 Disconnected from MongoDB');
  }
}

// Run the seed
seed().catch(console.error);
