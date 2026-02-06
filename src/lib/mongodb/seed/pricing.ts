import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb/client';
import User from '@/lib/mongodb/models/User';
import PricingConfig from '@/lib/mongodb/models/PricingConfig';
import Subscription from '@/lib/mongodb/models/Subscription';

// Admin credentials — used only for initial seeding
const ADMIN_EMAIL = 'anandlok@test.com';
const ADMIN_PASSWORD = 'Anand@20';
const ADMIN_NAME = 'AnandLok';

/**
 * Seeds the admin user on first login with hardcoded credentials.
 * On subsequent logins, just returns the existing admin user.
 */
export async function seedAdminUser() {
  await connectToDatabase();

  let adminUser = await User.findOne({ role: 'admin' });

  if (!adminUser) {
    // First time — create admin user
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    adminUser = await User.create({
      email: ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      name: ADMIN_NAME,
      currency: 'INR',
      role: 'admin',
      hasSelectedPlan: true,
      lockEnabled: false,
    });

    // Create admin subscription (premium by default)
    await Subscription.create({
      userId: adminUser._id,
      plan: 'premium',
      status: 'active',
      addons: [],
      startDate: new Date(),
    });
  } else {
    // Verify password for existing admin
    const isValid = await bcrypt.compare(ADMIN_PASSWORD, adminUser.passwordHash);
    if (!isValid) {
      // Update password if it was changed externally and someone uses original creds
      // This handles the case where admin creds are the initial bootstrap
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      adminUser.passwordHash = passwordHash;
      await adminUser.save();
    }
  }

  return adminUser;
}

/**
 * Default add-on definitions with Indian market pricing
 */
const defaultAddons = [
  {
    id: 'god-mode',
    name: 'देव God Mode',
    emoji: '🔱',
    description: 'Divine theme, Dharma Score, ⌘K Command Palette',
    price: 99,
    type: 'feature' as const,
    category: 'experience',
  },
  {
    id: 'trips',
    name: 'Trips',
    emoji: '✈️',
    description: 'Track travel expenses by trip',
    price: 49,
    type: 'feature' as const,
    category: 'modules',
  },
  {
    id: 'tax',
    name: 'Tax Manager',
    emoji: '🧾',
    description: 'Tax profile, deductions & filing',
    price: 79,
    type: 'feature' as const,
    category: 'modules',
  },
  {
    id: 'documents',
    name: 'Documents',
    emoji: '📄',
    description: 'Secure document vault',
    price: 39,
    type: 'feature' as const,
    category: 'modules',
  },
  {
    id: 'scheduled-payments',
    name: 'Scheduled Payments',
    emoji: '⏰',
    description: 'Recurring automated payments',
    price: 29,
    type: 'feature' as const,
    category: 'modules',
  },
  {
    id: 'vehicles',
    name: 'Vehicles',
    emoji: '🚗',
    description: 'Vehicle tracking & expenses',
    price: 29,
    type: 'feature' as const,
    category: 'modules',
  },
  {
    id: 'premium-themes',
    name: 'Premium Themes',
    emoji: '🎨',
    description: 'Unlock all 14 color themes',
    price: 49,
    type: 'feature' as const,
    category: 'experience',
  },
  {
    id: 'extra-member',
    name: 'Extra Member',
    emoji: '👤',
    description: 'Add one more family member',
    price: 29,
    type: 'stackable' as const,
    category: 'limits',
  },
  {
    id: 'extra-bank',
    name: 'Extra Bank Account',
    emoji: '🏦',
    description: 'Add one more bank account',
    price: 19,
    type: 'stackable' as const,
    category: 'limits',
  },
  {
    id: 'extra-card',
    name: 'Extra Card',
    emoji: '💳',
    description: 'Add one more card',
    price: 19,
    type: 'stackable' as const,
    category: 'limits',
  },
];

/**
 * Seeds the default pricing config if none exists.
 * Called during auth flow to ensure pricing is always available.
 */
export async function seedDefaultPricing() {
  await connectToDatabase();

  const existing = await PricingConfig.findOne({ isActive: true });
  if (existing) return existing;

  const config = await PricingConfig.create({
    freePlanPrice: 0,
    premiumPlanPrice: 199,
    freeLimits: {
      banks: 2,
      cards: 3,
      goals: 3,
      members: 2,
      investments: false,
      reports: false,
      freeThemes: ['default', 'baby', 'valentine'],
    },
    premiumLimits: {
      banks: 4,
      cards: 6,
      goals: 5,
      members: 5,
      investments: true,
      reports: true,
      freeThemes: ['default', 'baby', 'valentine'],
    },
    addons: defaultAddons,
    isActive: true,
  });

  return config;
}
