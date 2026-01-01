#!/bin/bash

# =====================================================
# Gemini POS - Quick VPS Update
# =====================================================
# Sử dụng: ./scripts/update-vps.sh
# =====================================================

set -e

# Configuration
VPS_IP="203.55.176.10"
VPS_USER="root"
KEY_PATH="$HOME/Desktop/key.pem"
REMOTE_PATH="/root/gemini-pos-api"

echo ""
echo "🚀 Gemini POS - VPS Quick Update"
echo "================================="
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Sync backend files
echo "📤 Uploading backend files..."
scp -i "$KEY_PATH" "$PROJECT_DIR/backend/server.cjs" "$VPS_USER@$VPS_IP:$REMOTE_PATH/"
scp -i "$KEY_PATH" "$PROJECT_DIR/backend/package.json" "$VPS_USER@$VPS_IP:$REMOTE_PATH/"
echo "   ✅ Files uploaded"

# Restart server
echo ""
echo "🔧 Restarting server..."
ssh -i "$KEY_PATH" "$VPS_USER@$VPS_IP" << 'ENDSSH'
cd /root/gemini-pos-api
npm install --production 2>/dev/null || true
pm2 restart gemini-pos || pm2 start server.cjs --name gemini-pos
pm2 save
echo ""
echo "✅ Server running!"
pm2 status gemini-pos --no-color | head -5
ENDSSH

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "   🌐 Frontend: https://store-six-fawn.vercel.app"
echo "   🔌 API:      https://vps.quanganh.org/api"
echo ""
