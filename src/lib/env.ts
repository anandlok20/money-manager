import { z } from 'zod';

/**
 * Environment variable validation schema
 * Validates required environment variables at build/startup time
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

/**
 * Validate environment variables
 * Throws an error if validation fails
 */
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      console.error('❌ Invalid environment variables:');
      missingVars.forEach((msg) => console.error(`   - ${msg}`));
      
      // In development, just warn. In production, throw.
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Missing or invalid environment variables:\n${missingVars.join('\n')}`);
      }
    }
    throw error;
  }
}

// Validate and export environment variables
// This will run at module load time
export const env = validateEnv();

/**
 * Helper to check if a feature is enabled based on env vars
 */
export const features = {
  hasOpenAI: Boolean(env.OPENAI_API_KEY),
  hasGoogleAI: Boolean(env.GOOGLE_AI_API_KEY),
  hasCloudinary: Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET),
  hasCronSecret: Boolean(env.CRON_SECRET),
};
