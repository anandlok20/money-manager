import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb/client';
import User from '@/lib/mongodb/models/User';
import Member from '@/lib/mongodb/models/Member';
import Category from '@/lib/mongodb/models/Category';
import { MemberType, CategoryType } from '@/types';

// Default categories to create for new users
const defaultCategories = [
  // Income categories
  { name: 'Salary', type: CategoryType.INCOME, icon: 'Briefcase', color: '#22c55e' },
  { name: 'Freelance', type: CategoryType.INCOME, icon: 'Laptop', color: '#16a34a' },
  { name: 'Investment Returns', type: CategoryType.INCOME, icon: 'TrendingUp', color: '#15803d' },
  { name: 'Gifts', type: CategoryType.INCOME, icon: 'Gift', color: '#14532d' },
  { name: 'Other Income', type: CategoryType.INCOME, icon: 'Plus', color: '#166534' },
  // Expense categories
  { name: 'Food & Dining', type: CategoryType.EXPENSE, icon: 'Utensils', color: '#ef4444' },
  { name: 'Shopping', type: CategoryType.EXPENSE, icon: 'ShoppingBag', color: '#f97316' },
  { name: 'Transportation', type: CategoryType.EXPENSE, icon: 'Car', color: '#eab308' },
  { name: 'Entertainment', type: CategoryType.EXPENSE, icon: 'Film', color: '#a855f7' },
  { name: 'Utilities', type: CategoryType.EXPENSE, icon: 'Zap', color: '#3b82f6' },
  { name: 'Healthcare', type: CategoryType.EXPENSE, icon: 'Heart', color: '#ec4899' },
  { name: 'Education', type: CategoryType.EXPENSE, icon: 'GraduationCap', color: '#6366f1' },
  { name: 'Rent', type: CategoryType.EXPENSE, icon: 'Home', color: '#0ea5e9' },
  { name: 'Insurance', type: CategoryType.EXPENSE, icon: 'Shield', color: '#14b8a6' },
  { name: 'Personal Care', type: CategoryType.EXPENSE, icon: 'User', color: '#f43f5e' },
  { name: 'Subscriptions', type: CategoryType.EXPENSE, icon: 'CreditCard', color: '#8b5cf6' },
  { name: 'Travel', type: CategoryType.EXPENSE, icon: 'Plane', color: '#06b6d4' },
  { name: 'Other Expense', type: CategoryType.EXPENSE, icon: 'MoreHorizontal', color: '#6b7280' },
];

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        await connectToDatabase();

        const user = await User.findOne({ email: credentials.email.toLowerCase() });

        if (!user) {
          throw new Error('No user found with this email');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          currency: user.currency,
          lockEnabled: user.lockEnabled,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.currency = (user as unknown as { currency: string }).currency;
        token.lockEnabled = (user as unknown as { lockEnabled: boolean }).lockEnabled;
      }

      // Handle updates to the session
      if (trigger === 'update' && session) {
        token.name = session.name ?? token.name;
        token.currency = session.currency ?? token.currency;
        token.lockEnabled = session.lockEnabled ?? token.lockEnabled;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        (session.user as unknown as { currency: string }).currency = token.currency as string;
        (session.user as unknown as { lockEnabled: boolean }).lockEnabled = token.lockEnabled as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Helper function to register a new user
export async function registerUser(name: string, email: string, password: string) {
  await connectToDatabase();

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    name,
    currency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || 'INR',
    lockEnabled: false,
  });

  // Create default "Self" member
  await Member.create({
    userId: user._id,
    name: name,
    type: MemberType.SELF,
    isActive: true,
  });

  // Create default categories
  const categoriesToCreate = defaultCategories.map((cat) => ({
    ...cat,
    userId: user._id,
    isActive: true,
  }));
  await Category.insertMany(categoriesToCreate);

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    currency: user.currency,
  };
}

export default authOptions;
