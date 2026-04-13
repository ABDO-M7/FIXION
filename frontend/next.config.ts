import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async rewrites() {
    const primary = process.env.NEXT_PUBLIC_BACKEND_PRIMARY || 'http://localhost:3001/api/v1';
    return [
      {
        source: '/api/backend/:path*',
        destination: `${primary}/:path*`,
      },
    ];
  },
};

export default nextConfig;
