import type { NextConfig } from "next";

const envOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOriginsList = [
  'localhost:3000',
  'localhost',
  '127.0.0.1:3000',
  '127.0.0.1',
  '0.0.0.0:3000',
  '0.0.0.0',
  'payroll.mypainclinicglobal.com',
  '*.mypainclinicglobal.com',
  '*.amazonaws.com',
  '*.compute.amazonaws.com',
  '*.compute-1.amazonaws.com',
  '*.loca.lt',
  '*.ngrok-free.app',
  '*.ngrok-free.dev',
  '*.ngrok.io',
  '*.ngrok.app',
  '*.ngrok.dev',
  '*.trycloudflare.com',
  '192.168.29.120:3000',
  '192.168.29.120',
  'recast-glass-sixteen.ngrok-free.dev',
  ...envOrigins,
];

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  devIndicators: false,
  allowedDevOrigins: allowedOriginsList,
  experimental: {
    optimizePackageImports: ['lucide-react', 'decimal.js', 'zod'],
    serverActions: {
      allowedOrigins: allowedOriginsList,
    },
  },
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|ico|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
