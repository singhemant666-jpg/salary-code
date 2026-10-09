import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '*.loca.lt',
    'localhost:3000',
    '192.168.29.120:3000',
    '192.168.29.120',
    '*.ngrok-free.app',
    '*.ngrok.io',
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        '*.loca.lt',
        'localhost:3000',
        '192.168.29.120:3000',
        '192.168.29.120',
        '*.ngrok-free.app',
        '*.ngrok.io',
      ],
    },
  },
};

export default nextConfig;
