import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  allowedDevOrigins: [
    '*.loca.lt',
    'localhost:3000',
    '192.168.29.120:3000',
    '192.168.29.120',
    '*.ngrok-free.app',
    '*.ngrok-free.dev',
    '*.ngrok.io',
    '*.ngrok.app',
    '*.ngrok.dev',
    '*.trycloudflare.com',
    'recast-glass-sixteen.ngrok-free.dev',
  ],
  experimental: {
    optimizePackageImports: ['lucide-react', 'decimal.js', 'zod'],
    serverActions: {
      allowedOrigins: [
        '*.loca.lt',
        'localhost:3000',
        '192.168.29.120:3000',
        '192.168.29.120',
        '*.ngrok-free.app',
        '*.ngrok-free.dev',
        '*.ngrok.io',
        '*.ngrok.app',
        '*.ngrok.dev',
        '*.trycloudflare.com',
        'recast-glass-sixteen.ngrok-free.dev',
      ],
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
