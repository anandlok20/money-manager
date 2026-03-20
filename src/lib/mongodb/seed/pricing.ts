import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb/client';
import User from '@/lib/mongodb/models/User';
import PricingConfig from '@/lib/mongodb/models/PricingConfig';
import Subscription from '@/lib/mongodb/models/Subscription';

/**
 * Seeds the admin user using environment variables (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME).
 * Returns null if env vars are not set — admin must be created through normal registration + manual DB role upgrade.
 */
export async function seedAdminUser(): Promise<InstanceType<typeof User> | null> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Admin';

  if (!adminEmail || !adminPassword) {
    // No admin env vars configured — skip seeding
    return null;
  }

  await connectToDatabase();

  let adminUser = await User.findOne({ email: adminEmail.toLowerCase() });

  if (!adminUser) {
    // First time — create admin user
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    adminUser = await User.create({
      email: adminEmail.toLowerCase(),
      passwordHash,
      name: adminName,
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
  } else if (adminUser.role !== 'admin') {
    // Promote existing user to admin
    adminUser.role = 'admin';
    await adminUser.save();
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
