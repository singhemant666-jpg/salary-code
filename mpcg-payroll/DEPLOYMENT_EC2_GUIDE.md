# 🚀 MPCG Payroll — Complete AWS EC2 Deployment & Stability Guide

This guide covers everything needed to deploy, run, and maintain the MPCG Payroll System on AWS EC2 without crashes, memory overruns, or database conflicts.

---

## 📋 Table of Contents
1. [Pre-Requisites & EC2 Instance Setup](#1-pre-requisites--ec2-instance-setup)
2. [AWS Security Group Configuration (Port 3000)](#2-aws-security-group-configuration)
3. [One-Command Automated Deployment](#3-one-command-automated-deployment)
4. [Database Configuration & Conflict Prevention](#4-database-configuration--conflict-prevention)
5. [Why EC2 Instances Crash & How They Are Prevented](#5-why-ec2-instances-crash--how-they-are-prevented)
6. [Process Management with PM2](#6-process-management-with-pm2)
7. [Setting Up Nginx Reverse Proxy & Free SSL (Optional)](#7-setting-up-nginx-reverse-proxy--free-ssl-optional)
8. [Troubleshooting Matrix (Common Errors & Fixes)](#8-troubleshooting-matrix)

---

## 1. Pre-Requisites & EC2 Instance Setup

### Recommended Instance Specs:
| Parameter | Minimum | Recommended |
|---|---|---|
| **Instance Type** | `t2.micro` / `t3.micro` (1 vCPU, 1GB RAM) | `t3.small` / `t3.medium` |
| **Operating System** | Ubuntu 22.04 LTS or 24.04 LTS (Amazon Linux 2 / 2023 also supported) | Ubuntu 22.04 LTS |
| **Storage (EBS)** | 16 GB SSD (gp3) | 30 GB SSD (gp3) |
| **Node.js** | v18.18+ or v20 LTS | v20 LTS |
| **Database** | MySQL 8.0 (Local on EC2 or AWS RDS MySQL) | MySQL 8.0 |

---

## 2. AWS Security Group Configuration

Before accessing the application from your browser, you must open port **3000** in your AWS EC2 Security Group:

1. Go to **AWS Console** ➔ **EC2** ➔ **Instances** ➔ select your instance.
2. Click the **Security** tab ➔ click your **Security Group**.
3. Under **Inbound rules**, click **Edit inbound rules**.
4. Add the following rules:

| Type | Protocol | Port Range | Source | Description |
|---|---|---|---|---|
| **SSH** | TCP | `22` | My IP (or `0.0.0.0/0`) | SSH terminal access |
| **Custom TCP** | TCP | `3000` | `0.0.0.0/0` | Next.js Payroll Application |
| **HTTP** | TCP | `80` | `0.0.0.0/0` | Optional: Nginx web server |
| **HTTPS** | TCP | `443` | `0.0.0.0/0` | Optional: Secure SSL traffic |

5. Click **Save rules**.

---

## 3. One-Command Automated Deployment

Connect to your EC2 instance via SSH:
```bash
ssh -i your-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```

Clone the repository and run the automated setup script:
```bash
# 1. Clone repository (if not already done)
git clone https://github.com/singhemant666-jpg/salary-code.git
cd salary-code/mpcg-payroll

# 2. Make script executable & run setup
chmod +x scripts/setup-ec2.sh
./scripts/setup-ec2.sh
```

### What `setup-ec2.sh` automatically does for you:
- ✅ **Allocates a 2GB Swapfile**: Stops memory exhaustion and kernel `SIGKILL` (OOM crashes) on 1GB RAM instances.
- ✅ **Verifies Node.js v20**: Ensures compatibility with Next.js 16.
- ✅ **Installs PM2**: Process manager that keeps your app running 24/7 and auto-restarts on server reboot.
- ✅ **Creates upload directories**: Prepares `salary-slips/` and `employee-documents/` with write permissions.
- ✅ **Generates Linux Prisma Query Engines**: Compiles Linux native, Debian, and RHEL query engine targets.
- ✅ **Synchronizes Database Schema**: Runs `prisma db push` safely on MySQL.
- ✅ **Seeds Default Admin**: Creates Super Admin (`admin@mpcglobal.com` / `admin123`).
- ✅ **Builds Next.js**: Compiles all production pages with `--max-old-space-size=2048`.
- ✅ **Starts with PM2**: Starts via `ecosystem.config.js`.

---

## 4. Database Configuration & Conflict Prevention

### Option A: Local MySQL on the EC2 Instance (Most Common)

If MySQL is installed locally on the EC2 server:

```bash
# Install MySQL Server if not installed
sudo apt update && sudo apt install -y mysql-server

# Start MySQL
sudo systemctl start mysql
sudo systemctl enable mysql
```

#### MySQL 8 Authentication Fix:
On Ubuntu EC2, MySQL root user uses `auth_socket` by default, which blocks Node.js from connecting over TCP (`127.0.0.1:3306`). Run these SQL commands to set up a dedicated user:

```bash
sudo mysql
```

Inside MySQL console:
```sql
-- Create database
CREATE DATABASE IF NOT EXISTS mpcg_payroll CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create dedicated database user with password
CREATE USER IF NOT EXISTS 'mpcg_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'YourSecurePassword123!';
CREATE USER IF NOT EXISTS 'mpcg_user'@'127.0.0.1' IDENTIFIED WITH mysql_native_password BY 'YourSecurePassword123!';

-- Grant privileges
GRANT ALL PRIVILEGES ON mpcg_payroll.* TO 'mpcg_user'@'localhost';
GRANT ALL PRIVILEGES ON mpcg_payroll.* TO 'mpcg_user'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

Then update your `.env`:
```env
DATABASE_URL="mysql://mpcg_user:YourSecurePassword123!@127.0.0.1:3306/mpcg_payroll"
```

---

### Option B: AWS RDS MySQL Database

If using AWS RDS MySQL:
1. Ensure the RDS instance's Security Group allows inbound MySQL traffic on port **3306** from your EC2 instance's Security Group.
2. In your `.env`:
```env
DATABASE_URL="mysql://admin:YourRDSPassword@your-rds-endpoint.us-east-1.rds.amazonaws.com:3306/mpcg_payroll"
```

---

## 5. Why EC2 Instances Crash & How They Are Prevented

### Issue 1: Out-Of-Memory (OOM) Kernel Kill
- **Symptom**: Application terminates with `Killed` in the terminal or PM2 restart count keeps increasing.
- **Why**: EC2 `t2.micro` or `t3.micro` only has 1GB physical RAM. Next.js 16 with Turbopack and React 19 needs ~1.5GB during builds and peak usage. Without swap, the Linux kernel invokes OOM-killer and kills the Node process.
- **Solution**: The setup script creates a **2GB swap space** (`/swapfile`). In addition, `ecosystem.config.js` sets `max_memory_restart: '850M'` to safely reload workers before OOM happens.

### Issue 2: Prisma Linux Binary Mismatch
- **Symptom**: `PrismaClientInitializationError: Query engine library for runtime "debian-openssl-..." or "rhel-openssl-..." could not be found`.
- **Why**: Prisma generated on Windows downloads `.dll.node`. On Linux EC2, it needs `.so.node`.
- **Solution**: `prisma/schema.prisma` now includes:
  ```prisma
  binaryTargets = ["native", "rhel-openssl-1.0.x", "rhel-openssl-3.0.x", "debian-openssl-1.1.x", "debian-openssl-3.0.x", "linux-musl-openssl-3.0.x"]
  ```
  and `package.json` has `"postinstall": "prisma generate"`.

### Issue 3: NextAuth Protocol & Port Stripping
- **Symptom**: `ERR_CONNECTION_REFUSED` or login redirects to `https://<ip>` port 443 instead of `http://<ip>:3000`.
- **Why**: Code previously defaulted proto to `https` and stripped port 3000.
- **Solution**: Fixed in `src/app/api/auth/[...nextauth]/route.ts` to detect the incoming protocol and preserve port 3000 over plain HTTP.

### Issue 4: Server Actions Origin Mismatch
- **Symptom**: Form submissions fail with `Invalid Server Actions request: Origin mismatch`.
- **Why**: Next.js 16 rejects server actions from origins not listed in `allowedOrigins`.
- **Solution**: `next.config.ts` dynamically allows `*.amazonaws.com` hostnames, local IPs, and any IPs/domains passed in `ALLOWED_ORIGINS`.

---

## 6. Process Management with PM2

The application is run under **PM2**, which handles backgrounding, log rotation, and crash restarts.

### Useful PM2 Commands:

```bash
# Check if application is running and memory consumption:
pm2 status

# View live application logs (useful for debugging):
pm2 logs mpcg-payroll

# View error logs specifically:
pm2 logs mpcg-payroll --err

# Restart application:
pm2 restart mpcg-payroll

# Stop application:
pm2 stop mpcg-payroll

# Ensure PM2 starts automatically on EC2 reboot:
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
pm2 save
```

---

## 7. Setting Up Nginx Reverse Proxy & Free SSL (Optional)

If you want to run on standard port **80 / 443** with a custom domain (e.g., `payroll.yourcompany.com`) and free HTTPS via Let's Encrypt:

### 1. Install Nginx
```bash
sudo apt update && sudo apt install -y nginx
```

### 2. Configure Nginx
Create `/etc/nginx/sites-available/mpcg-payroll`:
```bash
sudo nano /etc/nginx/sites-available/mpcg-payroll
```

Paste the following:
```nginx
server {
    listen 80;
    server_name payroll.yourcompany.com; # Or your EC2 public IP

    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/mpcg-payroll /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Install Free SSL with Certbot (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d payroll.yourcompany.com
```

Now your app runs securely on `https://payroll.yourcompany.com`!

---

## 8. Troubleshooting Matrix

| Error Symptom | Root Cause | Solution |
|---|---|---|
| **Terminal says `Killed` during build or dev** | Out of Memory (OOM Killer) | Run `setup-ec2.sh` to enable 2GB swap space (`sudo swapon /swapfile`). |
| **Browser says `Connection timed out`** | AWS Security Group port 3000 blocked | Go to AWS Console ➔ EC2 ➔ Security Groups ➔ Add Inbound rule for Custom TCP port **3000** from `0.0.0.0/0`. |
| **`Access denied for user 'root'@'127.0.0.1'`** | MySQL 8 auth_socket restriction | Create a dedicated MySQL user using `mysql_native_password` (see Section 4). |
| **`Table 'mpcg_payroll.xyz' doesn't exist`** | Schema not synced with database | Run `npx prisma db push --accept-data-loss`. |
| **`Query engine library could not be found`** | Missing Linux Prisma binary | Run `npx prisma generate` on the EC2 machine. |
| **Login fails or redirects to port 443** | Stale proto configuration | Pull latest code (`git pull origin main`) and restart PM2 (`pm2 restart mpcg-payroll`). |
| **File upload fails with `EACCES`** | Missing write permissions | Run `mkdir -p salary-slips employee-documents && chmod -R 775 salary-slips employee-documents`. |

---

## 🔑 Default Super Admin Login
- **URL**: `http://<YOUR_EC2_PUBLIC_IP>:3000/login`
- **Email**: `admin@mpcglobal.com`
- **Password**: `admin123`
*(Change this password immediately in Settings ➔ Users after logging in)*

