import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== 'production';
const devOrigins = process.env.ALLOWED_DEV_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  ...(isDev && devOrigins.length > 0 ? { allowedDevOrigins: devOrigins } : {}),
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', '@tanstack/react-query', 'recharts', 'zod'],
  },
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  
  // Compression
  compress: true,
  
  // Power bundler optimizations
  poweredByHeader: false,
  
  // React strict mode for better development
  reactStrictMode: true,
};

export default nextConfig;
