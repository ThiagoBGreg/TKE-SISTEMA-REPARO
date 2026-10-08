/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    DATABASE_URL:
      process.env.DATABASE_URL ||
      'postgresql://neondb_owner:npg_v0ru3OWJPNIt@ep-wandering-mouse-b6clcxjt.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
