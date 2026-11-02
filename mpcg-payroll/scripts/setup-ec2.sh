#!/bin/bash
# ============================================================
# MPCG Payroll - EC2 Automated Deployment & Stability Script
# ============================================================
# Prevents crashes, enables swap memory, installs PM2, syncs Prisma, and starts the app.

set -e

echo "🚀 Starting MPCG Payroll EC2 Setup..."

# 1. Enable Swap Memory (CRITICAL: Prevents 1GB RAM EC2 crashes / OOM Killer)
if [ ! -f /swapfile ]; then
    echo "📦 Configuring 2GB Swap Memory to prevent OOM crashes..."
    sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ Swap memory enabled successfully!"
else
    echo "✅ Swap file already exists."
fi

# 2. Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20 or 22."
    exit 1
fi
echo "✅ Node.js version: $(node -v)"

# 3. Install PM2 globally if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    sudo npm install -g pm2
    echo "✅ PM2 installed!"
else
    echo "✅ PM2 is already installed."
fi

# 4. Check for .env file
if [ ! -f .env ]; then
    echo "⚠️ .env not found. Creating default .env from template..."
    cat <<EOT >> .env
DATABASE_URL="mysql://root:@127.0.0.1:3306/mpcg_payroll"
AUTH_SECRET="$(openssl rand -hex 32 2>/dev/null || echo 'mpcg-payroll-production-secret-key-2026')"
AUTH_TRUST_HOST="true"
ALLOWED_ORIGINS="0.0.0.0,localhost,127.0.0.1"
EOT
    echo "⚠️ Created .env. Please update your DATABASE_URL in .env if your MySQL has a password!"
fi

# 5. Install Dependencies
echo "📦 Installing npm dependencies..."
export NODE_OPTIONS="--max-old-space-size=2048"
npm install

# 6. Generate Prisma Client for Linux
echo "🔧 Generating Prisma Client for Linux..."
npx prisma generate

# 7. Push Database Schema
echo "🗄️ Syncing database schema with MySQL..."
npx prisma db push --accept-data-loss || echo "⚠️ Prisma db push had warnings; continuing..."

# 8. Build Next.js Production App
echo "🏗️ Building Next.js production app..."
npm run build

# 9. Start with PM2 (Auto-restart on crash + auto-start on EC2 reboot)
echo "🚀 Starting application with PM2..."
pm2 stop mpcg-payroll 2>/dev/null || true
pm2 delete mpcg-payroll 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "============================================================"
echo "🎉 MPCG Payroll is now running stably on EC2!"
echo "============================================================"
echo "• View status:   pm2 status"
echo "• View logs:     pm2 logs mpcg-payroll"
echo "• Restart app:   pm2 restart mpcg-payroll"
echo "• Stop app:      pm2 stop mpcg-payroll"
echo ""
echo "Access in your browser at: http://<YOUR_EC2_PUBLIC_IP>:3000"
echo "============================================================"
