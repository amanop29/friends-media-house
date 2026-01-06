import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-*.r2.dev',
        port: '',
        pathname: '/**',
      },
      {
    protocol: 'https',
    hostname: 'media.friendsmediahouse.com',
    pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|webp|avif)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // Enable React Server Components
  reactStrictMode: true,
  // TypeScript configuration - set to false before production
  typescript: {
    ignoreBuildErrors: true, // TODO: Fix TypeScript errors and set to false
  },
  // Configure experimental features
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'framer-motion'],
  },
  // Turbopack configuration (moved from experimental.turbo)
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },
  // Compiler optimizations for smoother animations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Source map configuration
  productionBrowserSourceMaps: false,
  webpack: (config, { isServer, dev }) => {
    // Improve source map generation for node_modules
    if (dev) {
      config.devtool = 'cheap-module-source-map';
    }
    // Explicit path aliases for Vercel builds
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL,
  },
};

export default nextConfig;
