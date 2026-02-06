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
  
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
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
    cachedEnv = envSchema.parse(process.env);
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
};
