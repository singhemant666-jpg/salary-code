import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
