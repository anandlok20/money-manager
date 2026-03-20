import { z } from 'zod';

/**
 * Environment variable validation schema
 * Validates required environment variables at runtime
 */
const envSchema = z.object({
  // Database
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  
  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url().optional(),
  
  // Cron/Background jobs
  CRON_SECRET: z.string().optional(),
  
  // AI Services (optional)
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  
  // Cloudinary (optional)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Encryption / security (optional but enforced when present)
  DATA_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'DATA_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)').optional(),
  SENSITIVE_DATA_SECRET: z.string().min(32, 'SENSITIVE_DATA_SECRET must be at least 32 characters').optional(),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Validate Cloudinary all-or-nothing: partial config is a misconfiguration
const envSchemaWithRefinements = envSchema.superRefine((data, ctx) => {
  const cloudinaryVars = [data.CLOUDINARY_CLOUD_NAME, data.CLOUDINARY_API_KEY, data.CLOUDINARY_API_SECRET];
  const cloudinarySet = cloudinaryVars.filter(Boolean).length;
  if (cloudinarySet > 0 && cloudinarySet < 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Cloudinary requires all three vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
      path: ['CLOUDINARY_CLOUD_NAME'],
    });
  }
});

export type Env = z.infer<typeof envSchema>;

// Cache for validated env
let cachedEnv: Env | null = null;

/**
 * Get validated environment variables (lazy validation)
 * Only validates when first accessed at runtime, not at build time
 */
export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  try {
    cachedEnv = envSchemaWithRefinements.parse(process.env);
    return cachedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      console.error('❌ Invalid environment variables:');
      missingVars.forEach((msg) => console.error(`   - ${msg}`));
      throw new Error(`Missing or invalid environment variables:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
}

/**
 * Helper to check if a feature is enabled based on env vars
 * Uses lazy evaluation to avoid build-time errors
 */
export const features = {
  get hasOpenAI() { return Boolean(getEnv().OPENAI_API_KEY); },
  get hasGoogleAI() { return Boolean(getEnv().GOOGLE_AI_API_KEY); },
  get hasCloudinary() { 
    const e = getEnv();
    return Boolean(e.CLOUDINARY_CLOUD_NAME && e.CLOUDINARY_API_KEY && e.CLOUDINARY_API_SECRET); 
  },
  get hasCronSecret() { return Boolean(getEnv().CRON_SECRET); },
  get hasDataEncryption() { return Boolean(getEnv().DATA_ENCRYPTION_KEY); },
  get hasSensitiveDataSecret() { return Boolean(getEnv().SENSITIVE_DATA_SECRET); },
};
