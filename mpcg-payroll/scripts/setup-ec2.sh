#!/bin/bash
# ============================================================
# MPCG Payroll - EC2 Automated Deployment & Stability Script
# ============================================================
# Prevents crashes, enables swap memory, installs PM2, syncs Prisma, and starts the app.

set -e

echo "============================================================"
echo "🚀 Starting MPCG Payroll EC2 Setup & Optimization..."
echo "============================================================"

# 1. Enable Swap Memory (CRITICAL: Prevents 1GB RAM EC2 crashes / OOM Killer)
if [ ! -f /swapfile ]; then
    echo "📦 Configuring 2GB Swap Memory to prevent OOM (Out Of Memory) crashes..."
    sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ 2GB Swap memory enabled successfully!"
else
    echo "✅ Swap file already active."
fi

# 2. Check & Validate Node.js (Require Node 18.18+ or 20+)
if ! command -v node &> /dev/null; then
    echo "📦 Node.js not detected. Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs || sudo yum install -y nodejs
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
echo "✅ Node.js version: $(node -v)"
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️ Warning: Node.js 18.18+ or 20+ is recommended for Next.js 16."
fi

# 3. Create Runtime Upload Directories
echo "📁 Ensuring upload directories exist with write permissions..."
mkdir -p salary-slips employee-documents public
chmod -R 775 salary-slips employee-documents 2>/dev/null || true
echo "✅ Upload directories prepared."

# 4. Check & Prepare MySQL Database
if command -v mysql &> /dev/null; then
    echo "🗄️ MySQL CLI found. Ensuring database 'mpcg_payroll' exists..."
    sudo mysql -e "CREATE DATABASE IF NOT EXISTS mpcg_payroll CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || true
fi

# 5. Check or Create .env File
if [ ! -f .env ]; then
    echo "⚠️ .env not found. Creating default .env from template..."
    cat <<EOT > .env
DATABASE_URL="mysql://root:@127.0.0.1:3306/mpcg_payroll"
AUTH_SECRET="$(openssl rand -hex 32 2>/dev/null || echo 'mpcg-payroll-production-secret-key-2026')"
AUTH_TRUST_HOST="true"
ALLOWED_ORIGINS="0.0.0.0,localhost,127.0.0.1"
EOT
    echo "⚠️ Default .env created. If your MySQL has a password, update DATABASE_URL in .env!"
fi

# 6. Install PM2 globally if missing
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 process manager globally..."
    sudo npm install -g pm2
    echo "✅ PM2 installed!"
else
    echo "✅ PM2 is already installed."
fi

# 7. Install Dependencies with Memory Limit
echo "📦 Installing npm dependencies (with 2GB heap space)..."
export NODE_OPTIONS="--max-old-space-size=2048"
npm install

# 8. Generate Prisma Client for Linux Architectures
echo "🔧 Generating Prisma Client for Linux (native + debian + rhel engines)..."
npx prisma generate

# 9. Sync Database Schema
echo "🗄️ Syncing database schema with MySQL..."
npx prisma db push --accept-data-loss

# 10. Seed Database (Create Super Admin if empty)
echo "🌱 Checking default admin account..."
npm run prisma:seed 2>/dev/null || npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts 2>/dev/null || true

# 11. Build Next.js Production App
echo "🏗️ Building Next.js production app (with memory optimization)..."
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build

# 12. Start / Restart with PM2
echo "🚀 Starting application under PM2 process manager..."
pm2 stop mpcg-payroll 2>/dev/null || true
pm2 delete mpcg-payroll 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "============================================================"
echo "🎉 MPCG Payroll is now running stably on EC2!"
echo "============================================================"
echo "• App Status:    pm2 status"
echo "• View Logs:     pm2 logs mpcg-payroll"
echo "• Restart:       pm2 restart mpcg-payroll"
echo "• Stop:          pm2 stop mpcg-payroll"
echo ""
echo "Default Super Admin Credentials:"
echo "• Email:    admin@mpcglobal.com"
echo "• Password: admin123"
echo ""
echo "Access via browser at:"
echo "👉 http://<YOUR_EC2_PUBLIC_IP>:3000"
echo "============================================================"
