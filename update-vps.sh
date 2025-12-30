#!/bin/bash

# Configuration
VPS_HOST="10.66.66.1"
VPS_USER="root"
SSH_KEY="$HOME/Desktop/key.pem"
PROJECT_DIR="~/store" 

# Lưu ý: 10.66.66.1 là IP quản trị (VPN/Internal), còn 203.55.176.10 là IP Public của Web

echo "🚀 Connecting to VPS ($VPS_HOST)..."

# Dùng đúng lệnh SSH bạn yêu cầu
ssh -i ~/Desktop/key.pem -o StrictHostKeyChecking=no root@10.66.66.1 "cd $PROJECT_DIR && \
echo '⬇️  Pulling latest code...' && \
git reset --hard && \
git pull origin main && \
echo '📦 Installing dependencies...' && \
npm install && \
echo '🆔 Migrating IDs (10 chars)...' && \
node migrate-ids.js && \
echo '🖼️  Optimizing images...' && \
node optimize-images.js && \
echo '🔄 Restarting Server...' && \
pm2 restart server || pm2 start server.js --name server && \
echo '✅ Update Complete!'"

echo "Done."
