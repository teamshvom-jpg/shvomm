#!/usr/bin/env bash
# ==============================================================================
# Shvom Bespoke Gifting - Hostinger VPS Automated Production Setup Script
# Tested on: Ubuntu 22.04 LTS / 24.04 LTS on Hostinger VPS
# ==============================================================================

set -euo pipefail

echo "=========================================================="
echo " Starting Shvom Production Setup on Hostinger VPS"
echo "=========================================================="

APP_DIR="/var/www/shvom"

# 1. Update system packages
echo ">>> [1/7] Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y python3 python3-pip python3-venv git curl nginx certbot python3-certbot-nginx build-essential

# 2. Install Node.js 20 LTS (if not installed)
if ! command -v node &> /dev/null; then
    echo ">>> [2/7] Installing Node.js LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo ">>> [2/7] Node.js is already installed ($(node -v))"
fi

# 3. Create web directory if not exists
echo ">>> [3/7] Setting up permissions for ${APP_DIR}..."
sudo mkdir -p ${APP_DIR}
sudo chown -R $USER:$USER ${APP_DIR}

# 4. Setup Python Virtual Environment and Backend
echo ">>> [4/7] Setting up Python backend virtual environment..."
cd ${APP_DIR}/backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

# Ensure uploads directory exists
mkdir -p app/static/uploads

# Ensure .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️ NOTE: Please edit ${APP_DIR}/backend/.env with your production credentials!"
fi

# 5. Build React Frontend
echo ">>> [5/7] Building React production frontend..."
cd ${APP_DIR}/frontend
npm install
npm run build

# 6. Configure Systemd Service
echo ">>> [6/7] Installing Systemd Service..."
sudo cp ${APP_DIR}/deploy/shvom-backend.service /etc/systemd/system/shvom-backend.service
sudo systemctl daemon-reload
sudo systemctl enable shvom-backend
sudo systemctl restart shvom-backend

# 7. Configure Nginx
echo ">>> [7/7] Configuring Nginx reverse proxy..."
sudo cp ${APP_DIR}/deploy/nginx.conf /etc/nginx/sites-available/shvom
if [ ! -f "/etc/nginx/sites-enabled/shvom" ]; then
    sudo ln -s /etc/nginx/sites-available/shvom /etc/nginx/sites-enabled/shvom
fi
# Remove default nginx site if active
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl restart nginx

echo "=========================================================="
echo " Deployment Complete!"
echo " Backend Status: sudo systemctl status shvom-backend"
echo " To obtain free SSL: sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com"
echo "=========================================================="

