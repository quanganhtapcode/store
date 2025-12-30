#!/bin/bash

# Configuration
VPS_HOST="203.55.176.10"
VPS_USER="root"
SSH_KEY="$HOME/Desktop/key.pem"
PROJECT_DIR="~/store" 

# Check key existence
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ Error: Key file not found at $SSH_KEY"
    echo "Please check the path. Using default ssh agent if key missing..."
    SSH_CMD="ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST"
else
    SSH_CMD="ssh -i \"$SSH_KEY\" -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST"
fi

echo "🚀 Connecting to VPS ($VPS_HOST)..."

$SSH_CMD "cd $PROJECT_DIR && \
echo '⬇️  Pulling latest code...' && \
git reset --hard && \
git pull origin main && \
echo '📦 Installing dependencies...' && \
npm install && \
echo '🆔 Migrating IDs...' && \
node migrate-ids.js && \
echo '🖼️  Optimizing images...' && \
node optimize-images.js && \
echo '🔄 Restarting Server...' && \
pm2 restart server || pm2 start server.js --name server && \
echo '✅ Update Complete!'"

echo "Done."
