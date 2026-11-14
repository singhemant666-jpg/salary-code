import type { NextConfig } from "next";
import os from "os";

// Dynamically discover all local LAN IPv4 addresses (e.g. 192.168.x.x, 10.x.x.x, 172.x.x.x)
const localIps: string[] = [];
try {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        localIps.push(net.address);
        localIps.push(`${net.address}:3000`);
      }
    }
  }
} catch (e) {}

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
  ...localIps,
  ...envOrigins,
];

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  devIndicators: false,
  allowedDevOrigins: allowedOriginsList,
  typescript: {
    // Avoid double-checking TypeScript in worker to conserve CPU and RAM on cloud instances
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 1, // Restrict build worker concurrency to 1 vCPU to stop 100% CPU lockups and OOM kills
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
