import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env' });
dotenv.config({ path: '.env' }); // Local override

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    // Redis
    UPSTASH_REDIS_REST_URL: z.string().min(1, 'UPSTASH_REDIS_REST_URL is required'),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required'),

    // Google OAuth
    GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
    GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
    GOOGLE_CALLBACK_URL: z.string().url('GOOGLE_CALLBACK_URL must be a valid URL'),

    // Razorpay
    RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required'),
    RAZORPAY_KEY_SECRET: z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

    // Cloudflare R2
    R2_ACCOUNT_ID: z.string().min(1, 'R2_ACCOUNT_ID is required'),
    R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID is required'),
    R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY is required'),
    R2_BUCKET_NAME: z.string().default('shasansetu-documents'),

    // JWT
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('7d'),

    // Application
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    API_PORT: z.string().default('3001'),
    WEB_URL: z.string().url().default('http://localhost:3000'),
    API_URL: z.string().url().default('http://localhost:3001'),
});

// Parse and validate environment
const parseEnv = () => {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missingVars = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
            console.error('❌ Environment validation failed:');
            missingVars.forEach(v => console.error(`  - ${v}`));

            // In development, allow missing vars with warning
            if (process.env.NODE_ENV !== 'production') {
                console.warn('⚠️ Running in development mode with missing env vars');
                return envSchema.partial().parse(process.env) as z.infer<typeof envSchema>;
            }

            process.exit(1);
        }
        throw error;
    }
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
