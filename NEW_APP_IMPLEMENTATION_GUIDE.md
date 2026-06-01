# New App Implementation Guide - AWS EC2

**Complete step-by-step guide for implementing a new application from scratch on the AWS EC2 server.**

---

## 📋 Prerequisites

- Access to AWS EC2 server (ip-172-31-38-229)
- SSH access with sudo privileges
- Domain name ready (e.g., `newapp.shivjhawebtech.info`)
- Basic knowledge of Node.js, Nginx, and PM2
- PostgreSQL database credentials (if needed)

---

## 🚀 Step-by-Step Implementation

### Step 1: Choose an Available Port

Check which ports are currently in use:

```bash
sudo netstat -tlnp | grep node
```

**Current Port Allocation:**
- Port 3001: ecommerce-api
- Port 3002: store-locator (storelocatorapp)
- Port 3003: shopify-api (loginshopifyapp)
- Port 3004: storelocator-api (storelactoryapp)
- Port 3005: modern-reviews

**Available Ports:** 3006, 3007, 3008, etc.

For this guide, we'll use **Port 3006** as an example.

---

### Step 2: Create Application Directory

```bash
# Navigate to /home/ubuntu
cd /home/ubuntu

# Create new application directory
sudo mkdir newapp
sudo chown ubuntu:ubuntu newapp
cd newapp
```

---

### Step 3: Set Up the Application

#### Option A: Clone from Git Repository

```bash
git clone <your-repository-url> .
```

#### Option B: Upload Files via SCP/SFTP

Use WinSCP or FileZilla to upload files to `/home/ubuntu/newapp/`

#### Option C: Create New Next.js App

```bash
npx create-next-app@latest . --typescript --tailwind --eslint
```

---

### Step 4: Install Dependencies

```bash
npm install
```

---

### Step 5: Configure Environment Variables

Create a `.env` file in the application directory:

```bash
nano .env
```

**Example .env file:**

```env
NODE_ENV=production
PORT=3006

# Database (if needed)
DATABASE_URL=postgresql://deploy:SecurePass123@localhost:5432/newapp_db

# App Configuration
NEXT_PUBLIC_APP_URL=https://newapp.shivjhawebtech.info
NEXTAUTH_URL=https://newapp.shivjhawebtech.info
NEXTAUTH_SECRET=your-super-secret-key-change-in-production

# API Keys (if needed)
NEXT_PUBLIC_API_KEY=your-api-key-here

# SMTP (if needed)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Your App <your-email@gmail.com>"
```

**Important:** Replace all placeholder values with actual values.

---

### Step 6: Set Up Database (If Required)

#### Create PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE newapp_db;

# Create user (if not exists)
CREATE USER deploy WITH PASSWORD 'SecurePass123';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE newapp_db TO deploy;

# Exit psql
\q
```

#### Run Migrations (If Using Prisma/Sequelize)

```bash
# For Prisma
npx prisma generate
npx prisma migrate deploy

# For Sequelize
npx sequelize-cli db:migrate
```

---

### Step 7: Build the Application

```bash
npm run build
```

**Note:** Ensure the build completes successfully without errors.

---

### Step 8: Test Application Locally

```bash
# Start the application in development mode to test
PORT=3006 npm run dev
```

Test the application by accessing `http://<server-ip>:3006` in your browser.

Press `Ctrl+C` to stop the development server.

---

### Step 9: Configure PM2

#### Start Application with PM2

```bash
cd /home/ubuntu/newapp

# Start with specific port
PORT=3006 pm2 start npm --name "newapp" -- start

# Save PM2 configuration
pm2 save
```

#### Verify PM2 Status

```bash
pm2 status
pm2 logs newapp --lines 50
```

#### Verify Application is Listening on Correct Port

```bash
sudo netstat -tlnp | grep node
```

You should see port 3006 listed.

---

### Step 10: Configure Nginx

#### Create Nginx Configuration File

```bash
sudo nano /etc/nginx/sites-available/newapp.shivjhawebtech.info
```

**Add the following configuration:**

```nginx
server {
    listen 80;
    server_name newapp.shivjhawebtech.info;

    location / {
        proxy_pass http://localhost:3006;
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

#### Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/newapp.shivjhawebtech.info /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

### Step 11: Configure DNS

1. Log in to your domain registrar (e.g., GoDaddy, Namecheap)
2. Navigate to DNS management
3. Add an **A Record**:
   - **Name/Host:** `newapp` (or `@` for root domain)
   - **Type:** A
   - **Value:** `13.234.112.134` (your server IP)
   - **TTL:** 300 (or default)

4. Wait for DNS propagation (5-30 minutes)

#### Verify DNS Propagation

```bash
# From your local machine
nslookup newapp.shivjhawebtech.info
# or
dig newapp.shivjhawebtech.info
```

---

### Step 12: Obtain SSL Certificate

```bash
sudo certbot --nginx -d newapp.shivjhawebtech.info
```

**Follow the prompts:**
1. Enter your email address
2. Agree to terms of service
3. Choose whether to redirect HTTP to HTTPS (recommended: **Yes** - option 2)

Certbot will automatically:
- Obtain SSL certificate
- Update Nginx configuration with SSL settings
- Configure HTTP to HTTPS redirect

---

### Step 13: Verify SSL Configuration

```bash
# Check certificate details
sudo certbot certificates

