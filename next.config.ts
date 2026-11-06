import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // PGlite ships a .wasm binary and Prisma driver adapters must stay outside the bundler.
  serverExternalPackages: ['@electric-sql/pglite', 'pglite-prisma-adapter', 'sharp', '@prisma/client'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
}

export default nextConfig
