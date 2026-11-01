# Hostinger Production Deployment Guide for Shvom

This comprehensive guide walks you through deploying the **Shvom Bespoke Gifting Platform** (FastAPI backend + Vite React SPA frontend + Cashfree payments + SQLite/MySQL) on **Hostinger**.

---

## Architecture Overview

```
                      +-----------------------------+
                      |      Hostinger Visitor      |
                      |    (HTTPS / yourdomain)     |
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               |                                           |
               v                                           v
    [Static SPA Frontend]                         [API Reverse Proxy]
   - React Build (dist/)                         - FastAPI Backend
   - Cached Assets (assets/)                     - Gunicorn / Uvicorn / Passenger
   - SPA Rewrite via .htaccess / Nginx           - Port 8000 or WSGI
```

All required Hostinger production packages and configuration files are prepared in the repository:
- `requirements.txt` / `backend/requirements.txt`: Includes `gunicorn`, `uvicorn`, `a2wsgi`, `pymysql`, `cryptography`
- `passenger_wsgi.py` & `backend/passenger_wsgi.py`: WSGI entrypoints for Hostinger Shared/Cloud hosting (Phusion Passenger)
- `frontend/public/.htaccess` & `frontend/dist/.htaccess`: Apache/LiteSpeed SPA fallback routing, caching, security headers, and compression
- `deploy/shvom-backend.service`: Systemd service unit for Hostinger VPS
- `deploy/nginx.conf`: Production Nginx reverse proxy configuration for Hostinger VPS
- `deploy/deploy-vps.sh`: One-click automated setup script for Ubuntu 22.04/24.04 VPS
- `Dockerfile` & `docker-compose.yml`: Containerized production deployment for Hostinger VPS

---

## Choose Your Hostinger Plan

| Plan Type | Best Method | Difficulty | Performance |
| :--- | :--- | :--- | :--- |
| **Hostinger VPS (Recommended)** | Docker Compose or Automated Script | Easy / Medium | ⚡⚡⚡ High (Full root control, custom ports, background workers) |
| **Hostinger Shared / Cloud Hosting (hPanel)** | hPanel Python App + `public_html` | Medium | ⚡⚡ Good (Phusion Passenger WSGI + LiteSpeed) |

---

## Option 1: Hostinger VPS (Recommended)

Hostinger VPS provides full Ubuntu/Debian root access, perfect for FastAPI with Gunicorn/Uvicorn workers and Nginx.

### Method A: Automated Setup (Quickest)

1. **SSH into your Hostinger VPS**:
   ```bash
   ssh root@YOUR_SERVER_IP
   ```

2. **Clone your repository**:
   ```bash
   sudo mkdir -p /var/www/shvom
   sudo chown -R $USER:$USER /var/www/shvom
   git clone <YOUR_GIT_REPO_URL> /var/www/shvom
   cd /var/www/shvom
   ```

3. **Configure Environment Variables**:
   ```bash
   cp backend/.env.example backend/.env
   nano backend/.env
   ```
   *Update `JWT_SECRET_KEY`, `CORS_ORIGINS`, `DATABASE_URL`, Cashfree credentials, and SMTP mail settings.*

4. **Run the Automated Deploy Script**:
   ```bash
   chmod +x deploy/deploy-vps.sh
   ./deploy/deploy-vps.sh
   ```

5. **Enable Free SSL with Certbot**:
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

---

### Method B: Docker Compose (Zero Configuration VPS)

If your Hostinger VPS has Docker installed (or select the **Hostinger Docker OS template**):

1. **Upload or clone repository to `/var/www/shvom`**:
   ```bash
   cd /var/www/shvom
   cp backend/.env.example backend/.env
   nano backend/.env
   ```

2. **Launch with Docker Compose**:
   ```bash
   docker compose up -d --build
   ```

3. **Check status**:
   ```bash
   docker compose ps
   docker compose logs -f
   ```
   *Your site is live on port 80, with automatic restarts and data persistence for both uploads and the database.*

---

## Option 2: Hostinger Web / Cloud Hosting (hPanel)

If you are using standard Hostinger Web Hosting or Cloud Startup with hPanel:

### Step 1: Build & Upload the Frontend

1. **Build the production frontend on your machine**:
   ```bash
   cd frontend
   npm run build
   ```
   *This outputs to `frontend/dist/`, which automatically includes `.htaccess`, `index.html`, and bundled JS/CSS.*

2. **Upload to Hostinger**:
   - Log into **Hostinger hPanel** -> **File Manager**.
   - Navigate to `public_html/`.
   - Upload all files and folders inside `frontend/dist/` directly into `public_html/`.
   - Verify that `.htaccess` is present in `public_html/` (enable "Show hidden files" in File Manager if needed). This guarantees that reloading pages like `/designer`, `/corporate`, or `/admin` routes directly without 404 errors.

---

### Step 2: Configure Python App in hPanel

1. In **Hostinger hPanel**, go to **Advanced** -> **Python Applications** (or search "Python").
2. Click **Create Application**:
   - **Python Version**: Select **3.10** or **3.11**.
   - **Application Root**: `backend` (or your uploaded directory).
   - **Application URL**: Select your subdomain (e.g., `api.yourdomain.com`) or main domain.
   - **Application Startup File**: `passenger_wsgi.py`
   - **Application Entry Point**: `application`
3. Click **Create**.
4. Upload the contents of your `backend/` folder into the application root directory.
5. In hPanel, under **Configuration files**, click **Edit** for `requirements.txt` and ensure `a2wsgi` and other dependencies are present.
6. Click **Run Pip Install** to install dependencies into the Hostinger virtual environment.
7. Click **Restart Application**.

---

### Step 3: Database Options on Hostinger

#### Option 1: SQLite (Easiest)
- Leave `DATABASE_URL=sqlite:///./shvom.db` in `backend/.env`.
- Database file is created automatically upon first run with WAL mode enabled for concurrent performance.

#### Option 2: Hostinger Managed MySQL
1. In hPanel, go to **Databases** -> **Management** -> **Create MySQL Database & User**.
2. Note your database name, username, and password.
3. In `backend/.env`, set:
   ```env
   DATABASE_URL=mysql+pymysql://u123456789_shvom:YourSecurePassword@localhost:3306/u123456789_shvomdb
   ```
   *The `pymysql` driver handles connections, reconnections, and connection pooling automatically.*

---

## Production Security & Environment Checklist

Before announcing your site to clients, verify the following in `backend/.env`:

1. **`JWT_SECRET_KEY`**: Replace with a cryptographically random secret:
   ```bash
   python3 -c "import secrets; print(secrets.token_hex(32))"
   ```
2. **`CORS_ORIGINS`**: Set to your live Hostinger domains:
   ```env
   CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```
3. **`CASHFREE_ENVIRONMENT`**:
   - Switch to `PRODUCTION` when ready for real client payments.
   - Enter your live `CASHFREE_CLIENT_ID` and `CASHFREE_CLIENT_SECRET`.
   - In `frontend/.env`, set `VITE_CASHFREE_ENVIRONMENT=PRODUCTION` and re-run `npm run build`.
4. **`SMTP Email Delivery`**:
   - For **Hostinger Titan Mail**:
     ```env
     SMTP_HOST=smtp.titan.email
     SMTP_PORT=465
     SMTP_USER=concierge@yourdomain.com
     SMTP_PASSWORD=your_titan_email_password
     MAIL_FROM=concierge@yourdomain.com
     ```
   - For **Gmail**: Use an App Password (not your personal account password).
5. **Verify Health Check**:
   Visit `https://yourdomain.com/api/health` to confirm database, mailer, and payment status.