# Test HTTPS access
curl -I https://newapp.shivjhawebtech.info
```

---

### Step 14: Final Testing

#### Test HTTP to HTTPS Redirect

```bash
curl -I http://newapp.shivjhawebtech.info
```

Should return `301 Moved Permanently` redirecting to HTTPS.

#### Test HTTPS Access

```bash
curl -I https://newapp.shivjhawebtech.info
```

Should return `200 OK` or appropriate response.

#### Test in Browser

Open `https://newapp.shivjhawebtech.info` in your browser and verify:
- Application loads correctly
- SSL certificate is valid (padlock icon)
- All functionality works

---

### Step 15: Configure PM2 Startup

Ensure PM2 starts automatically on server reboot:

```bash
pm2 startup
```

Follow the command output to enable PM2 startup.

---

### Step 16: Update Documentation

Update the main AWS EC2 setup document (`AWS_ALL_IN_ONE_EC2_SETUP.md`) with:
- New application details
- Port assignment
- Domain information
- Database information (if applicable)

---

## 🔧 Troubleshooting

### Application Not Starting

**Check PM2 logs:**
```bash
pm2 logs newapp --lines 100
```

**Check if port is in use:**
```bash
sudo lsof -i :3006
```

**Kill process if needed:**
```bash
sudo lsof -ti:3006 | xargs kill -9
```

### 502 Bad Gateway

**Check if app is running:**
```bash
pm2 status
```

**Check if app is listening on correct port:**
```bash
sudo netstat -tlnp | grep node
```

**Check Nginx error logs:**
```bash
sudo tail -50 /var/log/nginx/error.log
```

### SSL Certificate Issues

**Check certificate status:**
```bash
sudo certbot certificates
```

**Renew certificate:**
```bash
sudo certbot renew
```

**Force renewal:**
```bash
sudo certbot renew --force-renewal
```

### Database Connection Issues

**Test database connection:**
```bash
psql -U deploy -d newapp_db -h localhost
```

**Check PostgreSQL status:**
```bash
sudo systemctl status postgresql
```

### Port Already in Use

**Find process using the port:**
```bash
sudo lsof -i :3006
```

**Kill the process:**
```bash
sudo kill -9 <PID>
```

---

## 📝 Checklist

Use this checklist to ensure all steps are completed:

- [ ] Port selected and verified as available
- [ ] Application directory created
- [ ] Application files uploaded/cloned
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables configured in `.env`
- [ ] Database created (if required)
- [ ] Migrations run (if required)
- [ ] Application built successfully (`npm run build`)
- [ ] Application tested locally
- [ ] PM2 configured and app started
- [ ] App listening on correct port
- [ ] Nginx configuration file created
- [ ] Nginx site enabled
- [ ] Nginx reloaded successfully
- [ ] DNS A record configured
- [ ] DNS propagated
- [ ] SSL certificate obtained
- [ ] HTTPS redirect configured
- [ ] Application tested over HTTP
- [ ] Application tested over HTTPS
- [ ] PM2 startup configured
- [ ] Documentation updated

---

## 🔄 Common Commands Reference

### PM2 Commands

```bash
# Start app
PORT=3006 pm2 start npm --name "newapp" -- start

# Stop app
pm2 stop newapp

# Restart app
pm2 restart newapp

# Delete app
pm2 delete newapp

# View logs
pm2 logs newapp

# View status
pm2 status

# Save configuration
pm2 save

# Enable startup
pm2 startup
```

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log
```

### SSL Commands

```bash
# Obtain certificate
sudo certbot --nginx -d newapp.shivjhawebtech.info

# Renew certificate
sudo certbot renew

# View certificates
sudo certbot certificates

# Dry run renewal
sudo certbot renew --dry-run
```

### Database Commands

```bash
# Access PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE newapp_db;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE newapp_db TO deploy;

# Connect to database
psql -U deploy -d newapp_db -h localhost
```

---

## 📚 Additional Resources

- **PM2 Documentation:** https://pm2.keymetrics.io/docs/
- **Nginx Documentation:** https://nginx.org/en/docs/
- **Let's Encrypt/Certbot:** https://certbot.eff.org/docs/
- **Next.js Deployment:** https://nextjs.org/docs/deployment

---

## 💡 Best Practices

1. **Always test locally before deploying**
2. **Use environment variables for sensitive data**
3. **Keep .env files out of version control**
4. **Regularly update dependencies**
5. **Monitor application logs**
6. **Set up log rotation for large applications**
7. **Use meaningful PM2 app names**
8. **Document any custom configurations**
9. **Test SSL renewal before expiration**
10. **Keep backups of databases and configurations**

---

## 🆘 Emergency Recovery

If something goes wrong:

### Rollback Nginx Changes

```bash
sudo rm /etc/nginx/sites-enabled/newapp.shivjhawebtech.info
sudo systemctl reload nginx
```

### Stop Application

```bash
pm2 stop newapp
pm2 delete newapp
```

### Restore from Backup

If you have a backup of the application:

```bash
# Restore files
rsync -av /path/to/backup/ /home/ubuntu/newapp/

# Restart application
cd /home/ubuntu/newapp
PORT=3006 pm2 start npm --name "newapp" -- start
pm2 save
```

---

**Last Updated:** May 31, 2026
**Document Version:** 1.0
