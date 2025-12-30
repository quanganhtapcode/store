#!/bin/bash

# === Gemini POS - VPS Deployment Script ===
# Sử dụng: ./update-vps.sh

set -e

# Configuration
VPS_IP="10.66.66.1"
VPS_USER="root"
KEY_PATH="$HOME/Desktop/key.pem"
REMOTE_PATH="/root/gemini-pos-api"

echo "🚀 Gemini POS - VPS Deployment"
echo "=============================="

# Files to sync (Frontend sẽ deploy qua Vercel, chỉ sync backend)
BACKEND_FILES=(
    "server.cjs"
    "package.json"
)

# 1. Sync Backend Files
echo ""
echo "📤 Syncing backend files..."
for file in "${BACKEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        scp -i "$KEY_PATH" "$file" "$VPS_USER@$VPS_IP:$REMOTE_PATH/"
        echo "   ✅ $file"
    fi
done

# 2. SSH Commands
echo ""
echo "🔧 Updating server..."
ssh -i "$KEY_PATH" "$VPS_USER@$VPS_IP" << 'ENDSSH'
cd /root/gemini-pos-api

# Install dependencies if package.json changed
npm install --production 2>/dev/null || true

# Restart PM2
pm2 restart gemini-pos || pm2 start server.cjs --name gemini-pos
pm2 save

echo ""
echo "✅ Server updated and running!"
pm2 status
ENDSSH

echo ""
echo "🎉 Deployment Complete!"
echo "   API: https://vps.quanganh.org/api"
echo "   Frontend: https://store-six-fawn.vercel.app"
