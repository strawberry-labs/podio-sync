#!/bin/bash

# VPS Initial Setup Script for eco-podio-webhook
# Run this once on your Hetzner VPS to set up the environment

set -e

APP_DIR="/var/www/podio-sync"
REPO_URL="git@github.com:YOUR_USERNAME/podio-sync.git"  # Update this!

echo "=== Updating system packages ==="
sudo apt update && sudo apt upgrade -y

echo "=== Installing Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "=== Installing pnpm ==="
sudo npm install -g pnpm

echo "=== Installing PM2 ==="
sudo npm install -g pm2

echo "=== Installing Git ==="
sudo apt install -y git

echo "=== Creating application directory ==="
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

echo "=== Cloning repository ==="
git clone $REPO_URL $APP_DIR
cd $APP_DIR

echo "=== Installing dependencies ==="
pnpm install

echo "=== Building application ==="
pnpm build

echo "=== Creating .env file ==="
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Please edit $APP_DIR/.env with your configuration"
fi

echo "=== Starting application with PM2 ==="
pm2 start dist/main.js --name podio-sync

echo "=== Setting PM2 to start on boot ==="
pm2 startup
pm2 save

echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "1. Edit $APP_DIR/.env with your configuration"
echo "2. Run: pm2 restart podio-sync"
echo "3. Set up GitHub secrets (see README)"
