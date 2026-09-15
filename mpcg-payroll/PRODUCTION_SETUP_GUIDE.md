# 🚀 MPCG Payroll & Attendance System - Production Deployment Guide

This guide provides step-by-step instructions for deploying the **MPCG Payroll & Attendance System** to a live production environment (Linux VPS / Cloud Server) with MySQL, Nginx, PM2, SSL, Biometric Integration, and Gupshup WhatsApp API.

---

## 📋 Table of Contents
1. [Prerequisites & System Requirements](#1-prerequisites--system-requirements)
2. [Environment Variables Setup (.env)](#2-environment-variables-setup-env)
3. [Production Database Setup (MySQL & Prisma)](#3-production-database-setup-mysql--prisma)
4. [Application Build & Process Management (PM2)](#4-application-build--process-management-pm2)
5. [Nginx Reverse Proxy & SSL Setup](#5-nginx-reverse-proxy--ssl-setup)
6. [Biometric Machine Integration Setup](#6-biometric-machine-integration-setup)
7. [WhatsApp Integration Setup (Gupshup API)](#7-whatsapp-integration-setup-gupshup-api)
8. [Automated Server Cron Jobs & Database Backups](#8-automated-server-cron-jobs--database-backups)
9. [Maintenance & Troubleshooting Commands](#9-maintenance--troubleshooting-commands)

---

## 1. Prerequisites & System Requirements

- **OS**: Ubuntu 20.04 / 22.04 LTS (recommended)
- **Node.js**: v20.x or higher LTS
- **Database**: MySQL 8.0 or MariaDB 10.5+
- **Process Manager**: PM2 (`npm install -g pm2`)
- **Web Server**: Nginx with Let's Encrypt (Certbot)
- **RAM**: Minimum 2 GB (4 GB recommended)

---

## 2. Environment Variables Setup (`.env`)

Create a `.env` file in the project root on your server:

```env
# Production Environment Flag
NODE_ENV=production

# Database Connection String
# Use 127.0.0.1 for local MySQL server to avoid IPv6 localhost resolution delays
DATABASE_URL="mysql://payroll_user:STRONG_SECURE_PASSWORD@127.0.0.1:3306/mpcg_payroll?connection_limit=10"

# NextAuth Authentication Configuration
NEXTAUTH_URL="https://yourdomain.com"
# Generate a 32-byte secret using: openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-super-secret-key"

# Gupshup WhatsApp API Credentials
GUPSHUP_APP_NAME="MPCG_Payroll_App"
GUPSHUP_API_KEY="your_live_gupshup_api_key"
GUPSHUP_SRC_NAME="919876543210"

# Optional Default SMTP Config (Can also be set in Dashboard Settings)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER="sahilsinghnewsome@gmail.com"
SMTP_PASS="your_gmail_app_password"
SMTP_FROM_EMAIL="sahilsinghnewsome@gmail.com"
SMTP_FROM_NAME="MY PAIN CLINIC GLOBAL Payroll"
```

---

## 3. Production Database Setup (MySQL & Prisma)

1. **Create Database & Dedicated User**:
   ```sql
   CREATE DATABASE mpcg_payroll CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'payroll_user'@'127.0.0.1' IDENTIFIED BY 'STRONG_SECURE_PASSWORD';
   GRANT ALL PRIVILEGES ON mpcg_payroll.* TO 'payroll_user'@'127.0.0.1';
   FLUSH PRIVILEGES;
   ```

2. **Sync Database Schema & Generate Client**:
   ```bash
   # Push schema to MySQL database
   npx prisma db push

   # Generate Prisma Client
   npx prisma generate
   ```

3. **(Optional) Seed Initial Admin User**:
   ```bash
   npx prisma db seed
   ```

---

## 4. Application Build & Process Management (PM2)

1. **Install Dependencies**:
   ```bash
   npm ci
   ```

2. **Build Production Application**:
   ```bash
   npm run build
   ```

3. **Start Next.js App using PM2**:
   ```bash
   pm2 start npm --name "mpcg-payroll" -- run start
   ```

4. **Configure PM2 Startup on Server Reboot**:
   ```bash
   pm2 startup
   pm2 save
   ```

---

## 5. Nginx Reverse Proxy & SSL Setup

1. **Create Nginx Site Configuration** (`/etc/nginx/sites-available/payroll.conf`):
   ```nginx
   server {
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Increase body size for salary slip batch uploads
       client_max_body_size 20M;
   }
   ```

2. **Enable Site & Test Nginx**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/payroll.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. **Install SSL Certificate (Let's Encrypt / Certbot)**:
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

---

## 6. Biometric Machine Integration Setup

Configure your **Realtime / eSSL Desktop Software** to forward punches to your live server endpoint:

1. Open **Realtime Software** → **API Integration** → **Parallel Data Export Setting**.
2. Configure the mapping parameters:
   - **API Type**: `Third Party Api`
   - **Request Method**: `POST`
   - **Authorization Auth Type**: `No Auth`
   - **Content-Type**: `application/json`
   - **Data Sending Format**: `Body`
   - **Active Parallel Third-party API Transfer**: Checked ☑️
   - **API URL**: `https://yourdomain.com/api/biometric/punch`

3. **Parameter Field Mappings**:
   - `EmpCode` → `EmpCode`
   - `EmployeeName` → `EmployeeName`
   - `LogDateTime` → `LogDateTime`
   - `LogDate` → `LogDate`
   - `LogTime` → `LogTime`
   - `DeviceSerialNo` → `DeviceSerialNo`

---

## 7. WhatsApp Integration Setup (Gupshup API)

To enable automated **Login (Check-in)** and **Logout (Check-out)** WhatsApp notifications:

1. Log in to your **Live Payroll Dashboard** at `https://yourdomain.com/dashboard/settings/whatsapp`.
2. Turn ON **Enable WhatsApp Notifications**.
3. Enter your **Gupshup Live API Key** & **Source Number** (`919876543210`).
4. Enable **Use Gupshup Approved Templates** and provide your approved Template IDs:
   - **Login Template ID**: `e.g. 04d2b07e-19d8-4243-8f59-fbea38c40b1b`
   - **Logout Template ID**: `e.g. af26e3dd-281a-41fd-ae1d-894bbffcc5a9`
5. Check **Automated Alert Triggers**:
   - ☑️ Send WhatsApp Notification on **Login / Check-in**
   - ☑️ Send WhatsApp Notification on **Logout / Check-out**
6. Click **Save WhatsApp Settings** and test with your mobile number.

---

## 8. Automated Server Cron Jobs & Database Backups

Edit system crontab (`crontab -e`):

```bash
# 1. Automated Daily Database Backup at 2:00 AM
0 2 * * * mysqldump -u payroll_user -p'STRONG_SECURE_PASSWORD' mpcg_payroll | gzip > /var/backups/mpcg_payroll_$(date +\%F).sql.gz

# 2. Daily End-of-Day Attendance Processing at 11:30 PM
30 23 * * * cd /var/www/mpcg-payroll && node realtime-sync-daemon.js >> /var/log/payroll-sync.log 2>&1
```

---

## 9. Maintenance & Troubleshooting Commands

- **Check App Status**: `pm2 status`
- **View Live Application Logs**: `pm2 logs mpcg-payroll`
- **Restart Application**: `pm2 restart mpcg-payroll`
- **Update Application Code**:
  ```bash
  git pull origin main
  npm ci
  npx prisma db push
  npm run build
  pm2 restart mpcg-payroll
  ```
- **Test SMTP Email Connection**: Open `/dashboard/payroll` → Email Settings → Test Connection.
